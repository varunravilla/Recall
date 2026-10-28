# Sessioning

## Purpose

Keep a short-lived opaque session for an external subject, so temporary access
can end without changing that subject's identity.

## Principle

Maya starts a session for her user id. Before it expires, current resolves to that
subject. An unknown or expired session is refused.

**Design decisions and guarantees.**

The subject is an external stable identity, not a username supplied to this
concept. Sessions are random opaque tokens held in memory with a 30-minute expiry.
Current refuses unknown, revoked and expired tokens. End revokes only the supplied
token, so another login remains independent. Restart deliberately signs everyone
out while leaving persistent accounts and saved data intact. Possession of a valid
session establishes identity; collection ownership still needs a separate check.

## Types

```types
external Subject
  The external identity represented by a session.
```

## State

```state
a set of Sessions with
  a subject Subject
  an expiresAt DateTime
```

## Actions

```actions
start (subject: Subject) : returns (session: Session, expiresAt: DateTime)
  where true
  then
    delete every expired session
    add a new opaque session for subject expiring 30 minutes from now
    returns session, expiresAt

current (session: Session) : returns (subject: Subject)
  where session is unknown, ended, or expired
  then
    delete the session if it is expired
    refuses UNKNOWN_SESSION "This session is not active."
  where session is active
  then
    bind subject to the Session's subject
    returns subject

end (session: Session) : returns (ended: Flag)
  where session is unknown, ended, or expired
  then
    delete the session if it is expired
    refuses UNKNOWN_SESSION "This session is not active."
  where session is active
  then
    delete session
    set ended to true
    returns ended
```

## Queries

```queries
_active (session: Session) : optional (subject: Subject, expiresAt: DateTime)
  answers no row for an unknown, ended, or expired Session
  does not delete an expired Session
```
