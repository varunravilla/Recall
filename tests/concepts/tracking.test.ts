import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { TrackingConcept } from "../../src/concepts/Tracking.ts";
import { openTestDb, type TestDb } from "../helpers/db.ts";

let testDb: TestDb;
let tracking: TrackingConcept;

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  tracking = new TrackingConcept(testDb.db);
});

afterAll(async () => {
  await testDb.close();
});

test("track then complete resolves pending item", async () => {
  const { tracking: id } = await tracking.track({ user: "maya", item: "interp-1" });
  await tracking.complete({ user: "maya", tracking: id });
  const row = await tracking._byId({ tracking: id });
  expect(row[0]?.status).toBe("completed");
});

test("duplicate pending track is refused", async () => {
  await tracking.track({ user: "maya", item: "interp-1" });
  await expect(tracking.track({ user: "maya", item: "interp-1" })).rejects.toThrow("already");
});

test("dismiss, unauthorized actions, and repeated resolution", async () => {
  const { tracking: id } = await tracking.track({ user: "maya", item: "new" });
  await expect(tracking.complete({ user: "other", tracking: id })).rejects.toThrow("own");
  await expect(tracking.dismiss({ user: "other", tracking: id })).rejects.toThrow("own");
  expect(await tracking._pending({ user: "maya" })).toHaveLength(1);
  await tracking.dismiss({ user: "maya", tracking: id });
  expect(await tracking._pending({ user: "maya" })).toEqual([]);
  expect((await tracking._byItem({ user: "maya", item: "new" }))[0]?.status).toBe("dismissed");
  await expect(tracking.dismiss({ user: "maya", tracking: id })).rejects.toThrow("pending");
  await expect(tracking.complete({ user: "maya", tracking: id })).rejects.toThrow("pending");
});

test("remove requires ownership, handles resolved rows, and preserves other trackings", async () => {
  const first = await tracking.track({ user: "maya", item: "history" });
  await tracking.complete({ user: "maya", tracking: first.tracking });
  const second = await tracking.track({ user: "maya", item: "history" });
  await expect(tracking.remove({ user: "other", tracking: first.tracking })).rejects.toThrow("own");
  expect(await tracking._allByItem({ item: "history" })).toHaveLength(2);
  await tracking.remove({ user: "maya", tracking: first.tracking });
  expect(await tracking._byId(first)).toEqual([]);
  expect(await tracking._byId(second)).toHaveLength(1);
  await expect(tracking.remove({ user: "maya", tracking: first.tracking })).rejects.toThrow("own");
});
