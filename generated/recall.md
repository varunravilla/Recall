<!-- Generated from the Recall assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# Recall — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### Collecting

Defined in [Collecting](../design/concepts/Collecting.md), line 1.

#### Actions

- `add(user: User, item: Item, content: String, collectedAt: DateTime) : returns (collection: Collection)`
  - Refuses `EMPTY_CONTENT`: Caption cannot be empty.
  - Refuses `ALREADY_COLLECTED`: This item is already in the collection.
- `remove(user: User, collection: Collection) : returns (collection: Collection)`
  - Refuses `NOT_OWNER`: You do not own this collection.

#### Queries

- `_byOwner(user: User) : many (collection: Collection, item: Item, content: String, collectedAt: DateTime)`
- `_byId(collection: Collection) : optional (owner: User, item: Item, content: String, collectedAt: DateTime)`

#### Instances

- `Collecting` — instance of `Collecting` — [Recall Application Types](../design/types.md), line 19.
  - `Item` is `ScreenshotRef` — [Recall Application Types](../design/types.md), line 21.
  - `User` is `User` — [Recall Application Types](../design/types.md), line 20.

### Interpreting

Defined in [Interpreting](../design/concepts/Interpreting.md), line 1.

#### Actions

- `propose(item: Item, kind: String, summary: String, relevantAt?: DateTime) : returns (interpretation: Interpretation)`
- `confirm(interpretation: Interpretation) : returns (interpretation: Interpretation)`
  - Refuses `NOT_PROPOSED`: Only a proposed interpretation can be confirmed.
- `revise(interpretation: Interpretation, kind: String, summary: String, relevantAt?: DateTime) : returns (interpretation: Interpretation)`
  - Refuses `NOT_PROPOSED`: Only a proposed interpretation can be revised.
- `reject(interpretation: Interpretation) : returns (interpretation: Interpretation)`
  - Refuses `NOT_PROPOSED`: Only a proposed interpretation can be rejected.

#### Queries

- `_byItem(item: Item) : optional (interpretation: Interpretation, kind: String, summary: String, relevantAt: DateTime, status: String)`
- `_byId(interpretation: Interpretation) : optional (item: Item, kind: String, summary: String, relevantAt: DateTime, status: String)`

#### Instances

- `Interpreting` — instance of `Interpreting` — [Recall Application Types](../design/types.md), line 23.
  - `Item` is `Collecting.Collection` — [Recall Application Types](../design/types.md), line 24.

### Reminding

Defined in [Reminding](../design/concepts/Reminding.md), line 1.

#### Actions

- `schedule(user: User, item: Item, at: DateTime) : returns (reminder: Reminder)`
- `reschedule(user: User, reminder: Reminder, at: DateTime) : returns (reminder: Reminder)`
  - Refuses `NOT_OWNER`: You do not own this reminder.
  - Refuses `NOT_SCHEDULED`: Only a scheduled reminder can be rescheduled.
- `cancel(user: User, reminder: Reminder) : returns (reminder: Reminder)`
  - Refuses `NOT_OWNER`: You do not own this reminder.
- `due(reminder: Reminder, now: DateTime) : returns (reminder: Reminder)`
  - Refuses `NOT_SCHEDULED`: This reminder is not scheduled.
  - Refuses `NOT_YET`: It is not time for this reminder yet.
- `sweepDue(now: DateTime) : returns (count: Number)`
- `acknowledge(user: User, reminder: Reminder) : returns (reminder: Reminder)`
  - Refuses `NOT_OWNER`: You do not own this reminder.
  - Refuses `NOT_DUE`: Only a due reminder can be acknowledged.

#### Queries

- `_byItem(user: User, item: Item) : optional (reminder: Reminder, at: DateTime, status: String)`
- `_scheduledBefore(now: DateTime) : many (reminder: Reminder, owner: User, item: Item, at: DateTime)`

#### Instances

- `Reminding` — instance of `Reminding` — [Recall Application Types](../design/types.md), line 30.
  - `Item` is `Tracking.Tracking` — [Recall Application Types](../design/types.md), line 32.
  - `User` is `User` — [Recall Application Types](../design/types.md), line 31.

### Sessioning

