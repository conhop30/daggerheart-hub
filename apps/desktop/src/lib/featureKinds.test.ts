import { describe, expect, it } from 'vitest';
import { FEATURE_KINDS, featureRowsFor, keyForCustomSection, kindsFor } from './featureKinds';

describe('featureKinds', () => {
  it('registers Evolution alongside the original three sections', () => {
    expect(FEATURE_KINDS.map((k) => k.key)).toEqual(['passives', 'actions', 'reactions', 'evolutions']);
  });

  it('always offers every registered section to an editor, even on an empty record', () => {
    expect(kindsFor({}).map((k) => k.key)).toEqual(['passives', 'actions', 'reactions', 'evolutions']);
    expect(kindsFor(undefined)).toHaveLength(FEATURE_KINDS.length);
  });

  it('keeps unregistered keys already on a record visible, after the registered ones', () => {
    const kinds = kindsFor({ passives: [], 'lair-actions': [{ name: 'Tremor' }] });
    expect(kinds.map((k) => k.key)).toEqual(['passives', 'actions', 'reactions', 'evolutions', 'lair-actions']);
    expect(kinds[kinds.length - 1].label).toBe('Lair Actions');
  });

  it('read-only views only list sections that actually have features', () => {
    const kinds = kindsFor(
      { passives: [{ name: 'A' }], actions: [], evolutions: [{ name: 'B' }], phase2: [{ name: 'C' }], empty: [] },
      { includeEmptyRegistered: false },
    );
    expect(kinds.map((k) => k.key)).toEqual(['passives', 'evolutions', 'phase2']);
  });

  it('slugs a typed section name into a storage key', () => {
    expect(keyForCustomSection('  Lair Actions! ')).toBe('lair-actions');
    expect(keyForCustomSection('???')).toBe('');
  });

  it('flattens features into display order with a singular kind label', () => {
    const rows = featureRowsFor({
      reactions: [{ name: 'R' }],
      passives: [{ name: 'P' }],
      evolutions: [{ name: 'E', description: 'x' }],
    });
    expect(rows.map((r) => `${r.name}:${r.kind}`)).toEqual(['P:Passive', 'R:Reaction', 'E:Evolution']);
  });
});
