import { afterAll, beforeAll, expect, test } from "bun:test";
import { openTestDb, type TestDb } from "../helpers/db.ts";
import { testApplication } from "../helpers/application.ts";
let store: TestDb;
beforeAll(async () => { store = await openTestDb(); }, 120000);
afterAll(async () => { await store?.close(); });
async function setup() {
  const app = testApplication(store.db); const a = await app.account();
  const at = new Date(Date.now() + 3600000).toISOString();
  const input = { session: a.session, item: crypto.randomUUID(), content: "Concert", collectedAt: at, kind: "event", summary: "Buy tickets", relevantAt: at };
  const item = await app.post("captions/add", input);
  const read = () => app.post("saved/get", { session: a.session, collection: item.collection });
  return { app, a, at, input, item, read };
}
for (const status of ["proposed", "rejected", "pending", "completed", "dismissed"]) {
  test(`delete removes the complete ${status} item history and a repeated delete is refused`, async () => {
    const { app, a, at, item } = await setup();
    let tracking: string | undefined;
    if (status === "rejected") await app.post("review/reject", { session: a.session, ...item });
    if (["pending", "completed", "dismissed"].includes(status)) {
      tracking = (await app.post("review/confirm", { session: a.session, ...item, at })).tracking;
      if (status !== "pending") await app.post(`saved/${status === "completed" ? "complete" : "dismiss"}`, { session: a.session, collection: item.collection, tracking });
    }
    await app.post("saved/delete", { session: a.session, collection: item.collection });
    await app.post("saved/delete", { session: a.session, collection: item.collection }, 403);
    expect(await app.Interpreting._allByItem({ item: item.collection })).toEqual([]);
    if (tracking) {
      expect(await app.Tracking._byId({ tracking })).toEqual([]);
      expect(await store.db.collection("reminding.reminders").countDocuments({ item: tracking })).toBe(0);
    }
    expect((await app.post("library/list", { session: a.session })).book.items).toEqual([]);
  });
}
for (const outcome of ["complete", "dismiss"]) {
  for (const repeat of ["complete", "dismiss", "reschedule"]) {
    test(`${outcome} then ${repeat} refuses without changing terminal state`, async () => {
      const { app, a, at, item, read } = await setup();
      const { tracking } = await app.post("review/confirm", { session: a.session, ...item, at });
      const body = { session: a.session, collection: item.collection, tracking, at };
      await app.post(`saved/${outcome}`, body); const before = await read();
      await app.post(`saved/${repeat}`, body, repeat === "reschedule" ? 404 : 409);
      expect(await read()).toEqual(before);
      expect(await store.db.collection("reminding.reminders").countDocuments({ item: tracking, status: { $ne: "cancelled" } })).toBe(0);
    });
  }
}
for (const kind of ["event", "place", "product"]) {
  test(`${kind} proposal preserves edits through confirmation and fresh login`, async () => {
    const { app, a, at, input, item } = await setup();
    await app.post("review/revise", { ...input, ...item, kind, summary: `Follow up on ${kind}` });
    await app.post("review/confirm", { session: a.session, ...item, at });
    const fresh = testApplication(store.db);
    const login = await fresh.post("start", a.credentials);
    const saved = await fresh.post("saved/get", { session: login.session, collection: item.collection });
    expect(saved.item.interpretationRow.kind).toBe(kind);
    expect(saved.item.interpretationRow.summary).toBe(`Follow up on ${kind}`);
    expect(saved.item.trackingRow.status).toBe("pending");
    expect(saved.item.reminderRow.at).toBe(at);
  });
}
for (const [field, value] of [
  ["summary", " "], ["summary", "x".repeat(241)], ["kind", "unsupported"],
  ["content", " "], ["content", "x".repeat(20001)],
  ["relevantAt", "2026-02-30T12:00:00Z"], ["collectedAt", "2026-10-26T24:00:00Z"],
] as const) {
  test(`invalid capture ${field} (${String(value).slice(0, 30)}) leaves no orphan collection`, async () => {
    const { app, a, input, item } = await setup();
    const before = await app.post("library/list", { session: a.session });
    await app.post("captions/add", { ...input, item: crypto.randomUUID(), [field]: value }, 400);
    expect(await app.post("library/list", { session: a.session })).toEqual(before);
    expect(before.book.items[0].collection).toBe(item.collection);
  });
}
test("due reminder refuses reschedule without altering the scheduled instant", async () => {
  const { app, a, at, item, read } = await setup();
  const { tracking } = await app.post("review/confirm", { session: a.session, ...item, at: new Date(0).toISOString() });
  await app.post("sweep/tick", { session: a.session }); const before = await read();
  await app.post("saved/reschedule", { session: a.session, collection: item.collection, tracking, at }, 409);
  expect(await read()).toEqual(before);
  expect(before.item.reminderRow.status).toBe("due");
});
test("concurrent complete and dismiss produce one resolution and cancel its reminder", async () => {
  const { app, a, at, item, read } = await setup();
  const { tracking } = await app.post("review/confirm", { session: a.session, ...item, at });
  const results = await Promise.all(["complete", "dismiss"].map(async action => app.api(new Request(`http://localhost/api/recall/saved/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session: a.session, collection: item.collection, tracking }) }))));
  expect(results.map(r => r.status).sort()).toEqual([200, 409]);
  expect(["completed", "dismissed"]).toContain((await read()).item.trackingRow.status);
  expect(await app.Reminding._byItem({ user: a.user, item: tracking })).toEqual([]);
});
test("session expiry at the exact boundary blocks HTTP reads and mutations without data loss", async () => {
  let now = new Date("2026-10-26T12:00:00Z");
  const app = testApplication(store.db, () => now); const a = await app.account();
  const item = await app.post("captions/add", { session: a.session, item: crypto.randomUUID(), content: "Concert", kind: "event", summary: "Buy tickets", collectedAt: now.toISOString(), relevantAt: "2030-01-01T00:00:00Z" });
  now = new Date(now.getTime() + 30 * 60000 - 1);
  expect((await app.post("library/list", { session: a.session })).book.items).toHaveLength(1);
  now = new Date(now.getTime() + 1);
  await app.post("library/list", { session: a.session }, 401);
  await app.post("saved/delete", { session: a.session, collection: item.collection }, 401);
  expect(await app.Collecting._byOwner({ user: a.user })).toHaveLength(1);
  const login = await app.post("start", a.credentials);
  expect((await app.post("saved/get", { session: login.session, collection: item.collection })).item.collection).toBe(item.collection);
});
test("caller-supplied user fields cannot impersonate a different collection owner", async () => {
  const app = testApplication(store.db); const a = await app.account(); const b = await app.account();
  const item = await app.post("captions/add", { session: a.session, user: b.user, item: crypto.randomUUID(), content: "Product", kind: "product", summary: "Compare this product", collectedAt: new Date().toISOString(), relevantAt: "2030-01-01T00:00:00Z" });
  expect((await app.post("library/list", { session: a.session, user: b.user })).book.items[0].collection).toBe(item.collection);
  expect((await app.post("library/list", { session: b.session, user: a.user })).book.items).toEqual([]);
  await app.post("review/get", { session: b.session, user: a.user, collection: item.collection }, 404);
  await app.post("saved/delete", { session: b.session, user: a.user, collection: item.collection }, 403);
  expect(await app.Collecting._byId({ collection: item.collection })).toMatchObject([{ owner: a.user }]);
});
