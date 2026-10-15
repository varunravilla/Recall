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
