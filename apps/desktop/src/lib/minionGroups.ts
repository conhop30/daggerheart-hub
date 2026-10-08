import type { SessionAdversary } from '../api/sessionAdversaries';

// Identical Adversaries can be gathered on the board, in one of two ways:
//
//  - Minions are a *counted stack*: one SessionAdversary record with a
//    `count` stands for that many. They arrive that way. Stacks of
//    different Minions can also be dragged into a mixed group, which is
//    several stacks sharing a `groupId`.
//  - Anything else stays one record each, because each one's HP, Stress
//    and adjustments have to be tracked separately. Dragging one across
//    its duplicates gives them a shared `groupId`, and the board then
//    shows that group as a single stat block with a row per member.
//
// Everything here is pure planning — given the live roster and a drag, it
// returns the writes to make; SessionView is what carries them out.

export type MinionStack = Pick<SessionAdversary, 'id' | 'adversaryId' | 'combatId' | 'type' | 'count' | 'groupId'>;

/** 'one' is a single Minion, dragged by its pip; 'all' is the whole tile, dragged from anywhere on it. */
export type MoveAmount = 'one' | 'all';

/** Where a drag was dropped: onto another tile, or onto the "split off" zone. */
export type MoveTarget = { stackId: string } | 'newGroup';

export type MinionOp =
  | { kind: 'update'; id: string; patch: { count?: number; groupId?: string | null } }
  | { kind: 'remove'; id: string }
  | { kind: 'create'; adversaryId: string; combatId: string | null; count: number; groupId: string | null };

export function isMinion(a: Pick<SessionAdversary, 'type'>): boolean {
  return a.type === 'MINION';
}

/** The other records sharing this one's group — empty for one standing alone. */
export function groupMates<T extends MinionStack>(list: T[], stack: MinionStack): T[] {
  if (!stack.groupId) return [];
  return list.filter((s) => s.id !== stack.id && s.groupId === stack.groupId && s.combatId === stack.combatId);
}

/**
 * A tile being dragged just touched another tile. If the two are the same
 * Adversary, the touched one is picked up into the dragged tile — which is
 * what lets a GM sweep one tile across its duplicates to gather them,
 * without ever collecting a different Adversary by accident. Minions merge
 * their counts; anything else joins the dragged one's stack, bringing along
 * whatever it was already stacked with.
 */
export function planPickUp(list: MinionStack[], sourceId: string, targetId: string, makeId: () => string): MinionOp[] {
  const source = list.find((s) => s.id === sourceId);
  const target = list.find((s) => s.id === targetId);
  if (!source || !target || source.id === target.id) return [];
  if (source.adversaryId !== target.adversaryId || source.combatId !== target.combatId) return [];

  if (isMinion(source)) {
    return [
      { kind: 'update', id: source.id, patch: { count: source.count + target.count } },
      { kind: 'remove', id: target.id },
    ];
  }

  if (source.groupId && source.groupId === target.groupId) return [];
  const groupId = source.groupId ?? makeId();
  const ops: MinionOp[] = source.groupId ? [] : [{ kind: 'update', id: source.id, patch: { groupId } }];
  for (const joining of [target, ...groupMates(list, target)]) {
    ops.push({ kind: 'update', id: joining.id, patch: { groupId } });
  }
  return ops;
}

/**
 * A freshly pulled-in Minion joins an existing stack of the same Minion
 * rather than starting a second one — the first one standing alone, so a
 * GM's hand-built mixed groups are never grown behind their back.
 */
export function stackToJoin<T extends MinionStack>(list: T[], adversaryId: string, combatId: string): T | null {
  return (
    list.find((s) => isMinion(s) && s.adversaryId === adversaryId && s.combatId === combatId && groupMates(list, s).length === 0) ??
    null
  );
}

/** A drag that ended in a drop (as opposed to a pick-up, which happens on contact — see planPickUp). */
export function planMinionMove(
  list: MinionStack[],
  sourceId: string,
  amount: MoveAmount,
  target: MoveTarget,
  makeId: () => string
): MinionOp[] {
  const source = list.find((s) => s.id === sourceId);
  if (!source) return [];
  return isMinion(source)
    ? planCountedMove(list, source, amount, target, makeId)
    : planMemberMove(list, source, amount, target, makeId);
}