Defined in [Sessioning](../design/concepts/Sessioning.md), line 1.

#### Actions

- `start(subject: Subject) : returns (session: Session, expiresAt: DateTime)`
- `current(session: Session) : returns (subject: Subject)`
  - Refuses `UNKNOWN_SESSION`: This session is not active.
- `end(session: Session) : returns (ended: Flag)`
  - Refuses `UNKNOWN_SESSION`: This session is not active.

#### Queries

- `_active(session: Session) : optional (subject: Subject, expiresAt: DateTime)`

#### Instances

- `Sessioning` — instance of `Sessioning` — [Recall Application Types](../design/types.md), line 16.
  - `Subject` is `User` — [Recall Application Types](../design/types.md), line 17.

### Tracking

Defined in [Tracking](../design/concepts/Tracking.md), line 1.

#### Actions

- `track(user: User, item: Item) : returns (tracking: Tracking)`
  - Refuses `ALREADY_TRACKING`: This item is already being tracked.
- `complete(user: User, tracking: Tracking) : returns (tracking: Tracking)`
  - Refuses `NOT_OWNER`: You do not own this tracking.
  - Refuses `NOT_PENDING`: Only a pending tracking can be completed.
- `dismiss(user: User, tracking: Tracking) : returns (tracking: Tracking)`
  - Refuses `NOT_OWNER`: You do not own this tracking.
  - Refuses `NOT_PENDING`: Only a pending tracking can be dismissed.

#### Queries

- `_pending(user: User) : many (tracking: Tracking, item: Item)`
- `_byItem(user: User, item: Item) : optional (tracking: Tracking, status: String)`
- `_byId(tracking: Tracking) : optional (owner: User, item: Item, status: String)`

#### Instances

- `Tracking` — instance of `Tracking` — [Recall Application Types](../design/types.md), line 26.
  - `Item` is `Interpreting.Interpretation` — [Recall Application Types](../design/types.md), line 28.
  - `User` is `User` — [Recall Application Types](../design/types.md), line 27.

## Application types

Concrete types:

- `ScreenshotRef` — [Recall Application Types](../design/types.md), line 8.
- `User` — [Recall Application Types](../design/types.md), line 11.

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### the action inbox book

Authored path: `Recall.Inbox.InboxBook`.
- Covered by [Recall](../design/compositions/Recall.md), line 6.

```former
Former "the action inbox book" — inputs (user); bindings (collection, item, content, collectedAt, interpretation, kind, summary, relevantAt, status, tracking, interpretationId, reminder, at, reminderStatus); promises exactly one record — forms:
  a record of
    due: each Tracking._pending (user) has (item: interpretationId, tracking)
      form a record of
        details: a record of
          where Interpreting._byId (interpretation: interpretationId) has (item: collection)
          where Interpreting._byItem (item: collection) has (kind, summary)
          where Reminding._byItem (item: tracking, user) has (at, reminder, status: reminderStatus)
          at
          collection
          kind
          reminder
          reminderStatus
          summary
        interpretationId
        tracking
    forReview: each Collecting._byOwner (user) has (collectedAt, collection, content, item)
      form a record of
        collectedAt
        collection
        content
        item
        proposal: each Interpreting._byItem (item: collection) has (interpretation, kind, relevantAt, status, summary)
          form a record of
            interpretation
            kind
            relevantAt
            status
            summary
```

### the saved item (collection)

Authored path: `Recall.Saved.SavedDetail`.
- Covered by [Recall](../design/compositions/Recall.md), line 14.

```former
Former "the saved item (collection)" — inputs (user, collection); bindings (item, content, collectedAt, interpretation, kind, summary, relevantAt, interpretationStatus, tracking, trackingStatus, reminder, at, reminderStatus); promises exactly one record — forms:
  a record of
    where Collecting._byId (collection) has (collectedAt, content, item, owner: user)
    collectedAt
    collection
    content
    interpretationRow: a record of
      where Interpreting._byItem (item: collection) has (interpretation, kind, relevantAt, status: interpretationStatus, summary)
      interpretation
      kind
      relevantAt
      status: interpretationStatus
      summary
    item
    reminderRow: a record of
      where Interpreting._byItem (item: collection) has (interpretation)
      where Tracking._byItem (item: interpretation, user) has (tracking)
      where Reminding._byItem (item: tracking, user) has (at, reminder, status: reminderStatus)
      at
      reminder
      status: reminderStatus
    trackingRow: a record of
      where Interpreting._byItem (item: collection) has (interpretation)
      where Tracking._byItem (item: interpretation, user) has (status: trackingStatus, tracking)
      status: trackingStatus
      tracking
```

