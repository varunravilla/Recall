/** Translate transport categories into an action a person can take. */
export function requestError(status: number, error: unknown): string {
  if (typeof error === "string" && !/^[A-Z_]+$/.test(error)) return error;
  if (status === 400) return "Check the details and try again.";
  if (status === 401) return "Username or password is incorrect, or your session has ended.";
  if (status === 403) return "You don’t have permission to change this item.";
  if (status === 404) return "This item is unavailable. It may have been deleted.";
  if (status === 409) return "This item or account already exists, or its state has changed. Refresh and try again.";
  return "Something went wrong. Please try again.";
}
