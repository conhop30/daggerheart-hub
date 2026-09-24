import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const carry = require('./carry.js');

let n = 0;
const makeId = () => `v${++n}`;
const order = ['s1', 's2', 's3'];
const names = (list) => list.map((v) => v.name);

describe('resolveVersions', () => {
  it('shows a version from its own session onward, not before', () => {
    const versions = [{ id: 'a', sessionId: 's2', name: 'Ogre' }];
    expect(carry.resolveVersions(versions, order, 's1')).toEqual([]);
    expect(names(carry.resolveVersions(versions, order, 's2'))).toEqual(['Ogre']);
    expect(names(carry.resolveVersions(versions, order, 's3'))).toEqual(['Ogre']);
  });

  it('a baseline version (no session) is visible everywhere, and before any session exists', () => {
    const versions = [{ id: 'a', sessionId: null, name: 'Mira' }];
    expect(names(carry.resolveVersions(versions, order, null))).toEqual(['Mira']);
    expect(names(carry.resolveVersions(versions, order, 's1'))).toEqual(['Mira']);
  });

  it('the newest version at or before the viewed session wins, and keeps the lineage id', () => {
    const versions = [
      { id: 'a', sessionId: 's1', name: 'Mira', hp: 0 },
      { id: 'b', lineageId: 'a', sessionId: 's2', name: 'Mira', hp: 3 },
    ];
    expect(carry.resolveVersions(versions, order, 's1')[0]).toMatchObject({ id: 'a', hp: 0, carried: false });
    expect(carry.resolveVersions(versions, order, 's2')[0]).toMatchObject({ id: 'a', hp: 3, carried: false });
    expect(carry.resolveVersions(versions, order, 's3')[0]).toMatchObject({ id: 'a', hp: 3, carried: true });
  });

  it('a tombstone hides the item from its session onward only', () => {
    const versions = [
      { id: 'a', sessionId: 's1', name: 'Mira' },
      { id: 'b', lineageId: 'a', sessionId: 's2', deleted: true },
    ];
    expect(names(carry.resolveVersions(versions, order, 's1'))).toEqual(['Mira']);
    expect(carry.resolveVersions(versions, order, 's2')).toEqual([]);
    expect(carry.resolveVersions(versions, order, 's3')).toEqual([]);
  });
});

describe('editVersion', () => {
  it('edits in place within the authoring session', () => {
    const versions = [{ id: 'a', sessionId: 's1', name: 'Mira', hp: 0 }];
    carry.editVersion(versions, order, 'a', 's1', { hp: 2 }, makeId);
    expect(versions).toHaveLength(1);
    expect(versions[0].hp).toBe(2);
  });

  it('writes a new version in a later session and leaves the earlier one alone', () => {
    const versions = [{ id: 'a', sessionId: 's1', name: 'Mira', hp: 0 }];
    carry.editVersion(versions, order, 'a', 's2', { hp: 2 }, makeId);
    expect(versions).toHaveLength(2);
    expect(versions[0].hp).toBe(0);
    expect(versions[1]).toMatchObject({ lineageId: 'a', sessionId: 's2', hp: 2 });
  });

  it('never lets a patch change identity fields', () => {
    const versions = [{ id: 'a', sessionId: 's1', campaignId: 'c1', name: 'Mira' }];
    carry.editVersion(versions, order, 'a', 's1', { id: 'x', sessionId: 's3', campaignId: 'c2', deleted: true, name: 'Mirah' }, makeId);
    expect(versions[0]).toMatchObject({ id: 'a', sessionId: 's1', campaignId: 'c1', name: 'Mirah' });
    expect(versions[0].deleted).toBeUndefined();
  });

  it('cannot edit an item that is not visible from that session', () => {
    const versions = [{ id: 'a', sessionId: 's2', name: 'Ogre' }];
    expect(() => carry.editVersion(versions, order, 'a', 's1', { name: 'X' }, makeId)).toThrow('No record');
  });
});

