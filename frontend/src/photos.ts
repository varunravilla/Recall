import { getSession } from "./session.ts";
// Ten new uploads fit the raw 10 MB batch budget before base64 expansion.
export const MAX_PREPARED_PHOTO_BYTES = 1024 * 1024;
export type ImportResult = { status: "added" | "skipped" | "duplicate"; reason: string; collection?: string; caption?: string; summary?: string; relevantAt?: string | null };
export class ImportFailure extends Error {
  constructor(message: string, public status = 0, public retryAfter = 60) { super(message); }
}
export async function photoStatus(): Promise<{ configured: boolean; nextRequestInMs?: number; batchSize?: number }> {
  const response = await fetch("/api/recall/photos/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session: getSession() }) });
  if (response.status === 401) { sessionStorage.removeItem("recall.session"); sessionStorage.removeItem("recall.user"); }
  if (!response.ok) throw new Error("Could not connect. Check your connection or log in again.");
  return response.json();
}
export function validateSourcePhoto(file: Pick<File, "size" | "type">): string | null {
  if (file.size <= 0 || file.size > 25 * 1024 * 1024) return "Choose a non-empty image up to 25 MB.";
  if (!file.type.startsWith("image/")) return "This file is not a photo. Export it as JPEG, PNG, or WebP.";
  return null;
}
export async function preparePhoto(file: File): Promise<Blob> {
  const invalid = validateSourcePhoto(file);
  if (invalid) throw new Error(invalid);
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error("This image cannot be read by this browser. Export it as JPEG or PNG and retry."); }
  try {
    if (bitmap.width * bitmap.height > 40000000) throw new Error("This photo is too large to open. Export a smaller copy and retry.");
    if (["image/png", "image/jpeg", "image/webp"].includes(file.type) && file.size <= MAX_PREPARED_PHOTO_BYTES && Math.max(bitmap.width, bitmap.height) <= 2560) return file;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot prepare photos. Try another browser.");
    for (const edge of [2560, 1920, 1280]) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.9, 0.75, 0.6, 0.45]) {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
        if (blob && blob.size <= MAX_PREPARED_PHOTO_BYTES) return blob;
      }
    }
    throw new Error("This photo is still too large. Export a smaller JPEG and retry.");
  } finally { bitmap.close(); }
}
function importErrorMessage(status: number): string {
  if (status === 401) return "Your session ended. Log in again.";
  if (status === 429) return "Importing needs a short break. Your waiting photos are safe.";
  if (status === 409) return "Another import is running. Try again shortly.";
  if (status === 413) return "These photos are too large. Try smaller copies.";
  if (status === 502) return "Could not read these photos reliably. Please retry.";
  return "Photo import is unavailable. Please try again.";
}
export async function importPhoto(image: Blob, timezone: string, signal: AbortSignal): Promise<ImportResult> {
  const session = getSession();
  if (!session) throw new ImportFailure("Log in before importing photos.", 401);
  const body = new FormData();
  body.set("session", session); body.set("timezone", timezone); body.set("consent", "gemini"); body.set("image", image, "photo");
  const response = await fetch("/api/recall/photos/import", { method: "POST", body, signal });
  const data = await response.json();
  if (response.status === 401) { sessionStorage.removeItem("recall.session"); sessionStorage.removeItem("recall.user"); }
  if (!response.ok) throw new ImportFailure(importErrorMessage(response.status), response.status, data.retryAfter ?? 60);
  return data;
}

export type BatchImportResult = { id: string } & (ImportResult | { status: "failed"; reason: string });
export async function importPhotos(images: Array<{ id: string; image: Blob }>, timezone: string, signal: AbortSignal): Promise<{ results: BatchImportResult[]; nextRequestInMs: number }> {
  const session = getSession();
  if (!session) throw new ImportFailure("Log in before importing photos.", 401);
  const body = new FormData();
  body.set("session", session); body.set("timezone", timezone); body.set("consent", "gemini");
  body.set("ids", JSON.stringify(images.map(i => i.id)));
  for (const { image } of images) body.append("images", image, "photo");
  let response: Response;
  try { response = await fetch("/api/recall/photos/import-batch", { method: "POST", body, signal }); }
  catch { throw new ImportFailure("Could not reach photo analysis. Your files are still queued.", 503); }
  const data = await response.json().catch(() => null);
  if (response.status === 401) { sessionStorage.removeItem("recall.session"); sessionStorage.removeItem("recall.user"); }
  if (!response.ok) throw new ImportFailure(importErrorMessage(response.status), response.status, data?.retryAfter ?? 60);
  const results = data?.results as BatchImportResult[] | undefined;
  if (!Array.isArray(results) || results.length !== images.length || new Set(results.map(r => r?.id)).size !== images.length ||
      results.some(r => !r || !images.some(i => i.id === r.id) || !["added", "skipped", "duplicate", "failed"].includes(r.status)))
    throw new ImportFailure("Could not read these photos reliably. Please retry.", 502);
  return { results, nextRequestInMs: typeof data.nextRequestInMs === "number" && Number.isFinite(data.nextRequestInMs) ? Math.max(0, data.nextRequestInMs) : 0 };
}
