import type { Db } from "mongodb";

/** Older HTTP writes stored ISO strings. Convert only parseable legacy values. */
export async function normalizeStoredDates(db: Db) {
  const changes: Record<string, number> = {};
  for (const [collection, field] of [
    ["collecting.collections", "collectedAt"],
    ["interpreting.interpretations", "relevantAt"],
    ["reminding.reminders", "at"],
  ] as const) {
    const parsed = { $convert: { input: `$${field}`, to: "date", onError: null, onNull: null } };
    const result = await db.collection(collection).updateMany(
      { [field]: { $type: "string" }, $expr: { $ne: [parsed, null] } },
      [{ $set: { [field]: parsed } }],
    );
    changes[`${collection}.${field}`] = result.modifiedCount;
  }
  return changes;
}
