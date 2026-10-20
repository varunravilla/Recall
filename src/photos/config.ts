import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
// Local .env is explicit for Gemini so stale inherited app variables cannot mask
// an edited key. Hosted deployments have no .env and use their secret variables.
export function geminiConfig(): { apiKey: string; model: string; requestsPerMinute: number | null } {
  const localPath = new URL("../../.env", import.meta.url);
  const local = existsSync(localPath) ? parseEnv(readFileSync(localPath, "utf8")) : {};
  const rpm = Number(local.GEMINI_REQUESTS_PER_MINUTE ?? process.env.GEMINI_REQUESTS_PER_MINUTE);
  return {
    requestsPerMinute: Number.isFinite(rpm) && rpm > 0 ? rpm : null,
    apiKey: (local.GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? "").trim(),
    model: (local.GEMINI_MODEL ?? process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL).trim(),
  };
}
