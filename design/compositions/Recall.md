# Recall composition

Recall connects a saved screenshot to a revisitable idea or an explicit intention.
A collection owns the source image. An interpretation describes that source. A
tracking records the decision to act, and a reminder gives that decision a time.
This separation matters for an undated restaurant: it needs a collection and an
interpretation, but creating a tracking or invented deadline would misrepresent it.

## Workflow boundaries

The exported `Recall` tree keeps stable names for generated clients. Its
implementation delegates to five files in `src/compositions/recall/`:

| Module | Responsibility | Reason for the boundary |
| --- | --- | --- |
| Capture | Add captions, dated photos and undated finds; find duplicates and retrieve images | Source ingestion differs from a user's later decision to act. The HTTP adapter validates AI output before invoking these writes. |
| Views | Inbox, library and saved detail formers and their read endpoints | A view joins several concepts without changing their state. Optional tracking/reminder joins keep unconfirmed and undated collections visible. |
| Review | Get, revise, confirm and reject a proposal | These endpoints decide whether an interpretation is trustworthy enough to become an intention. |
| Saved | Complete, dismiss, reschedule and delete | These operations change the lifecycle of an existing saved item, rather than its original interpretation. |
| Lifecycle | Due sweep, cancellation and deletion reactions | These consequences must run after a successful concept action regardless of which endpoint caused it. |

The split follows user decisions and their consequences, rather than giving each
concept an unrelated HTTP controller. For example, confirmation intentionally spans
Interpreting, Tracking and Reminding in one readable chain.

## Authentication and record identity

Every endpoint resolves the session before reading or writing account data. The
resolved subject supplies `user`; a caller cannot choose another owner in the body.
Item mutations then verify the complete relationship:

`user owns collection; interpretation.item = collection; tracking.item = interpretation`.

An owned collection alone is insufficient: two different items may belong to the
same account. Review operations therefore match the supplied interpretation to
that collection. Saved operations match both the tracking's owner and its item.
Read formers start from the owner's collections or pending trackings and omit image
bytes. Image retrieval separately checks ownership. Missing and foreign lookups
answer `NOT_FOUND`, which the HTTP policy exposes as 404. Deletion uses the
Collecting refusal and returns 403 for a non-owner without deleting anything.
Neither response includes the other account's data.

## Review and tracking contracts

- **Get** returns the source caption and latest interpretation for an owned item.
  **Revise** changes only a proposed interpretation. **Reject** keeps the source
  but resolves the proposal, so the user can still find the ignored item in Saved.
- **Confirm** requires the owned collection and matching proposed interpretation.
  It confirms that interpretation, creates a pending tracking, and schedules its
  reminder. The interface sends its displayed edits through Revise first. A
  second confirmation refuses instead of creating another intention.
- **Complete** and **Dismiss** require a pending tracking for this item. Their
  successful responses trigger cancellation of its active reminder. Refused
  actions must not cancel a reminder or alter the visible saved state.
- **Reschedule** requires the same owner/record chain and an active reminder.
  Reminding permits a change only while that reminder is scheduled. A missing
  reminder returns 404; a due reminder refuses with 409.

Every endpoint validates the runtime types of its required fields before actions.
Ids must be nonblank strings, captions are limited to 20,000 characters, actions to
240, and the application accepts event, place or product kinds. An object such as
`{"$ne": null}` cannot stand in for a collection id or credential. Malformed input
returns 400 without changing persistent records. This application policy leaves
Interpreting's generic kind string independent of Recall's three categories.

Date fields admit finite Date objects or ISO timestamps with a timezone. Calendar
checks reject impossible dates and 24:00 rollover rather than normalizing them to a
different day. Admission happens before confirmation, preventing a bad time from
leaving a confirmed interpretation without a valid reminder. Concept actions store
accepted timestamps as MongoDB dates. Specification type names alone do not decode
JSON strings at runtime.

## Read models

InboxBook includes collection proposals and pending trackings with reminder state.
The UI selects proposed rows for review and due rows for attention. LibraryBook
includes all the owner's collections, including rejected, proposed and Found items.
SavedDetail uses the same optional relationship joins for one owned collection.
A missing tracking means no intention was created, not that the source disappeared.
Lists exclude image data so opening a large collection does not download every image.

## Source ingestion and AI boundary

The multipart adapter authenticates, checks consent, validates image signatures and
size limits, and applies quota/concurrency controls before calling Gemini. Each
response id must match exactly one input id. The adapter validates the complete id
set before storing any results, preventing a reordered response from attaching a
caption to the wrong image. Accepted writes recheck the session after inference.
A logout during analysis therefore prevents subsequent writes.

