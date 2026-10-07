import type { SessionAdversary } from '../api/sessionAdversaries';

// Minions are tracked as stacks: one SessionAdversary record with a `count`
// stands for that many identical Minions. Stacks of *different* Minions can
// be dragged together into a mixed group, which is just several stacks
// sharing a `groupId`. Everything here is pure planning — given the live
// roster and a drag, it returns the writes to make; SessionView is what
// carries them out.

export type MinionStack = Pick<SessionAdversary, 'id' | 'adversaryId' | 'combatId' | 'type' | 'count' | 'groupId'>;

/** 'one' is a single Minion dragged by its pip; 'all' is the whole stack dragged by its count badge. */
export type MoveAmount = 'one' | 'all';

/** Where a drag was dropped: onto another stack, or onto the "new group" zone. */
export type MoveTarget = { stackId: string } | 'newGroup';

export type MinionOp =
  | { kind: 'update'; id: string; patch: { count?: number; groupId?: string | null } }
  | { kind: 'remove'; id: string }
  | { kind: 'create'; adversaryId: string; combatId: string | null; count: number; groupId: string | null };

export function isMinion(a: Pick<SessionAdversary, 'type'>): boolean {
  return a.type === 'MINION';
}

/** The other stacks sharing this one's group — empty for a stack standing alone. */
export function groupMates<T extends MinionStack>(list: T[], stack: MinionStack): T[] {
  if (!stack.groupId) return [];
  return list.filter((s) => s.id !== stack.id && s.groupId === stack.groupId && s.combatId === stack.combatId);
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

export function planMinionMove(
  list: MinionStack[],
  sourceId: string,
  amount: MoveAmount,
  target: MoveTarget,
  makeId: () => string
): MinionOp[] {
  const source = list.find((s) => s.id === sourceId);
  if (!source || !isMinion(source)) return [];
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
  /** Set when this cell is a mixed group of two or more stacks. */
  groupId: string | null;
  stacks: T[];
}

/**
 * The roster in display order, with a mixed group's stacks gathered into
 * one cell at the position of its first member. A group left with a single
 * stack reads as that stack standing alone.
 */
export function toBoardCells<T extends MinionStack>(list: T[]): BoardCell<T>[] {
  const cells: BoardCell<T>[] = [];
  const seen = new Set<string>();
  for (const stack of list) {
    if (seen.has(stack.id)) continue;
    const mates = isMinion(stack) ? groupMates(list, stack).filter(isMinion) : [];
    const stacks = [stack, ...mates];
    for (const s of stacks) seen.add(s.id);
    cells.push({ groupId: mates.length ? stack.groupId : null, stacks });
  }
  return cells;
}