### the saved library book

Authored path: `Recall.Library.LibraryBook`.
- Covered by [Recall](../design/compositions/Recall.md), line 12.

```former
Former "the saved library book" — inputs (user); bindings (collection, content, collectedAt, interpretation, kind, summary, relevantAt, interpretationStatus, tracking, trackingStatus, reminder, at, reminderStatus); promises exactly one record — forms:
  a record of
    items: each Collecting._byOwner (user) has (collectedAt, collection, content)
      form a record of
        collectedAt
        collection
        content
        interpretationRow: a record of
          where Interpreting._byItem (item: collection) has (interpretation, kind, relevantAt, status: interpretationStatus, summary)
          interpretation
          kind
          relevantAt
          status: interpretationStatus
          summary
        reminderRow: a record of
          where Interpreting._byItem (item: collection) has (interpretation)
          where Tracking._byItem (item: interpretation, user) has (tracking)
          where Reminding._byItem (item: tracking, user) has (at, reminder, status: reminderStatus)
          at
          reminder
          status: reminderStatus
        trackingRow: a record of
          where Interpreting._byItem (item: collection) has (interpretation)
          where Tracking._byItem (item: interpretation, user) has (status: trackingStatus, tracking)
          status: trackingStatus
          tracking
```

## Reactions

### DeliverFaultToAsker

```reaction
when any action is faulted, not asked by DeliverFaultToAsker
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respondFramework (error: "INTERNAL_ERROR", requestId)
```

### DeliverRefusalToAsker

```reaction
when any action is refused (message), except RequestBoundary
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respond (error: message, requestId)
```

### Recall.Collecting.AddCaption

Authored path: `Recall.Collecting.AddCaption`.
- Covered by [Recall](../design/compositions/Recall.md), line 3.
- Covered by [Recall](../design/compositions/Recall.md), line 20.

```reaction
when RequestBoundary.request (collectedAt, content, item, kind, path: "/recall/captions/add", relevantAt, requestId, session, summary)
then
  Sessioning.current (session)
```

### Recall.Collecting.AddCaption#2

Authored path: `Recall.Collecting.AddCaption`.
- Covered by [Recall](../design/compositions/Recall.md), line 3.
- Covered by [Recall](../design/compositions/Recall.md), line 20.

```reaction
when Sessioning.current (session, subject: user), asked by Recall.Collecting.AddCaption
where
  earlier, RequestBoundary.request (collectedAt, content, item, kind, path: "/recall/captions/add", relevantAt, requestId, session, summary)
then
  Collecting.add (collectedAt, content, item, user)
```

### Recall.Collecting.AddCaption#3

Authored path: `Recall.Collecting.AddCaption`.
- Covered by [Recall](../design/compositions/Recall.md), line 3.
- Covered by [Recall](../design/compositions/Recall.md), line 20.

```reaction
when Collecting.add (collectedAt, content, item, user, collection), asked by Recall.Collecting.AddCaption#2
where
  earlier, RequestBoundary.request (collectedAt, content, item, kind, path: "/recall/captions/add", relevantAt, requestId, session, summary)
then
  Interpreting.propose (item: collection, kind, relevantAt, summary)
```

### Recall.Collecting.AddCaption#4

Authored path: `Recall.Collecting.AddCaption`.
- Covered by [Recall](../design/compositions/Recall.md), line 3.
- Covered by [Recall](../design/compositions/Recall.md), line 20.

```reaction
when Interpreting.propose (item: collection, kind, relevantAt, summary, interpretation), asked by Recall.Collecting.AddCaption#3
where
  earlier, RequestBoundary.request (collectedAt, content, item, kind, path: "/recall/captions/add", relevantAt, requestId, session, summary)
then
  RequestBoundary.respond (collection, interpretation, requestId)
```

