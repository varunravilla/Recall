# Recall Application Types

Recall binds session subjects to collecting owners. Each collected screenshot
reference becomes a collection row. Interpretations attach to collections;
trackings attach to confirmed interpretations; reminders attach to trackings.

```types
concrete ScreenshotRef
  An opaque capture identity. Photo imports use the hash of optimized image bytes; Collecting stores the image and caption. Legacy text captures use a caller-supplied identity.

concrete User
  The signed-in user subject stored in the session.
```

```instances
instantiate Authenticating
instantiate Sessioning with
  Subject is User

instantiate Collecting with
  User is User
  Item is ScreenshotRef

instantiate Interpreting with
  Item is Collecting.Collection

instantiate Tracking with
  User is User
  Item is Interpreting.Interpretation

instantiate Reminding with
  User is User
  Item is Tracking.Tracking
```
