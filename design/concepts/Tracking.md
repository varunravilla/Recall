# Tracking

## Purpose

Distinguish unresolved intentions from ones that have already been resolved.

## Principle

A user tracks an item while it still deserves attention, then completes or dismisses it.
Pending items are listed separately from completed and dismissed ones.

## Types

```types
external User
  The owner of a tracking.

external Item
  The interpreted item being tracked.
```

## State

```state
a set of Trackings with
  an owner User
  an item Item
  a status String
```

## Actions

```actions
remove (user: User, tracking: Tracking) : returns (tracking: Tracking)
  where tracking does not exist or user is not its owner
  then
    refuses NOT_OWNER "You do not own this tracking."
  where tracking exists and user is its owner
  then
    delete tracking regardless of status
    returns tracking


track (user: User, item: Item) : returns (tracking: Tracking)
  where an active pending tracking already exists for this user and item
  then
    refuses ALREADY_TRACKING "This item is already being tracked."
  where no active pending tracking exists for this user and item
  then
    add a tracking with owner user, item item, and status "pending"
    returns tracking

complete (user: User, tracking: Tracking) : returns (tracking: Tracking)
  where tracking does not exist or user is not its owner
  then
    refuses NOT_OWNER "You do not own this tracking."
  where tracking exists, user is its owner, and status is not "pending"
  then
    refuses NOT_PENDING "Only a pending tracking can be completed."
  where tracking exists, user is its owner, and status is "pending"
  then
    set status to "completed"
    returns tracking

dismiss (user: User, tracking: Tracking) : returns (tracking: Tracking)
  where tracking does not exist or user is not its owner
  then
    refuses NOT_OWNER "You do not own this tracking."
  where tracking exists, user is its owner, and status is not "pending"
  then
    refuses NOT_PENDING "Only a pending tracking can be dismissed."
  where tracking exists, user is its owner, and status is "pending"
  then
    set status to "dismissed"
    returns tracking
```

## Queries

```queries
_allByItem (item: Item) : many (tracking: Tracking, owner: User)
  answers every tracking for item, including resolved rows


_pending (user: User) : many (tracking: Tracking, item: Item)
  answers every tracking for user with status "pending"

_byItem (user: User, item: Item) : optional (tracking: Tracking, status: String)
  answers no row when none exists for this user and item

_byId (tracking: Tracking) : optional (owner: User, item: Item, status: String)
  answers no row for an unknown tracking
```