### Recall.Inbox.List

Authored path: `Recall.Inbox.List`.
- Covered by [Recall](../design/compositions/Recall.md), line 5.
- Covered by [Recall](../design/compositions/Recall.md), line 21.

```reaction
when RequestBoundary.request (path: "/recall/inbox/list", requestId, session)
then
  Sessioning.current (session)
```

### Recall.Inbox.List#2

Authored path: `Recall.Inbox.List`.
- Covered by [Recall](../design/compositions/Recall.md), line 5.
- Covered by [Recall](../design/compositions/Recall.md), line 21.

```reaction
when Sessioning.current (session, subject: user), asked by Recall.Inbox.List
where
  earlier, RequestBoundary.request (path: "/recall/inbox/list", requestId, session)
then
  RequestBoundary.respond (book: former "the action inbox book" with (user), requestId)
```

### Recall.Library.List

Authored path: `Recall.Library.List`.
- Covered by [Recall](../design/compositions/Recall.md), line 11.
- Covered by [Recall](../design/compositions/Recall.md), line 22.

```reaction
when RequestBoundary.request (path: "/recall/library/list", requestId, session)
then
  Sessioning.current (session)
```

### Recall.Library.List#2

Authored path: `Recall.Library.List`.
- Covered by [Recall](../design/compositions/Recall.md), line 11.
- Covered by [Recall](../design/compositions/Recall.md), line 22.

```reaction
when Sessioning.current (session, subject: user), asked by Recall.Library.List
where
  earlier, RequestBoundary.request (path: "/recall/library/list", requestId, session)
then
  RequestBoundary.respond (book: former "the saved library book" with (user), requestId)
```

### Recall.Review.Confirm

Authored path: `Recall.Review.Confirm`.
- Covered by [Recall](../design/compositions/Recall.md), line 9.
- Covered by [Recall](../design/compositions/Recall.md), line 25.

```reaction
when RequestBoundary.request (at, collection, interpretation, path: "/recall/review/confirm", requestId, session)
then
  Sessioning.current (session)
```

### Recall.Review.Confirm:missing#2

Authored path: `Recall.Review.Confirm`.
- Covered by [Recall](../design/compositions/Recall.md), line 9.
- Covered by [Recall](../design/compositions/Recall.md), line 25.

```reaction
when Sessioning.current (session, subject: user), asked by Recall.Review.Confirm
where
  earlier, RequestBoundary.request (at, collection, interpretation, path: "/recall/review/confirm", requestId, session)
  no Collecting._byId (collection) has (owner: user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### Recall.Review.Confirm:owner#2

Authored path: `Recall.Review.Confirm`.
- Covered by [Recall](../design/compositions/Recall.md), line 9.
- Covered by [Recall](../design/compositions/Recall.md), line 25.

```reaction
when Sessioning.current (session, subject: user), asked by Recall.Review.Confirm
where
  earlier, RequestBoundary.request (at, collection, interpretation, path: "/recall/review/confirm", requestId, session)
  Collecting._byId (collection) has (owner: user)
then
  Interpreting.confirm (interpretation)
```

### Recall.Review.Confirm:owner#3

Authored path: `Recall.Review.Confirm`.
- Covered by [Recall](../design/compositions/Recall.md), line 9.
- Covered by [Recall](../design/compositions/Recall.md), line 25.

```reaction
when Interpreting.confirm (interpretation), asked by Recall.Review.Confirm:owner#2
where
  earlier, Sessioning.current (session, subject: user), asked by Recall.Review.Confirm
then
  Tracking.track (item: interpretation, user)
```

### Recall.Review.Confirm:owner#4

Authored path: `Recall.Review.Confirm`.
- Covered by [Recall](../design/compositions/Recall.md), line 9.
- Covered by [Recall](../design/compositions/Recall.md), line 25.

```reaction
when Tracking.track (item: interpretation, user, tracking), asked by Recall.Review.Confirm:owner#3
where
  earlier, RequestBoundary.request (at, collection, interpretation, path: "/recall/review/confirm", requestId, session)
then
  Reminding.schedule (at, item: tracking, user)
