import { afterAll, beforeAll, expect, test } from "bun:test";
import { AuthenticatingConcept, InvalidCredentials } from "../../src/concepts/Authenticating.ts";
import { openTestDb, type TestDb } from "../helpers/db.ts";
let store: TestDb;
beforeAll(async () => { store = await openTestDb(); }, 120000);
afterAll(async () => { await store?.close(); });
for (const size of [12, 128]) test(`password of exactly ${size} characters registers and authenticates`, async () => {
  const auth = new AuthenticatingConcept(store.db);
  const credentials = { username: `boundary_${size}`, password: "a".repeat(size) };
  const registered = await auth.register(credentials);
  expect(await auth.login(credentials)).toEqual(registered);
  await expect(auth.login({ ...credentials, password: "b".repeat(size) })).rejects.toBeInstanceOf(InvalidCredentials);
});
for (const [label, credentials] of [
  ["short password", { username: "short_password", password: "a".repeat(11) }],
  ["long password", { username: "long_password", password: "a".repeat(129) }],
  ["short username", { username: "ab", password: "valid-password-123" }],
  ["long username", { username: "a".repeat(41), password: "valid-password-123" }],
  ["punctuation username", { username: "name@example.com", password: "valid-password-123" }],
] as const) test(`registration refuses ${label} without creating an account`, async () => {
  const auth = new AuthenticatingConcept(store.db);
  const before = await store.db.collection("authenticating.accounts").countDocuments();
  await expect(auth.register(credentials)).rejects.toBeInstanceOf(InvalidCredentials);
  expect(await store.db.collection("authenticating.accounts").countDocuments()).toBe(before);
});
for (const field of ["username", "password"]) for (const value of [null, 42, {}, []]) {
  test(`concept registration/login refuse non-string ${field}: ${JSON.stringify(value)}`, async () => {
    const auth = new AuthenticatingConcept(store.db);
    const credentials = { username: "bad_type", password: "valid-password-123", [field]: value } as any;
    const before = await store.db.collection("authenticating.accounts").countDocuments();
    await expect(auth.register(credentials)).rejects.toBeInstanceOf(InvalidCredentials);
    await expect(auth.login(credentials)).rejects.toBeInstanceOf(InvalidCredentials);
    expect(await store.db.collection("authenticating.accounts").countDocuments()).toBe(before);
  });
}
test("concurrent normalized registration creates one identity and does not replace its password", async () => {
  const auth = new AuthenticatingConcept(store.db);
  const results = await Promise.allSettled([
    auth.register({ username: " Race_User ", password: "first-password-123" }),
    auth.register({ username: "race_user", password: "second-password-123" }),
  ]);
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
  expect(await store.db.collection("authenticating.accounts").countDocuments({ username: "race_user" })).toBe(1);
  const firstWon = results[0]!.status === "fulfilled";
  const success = results.find(r => r.status === "fulfilled") as PromiseFulfilledResult<{ user: string }>;
  expect(await auth.login({ username: "race_user", password: firstWon ? "first-password-123" : "second-password-123" })).toEqual(success.value);
  await expect(auth.login({ username: "race_user", password: firstWon ? "second-password-123" : "first-password-123" })).rejects.toBeInstanceOf(InvalidCredentials);
});
