import { afterEach, beforeEach, expect, test } from "bun:test";
import { listLibrary, startSession, itemRoute, itemStatusLabel, type LibraryItem } from "../../frontend/src/api.ts";
import { ensureSession, setSession, getSession, getUser, clearSession, grantPhotosAccess, hasPhotosAccess } from "../../frontend/src/session.ts";
import { photoStatus, importPhotos, importPhoto, ImportFailure, type BatchImportResult } from "../../frontend/src/photos.ts";
const descriptors = new Map<string, PropertyDescriptor | undefined>();
let storage: Map<string, string>;
let calls: Array<{ url: string; init?: RequestInit }>;
let redirects: string[];
let response: () => Promise<Response>;
beforeEach(() => {
  storage = new Map(); calls = []; redirects = [];
  response = async () => Response.json({ book: { items: [] } });
  for (const key of ["fetch", "sessionStorage", "window"]) descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) } });
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { assign: (url: string) => redirects.push(url) } } });
  Object.defineProperty(globalThis, "fetch", { configurable: true, value: async (url: string, init?: RequestInit) => { calls.push({ url: String(url), init }); return response(); } });
});
afterEach(() => {
  for (const [key, descriptor] of descriptors) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key);
  }
});
const image = () => new Blob(["synthetic image"], { type: "image/png" });

