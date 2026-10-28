# Interpreting

## Purpose

Let uncertain interpretations of items be proposed and corrected before they are relied upon.

## Principle

An interpretation is proposed for an item. While it is proposed, the user may revise,
confirm, or reject it. After confirmation or rejection, the interpretation cannot be
changed through propose again on the same row without a new proposal.

**Design decisions and guarantees.**

An interpretation refers to an opaque item and does not know its owner. Recall
binds that item to a collection and authorizes it before invoking mutations.
`proposed` permits revision, confirmation or rejection. Both terminal states refuse
further changes on that row. Conditional database updates enforce that rule even
when two requests arrive together. An absent relevantAt is an honest undated
interpretation, not a default current time. Queries return null for absence so
clients can distinguish a Found idea from a dated reminder.

## Types

```types
external Item
  The item being interpreted.
```

## State

```state
a set of Interpretations with
  an item Item
  a kind String
  a summary String
  an optional relevantAt DateTime
  a status String
```

## Actions

```actions
remove (interpretation: Interpretation) : returns (interpretation: Interpretation)
  where true
  then
    delete interpretation if it exists
    returns interpretation


propose (item: Item, kind: String, summary: String, relevantAt?: DateTime) : returns (interpretation: Interpretation)
  where supplied relevantAt is not a finite timestamp with a timezone
  then
    refuses INVALID_TIME "Use a valid timestamp with a timezone."
  where true
  then
    add a new interpretation for item with kind, summary, relevantAt, and status "proposed"
    returns interpretation

confirm (interpretation: Interpretation) : returns (interpretation: Interpretation)
  where interpretation does not exist or status is not "proposed"
  then
    refuses NOT_PROPOSED "Only a proposed interpretation can be confirmed."
  where interpretation exists and status is "proposed"
  then
    set status to "confirmed"
    returns interpretation

revise (interpretation: Interpretation, kind: String, summary: String, relevantAt?: DateTime) : returns (interpretation: Interpretation)
  where supplied relevantAt is not a finite timestamp with a timezone
  then
    refuses INVALID_TIME "Use a valid timestamp with a timezone."
  where interpretation does not exist or status is not "proposed"
  then
    refuses NOT_PROPOSED "Only a proposed interpretation can be revised."
  where interpretation exists and status is "proposed"
  then
    replace kind, summary, and relevantAt
    returns interpretation

reject (interpretation: Interpretation) : returns (interpretation: Interpretation)
  where interpretation does not exist or status is not "proposed"
  then
    refuses NOT_PROPOSED "Only a proposed interpretation can be rejected."
  where interpretation exists and status is "proposed"
  then
    set status to "rejected"
    returns interpretation
```

## Queries

```queries
_allByItem (item: Item) : many (interpretation: Interpretation)
  answers every interpretation for item, including rejected and confirmed rows


_byItem (item: Item) : optional (interpretation: Interpretation, kind: String, summary: String, relevantAt: DateTime | null, status: String)
  answers the latest interpretation for item if any; relevantAt is null when absent

_byId (interpretation: Interpretation) : optional (item: Item, kind: String, summary: String, relevantAt: DateTime | null, status: String)
  answers no row for an unknown interpretation; relevantAt is null when absent
```
