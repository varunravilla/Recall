import { expect, test } from "bun:test";
import { validateSourcePhoto, preparePhoto, MAX_PREPARED_PHOTO_BYTES } from "../../frontend/src/photos.ts";

test("photo selection accepts image formats and rejects empty, oversized or non-image files", () => {
  for (const type of ["image/png", "image/jpeg", "image/webp", "image/heic"]) expect(validateSourcePhoto({ type, size: 100 })).toBeNull();
  expect(validateSourcePhoto({ type: "text/html", size: 100 })).toContain("not a photo");
  expect(validateSourcePhoto({ type: "image/png", size: 0 })).toContain("non-empty");
  expect(validateSourcePhoto({ type: "image/png", size: 25 * 1024 * 1024 })).toBeNull();
  expect(validateSourcePhoto({ type: "image/png", size: 25 * 1024 * 1024 + 1 })).toContain("25 MB");
});

test("large source images are prepared small enough for a ten-photo request", async () => {
  const bitmapDescriptor = Object.getOwnPropertyDescriptor(globalThis, "createImageBitmap");
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  let closed = false; let encodes = 0;
  Object.defineProperty(globalThis, "createImageBitmap", { configurable: true, value: async () => ({ width: 2560, height: 1440, close() { closed = true; } }) });
  Object.defineProperty(globalThis, "document", { configurable: true, value: {
    createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillStyle: "", fillRect() {}, drawImage() {} }),
      toBlob(callback: (blob: Blob) => void) { encodes++; callback(new Blob([new Uint8Array(encodes === 1 ? MAX_PREPARED_PHOTO_BYTES + 1 : MAX_PREPARED_PHOTO_BYTES)])); },
    }),
  } });
  try {
    const source = new File([new Uint8Array(2 * 1024 * 1024)], "photo.png", { type: "image/png" });
    const result = await preparePhoto(source);
    expect(result.size * 10).toBeLessThanOrEqual(10 * 1024 * 1024);
    expect(closed).toBe(true);
  } finally {
    if (bitmapDescriptor) Object.defineProperty(globalThis, "createImageBitmap", bitmapDescriptor); else Reflect.deleteProperty(globalThis, "createImageBitmap");
    if (documentDescriptor) Object.defineProperty(globalThis, "document", documentDescriptor); else Reflect.deleteProperty(globalThis, "document");
  }
});