test("JSON API sends session in a body, never in the URL, and reads a successful result", async () => {
  setSession("opaque-session", "alice");
  expect(await listLibrary(getSession()!)).toEqual({ book: { items: [] } });
  expect(calls[0]!.url).toBe("/api/recall/library/list");
  expect(calls[0]!.url).not.toContain("opaque-session");
  expect(JSON.parse(String(calls[0]!.init?.body))).toEqual({ session: "opaque-session" });
});
for (const body of ["", "<html>proxy error</html>"]) test(`API handles ${body ? "non-JSON" : "empty"} response without a parser error`, async () => {
  response = async () => new Response(body);
  expect(await listLibrary("session")).toEqual({ error: "Something went wrong. Please try again." });
});
test("network failure becomes a recoverable API message", async () => {
  response = async () => { throw new Error("private network details"); };
  expect(await listLibrary("session")).toEqual({ error: "Could not connect. Check your connection and try again." });
});
for (const [status, category, clue] of [
  [400, "INVALID_REQUEST", "details"], [403, "FORBIDDEN", "permission"],
  [404, "NOT_FOUND", "unavailable"], [409, "CONFLICT", "Refresh"], [500, "INTERNAL_ERROR", "try again"],
] as const) test(`HTTP ${status} gives a recovery message instead of ${category}`, async () => {
  response = async () => Response.json({ error: category }, { status });
  const result = await listLibrary("session");
  expect(result).toHaveProperty("error");
  expect((result as { error: string }).error).toContain(clue);
  expect((result as { error: string }).error).not.toContain(category);
});
test("protected 401 clears the expired identity and returns to login", async () => {
  setSession("expired", "alice"); response = async () => Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  expect(await listLibrary("expired")).toHaveProperty("error");
  expect(getSession()).toBeNull(); expect(getUser()).toBeNull(); expect(redirects).toEqual(["/"]);
});
test("wrong login does not redirect in a loop or erase a separate active session", async () => {
  setSession("active", "alice"); response = async () => Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  expect(await startSession("alice", "wrong-password-123")).toHaveProperty("error");
  expect(getSession()).toBe("active"); expect(redirects).toEqual([]);
});
for (const registration of [false, true]) test(`${registration ? "registration" : "login"} stores a session only after successful authentication`, async () => {
  grantPhotosAccess(); response = async () => Response.json({ session: "new-session", user: "account-id", expiresAt: "2030-01-01T00:00:00Z" });
  expect(await ensureSession(" alice ", "valid-password-123", registration)).toEqual({ session: "new-session" });
  expect(getUser()).toBe("alice"); expect(hasPhotosAccess()).toBe(false);
  expect(calls[0]!.url).toBe(registration ? "/api/recall/register" : "/api/recall/start");
});
test("blank account name never sends credentials", async () => {
  expect(await ensureSession("  ", "password")).toEqual({ error: "Enter your username." }); expect(calls).toEqual([]);
});
test("failed authentication does not store a forged session", async () => {
  response = async () => Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  expect(await ensureSession("alice", "bad-password-123")).toHaveProperty("error"); expect(getSession()).toBeNull();
});
test("logout clears local consent and identity and revokes the old token", async () => {
  setSession("old-token", "alice"); grantPhotosAccess(); response = async () => Response.json({ ended: true });
  clearSession();
  expect(getSession()).toBeNull(); expect(getUser()).toBeNull(); expect(hasPhotosAccess()).toBe(false);
  expect(calls[0]!.url).toBe("/api/recall/end");
  expect(JSON.parse(String(calls[0]!.init?.body))).toEqual({ session: "old-token" });
});
test("status response detects an unconfigured analyzer and expired status clears identity", async () => {
  setSession("session", "alice"); response = async () => Response.json({ configured: false, batchSize: 10 });
  expect((await photoStatus()).configured).toBe(false);
  response = async () => Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  await expect(photoStatus()).rejects.toThrow("log in"); expect(getSession()).toBeNull();
});
for (const batch of [false, true]) test(`${batch ? "batch" : "single"} import refuses a missing session before upload`, async () => {
  const operation = batch ? importPhotos([{ id: "one", image: image() }], "UTC", new AbortController().signal) : importPhoto(image(), "UTC", new AbortController().signal);
  await expect(operation).rejects.toBeInstanceOf(ImportFailure); expect(calls).toEqual([]);
});
for (const status of ["added", "skipped", "duplicate"]) test(`single-photo ${status} response survives transport unchanged`, async () => {
  setSession("session", "alice");
  const result = { status, reason: "Synthetic outcome", ...(status === "added" ? { collection: "saved", relevantAt: null } : {}) };
  response = async () => Response.json(result);
  expect(await importPhoto(image(), "UTC", new AbortController().signal)).toEqual(result as any);
});
test("multipart batch binds ids to images, sends consent, and preserves reversed response identities", async () => {
  setSession("session", "alice");
  const results: BatchImportResult[] = [{ id: "two", status: "skipped", reason: "Expired" }, { id: "one", status: "added", reason: "Useful", collection: "collection" }];
  response = async () => Response.json({ results, nextRequestInMs: -30 });
  const data = await importPhotos([{ id: "one", image: image() }, { id: "two", image: image() }], "America/New_York", new AbortController().signal);
  expect(data.results).toEqual(results); expect(data.nextRequestInMs).toBe(0);
  const form = calls[0]!.init?.body as FormData;
  expect(JSON.parse(String(form.get("ids")))).toEqual(["one", "two"]); expect(form.getAll("images")).toHaveLength(2);
  expect(form.get("session")).toBe("session"); expect(form.get("consent")).toBe("gemini"); expect(form.get("timezone")).toBe("America/New_York");
});
for (const [label, results] of [
  ["missing id", []], ["foreign id", [{ id: "other", status: "added" }]],
  ["unsupported status", [{ id: "one", status: "unknown" }]], ["null result", [null]],
  ["not an array", {}],
] as const) test(`batch response refuses ${label} instead of attaching an incorrect result`, async () => {
  setSession("session", "alice"); response = async () => Response.json({ results });
  await expect(importPhotos([{ id: "one", image: image() }], "UTC", new AbortController().signal)).rejects.toMatchObject({ status: 502 });
});
for (const batch of [false, true]) for (const status of [401, 409, 413, 429, 502, 503]) {
  test(`${batch ? "batch" : "single"} upload exposes recoverable ${status} with retry information`, async () => {
    setSession("session", "alice"); response = async () => Response.json({ error: "private provider details", retryAfter: 90 }, { status });
    const operation = batch ? importPhotos([{ id: "one", image: image() }], "UTC", new AbortController().signal) : importPhoto(image(), "UTC", new AbortController().signal);
    await expect(operation).rejects.toMatchObject({ status, retryAfter: 90 });
    if (status === 401) expect(getSession()).toBeNull();
  });
}
for (const batch of [false, true]) test(`${batch ? "batch" : "single"} upload survives a proxy HTML response without leaking it`, async () => {
  setSession("session", "alice"); response = async () => new Response("<html>private proxy details</html>");
  const operation = batch ? importPhotos([{ id: "one", image: image() }], "UTC", new AbortController().signal) : importPhoto(image(), "UTC", new AbortController().signal);
  await expect(operation).rejects.toMatchObject({ status: 502 });
});
for (const batch of [false, true]) test(`${batch ? "batch" : "single"} upload network failure preserves retry status`, async () => {
  setSession("session", "alice"); response = async () => { throw new Error("private network details"); };
  const operation = batch ? importPhotos([{ id: "one", image: image() }], "UTC", new AbortController().signal) : importPhoto(image(), "UTC", new AbortController().signal);
  await expect(operation).rejects.toMatchObject({ status: 503 });
});
for (const [state, expected] of [["proposed", "Suggested"], ["rejected", "Ignored"], ["confirmed", "Found"]]) {
  test(`undated ${state} item has an explicit ${expected} state and appropriate detail route`, () => {
    const item: LibraryItem = { collection: "c", content: "Cafe", collectedAt: "2030-01-01T00:00:00Z", interpretationRow: { interpretation: "i", kind: "place", summary: "Try cafe", relevantAt: null, status: state! } };
    expect(itemStatusLabel(item)).toBe(expected!); expect(itemRoute(item).path).toBe(state === "proposed" ? "/review/c" : "/saved/c");
  });
}
