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

describe('Card', () => {
  it('rejects a domainId that does not exist', async () => {
    await expect(
      store.createCard({ name: 'Rune Ward', type: 'SPELL', domainId: 'missing', gameSetId: 'gs-1' })
    ).rejects.toThrow('No domain with id');
  });

  it('rejects a type outside the enum', async () => {
    const d = await store.createDomain({ name: 'Arcana', gameSetId: 'gs-1' });
    await expect(
      store.createCard({ name: 'Rune Ward', type: 'CANTRIP', domainId: d.id, gameSetId: 'gs-1' })
    ).rejects.toThrow('Card type must be one of');
  });

  it('auto-fills domainIcon from the parent Domain when omitted', async () => {
    const d = await store.createDomain({ name: 'Arcana', iconPath: '/icons/arcana.png', gameSetId: 'gs-1' });
    const card = await store.createCard({ name: 'Rune Ward', type: 'SPELL', domainId: d.id, gameSetId: 'gs-1' });
    expect(card.domainIcon).toBe('/icons/arcana.png');
  });

  it('an explicit domainIcon is kept as given, not overwritten', async () => {
    const d = await store.createDomain({ name: 'Arcana', iconPath: '/icons/arcana.png', gameSetId: 'gs-1' });
    const card = await store.createCard({
      name: 'Rune Ward',
      type: 'SPELL',
      domainId: d.id,
      domainIcon: '/icons/custom.png',
      gameSetId: 'gs-1',
    });
    expect(card.domainIcon).toBe('/icons/custom.png');
  });

  it('listCardsByDomain only returns matching cards', async () => {
    const arcana = await store.createDomain({ name: 'Arcana', gameSetId: 'gs-1' });
    const blade = await store.createDomain({ name: 'Blade', gameSetId: 'gs-1' });
    await store.createCard({ name: 'Rune Ward', type: 'SPELL', domainId: arcana.id, gameSetId: 'gs-1' });
    await store.createCard({ name: 'Whirlwind', type: 'ABILITY', domainId: blade.id, gameSetId: 'gs-1' });

    const arcanaCards = store.listCardsByDomain(arcana.id);
    expect(arcanaCards).toHaveLength(1);
    expect(arcanaCards[0].name).toBe('Rune Ward');
  });

  it('update and remove follow the same makeCollection rules as every other type', async () => {
    const d = await store.createDomain({ name: 'Arcana', gameSetId: 'gs-1' });
    const card = await store.createCard({ name: 'Rune Ward', type: 'SPELL', level: 1, domainId: d.id, gameSetId: 'gs-1' });
    const updated = await store.updateCard(card.id, { level: 3 });
    expect(updated.level).toBe(3);
    await store.removeCard(card.id);
    expect(store.listCards()).toHaveLength(0);
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

describe('Campaign', () => {
  it('create is idempotent by name, case-insensitive', async () => {
    const a = await store.createCampaign({ name: 'The Wildwood' });
    const b = await store.createCampaign({ name: 'the wildwood' });
    expect(a.id).toBe(b.id);
    expect(store.listCampaigns()).toHaveLength(1);
  });

  it('update follows PATCH semantics', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood', notes: 'Session 0' });
    const updated = await store.updateCampaign(c.id, { notes: 'Session 1' });
    expect(updated.name).toBe('The Wildwood');
    expect(updated.notes).toBe('Session 1');
  });

  it('remove cascades to delete its PartyMembers', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const other = await store.createCampaign({ name: 'Other Campaign' });
    await store.createPartyMember({ campaignId: c.id, name: 'Fenn' });
    await store.createPartyMember({ campaignId: c.id, name: 'Toth' });
    await store.createPartyMember({ campaignId: other.id, name: 'Unrelated' });

    await store.removeCampaign(c.id);

    expect(store.listCampaigns().find((x) => x.id === c.id)).toBeUndefined();
    expect(store.listPartyMembersByCampaign(c.id)).toHaveLength(0);
    expect(store.listPartyMembersByCampaign(other.id)).toHaveLength(1);
  });

  it('remove throws for an unknown id', async () => {
    await expect(store.removeCampaign('missing')).rejects.toThrow('No campaign with id');
  });
});

describe('PartyMember', () => {
  it('rejects a campaignId that does not exist', async () => {
    await expect(store.createPartyMember({ campaignId: 'missing', name: 'Fenn' })).rejects.toThrow(
      'No campaign with id'
    );
  });

  it('defaults trackables to an empty array', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const member = await store.createPartyMember({ campaignId: c.id, name: 'Fenn' });
    expect(member.trackables).toEqual([]);
  });

  it('stores freeform trackables as given, keyed positionally (no synthetic id)', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const member = await store.createPartyMember({
      campaignId: c.id,
      name: 'Fenn',
      trackables: [{ label: 'HP', current: 6, max: 6 }],
    });
    expect(member.trackables).toEqual([{ label: 'HP', current: 6, max: 6 }]);
  });

  it('listPartyMembersByCampaign only returns matching members', async () => {
    const c1 = await store.createCampaign({ name: 'The Wildwood' });
    const c2 = await store.createCampaign({ name: 'Other Campaign' });
    await store.createPartyMember({ campaignId: c1.id, name: 'Fenn' });
    await store.createPartyMember({ campaignId: c2.id, name: 'Toth' });

    const c1Members = store.listPartyMembersByCampaign(c1.id);
    expect(c1Members).toHaveLength(1);
    expect(c1Members[0].name).toBe('Fenn');
  });

  it('update and remove follow the same makeCollection rules as every other type', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const member = await store.createPartyMember({ campaignId: c.id, name: 'Fenn' });
    const updated = await store.updatePartyMember(member.id, { notes: 'Ranger' });
    expect(updated.notes).toBe('Ranger');
    await store.removePartyMember(member.id);
    expect(store.listPartyMembers()).toHaveLength(0);
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
    expect(Array.isArray(snapshot.campaigns)).toBe(true);
    expect(Array.isArray(snapshot.partyMembers)).toBe(true);
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

  it('round-trips Campaigns and PartyMembers', async () => {
    const campaign = await store.createCampaign({ name: 'The Wildwood' });
    const member = await store.createPartyMember({
      campaignId: campaign.id,
      name: 'Fenn',
      trackables: [{ label: 'HP', current: 6, max: 6 }],
    });

    const snapshot = store.exportSnapshot();
    const freshDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daggerheart-import-test-'));
    const previousDir = process.env.DAGGERHEART_STORE_DIR;
    process.env.DAGGERHEART_STORE_DIR = freshDir;
    store.__resetCacheForTests();
    fs.writeFileSync(path.join(freshDir, 'data.json'), JSON.stringify(store.emptyStore()));
    try {
      const result = await store.importSnapshot(snapshot);
      expect(result.importedCount).toBeGreaterThan(0);
      expect(store.listCampaigns().find((c) => c.id === campaign.id)?.name).toBe('The Wildwood');
      expect(store.listPartyMembersByCampaign(campaign.id)).toHaveLength(1);
      expect(store.listPartyMembersByCampaign(campaign.id)[0].id).toBe(member.id);
    } finally {
      process.env.DAGGERHEART_STORE_DIR = previousDir;
      store.__resetCacheForTests();
      fs.rmSync(freshDir, { recursive: true, force: true });
    }
  });
});

describe('forward-compat store migration', () => {
  it('backfills a collection missing from an on-disk store (e.g. an install from before Cards existed)', async () => {
    const oldStore = store.emptyStore();
    delete oldStore.cards;
    fs.writeFileSync(path.join(tempDir, 'data.json'), JSON.stringify(oldStore));
    store.__resetCacheForTests();

    expect(store.listCards()).toEqual([]);
    // The read fixed the in-memory cache; write it back out and confirm the
    // key is actually persisted, not just papered over in memory.
    await store.createGameSet({ name: 'Forces a write' });
    const onDisk = JSON.parse(fs.readFileSync(path.join(tempDir, 'data.json'), 'utf-8'));
    expect(Array.isArray(onDisk.cards)).toBe(true);
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
