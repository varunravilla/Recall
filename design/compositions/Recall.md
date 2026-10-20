# Recall

Signed-in users import photos through the authenticated Gemini adapter. Dated
imports become proposals; undated finds are saved without reminders. The legacy
[caption endpoint](reaction:Recall.Collecting.AddCaption) accepts text directly
for compatibility. The [action inbox](reaction:Recall.Inbox.List) uses the
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
uses the server clock to mark due reminders; it requires an active session.
[Completion](reaction:Recall.CancelCompleted) and
[dismissal](reaction:Recall.CancelDismissed) cancel the item’s active reminder.
Every mutation checks both the collection owner and the supplied interpretation
or tracking id’s relationship to that collection.

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

## Photo import

[AddPhoto](reaction:Recall.Photos.Add) stores the generated caption and a persisted
image, then proposes its generated action and time. [Image](reaction:Recall.Photos.Get)
returns image data only to the collection owner. [Lookup](reaction:Recall.Photos.Find)
checks duplicates within the signed-in user's captures.

The multipart HTTP adapter authenticates before calling Gemini. It provides server
time, the user's timezone, and an image as untrusted content. Generated captions,
actions and ISO dates are validated before AddPhoto is invoked. Expired deadlines,
past reminder times, inconsistent supplied dates, and non-actionable images are skipped without
writing a collection. Dated suggestions need user confirmation before tracking; undated finds do not
create reminders. Imported
images are optimized copies; existing text captures have no image.

```endpoints
Recall.Photos.Add at /recall/photos/add
Recall.Photos.Found at /recall/photos/found
Recall.Photos.Get at /recall/photos/get
Recall.Photos.Find at /recall/photos/find
```

## Delete a saved item

[Delete](reaction:Recall.Saved.Delete) checks the collection owner and removes
the collection and its stored image. [RemoveInterpretations](reaction:Recall.RemoveInterpretations)
runs only after successful removal and removes every associated interpretation. [RemoveTrackings](reaction:Recall.RemoveTrackings)
and [RemoveReminders](reaction:Recall.RemoveReminders) remove their trackings and
reminders, including resolved or cancelled records. Unconfirmed items follow the
same deletion path. The interface asks for confirmation before permanent deletion.

```endpoints
Recall.Saved.Delete at /recall/saved/delete
```

## Undated finds

Photo imports may omit relevantAt when no reliable date is visible. Such items
are confirmed as finds without creating tracking or reminders. They appear as
Found in Saved. Known expired events remain excluded; no reminder date is invented.

[AddFoundPhoto](reaction:Recall.Photos.Found) stores an undated photo and confirms its interpretation without tracking or reminders.

## Pipelined import

The photo HTTP adapter accepts up to ten optimized images per batch, assigns
opaque request-local ids, and requests one independently validated Gemini result
per id. It rejects missing, duplicate or foreign ids before writing any results.
Stored duplicates bypass inference; a duplicate within the same batch reuses the
first image's outcome. Each accepted photo uses the existing dated/undated write
composition with its own owner check and source image. No concept calls Gemini.

The client prepares at most one batch ahead while the current inference runs.
All new readable selections use AI analysis; local screening is removed. Pause
stops new requests and preserves prepared entries. Quota responses retain the
batch and set a server-wide cooldown; optional configured request limits pace
calls across accounts. There is no fixed per-photo sleep or automatic paid fallback.

## Import simplification

AI analysis is now the only photo-import path. Local OCR, keyword filters, and
mode controls are removed. Every readable new selection is eligible for analysis
after consent; known saved duplicates still bypass inference. The batch limit is
ten. New uploads target at most 1 MB each, retaining the existing 10 MB raw batch
and 12 MB multipart limits so Gemini inline data remains below 20 MB after base64.
Preparation remains bounded to one batch ahead. The interface describes selection,
progress, pause, retry and results, not batch sizes or provider internals. A short
privacy disclosure identifies the external processor and its data terms.
