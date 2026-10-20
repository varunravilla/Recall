import { afterAll, beforeAll, expect, test } from "bun:test";
import { assemble } from "@mit-sdg/sync-engine/assembly";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { applicationConceptSet } from "../../src/concepts.ts";
import { composition as Recall } from "../../src/compositions/Recall.ts";
import { composition as Sessions } from "../../src/compositions/Sessions.ts";
import { policy } from "../../src/http.ts";
import { AuthenticatingConcept } from "../../src/concepts/Authenticating.ts";
import { CollectingConcept } from "../../src/concepts/Collecting.ts";
import { InterpretingConcept } from "../../src/concepts/Interpreting.ts";
import { TrackingConcept } from "../../src/concepts/Tracking.ts";
import { RemindingConcept } from "../../src/concepts/Reminding.ts";
import { SessioningConcept } from "../../src/concepts/Sessioning.ts";
import { openTestDb, type TestDb } from "../helpers/db.ts";
let store: TestDb;
beforeAll(async () => { store = await openTestDb(); }, 120000);
afterAll(async () => { await store?.close(); });
test("delete is owner-only and removes images plus every historical interpretation, tracking and reminder", async () => {
  const collecting = new CollectingConcept(store.db), interpreting = new InterpretingConcept(store.db), tracking = new TrackingConcept(store.db), reminding = new RemindingConcept(store.db);
  const application = assemble({ conceptSet: applicationConceptSet, instances: {
    Authenticating: new AuthenticatingConcept(store.db), Sessioning: new SessioningConcept(),
    Collecting: collecting, Interpreting: interpreting, Tracking: tracking, Reminding: reminding,
  }, composition: { Recall, Sessions } });
  const gateway = createGateway({ application });
  const api = createHttpHandler({ application, gateway, policy });
  async function invoke(path: string, input: Record<string, unknown>): Promise<any> {
    const result = await gateway.invoke(path, input);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    return result.value;
  }
  const owner = await invoke("/recall/register", { username: "delete_owner", password: "delete-owner-password" });
  const other = await invoke("/recall/register", { username: "delete_other", password: "delete-other-password" });
  const imageData = Buffer.from(await Bun.file(new URL("../fixtures/future-concert.png", import.meta.url)).arrayBuffer()).toString("base64");
  const input = { content: "Concert", collectedAt: new Date(), kind: "event", summary: "Buy tickets", relevantAt: new Date(Date.now() + 600000), imageData, mimeType: "image/png" };
  const control = await invoke("/recall/photos/add", { ...input, session: other.session, item: "keep-other" });
  for (const state of ["proposed", "pending", "completed", "dismissed"]) {
    const added = await invoke("/recall/photos/add", { ...input, session: owner.session, item: `remove-${state}` });
    const trackingIds: string[] = [];
    if (state !== "proposed") {
      const confirmed = await invoke("/recall/review/confirm", { ...added, session: owner.session, at: input.relevantAt });
      trackingIds.push(confirmed.tracking);
      if (state === "completed" || state === "dismissed") await invoke(`/recall/saved/${state === "completed" ? "complete" : "dismiss"}`, { session: owner.session, collection: added.collection, tracking: confirmed.tracking });
      // A second interpretation exercises cleanup beyond the latest-row join.
      const extra = await interpreting.propose({ item: added.collection, kind: "event", summary: "Another proposal" });
      await interpreting.confirm(extra);
      const history = await tracking.track({ user: owner.user, item: extra.interpretation });
      trackingIds.push(history.tracking);
      await reminding.schedule({ user: owner.user, item: history.tracking, at: new Date(0) });
    }
    const interpretations = await interpreting._allByItem({ item: added.collection });
    const request = (session: string) => new Request("http://localhost/api/recall/saved/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session, collection: added.collection }) });
    expect((await api(request(other.session))).status).toBe(403);
    expect(await collecting._photo({ user: owner.user, collection: added.collection })).toHaveLength(1);
    expect(await interpreting._allByItem({ item: added.collection })).toEqual(interpretations);
    expect((await api(request(owner.session))).status).toBe(200);
    expect(await collecting._byId({ collection: added.collection })).toEqual([]);
    expect(await collecting._photo({ user: owner.user, collection: added.collection })).toEqual([]);
    expect(await interpreting._allByItem({ item: added.collection })).toEqual([]);
    for (const row of interpretations) expect(await tracking._allByItem({ item: row.interpretation })).toEqual([]);
    expect(await store.db.collection("reminding.reminders").countDocuments({ owner: owner.user, item: { $in: trackingIds } })).toBe(0);
    expect((await api(request(owner.session))).status).toBe(403);
    expect(await collecting._photo({ user: other.user, collection: control.collection })).toHaveLength(1);
  }
  expect(await tracking._pending({ user: owner.user })).toEqual([]);
  expect((await invoke("/recall/library/list", { session: owner.session })).book.items).toEqual([]);
});
