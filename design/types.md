# Recall Application Types

Recall binds session subjects to collecting owners. Each collected screenshot
reference becomes a collection row. Interpretations attach to collections;
trackings attach to confirmed interpretations; reminders attach to trackings.

```types
concrete ScreenshotRef
  An opaque id standing in for a screenshot detected from Photos or pasted in the web MVP.

concrete User
  The signed-in user subject stored in the session.
```

```instances
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
