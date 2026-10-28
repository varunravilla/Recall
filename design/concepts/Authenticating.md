# Authenticating

## Purpose

Protect a persistent account with a password.

## Principle

Maya registers a username and password. Logging in with that password returns the same account id; a wrong password grants no access.

**Design decisions and guarantees.**

An account id is independent of its displayed username, so a fresh login resolves
to the same collection owner. Usernames normalize before the unique lookup.
Passwords are hashed with Argon2id and never returned. Unknown accounts and wrong
passwords share the same refusal. This concept establishes identity; it does not
issue sessions or decide whether an account owns a screenshot.

## Types

```types
```

## State

```state
a set of Accounts with
  a username String
  a passwordHash String
```

## Actions

```actions
register (username: String, password: String) : returns (user: String)
  where username or password is invalid
  then
    refuses INVALID_CREDENTIALS "Use a 3–40 character username and a 12–128 character password."
  where username is already registered
  then
    refuses ACCOUNT_EXISTS "That username is unavailable."
  where credentials are valid and username is available
  then
    hash password and create a unique account with normalized username
    bind user to the new account id
    returns user

login (username: String, password: String) : returns (user: String)
  where account is unknown or password does not match
  then
    refuses INVALID_CREDENTIALS "Username or password is incorrect."
  where password matches the account
  then
    bind user to the account id
    returns user
```

## Queries

```queries
```
