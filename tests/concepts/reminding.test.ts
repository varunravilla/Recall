import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { RemindingConcept } from "../../src/concepts/Reminding.ts";
import { openTestDb, type TestDb } from "../helpers/db.ts";

let testDb: TestDb;
let reminding: RemindingConcept;

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  reminding = new RemindingConcept(testDb.db);
});

afterAll(async () => {
  await testDb.close();
});

test("sweepDue marks scheduled reminders as due", async () => {
  const at = new Date(Date.now() + 5_000);
  await reminding.schedule({ user: "maya", item: "track-1", at });
  const before = await reminding.sweepDue({ now: new Date(Date.now() - 1_000) });
  expect(before.count).toBe(0);
  const after = await reminding.sweepDue({ now: new Date(Date.now() + 10_000) });
  expect(after.count).toBe(1);
  const row = await reminding._byItem({ user: "maya", item: "track-1" });
  expect(row[0]?.status).toBe("due");
});

test("reschedule, due, acknowledge, and invalid transitions preserve state", async () => {
  const at = new Date("2030-01-01T12:00:00Z");
  const { reminder } = await reminding.schedule({ user: "maya", item: "r", at });
  await expect(reminding.due({ reminder, now: new Date(at.getTime() - 1) })).rejects.toThrow("not time");
  await expect(reminding.acknowledge({ user: "maya", reminder })).rejects.toThrow("due");
  await expect(reminding.cancel({ user: "other", reminder })).rejects.toThrow("own");
  await expect(reminding.reschedule({ user: "other", reminder, at })).rejects.toThrow("own");
  expect((await reminding._byItem({ user: "maya", item: "r" }))[0]?.at).toEqual(at);
  const later = new Date(at.getTime() + 60000);
  await reminding.reschedule({ user: "maya", reminder, at: later });
  expect(await reminding._scheduledBefore({ now: at })).toEqual([]);
  expect(await reminding._scheduledBefore({ now: later })).toHaveLength(1);
  await reminding.due({ reminder, now: later });
  await expect(reminding.reschedule({ user: "maya", reminder, at })).rejects.toThrow("scheduled");
  await expect(reminding.due({ reminder, now: later })).rejects.toThrow("scheduled");
  await expect(reminding.acknowledge({ user: "other", reminder })).rejects.toThrow("own");
  await reminding.acknowledge({ user: "maya", reminder });
  expect(await reminding._byItem({ user: "maya", item: "r" })).toEqual([]);
  await expect(reminding.acknowledge({ user: "maya", reminder })).rejects.toThrow("due");
});
test("cancelled reminder never surfaces in a later sweep", async () => {
  const { reminder } = await reminding.schedule({ user: "maya", item: "cancel", at: new Date(0) });
  await reminding.cancel({ user: "maya", reminder });
  await reminding.cancel({ user: "maya", reminder });
  expect(await reminding.sweepDue({ now: new Date() })).toEqual({ count: 0 });
  expect(await reminding._byItem({ user: "maya", item: "cancel" })).toEqual([]);
});

test("removeItem deletes every status for one owner and item only", async () => {
  const first = await reminding.schedule({ user: "maya", item: "delete", at: new Date(0) });
  await reminding.cancel({ user: "maya", reminder: first.reminder });
  await reminding.schedule({ user: "maya", item: "delete", at: new Date(0) });
  await reminding.schedule({ user: "other", item: "delete", at: new Date(0) });
  await reminding.removeItem({ user: "maya", item: "delete" });
  await reminding.removeItem({ user: "maya", item: "delete" });
  expect(await testDb.db.collection("reminding.reminders").countDocuments({ owner: "maya", item: "delete" })).toBe(0);
  expect(await reminding._byItem({ user: "other", item: "delete" })).toHaveLength(1);
});
