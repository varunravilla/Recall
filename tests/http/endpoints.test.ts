import { afterAll, beforeAll, expect, test } from "bun:test";
import { openTestDb, type TestDb } from "../helpers/db.ts";
import { testApplication } from "../helpers/application.ts";
let store: TestDb;
beforeAll(async () => { store = await openTestDb(); }, 120000);
afterAll(async () => { await store?.close(); });
const future = () => new Date(Date.now() + 3600000).toISOString();
function capture(session: string) {
  return { session, item: crypto.randomUUID(), content: "Local concert announcement", kind: "event",
    summary: "Buy concert tickets", collectedAt: new Date().toISOString(), relevantAt: future() };
}

test("every ordinary protected HTTP endpoint refuses forged sessions without writes", async () => {
  const app = testApplication(store.db);
  const routes: Array<[string, Record<string, unknown>]> = [
    ["current", {}], ["end", {}], ["captions/add", capture("forged")],
    ["inbox/list", {}], ["library/list", {}], ["review/get", { collection: "missing" }],
    ["review/revise", { collection: "missing", interpretation: "missing", kind: "event", summary: "Change", relevantAt: future() }],
    ["review/confirm", { collection: "missing", interpretation: "missing", at: future() }],
    ["review/reject", { collection: "missing", interpretation: "missing" }],
    ["saved/get", { collection: "missing" }], ["saved/delete", { collection: "missing" }],
    ...["complete", "dismiss", "reschedule"].map(action => [`saved/${action}`, { collection: "missing", tracking: "missing", at: future() }] as [string, Record<string, unknown>]),
    ["sweep/tick", {}],
    ["photos/get", { collection: "missing" }], ["photos/find", { item: "missing" }],
  ];
  const before = await store.db.collection("collecting.collections").countDocuments();
  for (const [path, body] of routes) expect(await app.post(path, { ...body, session: "forged" }, 401)).toHaveProperty("error");
  expect(await store.db.collection("collecting.collections").countDocuments()).toBe(before);
});

test("review, rejection, due sweep, completion and deletion are observable through HTTP", async () => {
  const app = testApplication(store.db); const a = await app.account();
  expect((await app.post("current", { session: a.session })).user).toBe(a.user);
  await app.post("register", a.credentials, 409);
  const item = await app.post("captions/add", capture(a.session));
  expect((await app.post("review/get", { session: a.session, collection: item.collection })).status).toBe("proposed");
  const before = await app.post("saved/get", { session: a.session, collection: item.collection });
  await app.post("review/confirm", { session: a.session, ...item, at: "not-a-date" }, 400);
  expect(await app.post("saved/get", { session: a.session, collection: item.collection })).toEqual(before);
  const tracked = await app.post("review/confirm", { session: a.session, ...item, at: new Date(0).toISOString() });
  await app.post("review/confirm", { session: a.session, ...item, at: future() }, 409);
  await app.post("sweep/tick", { session: a.session });
  const due = await app.post("inbox/list", { session: a.session });
  expect(due.book.due[0].details.reminderStatus).toBe("due");
  await app.post("saved/complete", { session: a.session, collection: item.collection, tracking: tracked.tracking });
  expect((await app.post("saved/get", { session: a.session, collection: item.collection })).item.trackingRow.status).toBe("completed");
  expect((await app.post("inbox/list", { session: a.session })).book.due).toEqual([]);
  await app.post("saved/complete", { session: a.session, collection: item.collection, tracking: tracked.tracking }, 409);
  expect(await app.Reminding._byItem({ user: a.user, item: tracked.tracking })).toEqual([]);
  const ignored = await app.post("captions/add", capture(a.session));
  await app.post("review/reject", { session: a.session, ...ignored });
  await app.post("review/revise", { session: a.session, ...ignored, kind: "event", summary: "Reopen", relevantAt: future() }, 409);
  expect((await app.post("saved/get", { session: a.session, collection: ignored.collection })).item.interpretationRow.status).toBe("rejected");
  for (const collection of [item.collection, ignored.collection]) await app.post("saved/delete", { session: a.session, collection });
  expect((await app.post("library/list", { session: a.session })).book.items).toEqual([]);
  expect(await app.Interpreting._byId({ interpretation: item.interpretation })).toEqual([]);
  expect(await app.Tracking._byId({ tracking: tracked.tracking })).toEqual([]);
  await app.post("saved/get", { session: a.session, collection: item.collection }, 404);
  await app.post("end", { session: a.session });
  await app.post("current", { session: a.session }, 401);
});

test("foreign and mismatched IDs cannot mutate, read, or delete an owner's records", async () => {
  const app = testApplication(store.db); const a = await app.account(); const b = await app.account();
  const item = await app.post("captions/add", capture(a.session));
  const before = await app.post("saved/get", { session: a.session, collection: item.collection });
  for (const path of ["review/get", "saved/get"]) await app.post(path, { session: b.session, collection: item.collection }, 404);
  for (const path of ["review/revise", "review/confirm", "review/reject"])
    await app.post(path, { session: b.session, ...item, kind: "product", summary: "Forged", relevantAt: future(), at: future() }, 404);
  await app.post("saved/delete", { session: b.session, collection: item.collection }, 403);
  expect(await app.post("saved/get", { session: a.session, collection: item.collection })).toEqual(before);
  const tracked = await app.post("review/confirm", { session: a.session, ...item, at: future() });
  const saved = await app.post("saved/get", { session: a.session, collection: item.collection });
  for (const path of ["saved/complete", "saved/dismiss", "saved/reschedule"])
    await app.post(path, { session: b.session, collection: item.collection, tracking: tracked.tracking, at: future() }, 404);
  const second = await app.post("captions/add", capture(a.session));
  for (const path of ["saved/complete", "saved/dismiss", "saved/reschedule"])
    await app.post(path, { session: a.session, collection: second.collection, tracking: tracked.tracking, at: future() }, 404);
  expect(await app.post("saved/get", { session: a.session, collection: item.collection })).toEqual(saved);
  expect((await app.post("library/list", { session: b.session })).book.items).toEqual([]);
});

test("simultaneous confirmation or resolution has exactly one successful transition", async () => {
  const app = testApplication(store.db); const a = await app.account();
  const item = await app.post("captions/add", capture(a.session));
  async function race(path: string, bodies: Record<string, unknown>[]) {
    return Promise.all(bodies.map(async body => {
      const response = await app.api(new Request(`http://localhost/api/recall/${path}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      }));
      return { status: response.status, data: await response.json() as any };
    }));
  }
  const body = { session: a.session, ...item, at: future() };
  const confirmations = await race("review/confirm", [body, body]);
  expect(confirmations.map(r => r.status).sort()).toEqual([200, 409]);
  const tracking = confirmations.find(r => r.status === 200)!.data.tracking;
  const resolution = { session: a.session, collection: item.collection, tracking };
  const resolutions = await race("saved/complete", [resolution, resolution]);
  expect(resolutions.map(r => r.status).sort()).toEqual([200, 409]);
  expect(await app.Reminding._byItem({ user: a.user, item: tracking })).toEqual([]);
  expect((await app.Tracking._byId({ tracking }))[0]?.status).toBe("completed");
});