```

### Recall.Review.Confirm:owner#5

Authored path: `Recall.Review.Confirm`.
- Covered by [Recall](../design/compositions/Recall.md), line 9.
- Covered by [Recall](../design/compositions/Recall.md), line 25.

```reaction
when Reminding.schedule (at, item: tracking, user, reminder), asked by Recall.Review.Confirm:owner#4
where
  earlier, Interpreting.confirm (interpretation), asked by Recall.Review.Confirm:owner#2
  earlier, RequestBoundary.request (at, collection, interpretation, path: "/recall/review/confirm", requestId, session)
then
  RequestBoundary.respond (interpretation, reminder, requestId, tracking)
```

### Recall.Review.Get

Authored path: `Recall.Review.Get`.
- Covered by [Recall](../design/compositions/Recall.md), line 8.
- Covered by [Recall](../design/compositions/Recall.md), line 23.

```reaction
when RequestBoundary.request (collection, path: "/recall/review/get", requestId, session)
then
  Sessioning.current (session)
```

### Recall.Review.Get:found#2

Authored path: `Recall.Review.Get`.
- Covered by [Recall](../design/compositions/Recall.md), line 8.
- Covered by [Recall](../design/compositions/Recall.md), line 23.

```reaction
when Sessioning.current (session, subject: user), asked by Recall.Review.Get
where
  earlier, RequestBoundary.request (collection, path: "/recall/review/get", requestId, session)
  Collecting._byId (collection) has (collectedAt, content, item, owner: user)
  Interpreting._byItem (item: collection) has (interpretation, kind, relevantAt, status, summary)
then
  RequestBoundary.respond (collectedAt, collection, content, interpretation, item, kind, relevantAt, requestId, status, summary)
