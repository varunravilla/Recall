type ApiResult<T> = T | { error: string };

async function post<T>(path: string, body: Record<string, unknown>): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { error: "Could not connect. Check your connection and try again." };
  }

  const text = await response.text();
  if (!text) {
    return { error: "Something went wrong. Please try again." };
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: "Something went wrong. Please try again." };
  }

  if (!response.ok) {
    if (response.status === 401 && !["/recall/start", "/recall/register"].includes(path)) {
      sessionStorage.removeItem("recall.session");
      sessionStorage.removeItem("recall.user");
      window.location.assign("/");
      return { error: "Your session ended. Log in again." };
    }
    const err = (data as { error?: unknown }).error;
    return { error: typeof err === "string" ? err : response.statusText };
  }
  return data as T;
}

export function startSession(username: string, password: string) {
  return post<{ user: string; session: string; expiresAt: string }>("/recall/start", { username, password });
}

export function addCaption(payload: {
  session: string;
  item: string;
  content: string;
  collectedAt: string;
  kind: string;
  summary: string;
  relevantAt: string;
}) {
  return post<{ collection: string; interpretation: string }>("/recall/captions/add", payload);
}

export function listInbox(session: string) {
  return post<{ book: InboxBook }>("/recall/inbox/list", { session });
}

export function listLibrary(session: string) {
  return post<{ book: LibraryBook }>("/recall/library/list", { session });
}

export function getReview(session: string, collection: string) {
  return post<ReviewPayload>("/recall/review/get", { session, collection });
}

export function confirmReview(payload: {
  session: string;
  collection: string;
  interpretation: string;
  at: string;
}) {
  return post<{ interpretation: string; tracking: string; reminder: string }>(
    "/recall/review/confirm",
    payload,
  );
}

export function rejectReview(session: string, collection: string, interpretation: string) {
  return post<{ interpretation: string }>("/recall/review/reject", {
    session,
    collection,
    interpretation,
  });
}

export function reviseReview(payload: {
  session: string;
  collection: string;
  interpretation: string;
  kind: string;
  summary: string;
  relevantAt: string;
}) {
  return post<{ interpretation: string }>("/recall/review/revise", payload);
}

export function getSaved(session: string, collection: string) {
  return post<{ item: SavedItemDetail } | { error: string }>("/recall/saved/get", {
    session,
    collection,
  });
}

export function completeSaved(session: string, collection: string, tracking: string) {
  return post<{ tracking: string }>("/recall/saved/complete", { session, collection, tracking });
}

export function dismissSaved(session: string, collection: string, tracking: string) {
  return post<{ tracking: string }>("/recall/saved/dismiss", { session, collection, tracking });
}

export function sweepTick(session: string) {
  return post<{ count: number }>("/recall/sweep/tick", { session });
}

export interface InboxBook {
  forReview: ForReviewRow[];
  due: DueRow[];
}

export interface LibraryBook {
  items: LibraryItem[];
}

export interface LibraryItem {
  collection: string;
  content: string;
  collectedAt: string;
  interpretationRow?: InterpretationRow;
  trackingRow?: TrackingRow;
  reminderRow?: ReminderRow;
}

export interface InterpretationRow {
  interpretation: string;
  kind: string;
  summary: string;
  relevantAt: string | null;
  status: string;
}

export interface TrackingRow {
  tracking: string;
  status: string;
}

export interface ReminderRow {
  reminder: string;
  at: string;
  status: string;
}

export interface ForReviewRow {
  collection: string;
  item: string;
  content: string;
  collectedAt: string;
  proposal: InterpretationRow[];
}

export interface DueRow {
  tracking: string;
  interpretationId: string;
  details: {
    collection: string;
    reminder: string;
    at: string;
    reminderStatus: string;
    summary: string;
    kind: string;
  };
}

export interface ReviewPayload {
  collection: string;
  item: string;
  content: string;
  collectedAt: string;
  interpretation: string;
  kind: string;
  summary: string;
  relevantAt?: string;
  status: string;
}

export interface SavedItemDetail {
  collection: string;
  item: string;
  content: string;
  collectedAt: string;
  interpretationRow?: InterpretationRow;
  trackingRow?: TrackingRow;
  reminderRow?: ReminderRow;
}

/** Route to review vs saved detail from library row shape. */
export function itemRoute(item: LibraryItem): { path: string; label: string } {
  const status = item.interpretationRow?.status;
  const tracking = item.trackingRow?.status;
  if (status === "proposed") {
    return { path: `/review/${item.collection}`, label: "Review" };
  }
  if (tracking === "pending" || tracking === "completed" || tracking === "dismissed") {
    return { path: `/saved/${item.collection}`, label: "Open" };
  }
  if (status === "confirmed") {
    return { path: `/saved/${item.collection}`, label: "Open" };
  }
  return { path: `/review/${item.collection}`, label: "Review" };
}

export function itemStatusLabel(item: LibraryItem): string {
  const tracking = item.trackingRow?.status;
  if (tracking === "pending" && item.reminderRow?.status === "due") return "Due now";
  if (tracking === "pending") return "Pending";
  if (tracking === "completed") return "Completed";
  if (tracking === "dismissed") return "Dismissed";
  const reminder = item.reminderRow?.status;
  if (reminder === "due") return "Due now";
  if (item.interpretationRow?.status === "proposed") return "Suggested";
  if (item.interpretationRow?.status === "rejected") return "Ignored";
  if (item.interpretationRow?.status === "confirmed" && !item.interpretationRow.relevantAt && !item.trackingRow) return "Found";
  return "Saved";
}

export function registerAccount(username: string, password: string) {
  return post<{ user: string; session: string; expiresAt: string }>("/recall/register", { username, password });
}
export function endSession(session: string) {
  return post<{ ended: boolean }>("/recall/end", { session });
}

export function rescheduleSaved(session: string, collection: string, tracking: string, at: string) {
  return post<{ reminder: string; at: string }>("/recall/saved/reschedule", { session, collection, tracking, at });
}

export function deleteSaved(session: string, collection: string) {
  return post<{ collection: string }>("/recall/saved/delete", { session, collection });
}
