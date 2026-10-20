import { afterAll, beforeAll, expect, test } from "bun:test";
import { assemble } from "@mit-sdg/sync-engine/assembly";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
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
test("two accounts cannot read, revise, confirm, or reject each other's items using mismatched IDs", async () => {
  const interpreting = new InterpretingConcept(store.db);
  const reminding = new RemindingConcept(store.db);
  const application = assemble({ conceptSet: applicationConceptSet, instances: {
    Authenticating: new AuthenticatingConcept(store.db), Sessioning: new SessioningConcept(),
    Collecting: new CollectingConcept(store.db), Interpreting: interpreting,
    Tracking: new TrackingConcept(store.db), Reminding: reminding,
  }, composition: { Recall, Sessions } });
  const gateway = createGateway({ application });
  async function invoke(path: string, body: Record<string, unknown>) {
    const result = await gateway.invoke(path, body);
    if (!result.ok) {
      if (result.error.kind === "domain") return { error: result.error.value };
      throw new Error(JSON.stringify(result));
    }
    expect(result.ok).toBe(true);
    return result.value as any;
  }
  const a = await invoke("/recall/register", { username: "alice", password: "alice-password-123" });
  const b = await invoke("/recall/register", { username: "bobby", password: "bobby-password-123" });
  const common = { content: "Concert", kind: "event", summary: "Buy tickets", collectedAt: new Date(), relevantAt: new Date() };
  const mine = await invoke("/recall/captions/add", { ...common, session: a.session, item: "a" });
  const theirs = await invoke("/recall/captions/add", { ...common, session: b.session, item: "b" });
  for (const path of ["/recall/review/get", "/recall/saved/get"])
    expect(await invoke(path, { session: a.session, collection: theirs.collection })).toEqual({ error: "NOT_FOUND" });
  for (const action of ["revise", "confirm", "reject"]) {
    expect(await invoke(`/recall/review/${action}`, { ...common, session: a.session,
      collection: mine.collection, interpretation: theirs.interpretation, at: new Date() })).toEqual({ error: "NOT_FOUND" });
    expect((await interpreting._byId({ interpretation: theirs.interpretation }))[0]?.status).toBe("proposed");
  }
  const library = await invoke("/recall/library/list", { session: a.session });
  expect(library.book.items.map((x: any) => x.collection)).toEqual([mine.collection]);
  const confirmed = await invoke("/recall/review/confirm", { session: a.session, ...mine, at: new Date(0) });
  const second = await invoke("/recall/captions/add", { ...common, session: a.session, item: "second" });
  for (const action of ["complete", "dismiss", "reschedule"])
    expect(await invoke(`/recall/saved/${action}`, { session: a.session, collection: second.collection,
      tracking: confirmed.tracking, at: new Date() })).toEqual({ error: "NOT_FOUND" });
  await invoke("/recall/sweep/tick", { session: a.session });
  const inbox = await invoke("/recall/inbox/list", { session: a.session });
  expect(inbox.book.due).toHaveLength(1);
  await invoke("/recall/saved/complete", { session: a.session, collection: mine.collection, tracking: confirmed.tracking });
  expect((await invoke("/recall/inbox/list", { session: a.session })).book.due).toEqual([]);
  expect(await reminding._byItem({ user: a.user, item: confirmed.tracking })).toEqual([]);
  await invoke("/recall/end", { session: a.session });
  expect((await gateway.invoke("/recall/library/list", { session: a.session })).ok).toBe(false);
  expect((await gateway.invoke("/recall/start", { user: "alice" })).ok).toBe(false);
});
