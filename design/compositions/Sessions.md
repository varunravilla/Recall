# Sessions

A visitor [registers](reaction:Sessions.Register) a password-protected account or
[logs in](reaction:Sessions.Start). Successful authentication starts a 30-minute
session for the account id. [Current](reaction:Sessions.Current) resolves that id;
[End](reaction:Sessions.End) revokes the token on logout.

```endpoints
Sessions.Register at /recall/register
Sessions.Start at /recall/start
Sessions.Current at /recall/current
Sessions.End at /recall/end
```
