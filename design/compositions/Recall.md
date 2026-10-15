# Recall

Signed-in users [add a caption](reaction:Recall.Collecting.AddCaption) to simulate a detected
screenshot. The application proposes an interpretation, then lists the
[action inbox](reaction:Recall.Inbox.List) using the
[action inbox book](former:Recall.Inbox.InboxBook).

A user [opens review](reaction:Recall.Review.Get) for one inbox item. When the user
[confirms](reaction:Recall.Review.Confirm), tracking and reminding follow.
Users [revise](reaction:Recall.Review.Revise), [reject](reaction:Recall.Review.Reject),
[list every saved screenshot](reaction:Recall.Library.List) using the
[saved library book](former:Recall.Library.LibraryBook),
[open a saved item](reaction:Recall.Saved.Get) using the
[saved item detail](former:Recall.Saved.SavedDetail),
[complete](reaction:Recall.Saved.Complete), [dismiss](reaction:Recall.Saved.Dismiss), or
[reschedule](reaction:Recall.Saved.Reschedule) items they own. A [sweep tick](reaction:Recall.Sweep.Tick)
marks due reminders when their time arrives.

```endpoints
Recall.Collecting.AddCaption at /recall/captions/add
Recall.Inbox.List at /recall/inbox/list
Recall.Library.List at /recall/library/list
Recall.Review.Get at /recall/review/get
Recall.Review.Revise at /recall/review/revise
Recall.Review.Confirm at /recall/review/confirm
Recall.Review.Reject at /recall/review/reject
Recall.Saved.Get at /recall/saved/get
Recall.Saved.Complete at /recall/saved/complete
Recall.Saved.Dismiss at /recall/saved/dismiss
Recall.Saved.Reschedule at /recall/saved/reschedule
Recall.Sweep.Tick at /recall/sweep/tick
```
