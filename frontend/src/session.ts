import { startSession } from "./api.ts";

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
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(PHOTOS_KEY);
}

/** Reuse session when the same name is already signed in this browser tab. */
export async function ensureSession(user: string): Promise<{ session: string } | { error: string }> {
  const trimmed = user.trim();
  if (!trimmed) return { error: "Enter your name." };

  const existingSession = getSession();
  const existingUser = getUser();
  if (existingSession && existingUser === trimmed) {
    return { session: existingSession };
  }

  revokePhotosAccess();
  const started = await startSession(trimmed);
  if ("error" in started) return { error: started.error };
  setSession(started.session, trimmed);
  return { session: started.session };
}
