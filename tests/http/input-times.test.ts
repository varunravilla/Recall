import { expect, test } from "bun:test";
import { isInstant, instant, InvalidTime } from "../../src/input.ts";
for (const value of [
  "2028-02-29T23:59:59Z", "2000-02-29T12:00:00Z", "2026-01-01T00:00:00.123Z",
  "2026-10-26T12:00:00+05:45", "2026-10-26T12:00:00-04:00", new Date(0),
]) test(`finite zoned timestamp accepted: ${String(value)}`, () => {
  expect(isInstant(value)).toBe(true);
  expect(instant(value as Date)).toEqual(new Date(value));
});
for (const [label, value] of [
  ["non-leap February 29", "2026-02-29T12:00:00Z"], ["non-leap century", "1900-02-29T12:00:00Z"], ["February 30", "2028-02-30T12:00:00Z"],
  ["April 31", "2026-04-31T12:00:00Z"], ["month zero", "2026-00-01T12:00:00Z"],
  ["month thirteen", "2026-13-01T12:00:00Z"], ["day zero", "2026-01-00T12:00:00Z"],
  ["24-hour rollover", "2026-01-01T24:00:00Z"], ["minute overflow", "2026-01-01T12:60:00Z"],
  ["second overflow", "2026-01-01T12:00:60Z"], ["missing timezone", "2026-01-01T12:00:00"],
  ["date only", "2026-01-01"], ["invalid Date", new Date(NaN)], ["null", null],
  ["numeric epoch", 0], ["empty", ""], ["object", {}], ["array", []],
] as const) test(`timestamp refuses ${label}`, () => {
  expect(isInstant(value)).toBe(false);
  expect(() => instant(value as Date)).toThrow(InvalidTime);
});
