import { startSession, registerAccount, endSession } from "./api.ts";

const SESSION_KEY = "recall.session";
const USER_KEY = "recall.user";
const PHOTOS_KEY = "recall.photosAccess";

export function getSession(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

export function setSession(session: string, user: string) {
  sessionStorage.setItem(SESSION_KEY, session);
  sessionStorage.setItem(USER_KEY, user);
}

export function getUser(): string | null {
  return sessionStorage.getItem(USER_KEY);
}

export function hasPhotosAccess(): boolean {
  return sessionStorage.getItem(PHOTOS_KEY) === "granted";
}

export function grantPhotosAccess() {
  sessionStorage.setItem(PHOTOS_KEY, "granted");
}

export function revokePhotosAccess() {
  sessionStorage.removeItem(PHOTOS_KEY);
}

export function clearSession() {
  const session = getSession();
  if (session) void endSession(session);
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(PHOTOS_KEY);
}

/** Authenticate credentials before saving a new session in this tab. */
export async function ensureSession(user: string, password: string, register = false): Promise<{ session: string } | { error: string }> {
  const trimmed = user.trim();
  if (!trimmed) return { error: "Enter your username." };

  revokePhotosAccess();
  const started = await (register ? registerAccount(trimmed, password) : startSession(trimmed, password));
  if ("error" in started) return { error: started.error };
  setSession(started.session, trimmed);
  return { session: started.session };
}
