# Interface verification checklist

These checks are not marked complete. Automated API and queue tests passed; prior browser work only covered registration, Inbox, and the import
layout. Browser upload permission was declined. Do not turn this checklist into
claimed observations without running it. Use synthetic photos rather than a
personal library for testing.

Run `bun run build`, start MongoDB and `bun run start`, then use the interface.
Repeat the key journey on the deployed submitted commit later.

| Check | Expected behavior |
| --- | --- |
| Register; log out; use wrong and correct passwords | Wrong credentials fail; correct credentials recover the same saved collection |
| Import `tests/fixtures/future-concert.png` with consent | Progress is visible; Recall returns a reviewable dated suggestion if it can resolve the fixture |
| Import a useful undated menu/product screenshot | Appears as Found with its photo and caption; no date or reminder is invented |
| Import a photo without text | It reaches analysis; a useful product/place may become Found without a date |
| Inspect Add photos | One import path, no filter/AI-mode controls, short consent, and no batch/provider implementation copy in the main flow |
| Review and edit a dated suggestion | Save reminder uses the displayed type, action and time; Saved shows Pending |
| Reload Saved and open a direct item link | Caption, image and stored state survive reload |
| Reschedule to a near future time; leave Inbox open | Time updates; Ready now appears after the server sweep; completion/dismissal cancels the reminder |
| Delete a proposed, Found, pending or completed item | Keep item and Escape cancel the dialog; confirmed deletion removes the item; reopening its URL does not reveal deleted content |
| Account B tries account A's saved/image/delete paths | No image or data is disclosed and account A's item is unchanged |
| Empty files, unreadable images, unsupported exports, offline API | Actionable errors; retry/clear controls work; no false success |
| Pause/import, navigate away and return | Queue is retained within the tab, paused after the active batch; a reload clears pending files as disclosed |
| Quota or session expiry | Countdown/backoff retries at most twice; Pause interrupts waits; expired sessions stop uploads; previously saved photos remain |
| Keyboard only; dialog; 200% zoom; narrow phone viewport | Visible focus, reachable controls, readable content, no horizontal clipping; dialog Escape returns safely |
| Screen reader | Labels, navigation landmarks, progress/status/errors and delete consequences are understandable |

Record browser/device, date, tested version, actual result, and unresolved issues.
P3 requires journey checks and notebook evidence; a formal accessibility audit is
not a separate deliverable. Slides, recording, commits and deployment are outside
the current repository-only completion request.
