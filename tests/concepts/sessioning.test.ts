import { expect, test } from "bun:test";
import { SessioningConcept, UnknownSession } from "../../src/concepts/Sessioning.ts";
test("session principle: start, resolve, expire without changing subject", () => {
  let now = 0;
  const sessions = new SessioningConcept(() => new Date(now));
  const { session } = sessions.start({ subject: "maya" });
  expect(sessions.current({ session }).subject).toBe("maya");
  expect(sessions._active({ session })).toHaveLength(1);
  now = 30 * 60 * 1000;
  expect(sessions._active({ session })).toEqual([]);
  expect(() => sessions.current({ session })).toThrow(UnknownSession);
  expect(() => sessions.end({ session })).toThrow(UnknownSession);
});
test("logout revokes exactly one session and repeated logout fails", () => {
  const sessions = new SessioningConcept();
  const a = sessions.start({ subject: "maya" });
  const b = sessions.start({ subject: "maya" });
  expect(sessions.end(a)).toEqual({ ended: true });
  expect(() => sessions.current(a)).toThrow(UnknownSession);
  expect(() => sessions.end(a)).toThrow(UnknownSession);
  expect(sessions.current(b).subject).toBe("maya");
  expect(() => sessions.current({ session: "forged" })).toThrow(UnknownSession);
});
