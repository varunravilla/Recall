# Beta engineering decisions — October 18, 2026

This record describes changes made with coding-agent assistance. It records
observable issues and implementation choices, not the author's personal reflection.

## Replace the simulated import

P2 claimed to scan Photos while accepting pasted captions. A browser cannot
silently watch the camera roll. The beta uses a file picker and runs Tesseract
OCR on the selected image. Keeping recognition in the browser avoids uploading
the image, while editable text provides recovery from recognition errors. Only
extracted text persists; the original image preview lasts for the import screen.

## Authenticate before starting a session

P2 accepted a name as an identity, allowing anyone to use another name. A new
Authenticating concept stores a unique normalized username and Argon2id password
hash in MongoDB. A successful registration or login starts a Sessioning token for
the account id. Sessioning remains responsible for expiry and revocation. Password
accounts also allow testers outside the class to use Recall.

## Check relationships, not just owners

Reviewing the endpoint composition revealed that an attacker could pair an owned
collection id with another collection's interpretation id. The owner check alone
was true. The fix joins the supplied interpretation back to the owned collection.
Tracking mutations similarly bind the supplied tracking to the collection's
interpretation. A two-account regression attempts revision, confirmation, and
rejection with mismatched ids, then verifies the victim's proposal stays unchanged.
Another check pairs two collections owned by the same account with the wrong
tracking id, covering a mistake a simple cross-account check would miss.

## Preserve items before tracking exists

The integration test found that Saved returned no items immediately after capture.
The nested former required a tracking row and a reminder row even though neither
exists before confirmation. Optional query bindings now retain the collection
while representing missing related fields as null. The HTTP journey checks Saved
before confirmation as well as after confirmation and a fresh login.

## Make confirmation match the visible form

P2's Confirm sent only the ids and reminder time. It could confirm an old summary
after the user edited the visible field. Confirm now saves the displayed proposal
before confirming it. Errors stop the sequence and leave the form available.

## Stop reminders when work is resolved

Hiding a completed item in the inbox did not cancel its reminder record. Two
reactions now cancel the active reminder after completion or dismissal. The
concepts do not call each other. A regression checks the cancellation record
through Reminding's query. Sweep timing also moved from client input to the
engine's server-side flow clock, so a forged future timestamp cannot advance it.

## Make the writing specific

The P1 feedback identified repeated, abstract discussion of modularity. The
revision replaces those paragraphs with the concrete concert example and one
record chain. P3 separates current behavior from original sketches and states
browser limits beside the journey that depends on them. Claims about deployment,
browser validation, and user testing require their own evidence.

## Visual and access choices

The study compares photographed signage, a printed wallpaper reference, and the
original interface sketches. Recall retains a system sans serif, restrained green
primary actions, pale surfaces, and explicit state labels. Supporting text was
darkened, keyboard focus is outlined, controls have minimum target heights, and
form labels and error announcements are explicit. These code changes still need
keyboard, zoom, screen-reader, and browser review; CSS alone is not an audit.

## Generate suggestions from photos and keep the image

The requested scope expanded from single-image OCR to selected-photo and exported
library imports. The new adapter sends images to Gemini with server time and an
explicit timezone, validates structured results, and invokes the authored photo
collection/proposal chain only for current actionable items. Gemini supplies all
photo-related AI output; the old keyword recognizer is not a photo-import fallback.

Collecting now stores an optimized image with the caption. Its owner-only image
query is separate from lists, so gallery JSON never carries base64 image data.
Cards and detail screens retrieve images with authenticated POST requests. Duplicate
image bytes are detected before inference. Batch progress is per file; quota
failures pause rather than triggering repeated automatic calls. A folder picker
handles exported libraries without claiming native Photos permission.

Tests exercise generated values through multipart HTTP, expired/uncertain skips
without writes, image persistence across new instances, cross-account reads,
concurrent uploads, invalid files, and quota failures. A live provider check is
separate from simulated automated tests. The initial live check reached Google
but was refused with API_KEY_INVALID; no key was printed or committed. A replacement
key is needed before live AI generation can be reported as verified.

A second live check exposed two integration details beyond a valid key: the local
file was masked by an older inherited key, and Google no longer allowed new users
to call the initial model. Local Gemini settings now read `.env` explicitly, and
the default is the supported free-tier Gemini 3.5 Flash-Lite model. The replacement
key produced a real concert suggestion. Its daylight-saving offset was inconsistent
with New York, so the model now supplies local wall times and the server converts
them using IANA rules. Tests cover the November transition, an ambiguous fall-back
time, a nonexistent spring-forward time, and a timezone with a half-hour offset.

The complete live pipeline then passed using synthetic fixtures: a future concert
was accepted with its generated fields and persisted image, an identical image
was recognized as a duplicate, and an expired concert was skipped. The temporary
database contained exactly one saved item. `docs/validation/photos-live.json`
records this separately from the automated suite and from unverified browser work.

