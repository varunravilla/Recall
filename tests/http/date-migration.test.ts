import { afterAll, beforeAll, expect, test } from "bun:test";
import { normalizeStoredDates } from "../../src/migrations/dates.ts";
import { openTestDb, type TestDb } from "../helpers/db.ts";
let store: TestDb;
beforeAll(async () => { store = await openTestDb(); }, 120000);
afterAll(async () => { await store?.close(); });

test("startup migrates old string timestamps once and preserves invalid/absent values", async () => {
  // A migration fixture intentionally reproduces the old storage format rather
  // than creating data through corrected concept actions.
  const reminders = store.db.collection("reminding.reminders");
  await reminders.insertMany([{ owner: "legacy", at: "2026-10-01T10:00:00Z" }, { owner: "invalid", at: "bad-date" }, { owner: "absent" }]);
  const changes = await normalizeStoredDates(store.db);
  expect(changes["reminding.reminders.at"]).toBe(1);
  expect((await reminders.findOne({ owner: "legacy" }))?.at).toEqual(new Date("2026-10-01T10:00:00Z"));
  expect((await reminders.findOne({ owner: "invalid" }))?.at).toBe("bad-date");
  expect(await normalizeStoredDates(store.db)).toEqual({ "collecting.collections.collectedAt": 0, "interpreting.interpretations.relevantAt": 0, "reminding.reminders.at": 0 });
});
