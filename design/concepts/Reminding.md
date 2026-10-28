# Reminding

## Purpose

Return an item to a user's attention at a chosen future time.

## Principle

A reminder is scheduled for a tracked item. When its time arrives, due marks it due.
Acknowledging or cancelling ends its scheduled life.

**Design decisions and guarantees.**

The item is opaque here. Recall binds it to a tracking, which is why resolving an
intention can cancel its reminder without changing the original screenshot.
Dates normalize to finite instants before storage; timezone interpretation belongs
to the intake/UI boundary. `scheduled` can become due through the server clock,
then acknowledged or cancelled. Rescheduling a due reminder refuses instead of
silently hiding it. `_byItem` returns only active scheduled/due rows, while removal
covers every historical status. SweepDue is a server maintenance operation that
can advance all owners' reminders; only authenticated Recall routes invoke it,
and owner-scoped read models determine which items a person sees.

## Types

```types
external User
  The owner of a reminder.

external Item
  The tracked item the reminder refers to.
```

## State

```state
a set of Reminders with
  an owner User
  an item Item
  an at DateTime
  a status String
```

## Actions

```actions
removeItem (user: User, item: Item) : returns (item: Item)
  where true
  then
    delete every reminder for this owner and item regardless of status
    returns item


schedule (user: User, item: Item, at: DateTime) : returns (reminder: Reminder)
  where at is not a finite timestamp with a timezone
  then
    refuses INVALID_TIME "Use a valid timestamp with a timezone."
  where true
  then
    add a reminder with owner user, item item, at at, and status "scheduled"
    returns reminder

reschedule (user: User, reminder: Reminder, at: DateTime) : returns (reminder: Reminder)
  where at is not a finite timestamp with a timezone
  then
    refuses INVALID_TIME "Use a valid timestamp with a timezone."
  where reminder does not exist or user is not its owner
  then
    refuses NOT_OWNER "You do not own this reminder."
  where reminder exists, user is its owner, and status is not "scheduled"
  then
    refuses NOT_SCHEDULED "Only a scheduled reminder can be rescheduled."
  where reminder exists, user is its owner, and status is "scheduled"
  then
    set at to at
    returns reminder

cancel (user: User, reminder: Reminder) : returns (reminder: Reminder)
  where reminder does not exist or user is not its owner
  then
    refuses NOT_OWNER "You do not own this reminder."
  where reminder exists and user is its owner
  then
    set status to "cancelled"
    returns reminder

due (reminder: Reminder, now: DateTime) : returns (reminder: Reminder)
  where reminder does not exist or status is not "scheduled"
  then
    refuses NOT_SCHEDULED "This reminder is not scheduled."
  where reminder exists, status is "scheduled", and now is before at
  then
    refuses NOT_YET "It is not time for this reminder yet."
  where reminder exists, status is "scheduled", and now is at or after at
  then
    set status to "due"
    returns reminder

sweepDue (now: DateTime) : returns (count: Number)
  where true
  then
    set status to "due" for every scheduled reminder whose at is at or before now
    returns count

acknowledge (user: User, reminder: Reminder) : returns (reminder: Reminder)
  where reminder does not exist or user is not its owner
  then
    refuses NOT_OWNER "You do not own this reminder."
  where reminder exists, user is its owner, and status is not "due"
  then
    refuses NOT_DUE "Only a due reminder can be acknowledged."
  where reminder exists, user is its owner, and status is "due"
  then
    set status to "acknowledged"
    returns reminder
```

## Queries

```queries
_byItem (user: User, item: Item) : optional (reminder: Reminder, at: DateTime, status: String)
  answers the active reminder for this user and item if any

_scheduledBefore (now: DateTime) : many (reminder: Reminder, owner: User, item: Item, at: DateTime)
  answers scheduled reminders whose at is at or before now
```