## Local date filter — October 19, 2026

Photo import defaults to an optional on-device English OCR filter. One worker is
reused across a batch, examining previews up to 1800 pixels before any Gemini
upload. Numeric, named, and relative date hints pass to Gemini, which still
checks relevance and expiry. Photos with no hint skip the upload and its rate-limit
wait; Include anyway queues an individual exception. OCR errors remain retryable
failures rather than silently uploading. Disabling the filter supports undated
places and products. This heuristic can miss dates and does not promise a scan
time; the first use downloads OCR assets. Pending files and skip decisions live
only in the current tab, not a persistent scan cache.

## Text filter and undated finds — October 19, 2026

The default local filter now looks for readable text rather than dates. This lets
short product names, food menus, and event posters reach Gemini without requiring
a date. Blank OCR and punctuation/numeric noise skip the upload. Include anyway
and disabling the filter cover visual finds and missed text. Recognition remains
English and can miss stylized or small text; this is a candidate filter, not a
promise to classify every photo locally.

Useful undated items are stored and confirmed as Found without tracking or
reminders. Interpretation queries return null for absent dates rather than the
creation timestamp. Known expired items still skip, and unresolvable supplied
dates cannot silently become undated finds. Food is classified as a place or
product. Internal photo-write endpoints remain blocked over HTTP.

## Finish repository validation — October 19, 2026

The final full run passes 47 tests with 337 assertions. Earlier EPERM errors were
caused by the sandbox refusing test-server ports; permitting disposable MongoDB
resolved execution. Additional checks target logout during inference and malformed
or daylight-saving-ambiguous supplied times becoming undated items. Neither dated
nor undated imports may write after logout. Null interpretation dates now appear
explicitly in query contracts as DateTime | null, not creation timestamps.

The journey, import/privacy documentation, application type description, and
validation record now reflect the text filter, Found items, and deletion. A real
OCR smoke run passed two repository fixtures. Interface/deployment verification
remains separate; the user excluded slides, video, commits, and deployment from
this completion task. No new user observations or personal reflections are claimed.

## Explain blocked import controls — October 19, 2026

A large selected folder showed a disabled Find reminders button far below the
Gemini consent checkbox. The queue now puts consent, the Google data-use summary,
and a specific enablement message directly above its start/retry controls. An
unavailable analysis service offers a connection recheck instead of permanently
disabling the start button. Connection checks have a visible pending state and
prevent duplicate starts. Offline errors no longer suggest logging in unless the
session is actually missing. Files stay selected while the user resolves consent
or connectivity; no personal photos were uploaded to verify this interface change.

## Stronger library filter — October 19, 2026

Any readable word was too broad for whole-library imports. Strict now requires
independent category and supporting clues, without requiring dates. Overlapping
or repeated matches do not count twice. Receipt/completed-purchase, code,
private-document, and conversation patterns exclude obvious unrelated content.
Broad and Off remain explicit alternatives; Include anyway bypasses a skip.
Each skip explains its cause, and mode changes only affect waiting files.

The rules deliberately favor fewer uploads over recall. Tests cover undated
products, menus, events, generic text, repeated clues, exclusion patterns and mode
behavior. No savings percentage or privacy-detection guarantee is claimed. Gemini
still performs interpretation; local matches never create saved items themselves.

## Remove category dictionaries — October 19, 2026

An attached product listing failed the strict dictionary despite showing price,
colour and size controls. Real local OCR reproduced the rejection. Shopping-page
structure accepted the same image after correction; the attached image was not
copied into the public repository or sent to Gemini for that check.

The broader correction removes product, brand and food dictionaries altogether.
Smart now skips obvious noise but defers ambiguous readable text to Gemini. Page
controls explain clear candidates; unfamiliar words never cause a category-based
rejection. This sacrifices request savings to reduce missed useful screenshots.
Broad and Off remain explicit options. Dates remain optional, and purely visual
or OCR-missed finds still need an override. No universal recognition claim is made.

Seven focused frontend tests and Vue/build checks cover this change. The last
full database run predates this adjustment; rerun permission was declined. Its
saved passing results are historical evidence, not a fresh full run of this edit.

## Batch and overlap image analysis — October 19, 2026

The old loop serialized preparation, AI and a fixed 6.5-second delay for every
photo. The replacement submits up to five new images per request and prepares
one batch ahead. AI-first bypasses local OCR. It never decodes a whole library at
once: at most the active and next batch hold optimized copies.

Explicit request-local ids are checked as a complete set before storage. Tests
return reversed results and verify both captions and image bytes, because an
order-only mapping could silently attach a private image to the wrong suggestion.
Saved and within-batch duplicates bypass another AI analysis. Every accepted
image still uses the authored ownership-checked dated/undated compositions.

