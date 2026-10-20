import type { Db, Collection } from "mongodb";
export class InvalidCredentials extends Error {}
export class AccountExists extends Error {}
type Account = { _id: string; username: string; passwordHash: string };
export class AuthenticatingConcept {
  private readonly accounts: Collection<Account>;
  private ready?: Promise<string>;
  constructor(db: Db) {
    this.accounts = db.collection<Account>("authenticating.accounts");
  }
  async register({ username, password }: { username: string; password: string }) {
    username = username.trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,40}$/.test(username) || password.length < 12 || password.length > 128)
      throw new InvalidCredentials("Use a 3–40 character username and a 12–128 character password.");
    await (this.ready ??= this.accounts.createIndex({ username: 1 }, { unique: true }));
    const user = crypto.randomUUID();
    const passwordHash = await Bun.password.hash(password, { algorithm: "argon2id" });
    try { await this.accounts.insertOne({ _id: user, username, passwordHash }); }
    catch (error) {
      if ((error as { code?: number }).code === 11000) throw new AccountExists("That username is unavailable.");
      throw error;
    }
    return { user };
  }
  async login({ username, password }: { username: string; password: string }) {
    const account = await this.accounts.findOne({ username: username.trim().toLowerCase() });
    if (password.length > 128 || !account || !await Bun.password.verify(password, account.passwordHash))
      throw new InvalidCredentials("Username or password is incorrect.");
    return { user: account._id };
  }
}
