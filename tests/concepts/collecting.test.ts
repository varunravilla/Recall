import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { CollectingConcept } from "../../src/concepts/Collecting.ts";
import { openTestDb, type TestDb } from "../helpers/db.ts";

let testDb: TestDb;
let collecting: CollectingConcept;

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  collecting = new CollectingConcept(testDb.db);
});

afterAll(async () => {
  await testDb.close();
});

test("add stores a caption for the owner", async () => {
  const at = new Date();
  const { collection } = await collecting.add({
    user: "maya",
    item: "shot-1",
    content: "Concert tickets Friday",
    collectedAt: at,
  });
  const rows = await collecting._byOwner({ user: "maya" });
  expect(rows).toHaveLength(1);
  expect(rows[0]?.collection).toBe(collection);
  expect(rows[0]?.content).toBe("Concert tickets Friday");
});

test("empty content is refused", async () => {
  await expect(
    collecting.add({ user: "maya", item: "x", content: "  ", collectedAt: new Date() }),
  ).rejects.toThrow("Caption cannot be empty.");
});

test("duplicate item for same user is refused", async () => {
  await collecting.add({ user: "maya", item: "shot-1", content: "a", collectedAt: new Date() });
  await expect(
    collecting.add({ user: "maya", item: "shot-1", content: "b", collectedAt: new Date() }),
  ).rejects.toThrow("already in the collection");
});
