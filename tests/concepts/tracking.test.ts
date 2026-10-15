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
