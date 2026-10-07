# Recall

Screenshots should come back when they become useful, not just become easier to find.

People screenshot restaurants, events, and products because saving is almost effortless. The screenshot keeps what was on the screen and loses why it was saved. Recall treats a new screenshot as the start of a small intention: interpret it, let the user confirm, then bring it back when it matters.

The full design writeup is in [P1.md](P1.md).

## How it works

Recall is limited to events, places, and products. It does not buy tickets, book restaurants, or complete purchases.

1. **Capturing.** New screenshots stay available without being organized first.
2. **Interpreting.** Recall proposes a kind, a summary, and an optional relevant time. The user confirms, edits, or ignores that suggestion.
3. **Tracking.** A confirmed item stays pending until the user marks it complete or dismisses it.
4. **Reminding.** If the item has a relevant time, Recall brings it back then.

## Screens

| Screen | File |
| --- | --- |
| Photos permission | [design_images/permission.png](design_images/permission.png) |
| Action Inbox | [design_images/inbox.png](design_images/inbox.png) |
| Review a suggested action | [design_images/review.png](design_images/review.png) |
| Pending saved item | [design_images/pending.png](design_images/pending.png) |
| Reminder brought back | [design_images/reminder.png](design_images/reminder.png) |
| Completed item | [design_images/completed.png](design_images/completed.png) |

### Photos permission

Recall asks for photo access so it can detect new screenshots. Access is optional; the user can skip it.

![Photos permission](design_images/permission.png)

### Action Inbox

The inbox shows screenshots Recall thinks are actionable, each with a suggested interpretation. The user reviews or ignores each one.

![Action Inbox](design_images/inbox.png)

### Review

Recognition is a suggestion. Before Recall relies on it, the user confirms the type, title, action, and relevant time, or edits those details.

![Review suggested action](design_images/review.png)

### Pending item

A saved item records whether the intention is still open, what the user wants to do, and when it should return.

![Pending saved item](design_images/pending.png)

### Reminder

When the relevant time arrives, the item returns to the Action Inbox and a notification explains why it was saved.

![Reminder brought back](design_images/reminder.png)

### Completed item

Marking an item complete ends the intention and cancels further reminders. The history stays visible, and the item can be reopened.

![Completed item](design_images/completed.png)

## Example

Maya screenshots a concert post while walking to class. Tickets go on sale Friday at 10 AM. Later, Recall suggests “Buy tickets” with that time. She confirms it. On Friday morning the item returns to her inbox, she buys the tickets, and marks the intention complete.
