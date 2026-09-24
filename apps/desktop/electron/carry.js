// The "carry forward" timeline: how a Campaign's data follows it from one
// Session to the next without the sessions ever overwriting each other.
//
// Sessions in a Campaign form an ordered list (creation order). Anything that
// carries is stored as *versions* authored at a particular session, and a
// session's view is "the newest version at or before me":
//
//   - Editing in session N writes a version at N. Sessions before N never see
//     it; N and every later session do (unless they've written their own).
//   - Deleting in session N removes the item from session N only: N's own
//     version goes away, and if the item existed earlier a tombstone at N stops
//     N from inheriting it. Earlier sessions are untouched, and so is any later
//     session that has its own version; later sessions that were merely
//     inheriting the item from N lose it naturally, because what they inherited
//     from is gone.
//   - A version authored at `sessionId: null` is the Campaign baseline — it
//     sits before every session (a Party member added before any session
//     exists, for instance).
//
// Everything here is pure (no store, no Electron) so the rules can be unit
// tested on their own. A "version" is a plain record with an `id` (unique per
// version), a `lineageId` (shared by every version of the same item; equals
// the first version's id, so a record that has never been edited has neither
// a separate lineage nor a tombstone), a `sessionId`, and optionally
// `deleted: true` for a tombstone.

const BASELINE = -1;

const lineageOf = (v) => v.lineageId ?? v.id;

// A session id that's null, or that no longer exists, counts as the baseline.
function positionOf(order, sessionId) {
  if (sessionId == null) return BASELINE;
  return order.indexOf(sessionId);
}

// The keys a caller can never patch: they define which version this is.
const IDENTITY_KEYS = ['id', 'lineageId', 'campaignId', 'sessionId', 'deleted', 'carried'];

function applyPatch(target, patch) {
  for (const key of Object.keys(patch)) {
    if (patch[key] !== undefined && !IDENTITY_KEYS.includes(key)) target[key] = patch[key];
  }
  return target;
}

// The version of one lineage that's in effect at `asOfPos`, or null. Tombstones
// are returned (callers check `.deleted`) so "deleted here" isn't confused with
// "never existed".
function pickVersion(versions, order, lineageId, asOfPos) {
  let best = null;
  let bestPos = BASELINE - 1;
  for (const v of versions) {
    if (lineageOf(v) !== lineageId) continue;
    const pos = positionOf(order, v.sessionId);
    if (pos > asOfPos) continue;
    if (pos >= bestPos) {
      best = v;
      bestPos = pos;
    }
  }
  return best;
}

/**
 * Every live item as seen from `asOfSessionId` (null = the baseline, before
 * any session). Ids in the result are the lineage ids — the stable identity
 * an item keeps across sessions — and `carried` says whether the item was
 * authored before the session being viewed.
 */
function resolveVersions(versions, order, asOfSessionId) {
  const asOfPos = positionOf(order, asOfSessionId);
  const best = new Map();
  for (const v of versions) {
    const key = lineageOf(v);
    const pos = positionOf(order, v.sessionId);
    if (!best.has(key)) best.set(key, null); // hold the item's place in the list
    if (pos > asOfPos) continue;
    const current = best.get(key);
    if (!current || pos >= current.pos) best.set(key, { v, pos });
  }
  const out = [];
  for (const [key, chosen] of best) {
    if (!chosen || chosen.v.deleted) continue;
    const { lineageId: _lineage, deleted: _deleted, ...rest } = chosen.v;
    out.push({ ...rest, id: key, carried: chosen.pos < asOfPos });
  }
  return out;
}

/**
 * Edits an item as seen from `asOfSessionId`. If the version in effect was
 * authored in that same session it's edited in place; otherwise a new version
 * is written at `asOfSessionId`, leaving what earlier sessions see untouched.
 * Mutates `versions` (push / in-place edit) and returns the raw version that
 * is now in effect.
 */
