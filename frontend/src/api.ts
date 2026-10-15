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
    return { error: "Could not reach the server. Is the backend running?" };
  }

  const text = await response.text();
  if (!text) {
    return { error: "Empty response from server." };
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: "Invalid JSON from server." };
  }

  if (!response.ok) {
    const err = (data as { error?: string }).error ?? response.statusText;
    return { error: err };
  }
  return data as T;
}

export function startSession(user: string) {
  return post<{ user: string; session: string; expiresAt: string }>("/recall/start", { user });
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

export function sweepTick(now: string) {
  return post<{ count: number }>("/recall/sweep/tick", { now });
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
  relevantAt: string;
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
  error?: string;
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
  if (tracking === "pending") return "Pending";
  if (tracking === "completed") return "Completed";
  if (tracking === "dismissed") return "Dismissed";
  const reminder = item.reminderRow?.status;
  if (reminder === "due") return "Due now";
  if (item.interpretationRow?.status === "proposed") return "Suggested";
  if (item.interpretationRow?.status === "rejected") return "Ignored";
  return "Saved";
}
