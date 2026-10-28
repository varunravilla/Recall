/** Runtime admission is explicit: specification DateTime types do not decode JSON. */
export function isInstant(value: unknown): boolean {
  if (value instanceof Date) return Number.isFinite(value.getTime());
  if (typeof value !== "string") return false;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!parts || !Number.isFinite(Date.parse(value))) return false;
  const [, year, month, day, hour, minute, second] = parts.map(Number);
  const leap = year! % 4 === 0 && (year! % 100 !== 0 || year! % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month! - 1] ?? 0;
  // Date.parse normalizes February 30 and 24:00, hiding a user's input error.
  return month! >= 1 && month! <= 12 && day! >= 1 && day! <= days && hour! < 24 && minute! < 60 && second! < 60;
}

export function inputContract(...fields: string[]) {
  return { input(value: unknown): { ok: true } | { ok: false; detail?: string } {
    if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, detail: "Expected an object." };
    const body = value as Record<string, unknown>;
    for (const field of fields) {
      const item = body[field];
      if (["at", "relevantAt", "collectedAt"].includes(field)) {
        if (!isInstant(item)) return { ok: false, detail: "Use an ISO timestamp with a timezone." };
      } else {
        const max = field === "imageData" ? 3 * 1024 * 1024 : field === "content" ? 20000 : field === "summary" ? 240 : field === "password" ? 128 : 512;
        if (typeof item !== "string" || !item.trim() || item.length > max)
          return { ok: false, detail: `Invalid ${field}.` };
        if (field === "kind" && !["event", "place", "product"].includes(item))
          return { ok: false, detail: "Choose event, place, or product." };
      }
    }
    return { ok: true };
  } };
}

export class InvalidTime extends Error {}
export function instant(value: Date): Date {
  if (!isInstant(value)) throw new InvalidTime("Use a valid timestamp with a timezone.");
  return new Date(value instanceof Date ? value.getTime() : Date.parse(value));
}