function editVersion(versions, order, lineageId, asOfSessionId, patch, makeId) {
  const asOfPos = positionOf(order, asOfSessionId);
  const current = pickVersion(versions, order, lineageId, asOfPos);
  if (!current || current.deleted) throw new Error(`No record with id ${lineageId}`);
  if (positionOf(order, current.sessionId) === asOfPos) {
    return applyPatch(current, patch);
  }
  const next = applyPatch({ ...structuredClone(current), id: makeId(), lineageId, sessionId: asOfSessionId ?? null }, patch);
  versions.push(next);
  return next;
}

/**
 * Deletes an item from `asOfSessionId` only. That session's own version (if it
 * has one) is dropped, and a tombstone is left there if an earlier version
 * would otherwise keep showing the item in it. Nothing else is touched: earlier
 * sessions keep the item, and a later session with its own version keeps that
 * too. Later sessions that were just inheriting from this one stop seeing it,
 * since there's nothing left to inherit. Returns the new array of versions (the
 * caller replaces its own).
 */
function removeVersions(versions, order, lineageId, asOfSessionId, makeId) {
  const asOfPos = positionOf(order, asOfSessionId);
  const current = pickVersion(versions, order, lineageId, asOfPos);
  if (!current || current.deleted) throw new Error(`No record with id ${lineageId}`);
  const kept = versions.filter((v) => lineageOf(v) !== lineageId || positionOf(order, v.sessionId) !== asOfPos);
  if (kept.some((v) => lineageOf(v) === lineageId && positionOf(order, v.sessionId) < asOfPos)) {
    kept.push({
      id: makeId(),
      lineageId,
      ...(current.campaignId !== undefined ? { campaignId: current.campaignId } : {}),
      sessionId: asOfSessionId ?? null,
      deleted: true,
    });
  }
  return kept;
}

/**
 * A session is being deleted: what it authored moves to the session right
 * after it (so later sessions keep seeing what they were seeing), unless that
 * next session already has its own version of the same item. With no next
 * session the versions simply go away. Returns the new array of versions.
 */
function rehomeVersions(versions, order, deletedSessionId) {
  const index = order.indexOf(deletedSessionId);
  const nextId = index >= 0 ? order[index + 1] : undefined;
  const out = [];
  for (const v of versions) {
    if (v.sessionId !== deletedSessionId) {
      out.push(v);
      continue;
    }
    if (nextId === undefined) continue;
    const shadowed = versions.some((o) => o !== v && lineageOf(o) === lineageOf(v) && o.sessionId === nextId);
    if (!shadowed) out.push({ ...v, sessionId: nextId });
  }
  return out;
}

/**
 * Session-level values that follow the Campaign (Fear, notes...): a session
 * stores one only when it has been set *in that session*; otherwise it takes
 * the nearest earlier session's, then the default.
 */
function resolveScalar(sessions, index, key, fallback) {
  for (let i = index; i >= 0; i--) {
    if (Object.prototype.hasOwnProperty.call(sessions[i], key) && sessions[i][key] !== undefined) return sessions[i][key];
  }
  return fallback;
}

/** Per-Party-member notes, resolved member by member so one edit never freezes the others. */
function resolvePcNotes(sessions, index) {
  const byMember = new Map();
  for (let i = 0; i <= index; i++) {
    for (const note of sessions[i].pcNotes ?? []) byMember.set(note.partyMemberId, note.text);
  }
  return [...byMember].map(([partyMemberId, text]) => ({ partyMemberId, text }));
}

/**
 * The loot log as of a session: every entry rolled in it or an earlier
 * session, minus anything removed in that span. A removal only reaches
 * sessions from the one it was made in onward.
 */
function resolveLootLog(sessions, index) {
  const entries = new Map();
  for (let i = 0; i <= index; i++) {
    for (const entry of sessions[i].lootLog ?? []) entries.set(entry.id, { ...entry, sessionId: sessions[i].id });
    for (const id of sessions[i].lootRemoved ?? []) entries.delete(id);
  }
  return [...entries.values()];
}

module.exports = {
  BASELINE,
  positionOf,
  resolveVersions,
  editVersion,
  removeVersions,
  rehomeVersions,
  resolveScalar,
  resolvePcNotes,
  resolveLootLog,
};