// One member of a stat-block stack (dragged by its row), or the whole stat
// block. Nothing is ever merged or created: each is its own record, and all
// that changes is which `groupId` it carries.
function planMemberMove(list: MinionStack[], source: MinionStack, amount: MoveAmount, target: MoveTarget, makeId: () => string): MinionOp[] {
  const mates = groupMates(list, source).filter((s) => !isMinion(s));

  if (target === 'newGroup') {
    // Already standing alone: nothing to do.
    if (mates.length === 0) return [];
    // One row dragged out leaves the rest stacked; the whole stat block
    // dragged out comes apart into its members.
    const leaving = amount === 'one' ? [source] : [source, ...mates];
    return leaving.map((s) => ({ kind: 'update', id: s.id, patch: { groupId: null } }));
  }

  // Onto another tile: only one row does this (a whole tile gathers its
  // duplicates on contact instead — see planPickUp), and only onto the same
  // Adversary.
  const dest = list.find((s) => s.id === target.stackId);
  if (amount !== 'one' || !dest || isMinion(dest) || dest.id === source.id) return [];
  if (dest.adversaryId !== source.adversaryId || dest.combatId !== source.combatId) return [];
  if (dest.groupId && dest.groupId === source.groupId) return [];
  const groupId = dest.groupId ?? makeId();
  const ops: MinionOp[] = dest.groupId ? [] : [{ kind: 'update', id: dest.id, patch: { groupId } }];
  return [...ops, { kind: 'update', id: source.id, patch: { groupId } }];
}

// Some or all of a counted Minion stack.
function planCountedMove(list: MinionStack[], source: MinionStack, amount: MoveAmount, target: MoveTarget, makeId: () => string): MinionOp[] {
  const moving = amount === 'all' ? source.count : 1;
  const emptiesSource = moving >= source.count;

  // Taking `moving` Minions off the source stack.
  const leave: MinionOp = emptiesSource
    ? { kind: 'remove', id: source.id }
    : { kind: 'update', id: source.id, patch: { count: source.count - moving } };

  if (target === 'newGroup') {
    // The whole stack already stands alone: nothing to do.
    if (emptiesSource) {
      return groupMates(list, source).length ? [{ kind: 'update', id: source.id, patch: { groupId: null } }] : [];
    }
    return [leave, { kind: 'create', adversaryId: source.adversaryId, combatId: source.combatId, count: moving, groupId: null }];
  }

  const dest = list.find((s) => s.id === target.stackId);
  if (!dest || !isMinion(dest) || dest.id === source.id || dest.combatId !== source.combatId) return [];

  // Identical Minions always fold into one stack.
  if (dest.adversaryId === source.adversaryId) {
    return [leave, { kind: 'update', id: dest.id, patch: { count: dest.count + moving } }];
  }

  // Different Minions: the moved ones join the destination's group. If that
  // group already holds a stack of the same Minion, they fold into it.
  const groupId = dest.groupId ?? makeId();
  const ops: MinionOp[] = dest.groupId ? [] : [{ kind: 'update', id: dest.id, patch: { groupId } }];
  const sameInGroup = groupMates(list, dest).find((s) => s.adversaryId === source.adversaryId && s.id !== source.id);
  if (sameInGroup) {
    return [...ops, leave, { kind: 'update', id: sameInGroup.id, patch: { count: sameInGroup.count + moving } }];
  }
  if (emptiesSource) {
    return source.groupId === groupId ? ops : [...ops, { kind: 'update', id: source.id, patch: { groupId } }];
  }
  return [...ops, leave, { kind: 'create', adversaryId: source.adversaryId, combatId: source.combatId, count: moving, groupId }];
}

export interface BoardCell<T> {
  /**
   * 'single' is one record on its own. 'minionGroup' is two or more Minion
   * stacks dragged together, each still its own tile inside a shared frame.
   * 'stack' is two or more identical non-Minions, shown as ONE stat block
   * with a row per member.
   */
  kind: 'single' | 'minionGroup' | 'stack';
  /** Set unless `kind` is 'single'. */
  groupId: string | null;
  stacks: T[];
}

/**
 * The roster in display order, with each group gathered into one cell at
 * the position of its first member. A group left with a single record
 * reads as that record standing alone.
 */
export function toBoardCells<T extends MinionStack>(list: T[]): BoardCell<T>[] {
  const cells: BoardCell<T>[] = [];
  const seen = new Set<string>();
  for (const stack of list) {
    if (seen.has(stack.id)) continue;
    const minion = isMinion(stack);
    const mates = groupMates(list, stack).filter((s) => (minion ? isMinion(s) : !isMinion(s) && s.adversaryId === stack.adversaryId));
    const stacks = [stack, ...mates];
    for (const s of stacks) seen.add(s.id);
    cells.push({
      kind: mates.length === 0 ? 'single' : minion ? 'minionGroup' : 'stack',
      groupId: mates.length ? stack.groupId : null,
      stacks,
    });
  }
  return cells;
}
