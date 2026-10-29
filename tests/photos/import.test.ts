import { afterAll, beforeAll, expect, test } from "bun:test";
import { assemble } from "@mit-sdg/sync-engine/assembly";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { applicationConceptSet } from "../../src/concepts.ts";
import { composition as Recall } from "../../src/compositions/Recall.ts";
import { composition as Sessions } from "../../src/compositions/Sessions.ts";
import { AuthenticatingConcept } from "../../src/concepts/Authenticating.ts";
import { CollectingConcept } from "../../src/concepts/Collecting.ts";
import { InterpretingConcept } from "../../src/concepts/Interpreting.ts";
import { TrackingConcept } from "../../src/concepts/Tracking.ts";
import { RemindingConcept } from "../../src/concepts/Reminding.ts";
import { SessioningConcept } from "../../src/concepts/Sessioning.ts";
import { createPhotoHandler } from "../../src/photos/http.ts";
import { PhotoImportError, type AnalyzePhoto, type AnalyzePhotos, type PhotoAnalysis } from "../../src/photos/gemini.ts";
import { openTestDb, type TestDb } from "../helpers/db.ts";
let store: TestDb;
const now = new Date("2026-10-18T16:00:00Z");
const future: PhotoAnalysis = { actionable: true, caption: "The Late Train concert, Cambridge", kind: "event", summary: "Buy The Late Train tickets", relevantAt: "2026-11-01T15:00:00Z", expiresAt: "2026-11-15T04:00:00Z", dateConfidence: "explicit", reason: "Upcoming ticket sale." };
const fixture = new Uint8Array(await Bun.file(new URL("../fixtures/future-concert.png", import.meta.url)).arrayBuffer());
beforeAll(async () => { store = await openTestDb(); }, 120000);
afterAll(async () => { await store?.close(); });
function setup(analyze: AnalyzePhoto, clock = () => now, analyzeBatch?: AnalyzePhotos) {
  const collecting = new CollectingConcept(store.db);
  const application = assemble({ conceptSet: applicationConceptSet, instances: {
    Authenticating: new AuthenticatingConcept(store.db), Sessioning: new SessioningConcept(), Collecting: collecting,
    Interpreting: new InterpretingConcept(store.db), Tracking: new TrackingConcept(store.db), Reminding: new RemindingConcept(store.db),
  }, composition: { Recall, Sessions } });
  const gateway = createGateway({ application });
  const handle = createPhotoHandler({ gateway, analyze, analyzeBatch, clock, configured: () => true });
  async function invoke(path: string, payload: Record<string, unknown>): Promise<any> {
    const result = await gateway.invoke(path, payload);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    return result.value;
  }
  async function account() {
    const credentials = { username: `u_${crypto.randomUUID().slice(0, 8)}`, password: "safe-test-password-123" };
    return { ...await invoke("/recall/register", credentials), credentials };
  }
  function upload(session: string, options: { consent?: string; timezone?: string; data?: Uint8Array; mime?: string } = {}) {
    const form = new FormData();
    form.set("session", session); form.set("consent", options.consent ?? "gemini"); form.set("timezone", options.timezone ?? "America/New_York");
    form.set("image", new Blob([new Uint8Array(options.data ?? fixture)], { type: options.mime ?? "image/png" }), "fixture.png");
    return handle(new Request("http://localhost/api/recall/photos/import", { method: "POST", body: form }));
  }
  function image(session: string, collection: string) {
    return handle(new Request("http://localhost/api/recall/photos/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session, collection }) }));
  }
  return { gateway, collecting, invoke, account, upload, image, handle };
}
test("generated import persists caption, action, time and image; deduplicates before AI; survives restart and isolates owners", async () => {
  let calls = 0;
  const app = setup(async () => { calls++; return future; });
  const alice = await app.account(); const bob = await app.account();
  const response = await app.upload(alice.session);
  expect(response.status).toBe(200);
  const result = await response.json() as any;
  expect(result.status).toBe("added");
  const review = await app.invoke("/recall/review/get", { session: alice.session, collection: result.collection });
  expect(review.content).toBe(future.caption); expect(review.summary).toBe(future.summary); expect(new Date(review.relevantAt)).toEqual(new Date(future.relevantAt!));
  const image = await app.image(alice.session, result.collection);
  expect(image.status).toBe(200); expect(image.headers.get("Cache-Control")).toContain("no-store");
  expect(new Uint8Array(await image.arrayBuffer())).toEqual(fixture);
  expect((await app.image(bob.session, result.collection)).status).toBe(404);
  const duplicate = await (await app.upload(alice.session)).json() as any;
  expect(duplicate.status).toBe("duplicate"); expect(calls).toBe(1);
  const library = await app.invoke("/recall/library/list", { session: alice.session });
  expect(library.book.items).toHaveLength(1); expect(JSON.stringify(library)).not.toContain("imageData");
  const fresh = setup(async () => future);
  const login = await fresh.invoke("/recall/start", alice.credentials);
  expect((await fresh.image(login.session, result.collection)).status).toBe(200);
  expect(await fresh.collecting._photo({ user: bob.user, collection: result.collection })).toEqual([]);
  await fresh.collecting.remove({ user: alice.user, collection: result.collection });
  expect((await fresh.image(login.session, result.collection)).status).toBe(404);
});
test("expired, irrelevant and uncertain photos write neither image nor collection", async () => {
  let analysis = future;
  const app = setup(async () => analysis); const account = await app.account();
  for (const patch of [{ actionable: false }, { expiresAt: "2026-01-01T00:00:00Z" }, { relevantAt: "2026-01-01T00:00:00Z" }, { dateConfidence: "uncertain" }, { expiresAt: null }]) {
    analysis = { ...future, ...patch } as PhotoAnalysis;
    expect((await (await app.upload(account.session)).json() as any).status).toBe("skipped");
    expect(await app.collecting._byOwner({ user: account.user })).toEqual([]);
  }
});
test("bad sessions, consent, timezone and forged files are rejected before inference; raw AddPhoto HTTP is blocked", async () => {
  let calls = 0; const app = setup(async () => { calls++; return future; }); const account = await app.account();
  expect((await app.upload("forged")).status).toBe(401);
  expect((await app.upload(account.session, { consent: "no" })).status).toBe(400);
  expect((await app.upload(account.session, { timezone: "Not/A_Timezone" })).status).toBe(400);
  expect((await app.upload(account.session, { data: new TextEncoder().encode("<html>fake image</html>") })).status).toBe(400);
  expect((await app.upload(account.session, { data: new Uint8Array(2 * 1024 * 1024 + 1) })).status).toBe(400);
  expect((await app.handle(new Request("http://localhost/api/recall/photos/add", { method: "POST" }))).status).toBe(404);
  expect((await app.handle(new Request("http://localhost/api/recall/photos/found", { method: "POST" }))).status).toBe(404);
  expect(calls).toBe(0); expect(await app.collecting._byOwner({ user: account.user })).toEqual([]);
});
test("provider quota failure leaves nothing stored and supplies retry guidance", async () => {
  const app = setup(async () => { throw new PhotoImportError("Quota exhausted", 429, 90); }); const account = await app.account();
  const response = await app.upload(account.session);
  expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("90");
  expect(await app.collecting._byOwner({ user: account.user })).toEqual([]);
});
test("deadline is checked again after slow inference", async () => {
  let time = new Date(now);
  const app = setup(async () => { time = new Date("2026-12-01T00:00:00Z"); return future; }, () => time);
  const account = await app.account();
  expect((await (await app.upload(account.session)).json() as any).status).toBe("skipped");
  expect(await app.collecting._byOwner({ user: account.user })).toEqual([]);
});
test("simultaneous uploads from one account cannot race duplicate creation", async () => {
  let release!: () => void; let started!: () => void;
  const barrier = new Promise<void>(resolve => release = resolve); const entered = new Promise<void>(resolve => started = resolve);
  const app = setup(async () => { started(); await barrier; return future; }); const account = await app.account();
  const first = app.upload(account.session); await entered;
  expect((await app.upload(account.session)).status).toBe(409);
  release(); expect((await first).status).toBe(200);
  expect(await app.collecting._byOwner({ user: account.user })).toHaveLength(1);
});

test("undated finds retain image and caption without a reminder or fabricated date", async () => {
  const app = setup(async () => ({ ...future, kind: "product", summary: "Consider these headphones", relevantAt: null, expiresAt: null, dateConfidence: "uncertain" }));
  const user = await app.account();
  const result = await (await app.upload(user.session)).json() as any;
  expect(result.status).toBe("added");
  expect(result.relevantAt).toBeNull();
  const library = await app.invoke("/recall/library/list", { session: user.session });
  const row = library.book.items.find((item: any) => item.collection === result.collection);
  expect(row.content).toBe(future.caption);
  expect(row.interpretationRow.status).toBe("confirmed");
  expect(row.interpretationRow.relevantAt).toBeNull();
  expect(row.trackingRow?.tracking).toBeFalsy();
  expect(row.reminderRow?.reminder).toBeFalsy();
  expect((await app.image(user.session, result.collection)).status).toBe(200);
  const inbox = await app.invoke("/recall/inbox/list", { session: user.session });
  expect(inbox.book.due).toHaveLength(0);
});

test("a yearless event with inferred past dates persists as a dated proposal with its source image", async () => {
  const app = setup(async () => ({ ...future, dateYearMissing: true, caption: "October 1 concert, no year shown",
    relevantAt: "2026-10-01T10:00:00Z", expiresAt: "2026-10-01T23:00:00Z" }));
  const account = await app.account();
  const response = await app.upload(account.session);
  expect(response.status).toBe(200);
  const result = await response.json() as any;
  expect(result.status).toBe("added"); expect(result.relevantAt).toBe("2027-10-01T04:00:00.000Z");
  const saved = await app.invoke("/recall/saved/get", { session: account.session, collection: result.collection });
  expect(saved.item.interpretationRow.status).toBe("proposed");
  expect(new Date(saved.item.interpretationRow.relevantAt).toISOString()).toBe("2027-10-01T04:00:00.000Z");
  expect(saved.item.trackingRow?.tracking ?? null).toBeNull();
  expect(saved.item.reminderRow?.reminder ?? null).toBeNull();
  expect((await app.image(account.session, result.collection)).status).toBe(200);
});

test("batch distinguishes a yearless date from an explicitly expired year", async () => {
  const past = { ...future, relevantAt: "2025-10-01T10:00:00Z", expiresAt: "2025-10-01T23:00:00Z" };
  const app = setup(async () => future, () => now, async ({ images }) => images.map((image, index) => ({
    id: image.id, analysis: { ...past, dateYearMissing: index === 0 },
  })));
  const account = await app.account();
  const form = new FormData();
  form.set("session", account.session); form.set("consent", "gemini"); form.set("timezone", "UTC");
  form.set("ids", JSON.stringify(["yearless", "explicit"]));
  form.append("images", new Blob([fixture], { type: "image/png" }), "yearless.png");
  form.append("images", new Blob([await Bun.file(new URL("../fixtures/expired-concert.png", import.meta.url)).arrayBuffer()], { type: "image/png" }), "explicit.png");
  const response = await app.handle(new Request("http://localhost/api/recall/photos/import-batch", { method: "POST", body: form }));
  expect(response.status).toBe(200);
  const result = await response.json() as any;
  expect(result.results.map((row: any) => row.status)).toEqual(["added", "skipped"]);
  expect(result.results[0].relevantAt).toBe("2027-10-01T00:00:00.000Z");
  expect(result.results[1].reason).toContain("expired");
  expect(await app.collecting._byOwner({ user: account.user })).toHaveLength(1);
});

// Inference can finish after logout. The second session check must prevent storage.
test("logout during inference writes neither a dated item nor an undated find", async () => {
  for (const undated of [false, true]) {
    let session = "";
    const app = setup(async () => {
      await app.invoke("/recall/end", { session });
      return undated ? { ...future, relevantAt: null, expiresAt: null, dateConfidence: "uncertain" } : future;
    });
    const user = await app.account(); session = user.session;
    expect((await app.upload(session)).status).toBe(409);
    expect(await app.collecting._byOwner({ user: user.user })).toEqual([]);
  }
});

function batchRequest(session: string, images: Array<{ id: string; data: Uint8Array }>, consent = "gemini") {
  const form = new FormData();
  form.set("session", session); form.set("timezone", "America/New_York"); form.set("consent", consent);
  form.set("ids", JSON.stringify(images.map(i => i.id)));
  for (const image of images) form.append("images", new Blob([new Uint8Array(image.data)], { type: "image/png" }), "fixture.png");
  return new Request("http://localhost/api/recall/photos/import-batch", { method: "POST", body: form });
}
const expiredFixture = new Uint8Array(await Bun.file(new URL("../fixtures/expired-concert.png", import.meta.url)).arrayBuffer());
test("one batched AI call matches reversed results to source images and deduplicates within/across batches", async () => {
  let calls = 0;
  const app = setup(async () => { throw new Error("Single analyzer must not run"); }, () => now, async ({ images }) => {
    calls++; expect(images).toHaveLength(2);
    return [...images].reverse().map(i => ({ id: i.id, analysis: { ...future, caption: `Caption ${i.id}`, summary: `Find ${i.id}`, kind: "product", relevantAt: null, expiresAt: null } }));
  });
  const user = await app.account(); const other = await app.account();
  const images = [{ id: "a", data: fixture }, { id: "b", data: expiredFixture }, { id: "c", data: fixture }];
  const response = await app.handle(batchRequest(user.session, images));
  expect(response.status).toBe(200);
  const { results } = await response.json() as any;
  expect(results.map((r: any) => r.id)).toEqual(["a", "b", "c"]);
  expect(results.map((r: any) => r.status)).toEqual(["added", "added", "duplicate"]);
  for (let i = 0; i < 2; i++) {
    const row = await app.invoke("/recall/saved/get", { session: user.session, collection: results[i].collection });
    expect(row.item.content).toBe(`Caption ${images[i]!.id}`);
    expect(new Uint8Array(await (await app.image(user.session, results[i].collection)).arrayBuffer())).toEqual(images[i]!.data);
    expect((await app.image(other.session, results[i].collection)).status).toBe(404);
  }
  expect((await (await app.handle(batchRequest(user.session, images))).json() as any).results.every((r: any) => r.status === "duplicate")).toBe(true);
  expect(calls).toBe(1);
});
test("batch rejects bad ids/count/consent before AI and refuses unmatched results before any writes", async () => {
  let calls = 0;
  const app = setup(async () => future, () => now, async () => { calls++; return [{ id: "wrong", analysis: future }]; });
  const user = await app.account();
  for (const images of [[], Array.from({ length: 11 }, (_, i) => ({ id: String(i), data: fixture })), [{ id: "x", data: fixture }, { id: "x", data: expiredFixture }]])
    expect((await app.handle(batchRequest(user.session, images))).status).toBe(400);
  expect((await app.handle(batchRequest(user.session, [{ id: "x", data: fixture }], "no"))).status).toBe(400);
  expect(calls).toBe(0);
  expect((await app.handle(batchRequest(user.session, [{ id: "x", data: fixture }]))).status).toBe(502);
  expect(await app.collecting._byOwner({ user: user.user })).toEqual([]);
});
test("batch keeps per-image outcomes and rechecks authentication after inference", async () => {
  let logout: (() => Promise<unknown>) | undefined;
  const app = setup(async () => future, () => now, async ({ images }) => {
    await logout?.();
    return images.map(i => ({ id: i.id, analysis: i.id === "old" ? { ...future, expiresAt: "2020-01-01T00:00:00Z" } : { ...future, relevantAt: null, expiresAt: null } }));
  });
  const user = await app.account();
  const results = (await (await app.handle(batchRequest(user.session, [{ id: "find", data: fixture }, { id: "old", data: expiredFixture }, { id: "invalid", data: new Uint8Array([1, 2]) }]))).json() as any).results;
  expect(results.map((r: any) => r.status)).toEqual(["added", "skipped", "failed"]);
  const fresh = await app.account();
  logout = () => app.invoke("/recall/end", { session: fresh.session });
  const refused = (await (await app.handle(batchRequest(fresh.session, [{ id: "find", data: fixture }]))).json() as any).results;
  expect(refused[0].status).toBe("failed");
  expect(await app.collecting._byOwner({ user: fresh.user })).toEqual([]);
});
test("batch quota cooldown is shared across accounts and never discards input", async () => {
  let calls = 0;
  const app = setup(async () => future, () => now, async () => { calls++; throw new PhotoImportError("Quota exhausted", 429, 90); });
  const first = await app.account(); const second = await app.account();
  const response = await app.handle(batchRequest(first.session, [{ id: "x", data: fixture }]));
  expect(response.status).toBe(429); expect(response.headers.get("retry-after")).toBe("90");
  expect((await app.handle(batchRequest(second.session, [{ id: "y", data: fixture }]))).status).toBe(429);
  expect(calls).toBe(1);
  expect(await app.collecting._byOwner({ user: first.user })).toEqual([]);
});

test("ten distinct images share one request; oversized aggregate payloads never call AI", async () => {
  let calls = 0;
  const app = setup(async () => future, () => now, async ({ images }) => {
    calls++; expect(images).toHaveLength(10);
    return [...images].reverse().map(i => ({ id: i.id, analysis: { ...future, caption: `Image ${i.id}`, relevantAt: null, expiresAt: null } }));
  });
  const user = await app.account();
  const photos = Array.from({ length: 10 }, (_, i) => ({ id: String(i), data: new Uint8Array([...fixture, i]) }));
  const response = await app.handle(batchRequest(user.session, photos));
  expect(response.status).toBe(200);
  const results = (await response.json() as any).results;
  expect(results).toHaveLength(10);
  expect(results.every((r: any) => r.status === "added")).toBe(true);
  for (const result of results) expect(result.caption).toBe(`Image ${result.id}`);
  expect(calls).toBe(1);
  const tooLarge = Array.from({ length: 6 }, (_, i) => ({ id: String(i), data: new Uint8Array(2 * 1024 * 1024) }));
  expect((await app.handle(batchRequest(user.session, tooLarge))).status).toBe(413);
  expect(calls).toBe(1);
});
