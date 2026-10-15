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
