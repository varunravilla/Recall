# Recall validation

Run `bun scripts/validate.ts` from the repository root. It checks specifications,
regenerates contracts, checks backend TypeScript and Vue components, builds the
production frontend, and runs the tests against disposable MongoDB instances.
Each step saves its command, time, exit code, and output in this folder.

For normal development, `bun test` uses the configured MongoDB server with a
fresh `test-<uuid>` database for each suite. `bun run test:memory` starts temporary
MongoDB instead and needs permission to listen on local ports. Its first run may
download the MongoDB binary. Test setup creates records through concept actions;
cleanup drops only those test databases.

## What the tests establish

| Area | Evidence |
| --- | --- |
| Authenticating | Registration, normalized names, duplicate and invalid credentials, wrong passwords, hash storage, stable account identity |
| Sessioning | Start/current/end, expiry boundary, forged tokens, repeated logout, independent sessions |
| Collecting | Add/query/remove, empty content, duplicate captures, owner checks, unchanged data after refusal |
| Interpreting | Proposal/revision/confirmation/rejection, terminal-state refusal, unchanged records after refusal |
| Tracking | Pending/completed/dismissed states, duplicate tracking, repeated resolution, owner checks |
| Reminding | Schedule/reschedule/due/sweep/acknowledge/cancel, time boundary, wrong owner, invalid transitions |
| Composition | Confirm creates tracking and reminder; completion cancels the reminder; mismatched collection/interpretation/tracking ids are refused |
| HTTP | JSON requests, invalid caption, password failure, save/edit/confirm/reschedule, persistence across fresh application instances, dismiss/logout |
| Photo import | Multipart image upload, Gemini output validation, expiry and relevance skips, per-owner deduplication, persistent image reads, concurrent uploads, quota errors |

`bun scripts/check-gemini.ts` separately sends a synthetic concert image to the real
Gemini API and validates its generated fields. It needs a valid server key and
network access. Photo analysis is now always server-side; local OCR, filter code,
its dependency and its tests were removed. The old OCR output is historical, not
a command or check for the current app.

## Checks still requiring the interface

A partial disposable-browser check covered registration, Inbox, and the import
layout. Upload permission was declined, so no complete browser photo journey is
claimed. The API tests are not completed browser journeys. Use
[the interface checklist](../browser-checks.md) before recording, and record the
actual results in the private notebook:

- Create two accounts; select several images or a folder; inspect generated captions and dates; confirm edited values.
- Reload Saved and a saved-item direct link; verify the data remains.
- Reschedule, wait for a real due time, then complete or dismiss the item.
- Try a wrong password, empty text, unsupported image, unreadable image, and another account's item link.
- Use only the keyboard; inspect focus order, labels, status/error announcements, and file selection, batch pause/resume, consent, and saved-image rendering.
- Check a narrow phone viewport, 200% zoom, and a screen reader. No formal accessibility audit has been completed.

The deployed HTTP evidence below is distinct from browser, video and user-testing observations.

## Live Gemini evidence — October 18, 2026

The replacement key and Gemini 3.5 Flash-Lite passed a real synthetic-image check.
[Generated output](gemini-live.json) records the caption, action, and server-resolved
time. The [live pipeline result](photos-live.json) additionally records image
persistence, duplicate detection, expired-event exclusion, and the final item count
through the multipart adapter, concept compositions, and temporary MongoDB. These
checks send only synthetic fixtures; they do not establish browser or deployment
behavior. Earlier key/model failures and their correction are summarized in
[the redacted diagnostic record](gemini-live.txt).

## Current repository checks — October 26, 2026

The [saved full run](tests.txt) records **313 passing tests, zero failures, and
926 assertions across 25 files**. Design, generated contracts, backend/Vue checks
and the production build pass. Five focused workflow modules retain the same
public composition names and generated endpoint paths. The saved Bun report gives
98.12% line coverage across loaded instrumented files. This excludes Vue templates
and the main server entry and is not a claim of full application coverage.
[The coverage map](../testing.md) identifies what each suite establishes.

Required-field tests independently enumerate ordinary endpoint contracts, omit
each required field, and replace it with an object. They compare all persistent
collections before/after refusals. Other HTTP tests check forged tokens,
foreign and mismatched ids, missing/deleted lookups, invalid reminder admission
without writes, rejection, due sweep and repeated completion. Existing journey
checks cover edit, reschedule, persistence, dismissal and logout. Concurrent
confirmation/resolution tests require one successful transition. A migration
fixture checks that parseable legacy timestamp strings become dates exactly once.
This fixture intentionally writes the old storage format; ordinary concept tests
continue to create their state through actions.

Image and batch regressions cover ten independent images, payload bounds,
reordered/missing/duplicate/foreign ids, per-owner image reads, post-inference
logout and quota cooldown. Pipeline tests cover additional selections during the
last active request, one-batch lookahead, and preserving files on pause/failure.

## Deployed HTTP baseline — October 26, 2026

[deployed-p4.json](deployed-p4.json) is an actual run against
https://recall.mit-sdg.dev/ using synthetic accounts and text captures. It confirms
health, homepage delivery, wrong-password/forged-session refusal, required fields,
fresh-login persistence, owner-safe deletion refusal and direct route delivery.
It also records failures on the older deployment: foreign and deleted-item
lookups return 500, and malformed confirmation times are accepted. These bugs now
have locally passing regressions and fixes, but the report remains a failed
baseline until the new code is deployed and checked again.

Run `bun scripts/check-deployed.ts https://recall.mit-sdg.dev/` after deployment.
It deletes only its own synthetic items, ends its sessions, and sends no photos
or Gemini requests. Two test accounts remain because account deletion is absent.
The report does not identify the deployed Git commit or establish browser
accessibility, the photo-picker journey, image analysis, or a narrated demo.

## Live batch evidence

[The real batch result](batch-live.json) passed with two unique synthetic images
in one Gemini request: a future concert was saved, an expired concert skipped,
and a repeated selected image marked duplicate. The stored image exactly matched
the accepted fixture. The adapter and checks took 12.59 seconds in this run. This
is an integration check, not a comparison against sequential processing and not
a promise about large libraries. The private key and personal photos are absent
from the report. No current browser upload/deployment journey is claimed.

## Local production-server and interface checks — October 26

[local-http-p4.json](local-http-p4.json) passes the same smoke checks against the
corrected local production server, including due reminders, error mapping,
invalid-time refusal and cleanup. The separate deployed baseline stays unchanged.
[Local browser observations](browser-p4.md) cover registration, edited review,
confirmation, direct-page reload, completion, Done filtering, missing-item recovery
and one phone-width layout. They do not establish a deployed photo upload journey,
full keyboard/zoom behavior, or screen-reader accessibility.

## Additional P4 regression review

The larger suite found and fixed malformed scalar/credential admission, impossible
calendar dates, duplicate restoration when pausing during preparation, and ignored
items reopening Review. Frontend transport tests cover session storage and expiry,
HTML/empty responses, multipart consent/id mapping, reversed or malformed results,
quota/status failures, and network retries. The shared production router has
explicit tests that raw internal photo writes never reach an action. Transition
tests include every deletion state, competing complete/dismiss requests, exact
expiry and attempted owner-field impersonation. Tests use synthetic data and
simulated providers; no new paid or live AI calls ran during this review.
