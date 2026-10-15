# Collecting

## Purpose

Maintain items discovered for a user without requiring the user to organize them manually.

## Principle

Maya adds a screenshot caption to her collection. It remains until she removes it.
Adding the same item twice for the same user is refused.

## Types

```types
external User
  The owner of collected items.

external Item
  An opaque reference to a discovered screenshot or capture.
```

## State

```state
a set of Collections with
  an owner User
  an item Item
  a content String
  a collectedAt DateTime
```

## Actions

```actions
add (user: User, item: Item, content: String, collectedAt: DateTime) : returns (collection: Collection)
  where content is blank
  then
    refuses EMPTY_CONTENT "Caption cannot be empty."
  where a collection already exists for this user and item
  then
    refuses ALREADY_COLLECTED "This item is already in the collection."
  where no collection exists for this user and item
  then
    add a new collection with owner user, item item, content content, and collectedAt collectedAt
    returns collection

remove (user: User, collection: Collection) : returns (collection: Collection)
  where collection does not exist or user is not its owner
  then
    refuses NOT_OWNER "You do not own this collection."
  where collection exists and user is its owner
  then
    remove collection
    returns collection
```

## Queries

```queries
_byOwner (user: User) : many (collection: Collection, item: Item, content: String, collectedAt: DateTime)
  answers every collection for user in collectedAt order

_byId (collection: Collection) : optional (owner: User, item: Item, content: String, collectedAt: DateTime)
  answers no row for an unknown collection
```
