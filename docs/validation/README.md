# P3 validation

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

No hosted deployment, video, or user-testing results are claimed here.

## Live Gemini evidence — October 18, 2026

The replacement key and Gemini 3.5 Flash-Lite passed a real synthetic-image check.
[Generated output](gemini-live.json) records the caption, action, and server-resolved
time. The [live pipeline result](photos-live.json) additionally records image
persistence, duplicate detection, expired-event exclusion, and the final item count
through the multipart adapter, concept compositions, and temporary MongoDB. These
checks send only synthetic fixtures; they do not establish browser or deployment
behavior. Earlier key/model failures and their correction are summarized in
[the redacted diagnostic record](gemini-live.txt).

## Current repository checks — October 19, 2026

The [full saved run](tests.txt) records **60 passing tests, zero failures, and 402
assertions across 16 files**. Design, generated artifacts, backend/Vue checks and
production build pass. Removed filter tests account for the lower count; coverage
for existing concepts remains. New tests accept ten independent images, reject an
eleventh before provider calls, enforce the aggregate upload limit, and verify
preparation keeps ten copies inside the raw payload budget.

Batch regressions cover reordered/missing/duplicate/foreign ids, independent
outcomes, within/across-batch duplicates, owner-only images, post-inference logout,
and shared quota cooldown. Pipeline tests cover one-batch lookahead, preserved
files on pause/failure, and no request when paused during waits. Provider/pacing
tests cover structured requests, retry hints, configured RPM, growing backoff and
reset after success. No OCR/filter functionality remains in this version.

## Live batch evidence

[The real batch result](batch-live.json) passed with two unique synthetic images
in one Gemini request: a future concert was saved, an expired concert skipped,
and a repeated selected image marked duplicate. The stored image exactly matched
the accepted fixture. The adapter and checks took 12.59 seconds in this run. This
is an integration check, not a comparison against sequential processing and not
a promise about large libraries. The private key and personal photos are absent
from the report. No current browser upload/deployment journey is claimed.
