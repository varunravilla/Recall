# Sessions

A visitor [registers](reaction:Sessions.Register) a password-protected account or
[logs in](reaction:Sessions.Start). Successful authentication starts a 30-minute
session for the account id. [Current](reaction:Sessions.Current) resolves that id;
[End](reaction:Sessions.End) revokes the token on logout.

## Boundary and identity

Registration and login are public because a visitor has no token yet. They return
an account identity only after Authenticating succeeds. Sessioning starts a fresh
opaque token for that account id, never for a user id supplied by the caller.
A bad password does not create a session. Duplicate registration refuses without
replacing the stored password hash.

Input admission requires nonblank strings before invoking authentication. Invalid
JSON types return 400; well-formed but incorrect credentials return 401. The
authentication concept also rejects non-string values defensively, so direct
internal calls cannot turn a bad value into a trim/hash runtime exception.

Current and End require the token. Current resolves an active subject without
returning a password hash. End revokes that token, so subsequent reads and writes
fail authentication. Independent tokens for the same account remain independent.
Thirty-minute sessions live in memory and disappear on restart. Accounts and
saved data live in MongoDB, so logging in again restores the same collection.

This composition owns access establishment and revocation. Item-specific ownership
belongs in Recall, where collection and interpretation identities can be checked
together. HTTP maps credential/session refusals to 401 and duplicate accounts to
409. No raw credential values or password hashes belong in responses or logs.

## Verification

Authenticating and Sessioning concept tests cover credential refusal, duplicate
registration, expiry and logout. HTTP tests additionally check that incorrect
credentials cannot start a session, a fresh login recovers persistent data, and a
revoked token cannot call protected endpoints.

```endpoints
Sessions.Register at /recall/register
Sessions.Start at /recall/start
Sessions.Current at /recall/current
Sessions.End at /recall/end
```
