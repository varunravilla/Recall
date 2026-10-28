import { afterAll, beforeAll, expect, test } from "bun:test";
import { openTestDb, type TestDb } from "../helpers/db.ts";
import { testApplication } from "../helpers/application.ts";

let store: TestDb;
let app: ReturnType<typeof testApplication>;
let session: string;
beforeAll(async () => { store = await openTestDb(); app = testApplication(store.db); session = (await app.account()).session; }, 120000);
afterAll(async () => { await store?.close(); });
const at = "2030-01-01T12:00:00Z";
const fields = { username: "admission_user", password: "admission-password-123", item: "new-item", content: "Concert announcement", collectedAt: at, kind: "event", summary: "Buy tickets", relevantAt: at, at, collection: "missing", interpretation: "missing", tracking: "missing" };
// Independent public-contract inventory: adding a route requires an explicit test row.
export const contracts: Array<[string, string[]]> = [
  ["register", ["username", "password"]], ["start", ["username", "password"]],
  ["current", ["session"]], ["end", ["session"]],
  ["captions/add", ["session", "item", "content", "collectedAt", "kind", "summary", "relevantAt"]],
  ["inbox/list", ["session"]], ["library/list", ["session"]],
  ["review/get", ["session", "collection"]],
  ["review/revise", ["session", "collection", "interpretation", "kind", "summary", "relevantAt"]],
  ["review/confirm", ["session", "collection", "interpretation", "at"]],
  ["review/reject", ["session", "collection", "interpretation"]],
  ["saved/get", ["session", "collection"]], ["saved/delete", ["session", "collection"]],
  ...["complete", "dismiss"].map(action => [`saved/${action}`, ["session", "collection", "tracking"]] as [string, string[]]),
  ["saved/reschedule", ["session", "collection", "tracking", "at"]], ["sweep/tick", ["session"]],
  ["photos/get", ["session", "collection"]], ["photos/find", ["session", "item"]],
];
async function snapshot() {
  const result: Record<string, unknown[]> = {};
  for (const name of ["authenticating.accounts", "collecting.collections", "interpreting.interpretations", "tracking.trackings", "reminding.reminders"])
    result[name] = await store.db.collection(name).find().sort({ _id: 1 }).toArray();
  return result;
}
for (const [route, required] of contracts) {
  for (const field of required) {
    test(`${route} refuses missing ${field} before any persistent write`, async () => {
      const body: Record<string, unknown> = { ...fields, session }; delete body[field];
      const before = await snapshot();
      await app.post(route, body, 400);
      expect(await snapshot()).toEqual(before);
      expect((await app.post("current", { session })).user).toBeString();
    });
    test(`${route} refuses an object in ${field} before any persistent write`, async () => {
      const before = await snapshot();
      await app.post(route, { ...fields, session, [field]: { $ne: null } }, 400);
      expect(await snapshot()).toEqual(before);
    });
  }
}

for (const body of [null, [], "text", 42, true]) {
  test(`HTTP rejects non-object JSON ${JSON.stringify(body)}`, async () => {
    const response = await app.api(new Request("http://localhost/api/recall/library/list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "INVALID_REQUEST" });
  });
}
for (const [label, init] of [
  ["broken JSON", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }],
  ["wrong content type", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" }],
  ["GET mutation", { method: "GET" }],
  ["PUT mutation", { method: "PUT", body: "{}" }],
] as const) {
  test(`transport refuses ${label}`, async () => {
    const before = await snapshot();
    const response = await app.api(new Request("http://localhost/api/recall/captions/add", init));
    expect(response.status).toBe(400);
    expect(await snapshot()).toEqual(before);
  });
}