A server-process scheduler shares configured RPM and quota cooldown across users.
Without a known RPM it adds no arbitrary pause, but honors provider retry hints
and grows backoff when hints are absent. The client shows countdowns, allows Pause,
limits automatic retries, and restores unsent prepared files after failures.
Malformed results pause for individual retry rather than guessing or repeatedly
spending requests on the remaining library.

A full run passes 65 tests and 438 assertions. A real synthetic batch also passed:
two unique images in one provider request produced one accepted concert and one
expired skip; a repeated image became duplicate and the stored image matched.
The check took 12.59 seconds, with no comparative benchmark or browser claim.

## One import path, ten photos, simpler copy — October 19, 2026

The requested default is now AI analysis for every readable new image, rather
than another switch. Local OCR, recognition dictionaries, filter tests and their
Tesseract dependency were removed. Backend compatibility for old text captures
remains, but it is not an alternative interface flow.

The batch count is ten. New image preparation targets 1 MB per photo and steps
down dimensions if needed, so ten copies fit the existing 10 MB raw/12 MB multipart
limits and the provider's inline base64 budget. Previously stored images are
unchanged. Boundary tests cover ten results, rejection of eleven, and aggregate
payload refusal before inference.

The interface names user actions and outcomes: choose photos, Find my saves,
pause, retry and Found. It no longer explains batch sizes, OCR, quotas or provider
implementation. A short external-processing consent notice and data-terms link
remain because they affect the decision to upload personal photos. Technical
failure strings are mapped to recovery instructions rather than shown verbatim.

The final full run passes 60 tests with 402 assertions across 16 files, plus design,
artifact, backend/Vue and production-build checks. Removed local-filter tests were
replaced by current file-validation and image-budget regressions; concept action
coverage remains. The earlier two-image real provider result is retained as
historical integration evidence, not a ten-image speed claim.

## October 26, 2026: P4 boundaries and public behavior

The P2 review found that the main composition mixed all workflows and that its
specification described little beyond endpoint names. P4 keeps the public Recall
composition tree stable but moves its definitions into Capture, Views, Review,
Saved and Lifecycle modules. This groups code by the decisions a user makes and
the consequences that must follow them. The specification now states ownership
joins, optional reads, refusal behavior and limits of multi-step execution.

New HTTP tests found two differences that direct gateway tests had missed.
`NOT_FOUND` refusals lacked an HTTP policy mapping and became 500 responses.
DateTime prose and TypeScript annotations did not decode JSON timestamps, allowing
invalid times to confirm a proposal and leaving valid time strings unsuitable for
MongoDB date queries. Explicit admission validates all date fields before actions,
concept actions normalize accepted values, and startup converts parseable legacy
strings. Invalid legacy strings stay unchanged rather than receiving guessed dates.

Concurrent confirmations also needed a state predicate in the update itself.
Interpreting now changes proposed rows conditionally, and Tracking resolves only
pending rows conditionally. HTTP regressions expect exactly one successful
transition under simultaneous requests. This does not make the whole multi-concept
chain transactional; infrastructure failure between actions remains a limitation.

The October 26 deployed HTTP run confirmed health, credential/session refusal,
fresh-login persistence, and rejection of another account's deletion. It reproduced
the old deployment's unmapped 404 and invalid-time bugs. Synthetic items were
removed and test sessions ended. Two synthetic accounts remain because account
deletion is unavailable. The saved report is explicitly a failed baseline, not
proof that the unpushed P4 fixes already run online.

P4 preserves P3's typography and palette. Error responses now use actionable UI
messages instead of uppercase transport codes. A final design summary connects
these choices to P1 and P3 and links those historical versions by commit. P5
participant tasks are prepared, but no user sessions or findings are invented.

## October 28, 2026: do not expire a date without a year

A month/day screenshot was skipped after analysis supplied a past year that was
not visible in the image. Missing year evidence now has an explicit analyzer flag.
For that case, parsing discards generated reminder and expiry times and preserves
an otherwise useful item as Found. The prompt tells the analyzer not to reject it
because an assumed current-year date has passed. The visible month/day stays in
the caption; no future year or reminder is invented. Explicit past years still
expire, and unrelated/private material still skips. Single and batch regressions
check this distinction and verify the stored image and absence of reminders.

### October 28: propose the next occurrence of partial dates

The previous yearless-date policy saved finds without dates. It did not match the
intended workflow for date-based offers. Recall now extracts month, optional day,
and optional printed year separately from generated timestamps. Server calendar
rules choose the next occurrence in the user's timezone; explicit years do not
roll forward. A date with no day starts at the beginning of its month, or one
minute from now during that month. Suggestions require review before tracking.
Regression cases cover both supplied food-offer dates, other categories, month-only
dates, expired explicit months, leap days, timezone conversion, and batch import.
