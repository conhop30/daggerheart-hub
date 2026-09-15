// Unit tests for the local data layer — the direct replacement for the
// deleted Spring Boot services, so these tests cover the same rules those
// services had: idempotent-by-name create, rename-collision-skip on
// update, the two-distinct-domains and Secondary-weapon-locks-to-One-
// Handed validations, and the export/import merge semantics.
//
// Each test gets its own throwaway directory via DAGGERHEART_STORE_DIR so
// nothing here ever touches the real ~/.daggerheart-hub, and pre-seeds an
// empty (already-existing) data.json so the store's first-run seeding
// logic doesn't fire except in the dedicated "seeding" tests below that
// want it to.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const store = require('./store.js');

let tempDir;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daggerheart-store-test-'));
  process.env.DAGGERHEART_STORE_DIR = tempDir;
  store.__resetCacheForTests();
  fs.writeFileSync(path.join(tempDir, 'data.json'), JSON.stringify(store.emptyStore()));
});

afterEach(() => {
  delete process.env.DAGGERHEART_STORE_DIR;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('GameSet', () => {
  it('create always inserts — never idempotent by name, unlike the other types', async () => {
    const a = await store.createGameSet({ name: 'Core' });
    const b = await store.createGameSet({ name: 'Core' });
    expect(a.id).not.toBe(b.id);
    expect(store.listGameSets()).toHaveLength(2);
  });
});

describe('Domain', () => {
  it('create is idempotent by name, case-insensitive', async () => {
    const a = await store.createDomain({ name: 'Arcana', gameSetId: 'gs-1' });
    const b = await store.createDomain({ name: 'arcana', gameSetId: 'gs-1' });
    expect(a.id).toBe(b.id);
    expect(store.listDomains()).toHaveLength(1);
  });

  it('requires a name', async () => {
    await expect(store.createDomain({ name: '', gameSetId: 'gs-1' })).rejects.toThrow('Name is required');
  });

  it('renaming to a name already used by a different record is silently skipped', async () => {
    await store.createDomain({ name: 'Arcana', gameSetId: 'gs-1' });
    const blade = await store.createDomain({ name: 'Blade', gameSetId: 'gs-1' });
    const updated = await store.updateDomain(blade.id, { name: 'arcana' });
    expect(updated.name).toBe('Blade');
  });

  it('remove deletes the record', async () => {
    const d = await store.createDomain({ name: 'Arcana', gameSetId: 'gs-1' });
    await store.removeDomain(d.id);
    expect(store.listDomains()).toHaveLength(0);
  });

  it('remove throws for an unknown id', async () => {
    await expect(store.removeDomain('missing')).rejects.toThrow('No domain with id');
  });
});

describe('HeroClass', () => {
  it('rejects the same domain id used for both slots', async () => {
    const d = await store.createDomain({ name: 'Arcana', gameSetId: 'gs-1' });
    await expect(
      store.createHeroClass({ name: 'Wizard', primaryDomainId: d.id, secondaryDomainId: d.id, gameSetId: 'gs-1' })
    ).rejects.toThrow('must be different');
  });

  it('rejects a domain id that does not exist', async () => {
    const d = await store.createDomain({ name: 'Arcana', gameSetId: 'gs-1' });
    await expect(
      store.createHeroClass({ name: 'Wizard', primaryDomainId: d.id, secondaryDomainId: 'missing', gameSetId: 'gs-1' })
    ).rejects.toThrow('No domain with id');
  });

  it('update re-validates the EFFECTIVE pair, not just whichever half changed', async () => {
    const d1 = await store.createDomain({ name: 'Arcana', gameSetId: 'gs-1' });
    const d2 = await store.createDomain({ name: 'Blade', gameSetId: 'gs-1' });
    const hc = await store.createHeroClass({
      name: 'Wizard',
      primaryDomainId: d1.id,
      secondaryDomainId: d2.id,
      gameSetId: 'gs-1',
    });
    // Only secondary is being changed, but the resulting pair (d1, d1)
    // is invalid — this must still be caught.
    await expect(store.updateHeroClass(hc.id, { secondaryDomainId: d1.id })).rejects.toThrow('must be different');
  });
});

describe('Subclass', () => {
  it('requires an existing parent class', async () => {
    await expect(store.createSubclass({ name: 'Wildborne', parentClassId: 'missing', gameSetId: 'gs-1' })).rejects.toThrow(
      'No hero class with id'
    );
  });

  it('listSubclassesByParentClass only returns matching subclasses', async () => {
    const d1 = await store.createDomain({ name: 'Arcana', gameSetId: 'gs-1' });
    const d2 = await store.createDomain({ name: 'Blade', gameSetId: 'gs-1' });
    const wizard = await store.createHeroClass({
      name: 'Wizard',
      primaryDomainId: d1.id,
      secondaryDomainId: d2.id,
      gameSetId: 'gs-1',
    });
    const warrior = await store.createHeroClass({
      name: 'Warrior',
      primaryDomainId: d2.id,
      secondaryDomainId: d1.id,
      gameSetId: 'gs-1',
    });
    await store.createSubclass({ name: 'School of Knowledge', parentClassId: wizard.id, gameSetId: 'gs-1' });
    await store.createSubclass({ name: 'Stalwart', parentClassId: warrior.id, gameSetId: 'gs-1' });

    const wizardSubclasses = store.listSubclassesByParentClass(wizard.id);
    expect(wizardSubclasses).toHaveLength(1);
    expect(wizardSubclasses[0].name).toBe('School of Knowledge');
  });
});

describe('Weapon', () => {
  it('rejects a Secondary weapon with Two-Handed burden', async () => {
    await expect(
      store.createWeapon({ weaponSlot: 'SECONDARY', name: 'Dagger', burden: 'TWO_HANDED', gameSetId: 'gs-1' })
    ).rejects.toThrow('Secondary weapon must be One-Handed');
  });

  it('allows a Primary weapon to be Two-Handed', async () => {
    const w = await store.createWeapon({ weaponSlot: 'PRIMARY', name: 'Greatsword', burden: 'TWO_HANDED', gameSetId: 'gs-1' });
    expect(w.burden).toBe('TWO_HANDED');
  });

  it('re-validates burden on update too, not just create', async () => {
    const w = await store.createWeapon({ weaponSlot: 'SECONDARY', name: 'Dagger', burden: 'ONE_HANDED', gameSetId: 'gs-1' });
    await expect(store.updateWeapon(w.id, { burden: 'TWO_HANDED' })).rejects.toThrow('Secondary weapon must be One-Handed');
  });
});

describe('generic collection (makeCollection) shared behavior', () => {
  it('PATCH semantics: an omitted field is untouched, an explicit empty value overwrites', async () => {
    const loot = await store.createLoot({ name: 'Trinket', description: 'A shiny thing', gameSetId: 'gs-1' });
    const updated = await store.updateLoot(loot.id, { description: '' });
    expect(updated.name).toBe('Trinket');
    expect(updated.description).toBe('');
  });

  it('update throws for an unknown id', async () => {
    await expect(store.updateConsumable('missing', { name: 'x' })).rejects.toThrow('No record with id');
  });

  it('remove throws for an unknown id', async () => {
    await expect(store.removeConsumable('missing')).rejects.toThrow('No record with id');
  });

  it('a failed mutation does not block the next one from running', async () => {
    await expect(store.updateLoot('missing', { name: 'x' })).rejects.toThrow();
    // If the write queue were left in a rejected state, this would hang
    // or reject too, instead of succeeding normally.
    const loot = await store.createLoot({ name: 'Still Works', gameSetId: 'gs-1' });
    expect(loot.name).toBe('Still Works');
  });
});

describe('Export / Import', () => {
  it('export hands back every collection as an array', () => {
    const snapshot = store.exportSnapshot();
    expect(Array.isArray(snapshot.domains)).toBe(true);
    expect(Array.isArray(snapshot.weapons)).toBe(true);
  });

  it('rejects a non-object payload', async () => {
    await expect(store.importSnapshot(null)).rejects.toThrow('not a valid Daggerheart Hub export');
  });

  it('rejects a payload whose collection is not an array', async () => {
    await expect(store.importSnapshot({ domains: 'nope' })).rejects.toThrow('not a valid Daggerheart Hub export');
  });

  it('upserts by id: an existing id is overwritten, a new id is added', async () => {
    const existing = await store.createDomain({ name: 'Arcana', gameSetId: 'gs-1' });
    const result = await store.importSnapshot({
      domains: [
        { ...existing, name: 'Arcana Renamed' },
        { id: 'brand-new-id', name: 'Blade', gameSetId: 'gs-1' },
      ],
    });
    expect(result.importedCount).toBe(2);
    const domains = store.listDomains();
    expect(domains).toHaveLength(2);
    expect(domains.find((d) => d.id === existing.id).name).toBe('Arcana Renamed');
  });
});

describe('seeding', () => {
  it('a brand-new store directory seeds from seed/core-content.json, with domain names resolved to real ids', () => {
    const freshDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daggerheart-seed-test-'));
    const previousDir = process.env.DAGGERHEART_STORE_DIR;
    process.env.DAGGERHEART_STORE_DIR = freshDir;
    store.__resetCacheForTests();
    try {
      const gameSets = store.listGameSets();
      expect(gameSets).toHaveLength(1);
      expect(gameSets[0].name).toBe('Core');
      expect(store.listDomains().length).toBeGreaterThan(0);
      expect(store.listHeroClasses().length).toBeGreaterThan(0);

      const domainIds = new Set(store.listDomains().map((d) => d.id));
      for (const heroClass of store.listHeroClasses()) {
        expect(domainIds.has(heroClass.primaryDomainId)).toBe(true);
        expect(domainIds.has(heroClass.secondaryDomainId)).toBe(true);
      }
    } finally {
      process.env.DAGGERHEART_STORE_DIR = previousDir;
      store.__resetCacheForTests();
      fs.rmSync(freshDir, { recursive: true, force: true });
    }
  });
});
