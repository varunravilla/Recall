# Collecting

## Purpose

Maintain items discovered for a user without requiring the user to organize them manually.

## Principle

Maya adds a screenshot caption to her collection. It remains until she removes it.
Adding the same item twice for the same user is refused.

**Design decisions and guarantees.**

A capture identity is unique within one owner, not globally. Two people may save
the same image without learning that the other has it. The caption and optional
optimized image describe one source and persist together. Metadata list queries
exclude image bytes; a separate owner-scoped query retrieves them. `_byId` is an
internal query and does not itself authorize a caller: compositions must bind its
owner to the authenticated subject. Accepted timestamps normalize to stored dates.
Removing a collection ends source storage; related-record cleanup is a composition
consequence, not an implicit dependency of this concept.

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
  an optional imageData String
  an optional mimeType String
```

## Actions

```actions
add (user: User, item: Item, content: String, collectedAt: DateTime) : returns (collection: Collection)
  where collectedAt is not a finite timestamp with a timezone
  then
    refuses INVALID_TIME "Use a valid timestamp with a timezone."
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

addPhoto (user: User, item: Item, content: String, collectedAt: DateTime, imageData: String, mimeType: String) : returns (collection: Collection)
  where collectedAt is not a finite timestamp with a timezone
  then
    refuses INVALID_TIME "Use a valid timestamp with a timezone."
  where content is blank or image is not a supported valid image of at most 2 MB
  then
    refuses EMPTY_CONTENT "Caption or image is invalid."
  where a collection already exists for this user and item
  then
    refuses ALREADY_COLLECTED "This item is already in the collection."
  where caption and image are valid and no collection exists for this user and item
  then
    add a collection with the given caption, image, mime type, owner, item and time
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
_photo (user: User, collection: Collection) : optional (imageData: String, mimeType: String)
  answers the persisted image only when user owns the collection and an image exists

_find (user: User, item: Item) : optional (collection: Collection)
  answers the collection for this owner and capture reference, without image bytes


_byOwner (user: User) : many (collection: Collection, item: Item, content: String, collectedAt: DateTime)
  answers every collection for user in collectedAt order

_byId (collection: Collection) : optional (owner: User, item: Item, content: String, collectedAt: DateTime)
  answers no row for an unknown collection
```
