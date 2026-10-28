# Recall: final design

Recall turns screenshots of events, places and products into ideas to revisit or
reminders to act on. It preserves the source image so people can check an
interpretation before relying on it.

## Changes from P1

- **Import gives users control over their photos.** [P1](https://github.com/varunravilla/Recall/blob/80686e5dde22f01bf1d316f61d62b3b5ff55e382/P1.md)
  imagined continuous Apple Photos access. A browser cannot watch that library.
  The final app accepts selected images or an exported folder, with disclosure
  before external analysis. Import adds a step but lets people choose what leaves
  their device.
- **A useful find does not require a deadline.** A restaurant menu and a ticket
  sale need different outcomes. Undated finds retain their image and caption in
  Saved. Dated proposals require review before tracking and scheduling. Known
  expired events skip instead of becoming new reminders.
- **AI supplies proposals.** Earlier text filters missed useful screenshots.
  Every readable new selection now follows the AI path after consent. Ten-photo
  requests overlap preparation with analysis while retaining only one extra batch
  in memory. Users check dated suggestions and make purchases elsewhere.

## Boundaries and access control

Six concepts hold accounts, sessions, sources, interpretations, intentions and
reminders. Their identities form a specific chain: a user owns a collection, an
interpretation refers to that collection, and a tracking refers to that
interpretation. An owned collection alone cannot authorize a supplied tracking id.

The [P3 composition](https://github.com/varunravilla/Recall/blob/b2d000ec93d5268df5f67939d39492dd2a713101/src/compositions/Recall.ts)
combined all workflows. P4 separates capture, views, review, saved-item changes
and lifecycle consequences while preserving endpoint names. Review accepts or
corrects proposals. Saved resolves existing intentions. Lifecycle cancels reminders
and removes related records after successful actions. The
[specification](../design/compositions/Recall.md) explains the ownership joins,
optional reads and refusal behavior at these boundaries.

- Authentication derives the owner from the session. Image retrieval checks that
  owner independently of list access. Caller-supplied user fields grant no access.
- Completion and dismissal cancel reminders. Deletion removes the source image and
  all related histories. Failed ownership checks trigger none of that cleanup.
- HTTP tests exposed invalid times being accepted and missing items returning 500.
  Input admission now rejects missing, wrongly typed, oversized or impossible-date
  values before writes. Accepted times become MongoDB dates. Startup converts
  parseable legacy strings without guessing replacements for invalid values.
- Conditional updates permit one successful confirmation or resolution under
  competing requests. The full chain remains nontransactional, so database failure
  between actions can still leave partial state.

## Changes from the P3 visual design

The [P3 study](visual-study/README.md) connects Yellowstone signage and Apple’s
heading hierarchy with Starbucks’ green/light contrast and Yosemite’s pale granite
and forest. P4 retains that direction. Georgia gives the collection a personal
identity. System text keeps controls familiar, and a large heading establishes the
page’s task. Cream surfaces frame varied screenshots. Solid green emphasizes the
primary action. A brown focus ring separates keyboard focus from selection, and
written labels explain states beyond color.

Behavior now supports that hierarchy more consistently. Users can append photos
without clearing results. Pausing restores prepared files once. Ignored suggestions
open saved details with an Ignored label and no action controls. Recovery messages
replace backend codes. Permanent deletion requires confirmation.

## Evidence and limits

[Validation](validation/README.md) and the [coverage map](testing.md) distinguish
concept, HTTP, frontend-adapter and browser evidence. Tests check unchanged state
after refusal, every ordinary endpoint’s required fields, ownership, persistence,
terminal states, batch identities and concurrent transitions.

The October 26 deployed baseline exposed the old date/error bugs. Local fixes and
the corrected local server pass their checks; deployment must be updated and
rechecked. Local browser observations cover editing, reload, completion and a phone
layout. Full photo-picker and accessibility checks remain.

Reminders require an open Inbox. Sessions expire after 30 minutes and on restart.
Reloading loses waiting files, while accepted images persist. Password recovery
and reopening completed intentions remain outside this version.
