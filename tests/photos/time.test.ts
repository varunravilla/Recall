import { expect, test } from "bun:test";
import { localTimeToIso } from "../../src/photos/time.ts";
test("server resolves daylight saving and fractional timezone offsets", () => {
  expect(localTimeToIso("2026-11-01T10:00:00", "America/New_York")).toBe("2026-11-01T15:00:00.000Z");
  expect(localTimeToIso("2026-10-18T10:00:00", "America/New_York")).toBe("2026-10-18T14:00:00.000Z");
  expect(localTimeToIso("2026-11-01T10:00:00", "Asia/Kolkata")).toBe("2026-11-01T04:30:00.000Z");
});
test("ambiguous, nonexistent and invalid local times are refused", () => {
  expect(localTimeToIso("2026-11-01T01:30:00", "America/New_York")).toBeNull();
  expect(localTimeToIso("2026-03-08T02:30:00", "America/New_York")).toBeNull();
  expect(localTimeToIso("2026-11-31T10:00:00", "America/New_York")).toBeNull();
  expect(localTimeToIso("2026-11-01T10:00:00", "Invalid/Timezone")).toBeNull();
});
