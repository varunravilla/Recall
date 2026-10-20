import { geminiConfig } from "./config.ts";
import type { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createGeminiAnalyzer, createGeminiBatchAnalyzer, exclusionReason, parseAnalysis, parseBatch, PhotoImportError, type AnalyzePhoto, type AnalyzePhotos } from "./gemini.ts";
import { MAX_IMAGE_BYTES, MAX_PHOTOS_PER_BATCH, MAX_BATCH_IMAGE_BYTES, MAX_IMPORT_BODY_BYTES, validImage } from "./image.ts";
import { PhotoPacer } from "./pacing.ts";
type Gateway = ReturnType<typeof createGateway>;
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => Response.json(body, { status, headers: { "Cache-Control": "no-store", ...extra } });
export function createPhotoHandler({ gateway, analyze = createGeminiAnalyzer(), analyzeBatch = createGeminiBatchAnalyzer(), clock = () => new Date(), configured = () => !!geminiConfig().apiKey }: {
  gateway: Gateway; analyze?: AnalyzePhoto; analyzeBatch?: AnalyzePhotos; clock?: () => Date; configured?: () => boolean;
}) {
  const activeUsers = new Set<string>();
  const pacer = new PhotoPacer(clock, () => geminiConfig().requestsPerMinute);
  return async (request: Request): Promise<Response> => {
    let lockedUser: string | undefined;
    try {
      const path = new URL(request.url).pathname;
      if (request.method !== "POST") return json({ error: "Use POST." }, 405);
      if (["/api/recall/photos/add", "/api/recall/photos/found"].includes(path)) return json({ error: "Use the photo import endpoint." }, 404);
      const length = Number(request.headers.get("content-length"));
      if (length > MAX_IMPORT_BODY_BYTES) return json({ error: "The optimized image is too large." }, 413);
      const isBatch = path === "/api/recall/photos/import-batch";
      const multipart = isBatch || path === "/api/recall/photos/import";
      const body = multipart ? await request.formData() : await request.json() as Record<string, unknown>;
      const field = (key: string) => body instanceof FormData ? body.get(key) : body[key];
      const session = field("session");
      if (typeof session !== "string") return json({ error: "Log in before importing photos." }, 401);
      const current = await gateway.invoke("/recall/current", { session });
      if (!current.ok) return json({ error: "Your session ended. Log in again." }, 401);
      const user = (current.value as { user: string }).user;
      if (path === "/api/recall/photos/status") return json({ configured: configured(), model: geminiConfig().model, batchSize: MAX_PHOTOS_PER_BATCH, nextRequestInMs: pacer.remainingMs() });
      if (path === "/api/recall/photos/image") {
        const collection = field("collection");
        if (typeof collection !== "string") return json({ error: "Choose a saved image." }, 400);
        const result = await gateway.invoke("/recall/photos/get", { session, collection });
        if (!result.ok) return json({ error: "Image not found." }, 404);
        const image = result.value as { imageData: string; mimeType: string };
        return new Response(Buffer.from(image.imageData, "base64"), { headers: { "Content-Type": image.mimeType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
      }
      if (!multipart) return json({ error: "Not found." }, 404);
      if (field("consent") !== "gemini") return json({ error: "Confirm that selected images may be sent to Google Gemini." }, 400);
      if (!configured()) return json({ error: "Gemini is not configured. Add GEMINI_API_KEY on the server." }, 503);
      const files = isBatch ? (body as FormData).getAll("images") : [field("image")];
      let ids: unknown = isBatch ? JSON.parse(String(field("ids"))) : ["single"];
      if (!files.length || files.length > MAX_PHOTOS_PER_BATCH || !Array.isArray(ids) || ids.length !== files.length ||
          ids.some(id => typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(id)) || new Set(ids).size !== ids.length)
        return json({ error: "Choose up to ten photos with unique ids." }, 400);
      const imageIds = ids as string[];
      if (files.reduce<number>((total, file) => total + (file instanceof File ? file.size : 0), 0) > MAX_BATCH_IMAGE_BYTES)
        return json({ error: "The optimized batch is too large." }, 413);
      let timezone = field("timezone");
      if (typeof timezone !== "string" || timezone.length > 100) return json({ error: "Choose a valid timezone." }, 400);
      try { new Intl.DateTimeFormat("en", { timeZone: timezone }).format(); }
      catch { return json({ error: "Choose a valid timezone." }, 400); }
      if (activeUsers.has(user)) return json({ error: "Another photo is being processed. Retry shortly." }, 409);
      activeUsers.add(user); lockedUser = user;
      type Result = { id: string; status: string; reason: string; collection?: string; caption?: string; summary?: string; relevantAt?: string | null };
      const results = new Map<string, Result>();
      const pending: Array<{ id: string; item: string; imageData: string; mimeType: string }> = [];
      const hashes = new Map<string, string>();
      const aliases = new Map<string, string>();
      for (let i = 0; i < files.length; i++) {
        const file = files[i]; const id = imageIds[i]!;
        if (!(file instanceof File) || file.size > MAX_IMAGE_BYTES) {
          if (!isBatch) return json({ error: "Choose an optimized PNG, JPEG, or WebP image up to 2 MB." }, 400);
          results.set(id, { id, status: "failed", reason: "This optimized image is too large or unsupported." }); continue;
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (!validImage(bytes, file.type)) {
          if (!isBatch) return json({ error: "This file is not a supported image." }, 400);
          results.set(id, { id, status: "failed", reason: "This file is not a supported image." }); continue;
        }
        const item = `photo:${new Bun.CryptoHasher("sha256").update(bytes).digest("hex")}`;
        const first = hashes.get(item);
        if (first) { aliases.set(id, first); continue; }
        hashes.set(item, id);
        const duplicate = await gateway.invoke("/recall/photos/find", { session, item });
        if (duplicate.ok) { results.set(id, { id, status: "duplicate", collection: (duplicate.value as { collection: string }).collection, reason: "This image is already saved." }); continue; }
        pending.push({ id, item, imageData: Buffer.from(bytes).toString("base64"), mimeType: file.type });
      }
      if (pending.length) {
        pacer.begin();
        let analyses: Awaited<ReturnType<AnalyzePhotos>>;
        try {
          analyses = isBatch ? await analyzeBatch({ images: pending, now: clock(), timezone }) :
            [{ id: pending[0]!.id, analysis: await analyze({ ...pending[0]!, now: clock(), timezone }) }];
        } catch (error) {
          if (error instanceof PhotoImportError && error.status === 429)
            throw new PhotoImportError(error.message, 429, pacer.limited(error.retryAfter));
          throw error;
        }
        // Validate the entire id set before storing anything. Never zip by order.
        const verified = parseBatch({ results: analyses.map(r => ({ ...r.analysis, id: r.id })) }, pending.map(p => p.id));
        const byId = new Map(verified.map(r => [r.id, r.analysis]));
        pacer.success();
        for (const image of pending) {
          const analysis = parseAnalysis(byId.get(image.id));
          const reason = exclusionReason(analysis, clock());
          if (reason) { results.set(image.id, { id: image.id, status: "skipped", reason }); continue; }
          // Each write re-authenticates after inference; logout cannot write a find.
          const result = await gateway.invoke(analysis.relevantAt === null ? "/recall/photos/found" : "/recall/photos/add", {
            session, item: image.item, content: analysis.caption.trim(), collectedAt: clock(), imageData: image.imageData, mimeType: image.mimeType,
            kind: analysis.kind, summary: analysis.summary.trim(), ...(analysis.relevantAt === null ? {} : { relevantAt: new Date(analysis.relevantAt) }),
          });
          if (!result.ok) {
            const duplicate = await gateway.invoke("/recall/photos/find", { session, item: image.item });
            if (duplicate.ok) results.set(image.id, { id: image.id, status: "duplicate", collection: (duplicate.value as { collection: string }).collection, reason: "This image is already saved." });
            else results.set(image.id, { id: image.id, status: "failed", reason: "Could not save this photo. Check your session and retry." });
          } else results.set(image.id, { id: image.id, status: "added", ...result.value as object, caption: analysis.caption, summary: analysis.summary, relevantAt: analysis.relevantAt, reason: analysis.reason });
        }
      }
      for (const [id, first] of aliases) {
        const original = results.get(first)!;
        results.set(id, { ...original, id, status: ["added", "duplicate"].includes(original.status) ? "duplicate" : original.status, reason: ["added", "duplicate"].includes(original.status) ? "Same image as another selected photo." : original.reason });
      }
      const ordered = imageIds.map(id => results.get(id)!);
      if (isBatch) return json({ results: ordered, nextRequestInMs: pacer.remainingMs() });
      const { id: _, ...result } = ordered[0]!;
      if (result.status === "failed") return json({ error: result.reason }, 409);
      return json(result);
    } catch (error) {
      if (error instanceof PhotoImportError) return json({ error: error.message, retryAfter: error.retryAfter }, error.status, error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {});
      return json({ error: "The photo request could not be processed. Retry this file." }, 400);
    } finally { if (lockedUser) activeUsers.delete(lockedUser); }
  };
}
