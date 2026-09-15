/**
 * Inserts `item` into `list` if its id isn't already present, or replaces
 * the existing entry in place if it is.
 *
 * This matters for two real cases here, not just edits:
 *   1. Editing an existing record — obviously needs replace-in-place.
 *   2. "Creating" a record whose name already exists — the backend's
 *      idempotent-by-name rule returns the *existing* row instead of
 *      erroring or duplicating it in the database, so the frontend has to
 *      make the same call for its own local list, or the same item ends
 *      up listed twice in the UI (with a duplicate React key) even though
 *      the database itself is correct.
 */
export function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const index = list.findIndex((existing) => existing.id === item.id);
  if (index === -1) {
    return [...list, item];
  }
  const next = list.slice();
  next[index] = item;
  return next;
}
