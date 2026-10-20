import { expect, test } from "bun:test";
import { PhotoPacer } from "../../src/photos/pacing.ts";

test("configured RPM shares a request window; unknown quotas do not add a fixed delay", () => {
  let time = 0;
  const fast = new PhotoPacer(() => new Date(time));
  fast.begin(); fast.success(); expect(fast.remainingMs()).toBe(0); fast.begin();
  const paced = new PhotoPacer(() => new Date(time), () => 10);
  paced.begin(); expect(paced.remainingMs()).toBe(6000);
  expect(() => paced.begin()).toThrow("request window");
  time = 6000; paced.begin(); expect(paced.remainingMs()).toBe(6000);
});
test("quota backoff honors provider hints, grows without them, and resets on success", () => {
  let time = 0;
  const pacer = new PhotoPacer(() => new Date(time));
  expect(pacer.limited()).toBe(60);
  time = 60000; expect(pacer.limited()).toBe(120);
  time += 120000; expect(pacer.limited(90)).toBe(90);
  time += 90000; pacer.success(); expect(pacer.limited()).toBe(60);
});
