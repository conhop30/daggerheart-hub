import { describe, expect, it } from 'vitest';
import { planMinionMove, planPickUp, stackToJoin, toBoardCells, type MinionStack } from './minionGroups';

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

  it('ignores a drop onto itself, and never mixes a non-Minion into a group', () => {
    const ogre = { ...stack('o', 'ogre', 1), type: 'BRUISER' as const };
    const list = [stack('a', 'hatchling', 2), ogre];
    expect(planMinionMove(list, 'a', 'all', { stackId: 'a' }, makeId)).toEqual([]);
    expect(planMinionMove(list, 'a', 'all', { stackId: 'o' }, makeId)).toEqual([]);
    expect(planMinionMove(list, 'o', 'all', { stackId: 'a' }, makeId)).toEqual([]);
  });

  describe('a stat-block stack of non-Minions', () => {
    const ogre = (id: string, groupId: string | null = null) => ({ ...stack(id, 'ogre', 1, groupId), type: 'BRUISER' as const });

    it('takes one member out when its row is dropped on the new-group zone', () => {
      const list = [ogre('a', 'g'), ogre('b', 'g'), ogre('c', 'g')];
      expect(planMinionMove(list, 'b', 'one', 'newGroup', makeId)).toEqual([{ kind: 'update', id: 'b', patch: { groupId: null } }]);
    });

    it('comes apart entirely when the whole stat block is dropped there', () => {
      const list = [ogre('a', 'g'), ogre('b', 'g'), ogre('c', 'g')];
      expect(planMinionMove(list, 'a', 'all', 'newGroup', makeId)).toEqual([
        { kind: 'update', id: 'a', patch: { groupId: null } },
        { kind: 'update', id: 'b', patch: { groupId: null } },
        { kind: 'update', id: 'c', patch: { groupId: null } },
      ]);
    });

    it('does nothing for one already standing alone', () => {
      expect(planMinionMove([ogre('a'), ogre('b')], 'a', 'all', 'newGroup', makeId)).toEqual([]);
      expect(planMinionMove([ogre('a', 'g')], 'a', 'one', 'newGroup', makeId)).toEqual([]);
    });

    it('moves one member onto another tile of the same Adversary, and never onto a different one', () => {
      const list = [ogre('a', 'g'), ogre('b', 'g'), ogre('c'), { ...ogre('t'), adversaryId: 'troll' }];
      expect(planMinionMove(list, 'a', 'one', { stackId: 'c' }, makeId)).toEqual([
        { kind: 'update', id: 'c', patch: { groupId: 'new-group' } },
        { kind: 'update', id: 'a', patch: { groupId: 'new-group' } },
      ]);
      expect(planMinionMove(list, 'a', 'one', { stackId: 't' }, makeId)).toEqual([]);
      expect(planMinionMove(list, 'a', 'one', { stackId: 'b' }, makeId)).toEqual([]);
    });
  });
});

describe('planPickUp', () => {
  const ogre = (id: string, groupId: string | null = null) => ({ ...stack(id, 'ogre', 1, groupId), type: 'BRUISER' as const });

  it('merges the counts of identical Minions', () => {
    expect(planPickUp([stack('a', 'rat', 2), stack('b', 'rat', 3)], 'a', 'b', makeId)).toEqual([
      { kind: 'update', id: 'a', patch: { count: 5 } },
      { kind: 'remove', id: 'b' },
    ]);
  });

  it('stacks identical non-Minions by giving them one group, keeping each its own record', () => {
    expect(planPickUp([ogre('a'), ogre('b')], 'a', 'b', makeId)).toEqual([
      { kind: 'update', id: 'a', patch: { groupId: 'new-group' } },
      { kind: 'update', id: 'b', patch: { groupId: 'new-group' } },
    ]);
  });

  it('adds to the dragged stack, and brings along whatever the touched one was already stacked with', () => {
    const list = [ogre('a', 'g1'), ogre('b', 'g1'), ogre('c', 'g2'), ogre('d', 'g2')];
    expect(planPickUp(list, 'a', 'c', makeId)).toEqual([
      { kind: 'update', id: 'c', patch: { groupId: 'g1' } },
      { kind: 'update', id: 'd', patch: { groupId: 'g1' } },
    ]);
    expect(planPickUp(list, 'a', 'b', makeId)).toEqual([]);
  });

  it('never picks up a different Adversary, itself, or one from another tab', () => {
    const list = [ogre('a'), stack('r', 'rat', 4), { ...ogre('c'), combatId: 'other-tab' }];
    expect(planPickUp(list, 'a', 'r', makeId)).toEqual([]);
    expect(planPickUp(list, 'a', 'a', makeId)).toEqual([]);
    expect(planPickUp(list, 'a', 'c', makeId)).toEqual([]);
    expect(planPickUp(list, 'a', 'gone', makeId)).toEqual([]);
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
  it('gathers a mixed Minion group at its first member and leaves everything else in place', () => {
    const list = [stack('a', 'hatchling', 2, 'g'), stack('x', 'rat', 1), stack('b', 'zombie', 3, 'g')];
    expect(toBoardCells(list).map((c) => [c.kind, c.stacks.map((s) => s.id)])).toEqual([
      ['minionGroup', ['a', 'b']],
      ['single', ['x']],
    ]);
  });

  it('shows identical non-Minions sharing a group as one stack', () => {
    const ogre = (id: string, groupId: string | null) => ({ ...stack(id, 'ogre', 1, groupId), type: 'BRUISER' as const });
    const list = [ogre('a', 'g'), ogre('b', null), ogre('c', 'g')];
    expect(toBoardCells(list).map((c) => [c.kind, c.groupId, c.stacks.map((s) => s.id)])).toEqual([
      ['stack', 'g', ['a', 'c']],
      ['single', null, ['b']],
    ]);
  });

  it('treats a group left with one record as that record standing alone', () => {
    expect(toBoardCells([stack('a', 'hatchling', 2, 'g')])[0]).toMatchObject({ kind: 'single', groupId: null });
  });
});
