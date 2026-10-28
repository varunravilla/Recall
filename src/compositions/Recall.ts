// Keep the public composition tree stable while workflows live in focused modules.
import { InboxBook, List, LibraryBook, LibraryList, SavedDetail, SavedGet } from "./recall/Views.ts";
import { AddCaption, AddPhoto, AddFoundPhoto, GetPhoto, FindPhoto } from "./recall/Capture.ts";
import { Get, Revise, Confirm, Reject } from "./recall/Review.ts";
import { Complete, Dismiss, Reschedule, Delete } from "./recall/Saved.ts";
import { Tick, RemoveInterpretations, RemoveTrackings, RemoveReminders, CancelCompleted, CancelDismissed } from "./recall/Lifecycle.ts";

export const composition = {
  CancelCompleted, CancelDismissed, RemoveInterpretations, RemoveTrackings, RemoveReminders,
  Photos: { Add: AddPhoto, Found: AddFoundPhoto, Get: GetPhoto, Find: FindPhoto },
  Collecting: { AddCaption },
  Inbox: { List, InboxBook },
  Library: { List: LibraryList, LibraryBook },
  Review: { Get, Revise, Confirm, Reject },
  Saved: { Get: SavedGet, SavedDetail, Complete, Dismiss, Reschedule, Delete },
  Sweep: { Tick },
};
