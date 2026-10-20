import { afterAll, beforeAll, expect, test } from "bun:test";
import { AuthenticatingConcept, AccountExists, InvalidCredentials } from "../../src/concepts/Authenticating.ts";
import { openTestDb, type TestDb } from "../helpers/db.ts";
let store: TestDb;
let auth: AuthenticatingConcept;
beforeAll(async () => { store = await openTestDb(); auth = new AuthenticatingConcept(store.db); }, 120000);
afterAll(async () => { await store?.close(); });
test("register and login retain identity across instances; passwords are hashed", async () => {
  const credentials = { username: "Maya", password: "correct horse battery" };
  const account = await auth.register(credentials);
  expect(await new AuthenticatingConcept(store.db).login({ ...credentials, username: " maya " })).toEqual(account);
  const saved = await store.db.collection("authenticating.accounts").findOne({ _id: account.user as never });
  expect(saved?.passwordHash).toStartWith("$argon2id$");
  expect(saved).not.toHaveProperty("password");
  await expect(auth.register(credentials)).rejects.toBeInstanceOf(AccountExists);
  await expect(auth.login({ ...credentials, password: "wrong-password" })).rejects.toBeInstanceOf(InvalidCredentials);
  await expect(auth.login({ ...credentials, username: "unknown" })).rejects.toBeInstanceOf(InvalidCredentials);
  expect(await auth.login(credentials)).toEqual(account);
});
test("invalid registration has no side effect", async () => {
  const count = await store.db.collection("authenticating.accounts").countDocuments();
  for (const credentials of [{ username: "ab", password: "long-enough-password" }, { username: "valid", password: "short" }, { username: "valid", password: "x".repeat(129) }])
    await expect(auth.register(credentials)).rejects.toBeInstanceOf(InvalidCredentials);
  expect(await store.db.collection("authenticating.accounts").countDocuments()).toBe(count);
});
