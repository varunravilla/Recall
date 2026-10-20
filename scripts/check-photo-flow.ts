import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createPhotoHandler } from "../src/photos/http.ts";
import { geminiConfig } from "../src/photos/config.ts";
const mongo = await MongoMemoryServer.create();
process.env.MONGODB_URL = mongo.getUri("recall-live-photo-test");
const { assembleApplication } = await import("../src/assembly.ts");
const { client } = await import("../src/db.ts");
try {
  await client.connect();
  const gateway = createGateway({ application: assembleApplication() });
  const api = createPhotoHandler({ gateway });
  const account = await gateway.invoke("/recall/register", { username: "live_fixture_user", password: "temporary-fixture-password" });
  assert(account.ok, "Fixture registration failed");
  const session = (account.value as { session: string }).session;
  async function upload(name: string) {
    const form = new FormData(); form.set("session", session); form.set("consent", "gemini"); form.set("timezone", "America/New_York");
    form.set("image", new Blob([await Bun.file(new URL(`../tests/fixtures/${name}.png`, import.meta.url)).arrayBuffer()], { type: "image/png" }), "fixture.png");
    const response = await api(new Request("http://localhost/api/recall/photos/import", { method: "POST", body: form }));
    const result = await response.json() as Record<string, unknown>;
    assert.equal(response.status, 200, String(result.error ?? "Import failed"));
    return result;
  }
  const added = await upload("future-concert"); assert.equal(added.status, "added");
  const response = await api(new Request("http://localhost/api/recall/photos/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session, collection: added.collection }) }));
  assert.equal(response.status, 200);
  const bytes = await response.arrayBuffer();
  assert.deepEqual(new Uint8Array(bytes), new Uint8Array(await Bun.file(new URL("../tests/fixtures/future-concert.png", import.meta.url)).arrayBuffer()));
  const duplicate = await upload("future-concert"); assert.equal(duplicate.status, "duplicate");
  await new Promise(resolve => setTimeout(resolve, 6500));
  const skipped = await upload("expired-concert"); assert.equal(skipped.status, "skipped");
  const library = await gateway.invoke("/recall/library/list", { session }); assert(library.ok);
  assert.equal((library.value as { book: { items: unknown[] } }).book.items.length, 1);
  const report = { checkedAt: new Date().toISOString(), model: geminiConfig().model, status: "PASS", futureImage: added, repeatedImage: duplicate.status, expiredImage: skipped, persistedImageBytes: bytes.byteLength, savedItemCount: 1, note: "Real Gemini + multipart handler + authored compositions + temporary MongoDB. Synthetic images only; no personal photos or credentials in this record." };
  await Bun.write("docs/validation/photos-live.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} finally { await client.close(); await mongo.stop(); }
