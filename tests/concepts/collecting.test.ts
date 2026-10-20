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

test("remove enforces ownership and leaves state unchanged on failure", async () => {
  const { collection } = await collecting.add({ user: "maya", item: "x", content: "Saved", collectedAt: new Date() });
  await expect(collecting.remove({ user: "other", collection })).rejects.toThrow("own");
  expect(await collecting._byOwner({ user: "other" })).toEqual([]);
  expect(await collecting._byId({ collection })).toHaveLength(1);
  await collecting.remove({ user: "maya", collection });
  expect(await collecting._byId({ collection })).toEqual([]);
  await expect(collecting.remove({ user: "maya", collection })).rejects.toThrow("own");
});

test("photo action validates its own input, persists privately, and refuses duplicates without replacement", async () => {
  const imageData = Buffer.from(await Bun.file(new URL("../fixtures/future-concert.png", import.meta.url)).arrayBuffer()).toString("base64");
  const input = { user: "maya", item: "photo-fixture", content: "Upcoming concert", collectedAt: new Date(), imageData, mimeType: "image/png" };
  const { collection } = await collecting.addPhoto(input);
  expect(await collecting._find({ user: "maya", item: input.item })).toEqual([{ collection }]);
  expect(await collecting._find({ user: "other", item: input.item })).toEqual([]);
  expect(await collecting._photo({ user: "maya", collection })).toEqual([{ imageData, mimeType: "image/png" }]);
  expect(await collecting._photo({ user: "other", collection })).toEqual([]);
  await expect(collecting.addPhoto({ ...input, item: "invalid", imageData: "not-base64" })).rejects.toThrow("invalid");
  await expect(collecting.addPhoto({ ...input, content: "Replacement" })).rejects.toThrow("already");
  const rows = await collecting._byOwner({ user: "maya" });
  expect(rows).toHaveLength(1); expect(rows[0]?.content).toBe(input.content);
  expect(rows[0]).not.toHaveProperty("imageData");
  await collecting.remove({ user: "maya", collection });
  expect(await collecting._photo({ user: "maya", collection })).toEqual([]);
});