describe('removeVersions', () => {
  it('drops an item created in the same session outright', () => {
    const versions = [{ id: 'a', sessionId: 's1', name: 'Ogre' }];
    expect(carry.removeVersions(versions, order, 'a', 's1', makeId)).toEqual([]);
  });

  it('leaves a tombstone when an earlier session still has it', () => {
    const versions = [{ id: 'a', sessionId: 's1', name: 'Ogre' }];
    const after = carry.removeVersions(versions, order, 'a', 's2', makeId);
    expect(names(carry.resolveVersions(after, order, 's1'))).toEqual(['Ogre']);
    expect(carry.resolveVersions(after, order, 's2')).toEqual([]);
    expect(carry.resolveVersions(after, order, 's3')).toEqual([]);
  });

  it('removes it from the session it was deleted in only: a later session with its own version keeps it', () => {
    const versions = [
      { id: 'a', sessionId: 's1', name: 'Ogre', hp: 0 },
      { id: 'b', lineageId: 'a', sessionId: 's3', name: 'Ogre', hp: 5 },
    ];
    const after = carry.removeVersions(versions, order, 'a', 's2', makeId);
    expect(names(carry.resolveVersions(after, order, 's1'))).toEqual(['Ogre']);
    expect(carry.resolveVersions(after, order, 's2')).toEqual([]);
    expect(carry.resolveVersions(after, order, 's3')).toEqual([expect.objectContaining({ name: 'Ogre', hp: 5 })]);
  });

  it('deleting in the authoring session drops only that version; a later session with its own copy is untouched', () => {
    const versions = [
      { id: 'a', sessionId: 's1', name: 'Ogre', hp: 0 },
      { id: 'b', lineageId: 'a', sessionId: 's3', name: 'Ogre', hp: 5 },
    ];
    const after = carry.removeVersions(versions, order, 'a', 's1', makeId);
    expect(carry.resolveVersions(after, order, 's1')).toEqual([]);
    expect(carry.resolveVersions(after, order, 's2')).toEqual([]);
    expect(names(carry.resolveVersions(after, order, 's3'))).toEqual(['Ogre']);
  });
});

describe('rehomeVersions', () => {
  it('moves what a deleted session authored to the next one', () => {
    const versions = [{ id: 'a', sessionId: 's2', name: 'Ogre' }];
    const after = carry.rehomeVersions(versions, order, 's2');
    expect(after[0].sessionId).toBe('s3');
  });

  it('lets the next session keep its own version of the same item', () => {
    const versions = [
      { id: 'a', sessionId: 's1', name: 'Ogre', hp: 1 },
      { id: 'b', lineageId: 'a', sessionId: 's2', name: 'Ogre', hp: 2 },
      { id: 'c', lineageId: 'a', sessionId: 's3', name: 'Ogre', hp: 3 },
    ];
    const after = carry.rehomeVersions(versions, order, 's2');
    expect(after.map((v) => v.id)).toEqual(['a', 'c']);
  });

  it('drops versions with no later session to hand them to', () => {
    const versions = [{ id: 'a', sessionId: 's3', name: 'Ogre' }];
    expect(carry.rehomeVersions(versions, order, 's3')).toEqual([]);
  });
});

describe('session-level values', () => {
  const sessions = [
    { id: 's1', fear: 4, pcNotes: [{ partyMemberId: 'p1', text: 'a' }], lootLog: [{ id: 'l1' }] },
    { id: 's2', pcNotes: [{ partyMemberId: 'p2', text: 'b' }], lootLog: [{ id: 'l2' }], lootRemoved: ['l1'] },
    { id: 's3', fear: 9, pcNotes: [{ partyMemberId: 'p1', text: 'c' }] },
  ];

  it('resolveScalar takes the nearest earlier value, then the fallback', () => {
    expect(carry.resolveScalar(sessions, 0, 'fear', 0)).toBe(4);
    expect(carry.resolveScalar(sessions, 1, 'fear', 0)).toBe(4);
    expect(carry.resolveScalar(sessions, 2, 'fear', 0)).toBe(9);
    expect(carry.resolveScalar(sessions, 2, 'npcNotes', null)).toBeNull();
  });

  it('resolvePcNotes resolves member by member', () => {
    expect(carry.resolvePcNotes(sessions, 1)).toEqual([
      { partyMemberId: 'p1', text: 'a' },
      { partyMemberId: 'p2', text: 'b' },
    ]);
    expect(carry.resolvePcNotes(sessions, 2)).toEqual([
      { partyMemberId: 'p1', text: 'c' },
      { partyMemberId: 'p2', text: 'b' },
    ]);
  });

  it('resolveLootLog accumulates, and a removal only reaches its own session onward', () => {
    expect(carry.resolveLootLog(sessions, 0).map((e) => e.id)).toEqual(['l1']);
    expect(carry.resolveLootLog(sessions, 1).map((e) => e.id)).toEqual(['l2']);
    expect(carry.resolveLootLog(sessions, 2).map((e) => e.id)).toEqual(['l2']);
  });
});
