# Test coverage and its limits

Run `bun scripts/validate.ts` for the saved check/build/test sequence. Its test
step uses disposable MongoDB and Bun's text coverage report. `bun run test:memory`
is a faster test-only command. [Saved output](validation/tests.txt) records the
actual result; test names identify the case that failed.

## Endpoint coverage

| Boundary | Observable behavior checked | Evidence |
| --- | --- | --- |
| Register and start | Password bounds, invalid credentials and types, normalized duplicate/racing registration, stable identity, no hash in responses | Concept authentication suites; HTTP journey and admission |
| Current and end | Active, forged, ended and exactly expired sessions; independent tokens; data remains after expiry/restart | Sessioning suite; HTTP endpoint, transition and journey suites |
| Caption intake | Success, duplicate, blank/oversized content, unsupported category, invalid time/type, caller-supplied owner, no orphan writes | Collecting suite; HTTP admission, transition and endpoint suites |
| Inbox and library | Owner-only lists; optional interpretation/tracking/reminder rows; proposed, rejected, pending and resolved items | HTTP journey/endpoints; composition security; photo Found test |
| Review get/revise/confirm/reject | Source details, edited values, terminal refusals, invalid-time refusal, foreign/mixed ids, simultaneous confirmation | HTTP endpoints, transitions and journey; Interpreting suite |
| Saved get/complete/dismiss/reschedule/delete | Pending through due/resolution; refusal without state change; all five deletion states; historical cleanup; foreign and mismatched ids; competing completion/dismissal | HTTP transitions/endpoints/journey; deletion composition; Tracking/Reminding suites |
| Sweep | Before, at and after a due time; cancelled/resolved reminders stay out of Inbox; no caller clock | Reminding suite; HTTP due path; server-clock composition |
| Public photo import/batch/status/image | Consent, authentication before inference, valid image signatures, size limits, duplicate scoping, owner-only image bytes, provider failures and cooldown, logout after inference | Photo adapter suite with simulated provider responses |
| Internal photo add/found | Dated proposal versus undated Found; no invented tracking/reminder; public access blocked even with trailing slashes or alternate methods | Photo integration suite; production router suite |

The admission inventory lists each ordinary JSON endpoint and its required fields
independently of implementation metadata. For every field it omits that field,
then supplies an object instead of its declared scalar. Each refusal compares the
five persistent collections before and after. This checks concrete entry-point
behavior rather than relying on one successful journey or printed output.

## Cross-cutting risks

- **Timestamps:** leap years, month/day bounds, missing timezone, offset instants,
  24:00 rollover, invalid Date objects, daylight-saving gaps/ambiguities and legacy
  string migration. The migration fixture deliberately seeds the old format.
- **Batch identity:** reversed, missing, duplicate and foreign result ids; mixed
  accepted/skipped/failed results; duplicates within and across requests; ten-photo
  and aggregate payload limits. Malformed id sets must produce no partial writes.
- **Import lifecycle:** additions during the final request, pause during preparation
  or quota wait, decoder/send/wait failure, one batch ahead, resource restoration
  exactly once and an empty queue that sends nothing.
- **Browser adapters:** session values stay in request bodies, successful login
  establishes local identity, logout/expiry clears it, wrong login avoids a redirect
  loop, HTML/empty responses become recovery messages, and upload status/retry data
  survives transport. Tests replace browser storage/fetch and restore those globals.

## What a high coverage number does not establish

Bun reports coverage for loaded and instrumented files. Vue component templates,
browser rendering and `src/main.ts` startup are outside the unit coverage report.
Executing a composition declaration does not prove every guard combination ran.
The endpoint/state tables above and [local browser observations](validation/browser-p4.md)
provide separate evidence. Live Gemini checks use synthetic inputs and are stored
separately from deterministic provider simulations.

The [deployed report](validation/deployed-p4.json) remains a failed baseline of the
older hosted version until fixes are deployed and checked again. No test count or
line percentage establishes full accessibility, every browser/device, provider
accuracy on all photos, or atomic recovery from a database outage between concept
actions. Those limits remain explicit in the design summary.
