import { afterAll, beforeAll, expect, test } from "bun:test";
import { assemble } from "@mit-sdg/sync-engine/assembly";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { policy } from "../../src/http.ts";
import { composition as Recall } from "../../src/compositions/Recall.ts";
import { composition as Sessions } from "../../src/compositions/Sessions.ts";
import { applicationConceptSet } from "../../src/concepts.ts";
import { AuthenticatingConcept } from "../../src/concepts/Authenticating.ts";
import { CollectingConcept } from "../../src/concepts/Collecting.ts";
import { InterpretingConcept } from "../../src/concepts/Interpreting.ts";
import { RemindingConcept } from "../../src/concepts/Reminding.ts";
import { SessioningConcept } from "../../src/concepts/Sessioning.ts";
import { TrackingConcept } from "../../src/concepts/Tracking.ts";
import { openTestDb, type TestDb } from "../helpers/db.ts";
let store: TestDb;
beforeAll(async () => { store = await openTestDb(); }, 120000);
afterAll(async () => { await store?.close(); });
function handler() {
  const application = assemble({ conceptSet: applicationConceptSet, instances: {
    Authenticating: new AuthenticatingConcept(store.db), Sessioning: new SessioningConcept(),
    Collecting: new CollectingConcept(store.db), Interpreting: new InterpretingConcept(store.db),
    Tracking: new TrackingConcept(store.db), Reminding: new RemindingConcept(store.db),
  }, composition: { Recall, Sessions } });
  return createHttpHandler({ application, gateway: createGateway({ application }), policy });
}
test("HTTP journey: validation, register, capture, edit, confirm, reschedule, persistence, dismiss, logout", async () => {
  let api = handler();
  async function post(path: string, body: Record<string, unknown>, status = 200): Promise<any> {
    const response = await api(new Request(`http://localhost/api/recall/${path}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }));
    const data = await response.json();
    expect(response.status, JSON.stringify(data)).toBe(status);
    return data;
  }
  const credentials = { username: "http_user", password: "http-test-password" };
  const account = await post("register", credentials);
  expect(account).not.toHaveProperty("password");
  const session = account.session;
  await post("start", { ...credentials, password: "incorrect-password" }, 401);
  const input = { session, item: "screenshot", content: "Cafe brunch", collectedAt: new Date().toISOString(), kind: "place", summary: "Try cafe", relevantAt: new Date(Date.now() + 3600000).toISOString() };
  await post("captions/add", { ...input, content: " " }, 400);
  const captured = await post("captions/add", input);
  expect((await post("library/list", { session })).book.items).toHaveLength(1);
  await post("review/revise", { session, ...captured, kind: "place", summary: "Try cafe with Sam", relevantAt: input.relevantAt });
  const tracked = await post("review/confirm", { session, ...captured, at: input.relevantAt });
  await post("saved/reschedule", { session, collection: captured.collection, tracking: tracked.tracking, at: new Date(Date.now() + 7200000).toISOString() });
  const saved = await post("saved/get", { session, collection: captured.collection });
  expect(saved.item.interpretationRow.summary).toBe("Try cafe with Sam");
  expect(saved.item.trackingRow.status).toBe("pending");
  api = handler(); // Same MongoDB, fresh instances and session map.
  await post("library/list", { session }, 401);
  const signedIn = await post("start", credentials);
  expect(signedIn).not.toHaveProperty("password");
  expect(signedIn.user).toBe(account.user);
  expect((await post("library/list", { session: signedIn.session })).book.items).toHaveLength(1);
  await post("saved/dismiss", { session: signedIn.session, collection: captured.collection, tracking: tracked.tracking });
  expect((await post("saved/get", { session: signedIn.session, collection: captured.collection })).item.trackingRow.status).toBe("dismissed");
  await post("end", { session: signedIn.session });
  await post("current", { session: signedIn.session }, 401);
});