Dated photos create a proposal requiring review. Undated photos create a confirmed
Found interpretation and stop before tracking/reminding. Known expired, irrelevant
or uncertain dated results are skipped. Image hashes deduplicate within one owner,
not across accounts. Raw Add and Found write endpoints are gateway-internal and
blocked by the production HTTP router; public clients use multipart import.

A visible month/day without a year is not evidence of expiration. The analyzer
marks that case with `dateYearMissing`. The adapter discards inferred reminder
and expiry timestamps and saves an otherwise useful image as Found. It does not
assume the current year or roll the event into next year. Explicit past years
still expire, and unrelated or sensitive content remains excluded.

Ten optimized images fit within the batch limit. The client prepares one batch
ahead, allows further selections during processing, and rechecks the live queue
before finishing. Pause stops new requests after the active batch. Reloading loses
waiting File objects, while accepted images persist. These controls manage a
browser import session rather than claiming background Photos synchronization.

## Successful-action consequences

Deletion first removes the owned collection and image. Only its successful
response triggers removal of all interpretations, then their trackings, then all
reminder histories. This includes resolved rows, not just the current reminder.
A failed ownership check triggers none of that cleanup. Completion and dismissal
likewise cancel reminders only after successful tracking transitions.

The chains are not a cross-concept MongoDB transaction. A database failure between
actions may leave partial state. Retry, refusal and deletion tests cover expected
application failures; they do not prove recovery from every infrastructure outage.

## Endpoint and former index

```endpoints
Recall.Collecting.AddCaption at /recall/captions/add
Recall.Inbox.List at /recall/inbox/list
Recall.Library.List at /recall/library/list
Recall.Review.Get at /recall/review/get
Recall.Review.Revise at /recall/review/revise
Recall.Review.Confirm at /recall/review/confirm
Recall.Review.Reject at /recall/review/reject
Recall.Saved.Get at /recall/saved/get
Recall.Saved.Complete at /recall/saved/complete
Recall.Saved.Dismiss at /recall/saved/dismiss
Recall.Saved.Reschedule at /recall/saved/reschedule
Recall.Sweep.Tick at /recall/sweep/tick
```

```endpoints
Recall.Photos.Add at /recall/photos/add
Recall.Photos.Found at /recall/photos/found
Recall.Photos.Get at /recall/photos/get
Recall.Photos.Find at /recall/photos/find
```

```endpoints
Recall.Saved.Delete at /recall/saved/delete
```

## Traceable reactions and formers

[AddCaption](reaction:Recall.Collecting.AddCaption),
[AddPhoto](reaction:Recall.Photos.Add), [Found](reaction:Recall.Photos.Found),
[GetPhoto](reaction:Recall.Photos.Get), [FindPhoto](reaction:Recall.Photos.Find).
[Inbox List](reaction:Recall.Inbox.List) uses [InboxBook](former:Recall.Inbox.InboxBook).
[Library List](reaction:Recall.Library.List) uses [LibraryBook](former:Recall.Library.LibraryBook).
[Saved Get](reaction:Recall.Saved.Get) uses [SavedDetail](former:Recall.Saved.SavedDetail).
[Review Get](reaction:Recall.Review.Get), [Revise](reaction:Recall.Review.Revise),
[Confirm](reaction:Recall.Review.Confirm), [Reject](reaction:Recall.Review.Reject).
[Complete](reaction:Recall.Saved.Complete), [Dismiss](reaction:Recall.Saved.Dismiss),
[Reschedule](reaction:Recall.Saved.Reschedule), [Delete](reaction:Recall.Saved.Delete),
[Tick](reaction:Recall.Sweep.Tick).
[CancelCompleted](reaction:Recall.CancelCompleted),
[CancelDismissed](reaction:Recall.CancelDismissed),
[RemoveInterpretations](reaction:Recall.RemoveInterpretations),
[RemoveTrackings](reaction:Recall.RemoveTrackings),
[RemoveReminders](reaction:Recall.RemoveReminders).

## Verification

`tests/http/admission.test.ts` checks each ordinary endpoint's required fields and
refuses missing or object-valued inputs, comparing all five persistent collections
before and after. `tests/http/endpoints.test.ts` checks forged sessions, invalid
times, foreign lookups, mixed ids and cleanup. `tests/http/transitions.test.ts`
covers each deletion state, competing resolutions, exact session expiry and
caller-supplied owner fields. `tests/http/routing.test.ts` exercises the production
router's separation of internal writes from public photo intake.
`tests/http/journey.test.ts` covers edit, confirmation, rescheduling, persistence
across fresh instances, dismissal and logout. Photo adapter and composition tests
cover image bytes, Found items, post-inference logout, quotas and deletion history.
