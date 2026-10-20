export const MAX_PHOTOS_PER_BATCH = 10;
export const MAX_BATCH_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_BODY_BYTES = 12 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export function validImage(bytes: Uint8Array, mime: string): boolean {
  if (bytes.length < 12 || bytes.length > MAX_IMAGE_BYTES) return false;
  if (mime === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === "image/png") return Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === "image/webp") return Buffer.from(bytes.subarray(0,4)).toString() === "RIFF" && Buffer.from(bytes.subarray(8,12)).toString() === "WEBP";
  return false;
}
export function decodeImage(data: string, mime: string): Uint8Array | null {
  if (data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return null;
  const bytes = Buffer.from(data, "base64");
  return bytes.toString("base64") === data && validImage(bytes, mime) ? bytes : null;
}
