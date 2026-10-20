import { PhotoImportError } from "./gemini.ts";

// One scheduler per server process/API key, shared by accounts and import routes.
export class PhotoPacer {
  private until = 0;
  private failures = 0;
  constructor(private clock: () => Date, private rpm: () => number | null = () => null) {}
  remainingMs() { return Math.max(0, this.until - this.clock().getTime()); }
  begin() {
    if (this.remainingMs()) throw new PhotoImportError("Waiting for the next Gemini request window.", 429, Math.ceil(this.remainingMs() / 1000));
    const rpm = this.rpm();
    if (rpm && Number.isFinite(rpm) && rpm > 0) this.until = this.clock().getTime() + Math.ceil(60000 / rpm);
  }
  limited(retryAfter?: number) {
    this.failures++;
    const seconds = retryAfter && retryAfter > 0 ? retryAfter : Math.min(300, 30 * 2 ** Math.min(this.failures, 4));
    this.until = Math.max(this.until, this.clock().getTime() + seconds * 1000);
    return Math.ceil(this.remainingMs() / 1000);
  }
  success() { this.failures = 0; }
}
