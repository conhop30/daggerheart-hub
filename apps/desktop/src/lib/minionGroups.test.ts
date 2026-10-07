import { describe, expect, it } from 'vitest';
import { planMinionMove, stackToJoin, toBoardCells, type MinionStack } from './minionGroups';

const stack = (id: string, adversaryId: string, count: number, groupId: string | null = null): MinionStack => ({
  id,
  adversaryId,
  combatId: 'tab',
  type: 'MINION',
  count,
  groupId,
});
const makeId = () => 'new-group';

describe('planMinionMove', () => {
  it('folds a whole stack into another stack of the same Minion', () => {
    const list = [stack('a', 'hatchling', 2), stack('b', 'hatchling', 3)];
    expect(planMinionMove(list, 'a', 'all', { stackId: 'b' }, makeId)).toEqual([
      { kind: 'remove', id: 'a' },
      { kind: 'update', id: 'b', patch: { count: 5 } },
    ]);
  });

  it('moves one Minion between stacks of the same Minion', () => {
    const list = [stack('a', 'hatchling', 2), stack('b', 'hatchling', 3)];
    expect(planMinionMove(list, 'a', 'one', { stackId: 'b' }, makeId)).toEqual([
      { kind: 'update', id: 'a', patch: { count: 1 } },
      { kind: 'update', id: 'b', patch: { count: 4 } },
    ]);
  });

  it('splits one Minion out into a new stack', () => {
    const list = [stack('a', 'hatchling', 15)];
    expect(planMinionMove(list, 'a', 'one', 'newGroup', makeId)).toEqual([
      { kind: 'update', id: 'a', patch: { count: 14 } },
      { kind: 'create', adversaryId: 'hatchling', combatId: 'tab', count: 1, groupId: null },
    ]);
  });

  it('does nothing when a lone stack is dropped on the new-group zone', () => {
    expect(planMinionMove([stack('a', 'hatchling', 3)], 'a', 'all', 'newGroup', makeId)).toEqual([]);
    expect(planMinionMove([stack('a', 'hatchling', 1)], 'a', 'one', 'newGroup', makeId)).toEqual([]);
  });

  it('mixes different Minions by putting both stacks in one new group', () => {
    const list = [stack('a', 'hatchling', 2), stack('b', 'zombie', 3)];
    expect(planMinionMove(list, 'a', 'all', { stackId: 'b' }, makeId)).toEqual([
      { kind: 'update', id: 'b', patch: { groupId: 'new-group' } },
      { kind: 'update', id: 'a', patch: { groupId: 'new-group' } },
    ]);
  });

  it('moving one of several into a group of a different Minion creates a stack of one there', () => {
    const list = [stack('a', 'hatchling', 2), stack('b', 'zombie', 3, 'g')];
    expect(planMinionMove(list, 'a', 'one', { stackId: 'b' }, makeId)).toEqual([
      { kind: 'update', id: 'a', patch: { count: 1 } },
      { kind: 'create', adversaryId: 'hatchling', combatId: 'tab', count: 1, groupId: 'g' },
    ]);
  });

  it('folds into the same Minion already in the destination group rather than adding a second stack', () => {
    const list = [stack('a', 'hatchling', 2), stack('b', 'zombie', 3, 'g'), stack('c', 'hatchling', 1, 'g')];
    expect(planMinionMove(list, 'a', 'all', { stackId: 'b' }, makeId)).toEqual([
      { kind: 'remove', id: 'a' },
      { kind: 'update', id: 'c', patch: { count: 3 } },
    ]);
  });

  it('takes a stack out of its mixed group', () => {
    const list = [stack('a', 'hatchling', 2, 'g'), stack('b', 'zombie', 3, 'g')];
    expect(planMinionMove(list, 'a', 'all', 'newGroup', makeId)).toEqual([{ kind: 'update', id: 'a', patch: { groupId: null } }]);
  });

  it('ignores a drop onto itself, onto a non-Minion, or of a non-Minion', () => {
    const ogre = { ...stack('o', 'ogre', 1), type: 'BRUISER' as const };
    const list = [stack('a', 'hatchling', 2), ogre];
    expect(planMinionMove(list, 'a', 'all', { stackId: 'a' }, makeId)).toEqual([]);
    expect(planMinionMove(list, 'a', 'all', { stackId: 'o' }, makeId)).toEqual([]);
    expect(planMinionMove(list, 'o', 'all', { stackId: 'a' }, makeId)).toEqual([]);
  });
});

describe('stackToJoin', () => {
  it('picks a lone stack of the same Minion in the same tab, never one inside a mixed group', () => {
    const list = [stack('a', 'hatchling', 2, 'g'), stack('b', 'zombie', 3, 'g'), stack('c', 'hatchling', 1)];
    expect(stackToJoin(list, 'hatchling', 'tab')?.id).toBe('c');
    expect(stackToJoin(list, 'zombie', 'tab')).toBeNull();
    expect(stackToJoin(list, 'hatchling', 'other-tab')).toBeNull();
  });
});

describe('toBoardCells', () => {
  it('gathers a mixed group at its first member and leaves everything else in place', () => {
    const list = [stack('a', 'hatchling', 2, 'g'), stack('x', 'rat', 1), stack('b', 'zombie', 3, 'g')];
    expect(toBoardCells(list).map((c) => [c.groupId, c.stacks.map((s) => s.id)])).toEqual([
      ['g', ['a', 'b']],
      [null, ['x']],
    ]);
  });

  it('treats a group left with one stack as that stack standing alone', () => {
    expect(toBoardCells([stack('a', 'hatchling', 2, 'g')])[0].groupId).toBeNull();
  });
});
