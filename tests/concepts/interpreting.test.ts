import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { InterpretingConcept } from "../../src/concepts/Interpreting.ts";
import { openTestDb, type TestDb } from "../helpers/db.ts";

let testDb: TestDb;
let interpreting: InterpretingConcept;

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

beforeEach(async () => {
  await testDb.db.dropDatabase();
  interpreting = new InterpretingConcept(testDb.db);
});

afterAll(async () => {
  await testDb.close();
});

test("propose then confirm updates status", async () => {
  const { interpretation } = await interpreting.propose({
    item: "collection-1",
    kind: "buy",
    summary: "Buy tickets",
  });
  await interpreting.confirm({ interpretation });
  const rows = await interpreting._byId({ interpretation });
  expect(rows[0]?.status).toBe("confirmed");
});

test("revise only works while proposed", async () => {
  const { interpretation } = await interpreting.propose({
    item: "c1",
    kind: "buy",
    summary: "Old",
  });
  await interpreting.revise({ interpretation, kind: "buy", summary: "New" });
  const rows = await interpreting._byId({ interpretation });
  expect(rows[0]?.summary).toBe("New");
});

test("confirm after reject is refused", async () => {
  const { interpretation } = await interpreting.propose({
    item: "c1",
    kind: "buy",
    summary: "x",
  });
  await interpreting.reject({ interpretation });
  await expect(interpreting.confirm({ interpretation })).rejects.toThrow("proposed");
});

test("terminal interpretations refuse revision, rejection and repeated confirmation without changes", async () => {
  const { interpretation } = await interpreting.propose({ item: "terminal", kind: "place", summary: "Try cafe" });
  expect(await interpreting._byItem({ item: "terminal" })).toHaveLength(1);
  await interpreting.confirm({ interpretation });
  const before = await interpreting._byId({ interpretation });
  await expect(interpreting.confirm({ interpretation })).rejects.toThrow("proposed");
  await expect(interpreting.reject({ interpretation })).rejects.toThrow("proposed");
  await expect(interpreting.revise({ interpretation, kind: "event", summary: "Wrong" })).rejects.toThrow("proposed");
  expect(await interpreting._byId({ interpretation })).toEqual(before);
  expect(await interpreting._byId({ interpretation: "unknown" })).toEqual([]);
});

test("remove deletes one interpretation in any state and is idempotent", async () => {
  const first = await interpreting.propose({ item: "history", kind: "event", summary: "First" });
  const second = await interpreting.propose({ item: "history", kind: "event", summary: "Second" });
  await interpreting.confirm(first);
  expect(await interpreting._allByItem({ item: "history" })).toHaveLength(2);
  await interpreting.remove(first);
  await interpreting.remove(first);
  expect(await interpreting._byId(first)).toEqual([]);
  expect(await interpreting._allByItem({ item: "history" })).toEqual([second]);
});

test("absent dates remain null instead of becoming the creation timestamp", async () => {
  const row = await interpreting.propose({ item: "undated", kind: "product", summary: "Headphones" });
  expect((await interpreting._byId(row))[0]?.relevantAt).toBeNull();
  expect((await interpreting._byItem({ item: "undated" }))[0]?.relevantAt).toBeNull();
  const at = new Date("2027-01-01T12:00:00Z");
  await interpreting.revise({ ...row, kind: "product", summary: "Headphones", relevantAt: at });
  expect((await interpreting._byId(row))[0]?.relevantAt).toEqual(at);
  await interpreting.revise({ ...row, kind: "product", summary: "Headphones" });
  expect((await interpreting._byId(row))[0]?.relevantAt).toBeNull();
});