```

### Recall.Review.Get:missing#2

Authored path: `Recall.Review.Get`.
- Covered by [Recall](../design/compositions/Recall.md), line 8.
- Covered by [Recall](../design/compositions/Recall.md), line 23.

```reaction
when Sessioning.current (session, subject: user), asked by Recall.Review.Get
where
  earlier, RequestBoundary.request (collection, path: "/recall/review/get", requestId, session)
  no Collecting._byId (collection) has (owner: user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### Recall.Review.Reject

Authored path: `Recall.Review.Reject`.
- Covered by [Recall](../design/compositions/Recall.md), line 10.
- Covered by [Recall](../design/compositions/Recall.md), line 26.

```reaction
when RequestBoundary.request (collection, interpretation, path: "/recall/review/reject", requestId, session)
then
  Sessioning.current (session)
```

### Recall.Review.Reject:missing#2

Authored path: `Recall.Review.Reject`.
- Covered by [Recall](../design/compositions/Recall.md), line 10.
- Covered by [Recall](../design/compositions/Recall.md), line 26.

```reaction
when Sessioning.current (session, subject: user), asked by Recall.Review.Reject
where
  earlier, RequestBoundary.request (collection, interpretation, path: "/recall/review/reject", requestId, session)
  no Collecting._byId (collection) has (owner: user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### Recall.Review.Reject:owner#2

Authored path: `Recall.Review.Reject`.
- Covered by [Recall](../design/compositions/Recall.md), line 10.
- Covered by [Recall](../design/compositions/Recall.md), line 26.

```reaction
when Sessioning.current (session, subject: user), asked by Recall.Review.Reject
where
  earlier, RequestBoundary.request (collection, interpretation, path: "/recall/review/reject", requestId, session)
  Collecting._byId (collection) has (owner: user)
then
  Interpreting.reject (interpretation)
```

### Recall.Review.Reject:owner#3

Authored path: `Recall.Review.Reject`.
- Covered by [Recall](../design/compositions/Recall.md), line 10.
- Covered by [Recall](../design/compositions/Recall.md), line 26.

```reaction
when Interpreting.reject (interpretation), asked by Recall.Review.Reject:owner#2
where
  earlier, RequestBoundary.request (collection, interpretation, path: "/recall/review/reject", requestId, session)
then
  RequestBoundary.respond (interpretation, requestId)
```

### Recall.Review.Revise

Authored path: `Recall.Review.Revise`.
- Covered by [Recall](../design/compositions/Recall.md), line 10.
- Covered by [Recall](../design/compositions/Recall.md), line 24.

```reaction
when RequestBoundary.request (collection, interpretation, kind, path: "/recall/review/revise", relevantAt, requestId, session, summary)
then
  Sessioning.current (session)
```

### Recall.Review.Revise:missing#2

Authored path: `Recall.Review.Revise`.
- Covered by [Recall](../design/compositions/Recall.md), line 10.
- Covered by [Recall](../design/compositions/Recall.md), line 24.

```reaction
when Sessioning.current (session, subject: user), asked by Recall.Review.Revise
where
  earlier, RequestBoundary.request (collection, interpretation, kind, path: "/recall/review/revise", relevantAt, requestId, session, summary)
  no Collecting._byId (collection) has (owner: user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### Recall.Review.Revise:owner#2

Authored path: `Recall.Review.Revise`.
- Covered by [Recall](../design/compositions/Recall.md), line 10.
- Covered by [Recall](../design/compositions/Recall.md), line 24.

```reaction
when Sessioning.current (session, subject: user), asked by Recall.Review.Revise
where
  earlier, RequestBoundary.request (collection, interpretation, kind, path: "/recall/review/revise", relevantAt, requestId, session, summary)
  Collecting._byId (collection) has (owner: user)
then
  Interpreting.revise (interpretation, kind, relevantAt, summary)
```

### Recall.Review.Revise:owner#3

Authored path: `Recall.Review.Revise`.
- Covered by [Recall](../design/compositions/Recall.md), line 10.
- Covered by [Recall](../design/compositions/Recall.md), line 24.

```reaction
when Interpreting.revise (interpretation, kind, relevantAt, summary), asked by Recall.Review.Revise:owner#2
where
  earlier, RequestBoundary.request (collection, interpretation, kind, path: "/recall/review/revise", relevantAt, requestId, session, summary)
then
  RequestBoundary.respond (interpretation, requestId)
```

### Recall.Saved.Complete

Authored path: `Recall.Saved.Complete`.
- Covered by [Recall](../design/compositions/Recall.md), line 15.
- Covered by [Recall](../design/compositions/Recall.md), line 28.

```reaction
when RequestBoundary.request (collection, path: "/recall/saved/complete", requestId, session, tracking)
then
  Sessioning.current (session)
```

### Recall.Saved.Complete:missing#2

Authored path: `Recall.Saved.Complete`.
- Covered by [Recall](../design/compositions/Recall.md), line 15.
- Covered by [Recall](../design/compositions/Recall.md), line 28.

```reaction
when Sessioning.current (session, subject: user), asked by Recall.Saved.Complete
where
  earlier, RequestBoundary.request (collection, path: "/recall/saved/complete", requestId, session, tracking)
  no Collecting._byId (collection) has (owner: user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### Recall.Saved.Complete:owner#2

Authored path: `Recall.Saved.Complete`.
- Covered by [Recall](../design/compositions/Recall.md), line 15.
- Covered by [Recall](../design/compositions/Recall.md), line 28.

```reaction
when Sessioning.current (session, subject: user), asked by Recall.Saved.Complete
where
  earlier, RequestBoundary.request (collection, path: "/recall/saved/complete", requestId, session, tracking)
  Collecting._byId (collection) has (owner: user)
then
  Tracking.complete (tracking, user)
```

### Recall.Saved.Complete:owner#3

Authored path: `Recall.Saved.Complete`.
- Covered by [Recall](../design/compositions/Recall.md), line 15.
- Covered by [Recall](../design/compositions/Recall.md), line 28.

```reaction
when Tracking.complete (tracking, user), asked by Recall.Saved.Complete:owner#2
where
  earlier, RequestBoundary.request (collection, path: "/recall/saved/complete", requestId, session, tracking)
then
  RequestBoundary.respond (requestId, tracking)
```

### Recall.Saved.Dismiss

Authored path: `Recall.Saved.Dismiss`.
- Covered by [Recall](../design/compositions/Recall.md), line 15.
- Covered by [Recall](../design/compositions/Recall.md), line 29.

```reaction
when RequestBoundary.request (collection, path: "/recall/saved/dismiss", requestId, session, tracking)
then
  Sessioning.current (session)
```

### Recall.Saved.Dismiss:missing#2

Authored path: `Recall.Saved.Dismiss`.
- Covered by [Recall](../design/compositions/Recall.md), line 15.
- Covered by [Recall](../design/compositions/Recall.md), line 29.

```reaction
when Sessioning.current (session, subject: user), asked by Recall.Saved.Dismiss
where
  earlier, RequestBoundary.request (collection, path: "/recall/saved/dismiss", requestId, session, tracking)
  no Collecting._byId (collection) has (owner: user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### Recall.Saved.Dismiss:owner#2

Authored path: `Recall.Saved.Dismiss`.
- Covered by [Recall](../design/compositions/Recall.md), line 15.
- Covered by [Recall](../design/compositions/Recall.md), line 29.

```reaction
when Sessioning.current (session, subject: user), asked by Recall.Saved.Dismiss
where
  earlier, RequestBoundary.request (collection, path: "/recall/saved/dismiss", requestId, session, tracking)
  Collecting._byId (collection) has (owner: user)
then
  Tracking.dismiss (tracking, user)
```

### Recall.Saved.Dismiss:owner#3

Authored path: `Recall.Saved.Dismiss`.
- Covered by [Recall](../design/compositions/Recall.md), line 15.
- Covered by [Recall](../design/compositions/Recall.md), line 29.

```reaction
when Tracking.dismiss (tracking, user), asked by Recall.Saved.Dismiss:owner#2
where
  earlier, RequestBoundary.request (collection, path: "/recall/saved/dismiss", requestId, session, tracking)
then
  RequestBoundary.respond (requestId, tracking)
```

### Recall.Saved.Get

Authored path: `Recall.Saved.Get`.
- Covered by [Recall](../design/compositions/Recall.md), line 13.
- Covered by [Recall](../design/compositions/Recall.md), line 27.

```reaction
when RequestBoundary.request (collection, path: "/recall/saved/get", requestId, session)
then
  Sessioning.current (session)
```

### Recall.Saved.Get:found#2

Authored path: `Recall.Saved.Get`.
- Covered by [Recall](../design/compositions/Recall.md), line 13.
- Covered by [Recall](../design/compositions/Recall.md), line 27.

```reaction
when Sessioning.current (session, subject: user), asked by Recall.Saved.Get
where
  earlier, RequestBoundary.request (collection, path: "/recall/saved/get", requestId, session)
  Collecting._byId (collection) has (owner: user)
then
  RequestBoundary.respond (item: former "the saved item (collection)" with (collection, user), requestId)
```

### Recall.Saved.Get:missing#2

Authored path: `Recall.Saved.Get`.
- Covered by [Recall](../design/compositions/Recall.md), line 13.
- Covered by [Recall](../design/compositions/Recall.md), line 27.

```reaction
when Sessioning.current (session, subject: user), asked by Recall.Saved.Get
where
  earlier, RequestBoundary.request (collection, path: "/recall/saved/get", requestId, session)
  no Collecting._byId (collection) has (owner: user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### Recall.Saved.Reschedule

Authored path: `Recall.Saved.Reschedule`.
- Covered by [Recall](../design/compositions/Recall.md), line 16.
- Covered by [Recall](../design/compositions/Recall.md), line 30.

```reaction
when RequestBoundary.request (at, collection, path: "/recall/saved/reschedule", requestId, session, tracking)
then
  Sessioning.current (session)
```

### Recall.Saved.Reschedule:missing#2

Authored path: `Recall.Saved.Reschedule`.
- Covered by [Recall](../design/compositions/Recall.md), line 16.
- Covered by [Recall](../design/compositions/Recall.md), line 30.

```reaction
when Sessioning.current (session, subject: user), asked by Recall.Saved.Reschedule
where
  earlier, RequestBoundary.request (at, collection, path: "/recall/saved/reschedule", requestId, session, tracking)
  no Collecting._byId (collection) has (owner: user)
then
  RequestBoundary.respond (error: "NOT_FOUND", requestId)
```

### Recall.Saved.Reschedule:owner#2

Authored path: `Recall.Saved.Reschedule`.
- Covered by [Recall](../design/compositions/Recall.md), line 16.
- Covered by [Recall](../design/compositions/Recall.md), line 30.

```reaction
when Sessioning.current (session, subject: user), asked by Recall.Saved.Reschedule
where
  earlier, RequestBoundary.request (at, collection, path: "/recall/saved/reschedule", requestId, session, tracking)
  Collecting._byId (collection) has (owner: user)
  Reminding._byItem (item: tracking, user) has (reminder)
then
  Reminding.reschedule (at, reminder, user)
```

### Recall.Saved.Reschedule:owner#3

Authored path: `Recall.Saved.Reschedule`.
- Covered by [Recall](../design/compositions/Recall.md), line 16.
- Covered by [Recall](../design/compositions/Recall.md), line 30.

```reaction
when Reminding.reschedule (at, reminder, user), asked by Recall.Saved.Reschedule:owner#2
where
  earlier, RequestBoundary.request (at, collection, path: "/recall/saved/reschedule", requestId, session, tracking)
then
  RequestBoundary.respond (at, reminder, requestId)
```

### Recall.Sweep.Tick

Authored path: `Recall.Sweep.Tick`.
- Covered by [Recall](../design/compositions/Recall.md), line 16.
- Covered by [Recall](../design/compositions/Recall.md), line 31.

```reaction
when RequestBoundary.request (now, path: "/recall/sweep/tick", requestId)
then
  Reminding.sweepDue (now)
```

### Recall.Sweep.Tick#2

Authored path: `Recall.Sweep.Tick`.
- Covered by [Recall](../design/compositions/Recall.md), line 16.
- Covered by [Recall](../design/compositions/Recall.md), line 31.

```reaction
when Reminding.sweepDue (now, count), asked by Recall.Sweep.Tick
where
  earlier, RequestBoundary.request (now, path: "/recall/sweep/tick", requestId)
then
  RequestBoundary.respond (count, requestId)
```

### Sessions.Current

Authored path: `Sessions.Current`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 4.
- Covered by [Sessions](../design/compositions/Sessions.md), line 8.

```reaction
when RequestBoundary.request (path: "/recall/current", requestId, session)
then
  Sessioning.current (session)
```

### Sessions.Current#2

Authored path: `Sessions.Current`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 4.
- Covered by [Sessions](../design/compositions/Sessions.md), line 8.

```reaction
when Sessioning.current (session, subject: user), asked by Sessions.Current
where
  earlier, RequestBoundary.request (path: "/recall/current", requestId, session)
then
  RequestBoundary.respond (requestId, user)
```

### Sessions.Start

Authored path: `Sessions.Start`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 3.
- Covered by [Sessions](../design/compositions/Sessions.md), line 7.

```reaction
when RequestBoundary.request (path: "/recall/start", requestId, user)
then
  Sessioning.start (subject: user)
```

### Sessions.Start#2

Authored path: `Sessions.Start`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 3.
- Covered by [Sessions](../design/compositions/Sessions.md), line 7.

```reaction
when Sessioning.start (subject: user, expiresAt, session), asked by Sessions.Start
where
  earlier, RequestBoundary.request (path: "/recall/start", requestId, user)
then
  RequestBoundary.respond (expiresAt, requestId, session, user)
```

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/recall/captions/add` — requires `session`, `item`, `content`, `collectedAt`, `kind`, `summary`, `relevantAt`
- `/recall/current` — requires `session`
- `/recall/inbox/list` — requires `session`
- `/recall/library/list` — requires `session`
- `/recall/review/confirm` — requires `session`, `collection`, `interpretation`, `at`
- `/recall/review/get` — requires `session`, `collection`
- `/recall/review/reject` — requires `session`, `collection`, `interpretation`
- `/recall/review/revise` — requires `session`, `collection`, `interpretation`, `kind`, `summary`, `relevantAt`
- `/recall/saved/complete` — requires `session`, `tracking`, `collection`
- `/recall/saved/dismiss` — requires `session`, `tracking`, `collection`
- `/recall/saved/get` — requires `session`, `collection`
- `/recall/saved/reschedule` — requires `session`, `tracking`, `collection`, `at`
- `/recall/start` — requires `user`
- `/recall/sweep/tick` — requires `now`
