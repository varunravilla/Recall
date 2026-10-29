# Photo import: setup and behavior

The app has one import path: choose photos, allow analysis, and choose **Find my
saves**. It has no local OCR, keyword filters, or analysis-mode controls. Gemini
reads every valid new image, including screenshots without text or dates. Known
saved duplicates bypass another provider call.

## Server setup

Create a key in [Google AI Studio](https://aistudio.google.com/apikey) and set it
in the root `.env`, or the hosting platform's server environment:

```dotenv
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-3.5-flash-lite
# Optional: enter your actual project RPM allowance from AI Studio.
GEMINI_REQUESTS_PER_MINUTE=
```

Local `.env` values take precedence over inherited Gemini settings. Without that
file, deployments use environment variables. Never use `VITE_` for credentials.
Google's [pricing](https://ai.google.dev/gemini-api/docs/pricing) and project quotas
apply. Use a project without paid billing for free-tier-only use; the app cannot
change a paid project into a free one. There is no provider or paid-model fallback.
All dependencies are now in the root package; the frontend package has scripts only.

## Images, batches, and queue

- Source images can be up to 25 MB. Browser decoding determines format support;
  export JPEG if HEIC cannot open. Apple Photos must be exported to files or a
  folder; the browser cannot watch the native library.
- New copies target at most 1 MB each. JPEG encoding tries smaller dimensions if
  needed, starting at a longest edge of 2560 pixels. Originals are untouched.
  Existing stored images keep their original copies and remain readable.
- Up to ten images share one request. Their raw total is capped at 10 MB; the
  multipart body is capped at 12 MB. Base64 plus prompt/schema stays below the
  provider's 20 MB inline request limit. Legacy single-image import accepts up to
  2 MB for compatibility.
- One next batch prepares while current inference runs. At most twenty optimized
  copies are prepared at once. Pause finishes the active request and restores
  unsent prepared files. Navigating away pauses; reloading clears waiting files.
- A request-local id accompanies each image and result. Missing, duplicate or
  foreign ids reject the response before writes; results never match by position.
  Per-image validation, expiry checks, and owner checks still apply.
- Failed responses can be retried individually. A broken request pauses instead
  of repeatedly sending the remaining library. Accepted copies and captions
  persist in MongoDB and survive backend restarts; login expires after 30 minutes.

## Quota handling

There is no fixed per-photo delay. A configured RPM paces calls across accounts in
one server process. Without a known RPM, provider Retry-After/RetryInfo hints set
a shared cooldown; missing hints use increasing backoff. The queue displays a
wait, allows Pause, retries at most twice automatically, then pauses with files
preserved. Request and token quotas still apply. Exact project limits are not
automatically discoverable, and the scheduler is not distributed across replicas.

## Interpretation and privacy

Gemini receives current server time, timezone, image ids, and the images. The prompt
treats visible instructions as untrusted content. Useful events, places/food and
products receive captions and suggested actions. Known expired or irrelevant
items skip; ordinary personal photos, private documents, receipts and conversations
are not intended to be saved. All selected readable new images may nevertheless
reach the provider before that decision. [Google's data terms](https://ai.google.dev/gemini-api/terms)
apply; free-tier uploads may help improve its AI. The UI keeps a short disclosure
next to consent, with a link to these terms.

Useful undated items return null times and appear as Found without a reminder.
An undated event is not verified to be upcoming. Supplied local times resolve with
IANA timezone rules; invalid, ambiguous, nonexistent or inconsistent dates are
refused. Dated suggestions require user review before scheduling. These checks
cannot prove the model read the image correctly.

Images are retrieved through owner-authenticated POST requests, never public URLs.
Lists omit image bytes. Deletion removes the photo and its interpretation,
tracking and reminder histories; it does not delete the user's original or
retract provider submissions/backups. Byte-identical accepted images are
deduplicated per account and within each batch; re-encoded copies may differ.

## Endpoints and verification

| Endpoint | Purpose |
| --- | --- |
| `POST /api/recall/photos/status` | Authenticated availability, batch limit and cooldown; no key |
| `POST /api/recall/photos/import-batch` | Multipart `session`, `images` (1–10), JSON `ids`, `timezone`, `consent=gemini` |
| `POST /api/recall/photos/import` | Compatible single-image import and individual retry |
| `POST /api/recall/photos/image` | JSON `session`, `collection`; owner-only binary image |
| `/recall/photos/add`, `/recall/photos/found` | Internal compositions; direct HTTP writes blocked |

Run `bun scripts/validate.ts` for saved specification, artifact, type, build and
full test results. Tests use simulated provider responses and disposable MongoDB.
`bun scripts/check-batch-flow.ts` separately tests real Gemini using synthetic
concert fixtures; it needs network access and a key. The existing live result
used two unique images in one request; it does not establish ten-image throughput
or a complete browser journey. Historical OCR results describe removed code.

### Dates without a year

Partial dates become suggestions for review. A month/day with no year uses its next
upcoming occurrence in the user's timezone. A month/year without a day uses the
first day of that month, or one minute from now if the month is already underway.
A date-only offer remains eligible through the end of its day. Inferred dates are
not proof an offer is current; users review the proposed date before saving.
Explicit past years and fully elapsed explicit months remain excluded.
