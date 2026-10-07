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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  // A test that mutated the store without flushing may still have a pending
  // debounced write timer — left alone, it'd fire later and write to
  // whatever getStoreDir() resolves to once DAGGERHEART_STORE_DIR is gone
  // (the real ~/.daggerheart-hub), so clear it before tearing anything down.
  store.__resetCacheForTests();
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

  // Regression: createSubclass's duplicate-name check used to search the
  // whole store.subclasses list, not scoped to parentClassId (unlike
  // Session's own identical "two different parents can each have their own
  // same-named child" shape, which does scope — see store.js). Two
  // different classes with a same-named Subclass used to silently collide:
  // the second create() returned the FIRST class's existing record
  // instead of creating one for the second class, which from the UI read
  // as "doesn't accept input" for whichever class tried second.
  it('two different classes can each have a same-named Subclass without colliding', async () => {
    const d1 = await store.createDomain({ name: 'Arcana', gameSetId: 'gs-1' });
    const d2 = await store.createDomain({ name: 'Blade', gameSetId: 'gs-1' });
    const wizard = await store.createHeroClass({
      name: 'Wizard',
      primaryDomainId: d1.id,
      secondaryDomainId: d2.id,
      gameSetId: 'gs-1',
    });
    const ranger = await store.createHeroClass({
      name: 'Ranger',
      primaryDomainId: d1.id,
      secondaryDomainId: d2.id,
      gameSetId: 'gs-1',
    });
    const first = await store.createSubclass({ name: 'Wayfinder', parentClassId: wizard.id, gameSetId: 'gs-1' });
    const second = await store.createSubclass({ name: 'Wayfinder', parentClassId: ranger.id, gameSetId: 'gs-1' });

    expect(second.id).not.toBe(first.id);
    expect(second.parentClassId).toBe(ranger.id);
    expect(store.listSubclassesByParentClass(ranger.id)).toHaveLength(1);
    expect(store.listSubclassesByParentClass(wizard.id)).toHaveLength(1);
  });

  it('renaming a Subclass to collide with a sibling under the SAME class is skipped, but a same name under a DIFFERENT class is not', async () => {
    const d1 = await store.createDomain({ name: 'Arcana', gameSetId: 'gs-1' });
    const d2 = await store.createDomain({ name: 'Blade', gameSetId: 'gs-1' });
    const wizard = await store.createHeroClass({
      name: 'Wizard',
      primaryDomainId: d1.id,
      secondaryDomainId: d2.id,
      gameSetId: 'gs-1',
    });
    const ranger = await store.createHeroClass({
      name: 'Ranger',
      primaryDomainId: d1.id,
      secondaryDomainId: d2.id,
      gameSetId: 'gs-1',
    });
    const wizardSub = await store.createSubclass({ name: 'School of Knowledge', parentClassId: wizard.id, gameSetId: 'gs-1' });
    await store.createSubclass({ name: 'Wayfinder', parentClassId: ranger.id, gameSetId: 'gs-1' });
    const other = await store.createSubclass({ name: 'Beastbound', parentClassId: ranger.id, gameSetId: 'gs-1' });

    // Same class, name collides with a sibling -> skipped (existing behavior, unchanged).
    const skipped = await store.updateSubclass(other.id, { name: 'Wayfinder' });
    expect(skipped.name).toBe('Beastbound');

    // Different class, same name as a sibling's name under another class -> allowed now.
    const renamed = await store.updateSubclass(other.id, { name: 'School of Knowledge' });
    expect(renamed.name).toBe('School of Knowledge');
    expect(renamed.id).not.toBe(wizardSub.id);
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

  it('rejects a trait that is not one of the known trait names', async () => {
    await expect(
      store.createWeapon({ weaponSlot: 'PRIMARY', name: 'Cursed Blade', burden: 'ONE_HANDED', trait: 'LUCK', gameSetId: 'gs-1' })
    ).rejects.toThrow('trait must be one of');
  });

  it('clamps a non-numeric tier instead of persisting NaN', async () => {
    const w = await store.createWeapon({
      weaponSlot: 'PRIMARY',
      name: 'Rusty Sword',
      burden: 'ONE_HANDED',
      tier: 'a lot',
      gameSetId: 'gs-1',
    });
    expect(w.tier).toBeNull();
  });
});

describe('Adversary', () => {
  it('rejects a type that is not one of the corebook categories', async () => {
    await expect(store.createAdversary({ name: 'Ogre', type: 'BOSS', gameSetId: 'gs-1' })).rejects.toThrow(
      'type must be one of'
    );
  });

  it('clamps a garbled numeric field instead of persisting NaN, the motivating "Harbinger of Pestilence" bug', async () => {
    const a = await store.createAdversary({
      name: 'Harbinger of Pestilence',
      hp: '(unrecognized damage type)',
      gameSetId: 'gs-1',
    });
    expect(a.hp).toBeNull();
  });

  it('clamps hp/stress/thresholds to non-negative whole numbers', async () => {
    const a = await store.createAdversary({
      name: 'Ogre',
      hp: -3,
      stress: 2.6,
      thresholds: { major: -1, severe: 10.4 },
      gameSetId: 'gs-1',
    });
    expect(a.hp).toBe(0);
    expect(a.stress).toBe(3);
    expect(a.thresholds).toEqual({ major: 0, severe: 10 });
  });

  it('re-validates enum fields on update too, not just create', async () => {
    const a = await store.createAdversary({ name: 'Ogre', gameSetId: 'gs-1' });
    await expect(store.updateAdversary(a.id, { attackRange: 'ADJACENT' })).rejects.toThrow('attackRange must be one of');
  });
});

describe('Environment', () => {
  it('rejects a category that is not one of the corebook categories', async () => {
    await expect(store.createEnvironment({ name: 'Cave', category: 'DUNGEON', gameSetId: 'gs-1' })).rejects.toThrow(
      'category must be one of'
    );
  });

  it('clamps a negative difficulty to zero', async () => {
    const e = await store.createEnvironment({ name: 'Cave', difficulty: -5, gameSetId: 'gs-1' });
    expect(e.difficulty).toBe(0);
  });
});

describe('Armor', () => {
  it('clamps a non-numeric baseScore instead of persisting NaN', async () => {
    const a = await store.createArmor({ name: 'Leather', baseScore: 'sturdy', gameSetId: 'gs-1' });
    expect(a.baseScore).toBeNull();
  });

  it('clamps thresholds to non-negative whole numbers', async () => {
    const a = await store.createArmor({ name: 'Leather', thresholds: { major: -2, severe: 8.2 }, gameSetId: 'gs-1' });
    expect(a.thresholds).toEqual({ major: 0, severe: 8 });
  });
});

describe('Loot / Consumable', () => {
  it('rejects a gameSetId that does not exist', async () => {
    await expect(store.createLoot({ name: 'Trinket', gameSetId: 'missing' })).rejects.toThrow('No game set with id');
    await expect(store.createConsumable({ name: 'Potion', gameSetId: 'missing' })).rejects.toThrow('No game set with id');
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

  // coverImage/portraitImage are raw data: URLs with no managed file
  // directory behind them — store.js rejects a too-large or malformed one
  // outright rather than clamping, since there's no sensible way to shrink
  // an oversized image automatically.
  const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

  it('accepts a small image data URL for coverImage', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood', coverImage: TINY_PNG });
    expect(c.coverImage).toBe(TINY_PNG);
  });

  it('rejects a coverImage that is not an image data URL', async () => {
    await expect(store.createCampaign({ name: 'The Wildwood', coverImage: 'not-a-data-url' })).rejects.toThrow(
      'coverImage must be an image data URL'
    );
  });

  it('rejects a coverImage over the size cap', async () => {
    const oversized = `data:image/png;base64,${'A'.repeat(6_000_000)}`;
    await expect(store.createCampaign({ name: 'The Wildwood', coverImage: oversized })).rejects.toThrow(
      'coverImage is too large'
    );
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

  it('rejects a portraitImage over the size cap', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const oversized = `data:image/png;base64,${'A'.repeat(6_000_000)}`;
    await expect(store.createPartyMember({ campaignId: c.id, name: 'Fenn', portraitImage: oversized })).rejects.toThrow(
      'portraitImage is too large'
    );
  });

  it('clamps a trackable\'s current/max to non-negative whole numbers', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const member = await store.createPartyMember({
      campaignId: c.id,
      name: 'Fenn',
      trackables: [{ label: 'HP', current: -2, max: 6.7 }],
    });
    expect(member.trackables).toEqual([{ label: 'HP', current: 0, max: 7 }]);
  });
});

describe('LootTable', () => {
  it('rejects a gameSetId that does not exist', async () => {
    await expect(store.createLootTable({ name: 'Core Loot', gameSetId: 'missing' })).rejects.toThrow(
      'No game set with id'
    );
  });

  it('defaults entries to an empty object for every rarity', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const table = await store.createLootTable({ name: 'Core Loot', gameSetId: gs.id });
    expect(table.entries).toEqual({ COMMON: [], UNCOMMON: [], RARE: [], LEGENDARY: [] });
  });

  it('rejects an entry referencing a lootId that does not exist', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    await expect(
      store.createLootTable({
        name: 'Core Loot',
        gameSetId: gs.id,
        entries: { COMMON: [{ position: 1, lootId: 'missing' }], UNCOMMON: [], RARE: [], LEGENDARY: [] },
      })
    ).rejects.toThrow('No loot item with id');
  });

  it('rejects a position outside [1, rarity max]', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const trinket = await store.createLoot({ name: 'Trinket', gameSetId: gs.id });
    await expect(
      store.createLootTable({
        name: 'Core Loot',
        gameSetId: gs.id,
        entries: { COMMON: [{ position: 25, lootId: trinket.id }], UNCOMMON: [], RARE: [], LEGENDARY: [] },
      })
    ).rejects.toThrow('between 1 and 24');
  });

  it('rejects two entries in the same rarity sharing a position', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const trinket = await store.createLoot({ name: 'Trinket', gameSetId: gs.id });
    const charm = await store.createLoot({ name: 'Charm', gameSetId: gs.id });
    await expect(
      store.createLootTable({
        name: 'Core Loot',
        gameSetId: gs.id,
        entries: {
          COMMON: [
            { position: 5, lootId: trinket.id },
            { position: 5, lootId: charm.id },
          ],
          UNCOMMON: [],
          RARE: [],
          LEGENDARY: [],
        },
      })
    ).rejects.toThrow('used more than once');
  });

  it('accepts a full LEGENDARY position up to 60', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const trinket = await store.createLoot({ name: 'Trinket', gameSetId: gs.id });
    const table = await store.createLootTable({
      name: 'Core Loot',
      gameSetId: gs.id,
      entries: { COMMON: [], UNCOMMON: [], RARE: [], LEGENDARY: [{ position: 60, lootId: trinket.id }] },
    });
    expect(table.entries.LEGENDARY).toEqual([{ position: 60, lootId: trinket.id }]);
  });

  it('update and remove follow the same makeCollection rules as every other type', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const table = await store.createLootTable({ name: 'Core Loot', gameSetId: gs.id });
    const updated = await store.updateLootTable(table.id, { description: 'The default table' });
    expect(updated.description).toBe('The default table');
    await store.removeLootTable(table.id);
    expect(store.listLootTables()).toHaveLength(0);
  });
});

describe('ConsumableTable', () => {
  it('rejects an entry referencing a consumableId that does not exist', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    await expect(
      store.createConsumableTable({
        name: 'Core Consumables',
        gameSetId: gs.id,
        entries: { COMMON: [{ position: 1, consumableId: 'missing' }], UNCOMMON: [], RARE: [], LEGENDARY: [] },
      })
    ).rejects.toThrow('No consumable with id');
  });

  it('accepts a valid entry and round-trips it through update', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const potion = await store.createConsumable({ name: 'Minor Health Potion', gameSetId: gs.id });
    const table = await store.createConsumableTable({
      name: 'Core Consumables',
      gameSetId: gs.id,
      entries: { COMMON: [{ position: 3, consumableId: potion.id }], UNCOMMON: [], RARE: [], LEGENDARY: [] },
    });
    expect(table.entries.COMMON).toEqual([{ position: 3, consumableId: potion.id }]);

    const potion2 = await store.createConsumable({ name: 'Major Health Potion', gameSetId: gs.id });
    const updated = await store.updateConsumableTable(table.id, {
      entries: { COMMON: [{ position: 3, consumableId: potion2.id }], UNCOMMON: [], RARE: [], LEGENDARY: [] },
    });
    expect(updated.entries.COMMON).toEqual([{ position: 3, consumableId: potion2.id }]);
  });
});

describe('Session', () => {
  it('rejects a campaignId that does not exist', async () => {
    await expect(store.createSession({ campaignId: 'missing', name: 'Session 1' })).rejects.toThrow(
      'No campaign with id'
    );
  });

  it('defaults fear to 0', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    expect(session.fear).toBe(0);
    expect(session.lootLog).toEqual([]);
  });

  it('clamps fear to [0, 12] instead of rejecting an out-of-range value', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1', fear: 99 });
    expect(session.fear).toBe(12);
    const updated = await store.updateSession(session.id, { fear: -5 });
    expect(updated.fear).toBe(0);
  });

  it('listSessionsByCampaign only returns matching sessions', async () => {
    const c1 = await store.createCampaign({ name: 'The Wildwood' });
    const c2 = await store.createCampaign({ name: 'Other Campaign' });
    await store.createSession({ campaignId: c1.id, name: 'Session 1' });
    await store.createSession({ campaignId: c2.id, name: 'Session 1' });

    const c1Sessions = store.listSessionsByCampaign(c1.id);
    expect(c1Sessions).toHaveLength(1);
  });

  it('removing a session hands what it authored to the next session, and drops it with the last one', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    const otherSession = await store.createSession({ campaignId: c.id, name: 'Session 2' });
    const ogre = await store.createAdversary({ name: 'Ogre', gameSetId: gs.id });
    const cave = await store.createEnvironment({ name: 'Cave', gameSetId: gs.id });
    await store.createSessionAdversary({ sessionId: session.id, adversaryId: ogre.id });
    await store.createSessionEnvironment({ sessionId: session.id, environmentId: cave.id });
    await store.createSessionAdversary({ sessionId: otherSession.id, adversaryId: ogre.id });

    await store.removeSession(session.id);

    expect(store.listSessions().find((s) => s.id === session.id)).toBeUndefined();
    expect(store.listSessionAdversariesBySession(session.id)).toHaveLength(0);
    expect(store.listSessionEnvironmentsBySession(session.id)).toHaveLength(0);
    // Session 2 was already showing session 1's Ogre and Cave (they carry), so
    // deleting session 1 must not make them vanish from it.
    expect(store.listSessionAdversariesBySession(otherSession.id)).toHaveLength(2);
    expect(store.listSessionEnvironmentsBySession(otherSession.id)).toHaveLength(1);

    await store.removeSession(otherSession.id);
    expect(store.listSessionAdversaries()).toHaveLength(0);
  });

  it('remove throws for an unknown id', async () => {
    await expect(store.removeSession('missing')).rejects.toThrow('No session with id');
  });

  it('renaming a Session relabels its linked SESSION-kind Journal entry to match', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    const linked = await store.createJournalEntry({ campaignId: c.id, kind: 'SESSION', label: 'Session 1' });
    // An unrelated entry at a different kind, or in a different campaign,
    // must never be touched by this.
    const other = await store.createJournalEntry({ campaignId: c.id, kind: 'OTHER', label: 'Session 1' });

    const renamed = await store.updateSession(session.id, { name: 'The Ambush at Dawn' });

    expect(renamed.name).toBe('The Ambush at Dawn');
    const linkedAfter = store.listJournalEntriesByCampaign(c.id).find((e) => e.id === linked.id);
    expect(linkedAfter.label).toBe('The Ambush at Dawn');
    const otherAfter = store.listJournalEntriesByCampaign(c.id).find((e) => e.id === other.id);
    expect(otherAfter.label).toBe('Session 1');
  });

  it('a rename that collides with another Session in the same Campaign is silently reverted, and does not relabel the linked entry', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    await store.createSession({ campaignId: c.id, name: 'Session 2' });
    const linked = await store.createJournalEntry({ campaignId: c.id, kind: 'SESSION', label: 'Session 1' });

    const result = await store.updateSession(session.id, { name: 'Session 2' });

    expect(result.name).toBe('Session 1');
    const linkedAfter = store.listJournalEntriesByCampaign(c.id).find((e) => e.id === linked.id);
    expect(linkedAfter.label).toBe('Session 1');
  });

  it('a non-rename update (e.g. fear) never touches a linked entry’s label', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    const linked = await store.createJournalEntry({ campaignId: c.id, kind: 'SESSION', label: 'Session 1' });

    await store.updateSession(session.id, { fear: 4 });

    const linkedAfter = store.listJournalEntriesByCampaign(c.id).find((e) => e.id === linked.id);
    expect(linkedAfter.label).toBe('Session 1');
  });
});

describe('JournalEntry', () => {
  it('rejects a campaignId that does not exist', async () => {
    await expect(store.createJournalEntry({ campaignId: 'missing', kind: 'OTHER' })).rejects.toThrow(
      'No campaign with id'
    );
  });

  it('rejects a kind outside the enum', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    await expect(store.createJournalEntry({ campaignId: c.id, kind: 'NPC' })).rejects.toThrow(
      'Journal entry kind must be one of'
    );
  });

  it('defaults label and notes to empty strings, and assigns an incrementing order within its (campaign, kind) group', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const first = await store.createJournalEntry({ campaignId: c.id, kind: 'WEAPONS' });
    expect(first.label).toBe('');
    expect(first.notes).toBe('');
    expect(first.order).toBe(0);
    const second = await store.createJournalEntry({ campaignId: c.id, kind: 'WEAPONS' });
    expect(second.order).toBe(1);
    // A different kind in the same campaign starts its own group at 0.
    const other = await store.createJournalEntry({ campaignId: c.id, kind: 'LOOT' });
    expect(other.order).toBe(0);
  });

  it('listJournalEntriesByCampaign only returns matching entries, sorted by order', async () => {
    const c1 = await store.createCampaign({ name: 'The Wildwood' });
    const c2 = await store.createCampaign({ name: 'Other Campaign' });
    const a = await store.createJournalEntry({ campaignId: c1.id, kind: 'OTHER', label: 'A' });
    const b = await store.createJournalEntry({ campaignId: c1.id, kind: 'OTHER', label: 'B' });
    await store.createJournalEntry({ campaignId: c2.id, kind: 'OTHER', label: 'C' });

    await store.updateJournalEntry(a.id, { order: 5 });
    await store.updateJournalEntry(b.id, { order: 1 });

    const c1Entries = store.listJournalEntriesByCampaign(c1.id);
    expect(c1Entries.map((e) => e.label)).toEqual(['B', 'A']);
  });

  it('update can change label, notes, and order', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const entry = await store.createJournalEntry({ campaignId: c.id, kind: 'ADVERSARIES' });
    const updated = await store.updateJournalEntry(entry.id, { label: 'Ogre captain', notes: 'Tough fight', order: 3 });
    expect(updated.label).toBe('Ogre captain');
    expect(updated.notes).toBe('Tough fight');
    expect(updated.order).toBe(3);
  });

  it('remove throws for an unknown id', async () => {
    await expect(store.removeJournalEntry('missing')).rejects.toThrow('No record with id');
  });

  it('accepts the SESSION kind — auto-created from a live Session’s Notes panel, see updateSessionAndSyncNotes', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const entry = await store.createJournalEntry({ campaignId: c.id, kind: 'SESSION', label: 'Session 1' });
    expect(entry.kind).toBe('SESSION');
  });
});

describe('SessionAdversary', () => {
  it('rejects a sessionId that does not exist', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const ogre = await store.createAdversary({ name: 'Ogre', gameSetId: gs.id });
    await expect(store.createSessionAdversary({ sessionId: 'missing', adversaryId: ogre.id })).rejects.toThrow(
      'No session with id'
    );
  });

  it('rejects an adversaryId that does not exist', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    await expect(store.createSessionAdversary({ sessionId: session.id, adversaryId: 'missing' })).rejects.toThrow(
      'No adversary with id'
    );
  });

  it('snapshots the master Adversary at create time, defaulting label to its name', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    const ogre = await store.createAdversary({ name: 'Ogre', hp: 8, stress: 3, tier: 2, gameSetId: gs.id });

    const pulled = await store.createSessionAdversary({ sessionId: session.id, adversaryId: ogre.id });
    expect(pulled.label).toBe('Ogre');
    expect(pulled.name).toBe('Ogre');
    expect(pulled.hpMax).toBe(8);
    expect(pulled.stressMax).toBe(3);
    expect(pulled.hpMarked).toBe(0);
    expect(pulled.stressMarked).toBe(0);
    expect(pulled.conditions).toEqual([]);
  });

  it('snapshots the master Adversary\'s Experiences too, not just its combat stats', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    const ogre = await store.createAdversary({
      name: 'Ogre',
      gameSetId: gs.id,
      experiences: [{ name: 'Tracking', modifier: 2 }],
    });

    const pulled = await store.createSessionAdversary({ sessionId: session.id, adversaryId: ogre.id });
    expect(pulled.experiences).toEqual([{ name: 'Tracking', modifier: 2 }]);
  });

  it('pulling in the same Adversary twice creates two independent records, not one', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    const ogre = await store.createAdversary({ name: 'Ogre', gameSetId: gs.id });

    const first = await store.createSessionAdversary({ sessionId: session.id, adversaryId: ogre.id, label: 'Ogre A' });
    const second = await store.createSessionAdversary({ sessionId: session.id, adversaryId: ogre.id, label: 'Ogre B' });
    expect(first.id).not.toBe(second.id);
    expect(store.listSessionAdversariesBySession(session.id)).toHaveLength(2);
  });

  it('editing the master Adversary after pull-in does not change the snapshot', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    const ogre = await store.createAdversary({ name: 'Ogre', hp: 8, gameSetId: gs.id });
    const pulled = await store.createSessionAdversary({ sessionId: session.id, adversaryId: ogre.id });

    await store.updateAdversary(ogre.id, { hp: 20 });

    const stillSnapshotted = store.listSessionAdversariesBySession(session.id).find((sa) => sa.id === pulled.id);
    expect(stillSnapshotted.hpMax).toBe(8);
  });

  it('marking HP/Stress and adding conditions updates the record', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    const ogre = await store.createAdversary({ name: 'Ogre', hp: 8, gameSetId: gs.id });
    const pulled = await store.createSessionAdversary({ sessionId: session.id, adversaryId: ogre.id });

    const updated = await store.updateSessionAdversary(pulled.id, {
      hpMarked: 3,
      conditions: [{ name: 'Restrained', count: 1 }],
    });
    expect(updated.hpMarked).toBe(3);
    expect(updated.conditions).toEqual([{ name: 'Restrained', count: 1 }]);
  });

  it('stacks and sanitizes Conditions on update', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    const ogre = await store.createAdversary({ name: 'Ogre', hp: 8, gameSetId: gs.id });
    const pulled = await store.createSessionAdversary({ sessionId: session.id, adversaryId: ogre.id });

    const updated = await store.updateSessionAdversary(pulled.id, {
      conditions: [{ name: 'Corrosive', count: 2.6 }, { count: 3 }],
    });
    expect(updated.conditions).toEqual([
      { name: 'Corrosive', count: 3 },
      { name: '', count: 3 },
    ]);
  });

  it('clamps Difficulty/Thresholds/HP edited live in Combat instead of persisting a garbled value', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    const ogre = await store.createAdversary({ name: 'Ogre', gameSetId: gs.id });
    const pulled = await store.createSessionAdversary({ sessionId: session.id, adversaryId: ogre.id });

    const updated = await store.updateSessionAdversary(pulled.id, {
      difficulty: -4,
      thresholds: { major: -1, severe: 12.9 },
      hpMarked: -1,
    });
    expect(updated.difficulty).toBe(0);
    expect(updated.thresholds).toEqual({ major: 0, severe: 13 });
    expect(updated.hpMarked).toBe(0);
  });

  it('remove deletes the record', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    const ogre = await store.createAdversary({ name: 'Ogre', gameSetId: gs.id });
    const pulled = await store.createSessionAdversary({ sessionId: session.id, adversaryId: ogre.id });

    await store.removeSessionAdversary(pulled.id);
    expect(store.listSessionAdversariesBySession(session.id)).toHaveLength(0);
  });
});

describe('SessionEnvironment', () => {
  it('rejects an environmentId that does not exist', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    await expect(store.createSessionEnvironment({ sessionId: session.id, environmentId: 'missing' })).rejects.toThrow(
      'No environment with id'
    );
  });

  it('snapshots the master Environment at create time', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    const cave = await store.createEnvironment({ name: 'Cave', tier: 1, impulses: ['Ambush'], gameSetId: gs.id });

    const pulled = await store.createSessionEnvironment({ sessionId: session.id, environmentId: cave.id });
    expect(pulled.label).toBe('Cave');
    expect(pulled.tier).toBe(1);
    expect(pulled.impulses).toEqual(['Ambush']);
    expect(pulled.notes).toBeNull();
  });
});

describe('Combat', () => {
  it('rejects a sessionId that does not exist', async () => {
    await expect(store.createCombat({ sessionId: 'missing', name: 'Combat', order: 0 })).rejects.toThrow(
      'No session with id'
    );
  });

  it('requires an order', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    await expect(store.createCombat({ sessionId: session.id, name: 'Combat' })).rejects.toThrow('order is required');
  });

  it('defaults an empty name to "Combat"', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    const combat = await store.createCombat({ sessionId: session.id, name: '  ', order: 0 });
    expect(combat.name).toBe('Combat');
  });

  it('renames and reorders via update', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    const combat = await store.createCombat({ sessionId: session.id, name: 'Combat', order: 0 });
    const updated = await store.updateCombat(combat.id, { name: 'Boss Fight', order: 2 }, { sessionId: session.id });
    expect(updated.name).toBe('Boss Fight');
    expect(updated.order).toBe(2);
  });

  it('a blank rename is a no-op, keeping the old name rather than erroring or clearing it', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    const combat = await store.createCombat({ sessionId: session.id, name: 'Boss Fight', order: 0 });
    const updated = await store.updateCombat(combat.id, { name: '  ' }, { sessionId: session.id });
    expect(updated.name).toBe('Boss Fight');
  });

  it('remove deletes the record', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    const combat = await store.createCombat({ sessionId: session.id, name: 'Combat', order: 0 });
    await store.removeCombat(combat.id, { sessionId: session.id });
    expect(store.listCombatsBySession(session.id)).toHaveLength(0);
  });

  it('a pulled-in Adversary/Environment can reference a Combat tab by id, validated against real tabs', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    const ogre = await store.createAdversary({ name: 'Ogre', gameSetId: gs.id });
    const combat = await store.createCombat({ sessionId: session.id, name: 'Combat', order: 0 });

    const pulled = await store.createSessionAdversary({ sessionId: session.id, adversaryId: ogre.id, combatId: combat.id });
    expect(pulled.combatId).toBe(combat.id);

    await expect(
      store.createSessionAdversary({ sessionId: session.id, adversaryId: ogre.id, combatId: 'missing' })
    ).rejects.toThrow('No combat with id');
  });

  it('combatId is optional — a SessionAdversary/SessionEnvironment pulled in without one reads as null', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    const ogre = await store.createAdversary({ name: 'Ogre', gameSetId: gs.id });
    const pulled = await store.createSessionAdversary({ sessionId: session.id, adversaryId: ogre.id });
    expect(pulled.combatId).toBeNull();
  });

  it('a pre-tabs Adversary/Environment can be adopted into a tab by update, from that session onward', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const first = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    const second = await store.createSession({ campaignId: c.id, name: 'Session 2' });
    const ogre = await store.createAdversary({ name: 'Ogre', gameSetId: gs.id });
    const bog = await store.createEnvironment({ name: 'Bog', gameSetId: gs.id });
    const adv = await store.createSessionAdversary({ sessionId: first.id, adversaryId: ogre.id });
    const env = await store.createSessionEnvironment({ sessionId: first.id, environmentId: bog.id });
    const combat = await store.createCombat({ sessionId: second.id, name: 'Combat', order: 0 });

    await store.updateSessionAdversary(adv.id, { combatId: combat.id }, { sessionId: second.id });
    await store.updateSessionEnvironment(env.id, { combatId: combat.id }, { sessionId: second.id });

    expect(store.listSessionAdversariesBySession(second.id)[0].combatId).toBe(combat.id);
    expect(store.listSessionEnvironmentsBySession(second.id)[0].combatId).toBe(combat.id);
    expect(store.listSessionAdversariesBySession(first.id)[0].combatId).toBeNull();

    await expect(store.updateSessionAdversary(adv.id, { combatId: 'missing' }, { sessionId: second.id })).rejects.toThrow(
      'No combat with id'
    );
  });
});

describe('generic collection (makeCollection) shared behavior', () => {
  it('PATCH semantics: an omitted field is untouched, an explicit empty value overwrites', async () => {
    const gs = await store.createGameSet({ name: 'Core' });
    const loot = await store.createLoot({ name: 'Trinket', description: 'A shiny thing', gameSetId: gs.id });
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
    const gs = await store.createGameSet({ name: 'Core' });
    const loot = await store.createLoot({ name: 'Still Works', gameSetId: gs.id });
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
    expect(Array.isArray(snapshot.lootTables)).toBe(true);
    expect(Array.isArray(snapshot.consumableTables)).toBe(true);
    expect(Array.isArray(snapshot.sessions)).toBe(true);
    expect(Array.isArray(snapshot.sessionAdversaries)).toBe(true);
    expect(Array.isArray(snapshot.sessionEnvironments)).toBe(true);
  });

  it('rejects a non-object payload', async () => {
    await expect(store.importSnapshot(null)).rejects.toThrow('not a valid Daggerheart Brewery export');
  });

  it('rejects a payload whose collection is not an array', async () => {
    await expect(store.importSnapshot({ domains: 'nope' })).rejects.toThrow('not a valid Daggerheart Brewery export');
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
    store.flushPendingWrite();
    const onDisk = JSON.parse(fs.readFileSync(path.join(tempDir, 'data.json'), 'utf-8'));
    expect(Array.isArray(onDisk.cards)).toBe(true);
  });
});

describe('debounced disk writes', () => {
  it('list() reflects a mutation immediately, even before the debounced write to disk fires', async () => {
    await store.createGameSet({ name: 'Core' });
    expect(store.listGameSets()).toHaveLength(1);
  });

  it('flushPendingWrite() writes to disk immediately, without waiting out the debounce window', async () => {
    await store.createGameSet({ name: 'Core' });
    store.flushPendingWrite();
    const onDisk = JSON.parse(fs.readFileSync(path.join(tempDir, 'data.json'), 'utf-8'));
    expect(onDisk.gameSets).toHaveLength(1);
  });

  it('a burst of rapid mutations coalesces into disk matching the final in-memory state once flushed', async () => {
    const a = await store.createGameSet({ name: 'Core' });
    await store.createGameSet({ name: 'Homebrew' });
    await store.updateGameSet(a.id, { name: 'Core (renamed)' });
    store.flushPendingWrite();
    const onDisk = JSON.parse(fs.readFileSync(path.join(tempDir, 'data.json'), 'utf-8'));
    expect(onDisk.gameSets.map((g) => g.name).sort()).toEqual(['Core (renamed)', 'Homebrew']);
  });

  it('coalesces multiple rapid mutations into a single disk write instead of one per mutation', async () => {
    const writeSpy = vi.spyOn(fs, 'writeFileSync');
    await store.createGameSet({ name: 'A' });
    await store.createGameSet({ name: 'B' });
    await store.createGameSet({ name: 'C' });
    expect(writeSpy).not.toHaveBeenCalled();
    store.flushPendingWrite();
    expect(writeSpy).toHaveBeenCalledTimes(1);
    writeSpy.mockRestore();
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

describe('Campaign level', () => {
  it('defaults to 1 and clamps into [1, 10]', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    expect(c.level).toBe(1);
    const high = await store.updateCampaign(c.id, { level: 99 });
    expect(high.level).toBe(10);
    const low = await store.updateCampaign(c.id, { level: 0 });
    expect(low.level).toBe(1);
    const ok = await store.updateCampaign(c.id, { level: 4 });
    expect(ok.level).toBe(4);
  });
});

describe('name uniqueness scoped to a Campaign', () => {
  it('two Campaigns can each have a Session or PartyMember with the same name', async () => {
    const a = await store.createCampaign({ name: 'A' });
    const b = await store.createCampaign({ name: 'B' });
    const s1 = await store.createSession({ campaignId: a.id, name: 'Session 1' });
    const s2 = await store.createSession({ campaignId: b.id, name: 'Session 1' });
    expect(s1.id).not.toBe(s2.id);
    expect(store.listSessionsByCampaign(a.id)).toHaveLength(1);
    expect(store.listSessionsByCampaign(b.id)).toHaveLength(1);

    const p1 = await store.createPartyMember({ campaignId: a.id, name: 'Mira' });
    const p2 = await store.createPartyMember({ campaignId: b.id, name: 'Mira' });
    expect(p1.id).not.toBe(p2.id);
  });

  it('is still idempotent by name inside one Campaign', async () => {
    const a = await store.createCampaign({ name: 'A' });
    const s1 = await store.createSession({ campaignId: a.id, name: 'Session 1' });
    const again = await store.createSession({ campaignId: a.id, name: 'session 1' });
    expect(again.id).toBe(s1.id);
  });
});

describe('cloneSession', () => {
  async function setup() {
    const gs = await store.createGameSet({ name: 'Core' });
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const adv = await store.createAdversary({ name: 'Ogre', tier: 1, difficulty: 12, gameSetId: gs.id });
    const env = await store.createEnvironment({ name: 'Bog', tier: 1, difficulty: 10, gameSetId: gs.id });
    const source = await store.createSession({
      campaignId: c.id,
      name: 'Session 3',
      fear: 7,
      lootLog: [{ rolledAt: 'x', rarity: 'COMMON', poolSize: 1, rollTotal: 3, results: [] }],
    });
    const sa = await store.createSessionAdversary({ sessionId: source.id, adversaryId: adv.id, label: 'Ogre A' });
    await store.updateSessionAdversary(sa.id, { hpMarked: 2, conditions: [{ name: 'Vulnerable', count: 1 }] });
    await store.createSessionEnvironment({ sessionId: source.id, environmentId: env.id, label: 'Bog' });
    return { c, source };
  }

  it('lands at the end of the timeline, with everything carried forward', async () => {
    const { c, source } = await setup();
    const copy = await store.cloneSession(source.id);
    expect(copy.id).not.toBe(source.id);
    expect(copy.campaignId).toBe(c.id);
    expect(copy).toMatchObject({ fear: 7 });

    const advs = store.listSessionAdversariesBySession(copy.id);
    expect(advs).toHaveLength(1);
    expect(advs[0]).toMatchObject({ label: 'Ogre A', hpMarked: 2, conditions: [{ name: 'Vulnerable', count: 1 }] });
    expect(store.listSessionEnvironmentsBySession(copy.id)).toHaveLength(1);
  });

  it('carries the loot log forward rather than copying it', async () => {
    const { source } = await setup();
    const copy = await store.cloneSession(source.id);
    expect(copy.lootLog).toHaveLength(1);
    expect(copy.lootLog[0].sessionId).toBe(source.id);
    // Removing it in the clone hides it there only.
    const after = await store.removeSessionLoot(copy.id, copy.lootLog[0].id);
    expect(after.lootLog).toHaveLength(0);
    expect(store.listSessions().find((s) => s.id === source.id).lootLog).toHaveLength(1);
  });

  it('names the copy by incrementing a trailing number, or by appending "(copy)"', async () => {
    const { c, source } = await setup();
    const next = await store.cloneSession(source.id);
    expect(next.name).toBe('Session 4');
    const afterNext = await store.cloneSession(source.id); // 4 is taken, so it skips to 5
    expect(afterNext.name).toBe('Session 5');

    const plain = await store.createSession({ campaignId: c.id, name: 'The Ambush' });
    expect((await store.cloneSession(plain.id)).name).toBe('The Ambush (copy)');
    expect((await store.cloneSession(plain.id)).name).toBe('The Ambush (copy 2)');
  });

  it('accepts an explicit name', async () => {
    const { source } = await setup();
    expect((await store.cloneSession(source.id, { name: 'Finale' })).name).toBe('Finale');
  });

  it('makes an independent copy: changes and deletes on one never touch the other', async () => {
    const { source } = await setup();
    const copy = await store.cloneSession(source.id);
    const [copyAdv] = store.listSessionAdversariesBySession(copy.id);
    await store.updateSessionAdversary(copyAdv.id, { hpMarked: 5 });
    expect(store.listSessionAdversariesBySession(source.id)[0].hpMarked).toBe(2);

    await store.removeSession(source.id);
    expect(store.listSessionAdversariesBySession(copy.id)).toHaveLength(1);
    expect(store.listSessionEnvironmentsBySession(copy.id)).toHaveLength(1);
  });

  it('rejects an unknown session id', async () => {
    await expect(store.cloneSession('missing')).rejects.toThrow('No session with id');
  });
});

describe('Music', () => {
  const DEFAULT = 'everywhere';

  it('always has the built-in Global region, which cannot be removed or renamed', async () => {
    const regions = store.listMusicRegions();
    expect(regions).toHaveLength(1);
    expect(regions[0]).toMatchObject({ id: DEFAULT, name: 'Global', isDefault: true });
    await expect(store.removeMusicRegion(DEFAULT)).rejects.toThrow('cannot be removed');
    const renamed = await store.updateMusicRegion(DEFAULT, { name: 'Elsewhere', isDefault: false });
    expect(renamed).toMatchObject({ name: 'Global', isDefault: true });
  });

  it('backfills the Global region into an older store that lacks the collections', async () => {
    fs.writeFileSync(path.join(tempDir, 'data.json'), JSON.stringify({ version: 1, campaigns: [] }));
    store.__resetCacheForTests();
    expect(store.listMusicRegions()).toEqual([expect.objectContaining({ id: DEFAULT, name: 'Global' })]);
  });

  it('renames an older store\'s default region forward from "Everywhere" to "Global" on load', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'data.json'),
      JSON.stringify({
        version: 1,
        campaigns: [],
        musicRegions: [{ id: DEFAULT, name: 'Everywhere', isDefault: true, adventuringTrackId: null, combatTrackId: null }],
        musicTracks: [],
      })
    );
    store.__resetCacheForTests();
    expect(store.listMusicRegions()).toEqual([expect.objectContaining({ id: DEFAULT, name: 'Global' })]);
  });

  it('creates regions and files tracks under them (default region if none given)', async () => {
    const coast = await store.createMusicRegion({ name: 'The Sunken Coast' });
    expect(coast).toMatchObject({ isDefault: false, campaignId: null, defaultTrackId: null });
    const a = await store.createMusicTrack({ name: 'Tide', fileName: 'a.mp3', regionId: coast.id });
    const b = await store.createMusicTrack({ name: 'Tide', fileName: 'b.mp3' }); // same name is fine
    expect(a.regionId).toBe(coast.id);
    expect(b.regionId).toBe(DEFAULT);
    expect(store.listMusicTracks()).toHaveLength(2);
  });

  it('rejects a track with an unknown region or no file', async () => {
    await expect(store.createMusicTrack({ name: 'X', fileName: 'x.mp3', regionId: 'missing' })).rejects.toThrow(
      'No music region'
    );
    await expect(store.createMusicTrack({ name: 'X' })).rejects.toThrow('audio file');
  });

  it('a user region can only default to its own tracks; Everywhere can default to any', async () => {
    const coast = await store.createMusicRegion({ name: 'The Sunken Coast' });
    const inCoast = await store.createMusicTrack({ name: 'Tide', fileName: 'a.mp3', regionId: coast.id });
    const elsewhere = await store.createMusicTrack({ name: 'Drums', fileName: 'b.mp3' });

    const set = await store.updateMusicRegion(coast.id, { defaultTrackId: inCoast.id });
    expect(set.defaultTrackId).toBe(inCoast.id);
    await expect(store.updateMusicRegion(coast.id, { defaultTrackId: elsewhere.id })).rejects.toThrow('filed under it');
    await expect(store.updateMusicRegion(coast.id, { defaultTrackId: 'missing' })).rejects.toThrow('No music track');

    const global = await store.updateMusicRegion(DEFAULT, { defaultTrackId: inCoast.id });
    expect(global.defaultTrackId).toBe(inCoast.id);
    const cleared = await store.updateMusicRegion(DEFAULT, { defaultTrackId: null });
    expect(cleared.defaultTrackId).toBeNull();
  });

  it('moving a track out of a region clears that region\'s default pointing at it', async () => {
    const coast = await store.createMusicRegion({ name: 'The Sunken Coast' });
    const t = await store.createMusicTrack({ name: 'Tide', fileName: 'a.mp3', regionId: coast.id });
    await store.updateMusicRegion(coast.id, { defaultTrackId: t.id });
    await store.updateMusicTrack(t.id, { regionId: DEFAULT });
    expect(store.listMusicRegions().find((r) => r.id === coast.id).defaultTrackId).toBeNull();
  });

  it('removing a track returns its record and clears any default that used it', async () => {
    const t = await store.createMusicTrack({ name: 'Drums', fileName: 'b.mp3' });
    await store.updateMusicRegion(DEFAULT, { defaultTrackId: t.id });
    const removed = await store.removeMusicTrack(t.id);
    expect(removed.fileName).toBe('b.mp3');
    expect(store.listMusicTracks()).toHaveLength(0);
    expect(store.listMusicRegions()[0].defaultTrackId).toBeNull();
  });

  it('creates a Campaign-scoped region, rejects another Campaign defaulting to it, and survives the Campaign\'s deletion by becoming application-wide', async () => {
    const a = await store.createCampaign({ name: 'Campaign A' });
    const b = await store.createCampaign({ name: 'Campaign B' });
    const scoped = await store.createMusicRegion({ name: 'Battle Music', campaignId: a.id });
    expect(scoped.campaignId).toBe(a.id);

    // Same name, different scope — not a collision (regions are scoped by campaignId).
    const globalOne = await store.createMusicRegion({ name: 'Battle Music' });
    expect(globalOne.campaignId).toBeNull();
    expect(globalOne.id).not.toBe(scoped.id);

    // Campaign A can default to its own scoped region; Campaign B cannot.
    const updatedA = await store.updateCampaign(a.id, { defaultRegionId: scoped.id });
    expect(updatedA.defaultRegionId).toBe(scoped.id);
    await expect(store.updateCampaign(b.id, { defaultRegionId: scoped.id })).rejects.toThrow(
      'application-wide region or one of its own'
    );

    await store.removeCampaign(a.id);
    expect(store.listMusicRegions().find((r) => r.id === scoped.id).campaignId).toBeNull();
  });

  it('removing a region keeps its tracks (moved to Everywhere) and un-sets Sessions using it', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const coast = await store.createMusicRegion({ name: 'The Sunken Coast' });
    const t = await store.createMusicTrack({ name: 'Tide', fileName: 'a.mp3', regionId: coast.id });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1', regionId: coast.id });
    expect(session.regionId).toBe(coast.id);

    await store.removeMusicRegion(coast.id);
    expect(store.listMusicTracks().find((x) => x.id === t.id).regionId).toBe(DEFAULT);
    expect(store.listSessions().find((s) => s.id === session.id).regionId).toBeNull();
  });

  it('a Session rejects a region that does not exist', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    await expect(store.createSession({ campaignId: c.id, name: 'Session 1', regionId: 'missing' })).rejects.toThrow(
      'No music region'
    );
  });

  it('a new track starts at full volume, and volume clamps to 0–1 on update', async () => {
    const t = await store.createMusicTrack({ name: 'Tide', fileName: 'a.mp3' });
    expect(t.volume).toBe(1);

    const quieter = await store.updateMusicTrack(t.id, { volume: 0.4 });
    expect(quieter.volume).toBe(0.4);

    const clampedHigh = await store.updateMusicTrack(t.id, { volume: 3 });
    expect(clampedHigh.volume).toBe(1);
    const clampedLow = await store.updateMusicTrack(t.id, { volume: -2 });
    expect(clampedLow.volume).toBe(0);
    const clampedNaN = await store.updateMusicTrack(t.id, { volume: Number.NaN });
    expect(clampedNaN.volume).toBe(0); // falls back to the track's current (just-clamped) volume, not 1
  });

  it('a track record from before `volume` existed presents as full volume, without rewriting the stored file', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'data.json'),
      JSON.stringify({
        version: 1,
        campaigns: [],
        musicRegions: [{ id: DEFAULT, name: 'Global', isDefault: true, adventuringTrackId: null, combatTrackId: null }],
        musicTracks: [{ id: 'legacy-track', name: 'Old Tide', regionId: DEFAULT, fileName: 'old.mp3', sizeBytes: 1 }],
      })
    );
    store.__resetCacheForTests();
    const [track] = store.listMusicTracks();
    expect(track.volume).toBe(1);

    const onDisk = JSON.parse(fs.readFileSync(path.join(tempDir, 'data.json'), 'utf-8'));
    expect(onDisk.musicTracks[0].volume).toBeUndefined();
  });

  it('a region record from before campaignId/defaultTrackId existed presents with both backfilled, preferring the old Adventuring default, without rewriting the stored file', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'data.json'),
      JSON.stringify({
        version: 1,
        campaigns: [],
        musicRegions: [
          { id: DEFAULT, name: 'Global', isDefault: true, adventuringTrackId: null, combatTrackId: null },
          { id: 'legacy-region', name: 'The Sunken Coast', isDefault: false, adventuringTrackId: 'calm', combatTrackId: 'drums' },
        ],
        musicTracks: [],
      })
    );
    store.__resetCacheForTests();
    const legacy = store.listMusicRegions().find((r) => r.id === 'legacy-region');
    expect(legacy).toMatchObject({ campaignId: null, defaultTrackId: 'calm' });

    const onDisk = JSON.parse(fs.readFileSync(path.join(tempDir, 'data.json'), 'utf-8'));
    expect(onDisk.musicRegions[1].defaultTrackId).toBeUndefined();
  });
});

describe('Carrying data across Sessions', () => {
  async function campaignWithSessions(count = 3) {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const sessions = [];
    for (let i = 1; i <= count; i++) sessions.push(await store.createSession({ campaignId: c.id, name: `Session ${i}` }));
    return { c, sessions };
  }
  const view = (id) => store.listSessions().find((s) => s.id === id);

  describe('session-level values', () => {
    it('a new session starts with Fear and region as the last one left them', async () => {
      const c = await store.createCampaign({ name: 'The Wildwood' });
      const s1 = await store.createSession({ campaignId: c.id, name: 'Session 1' });
      await store.updateSession(s1.id, { fear: 6 });
      const s2 = await store.createSession({ campaignId: c.id, name: 'Session 2' });
      expect(s2).toMatchObject({ fear: 6 });
    });

    it('a change in session N never edits earlier sessions but flows into later ones', async () => {
      const { sessions } = await campaignWithSessions();
      await store.updateSession(sessions[0].id, { fear: 3 });
      await store.updateSession(sessions[1].id, { fear: 8 });
      expect(view(sessions[0].id).fear).toBe(3);
      expect(view(sessions[1].id).fear).toBe(8);
      expect(view(sessions[2].id).fear).toBe(8);
    });

    it('a correction to an earlier session reaches later sessions that have not set their own', async () => {
      const { sessions } = await campaignWithSessions();
      await store.updateSession(sessions[0].id, { fear: 3 });
      expect(view(sessions[2].id).fear).toBe(3);
      await store.updateSession(sessions[0].id, { fear: 5 });
      expect(view(sessions[2].id).fear).toBe(5);
      await store.updateSession(sessions[1].id, { fear: 9 });
      await store.updateSession(sessions[0].id, { fear: 1 });
      expect(view(sessions[2].id).fear).toBe(9);
    });

    it("a Campaign's defaultRegionId pre-fills only its first Session; later ones carry forward from the previous one instead", async () => {
      const region = await store.createMusicRegion({ name: 'The Sunken Coast' });
      const c = await store.createCampaign({ name: 'The Wildwood', defaultRegionId: region.id });
      const s1 = await store.createSession({ campaignId: c.id, name: 'Session 1' });
      expect(s1.regionId).toBe(region.id);

      const other = await store.createMusicRegion({ name: 'The Ember Wastes' });
      await store.updateSession(s1.id, { regionId: other.id });
      const s2 = await store.createSession({ campaignId: c.id, name: 'Session 2' });
      expect(s2.regionId).toBe(other.id);
    });
  });

  describe('Party members', () => {
    async function threeSessions(c) {
      const out = [];
      for (const n of [1, 2, 3]) out.push(await store.createSession({ campaignId: c.id, name: `Session ${n}` }));
      return out;
    }

    it('one added before any session shows in every session', async () => {
      const c = await store.createCampaign({ name: 'The Wildwood' });
      const mira = await store.createPartyMember({ campaignId: c.id, name: 'Mira' });
      const s1 = await store.createSession({ campaignId: c.id, name: 'Session 1' });
      expect(store.listPartyMembersBySession(s1.id).map((m) => m.id)).toEqual([mira.id]);
    });

    it('marking HP in session 2 leaves session 1 as it was and carries into session 3', async () => {
      const c = await store.createCampaign({ name: 'The Wildwood' });
      const mira = await store.createPartyMember({ campaignId: c.id, name: 'Mira', trackables: [{ label: 'HP', current: 0, max: 6 }] });
      const [s1, s2, s3] = await threeSessions(c);
      const hp = (sid) => store.listPartyMembersBySession(sid)[0].trackables[0].current;

      await store.updatePartyMember(mira.id, { trackables: [{ label: 'HP', current: 4, max: 6 }] }, { sessionId: s2.id });

      expect(hp(s1.id)).toBe(0);
      expect(hp(s2.id)).toBe(4);
      expect(hp(s3.id)).toBe(4);
      expect(store.listPartyMembersBySession(s3.id)[0].id).toBe(mira.id);
    });

    it('with no session given, an edit lands on the latest session', async () => {
      const c = await store.createCampaign({ name: 'The Wildwood' });
      const mira = await store.createPartyMember({ campaignId: c.id, name: 'Mira' });
      const [s1, s2] = await threeSessions(c);
      await store.updatePartyMember(mira.id, { name: 'Miralynn' });
      expect(store.listPartyMembersBySession(s1.id)[0].name).toBe('Mira');
      expect(store.listPartyMembersBySession(s2.id)[0].name).toBe('Mira');
      expect(store.listPartyMembersByCampaign(c.id)[0].name).toBe('Miralynn');
    });

    it('removing one in session 2 keeps it in session 1 and drops it from 2 and everything after', async () => {
      const c = await store.createCampaign({ name: 'The Wildwood' });
      const mira = await store.createPartyMember({ campaignId: c.id, name: 'Mira' });
      const [s1, s2] = await threeSessions(c);
      await store.removePartyMember(mira.id, { sessionId: s2.id });
      const s4 = await store.createSession({ campaignId: c.id, name: 'Session 4' });
      expect(store.listPartyMembersBySession(s1.id)).toHaveLength(1);
      expect(store.listPartyMembersBySession(s2.id)).toHaveLength(0);
      expect(store.listPartyMembersBySession(s4.id)).toHaveLength(0);
    });

    it('removing one only removes it from the session it was removed in', async () => {
      const c = await store.createCampaign({ name: 'The Wildwood' });
      const mira = await store.createPartyMember({ campaignId: c.id, name: 'Mira' });
      const [s1, s2, s3] = await threeSessions(c);
      await store.removePartyMember(mira.id, { sessionId: s2.id });
      expect(store.listPartyMembersBySession(s1.id)).toHaveLength(1);
      expect(store.listPartyMembersBySession(s2.id)).toHaveLength(0);
      // Session 3 was only inheriting her from before, so with session 2 no longer having her she's gone there too.
      expect(store.listPartyMembersBySession(s3.id)).toHaveLength(0);
    });

    it('a later session that has its own version of the member is not affected by a removal in an earlier one', async () => {
      const c = await store.createCampaign({ name: 'The Wildwood' });
      const mira = await store.createPartyMember({ campaignId: c.id, name: 'Mira' });
      const [s1, s2, s3] = await threeSessions(c);
      await store.updatePartyMember(mira.id, { notes: 'edited in session 3' }, { sessionId: s3.id });
      await store.removePartyMember(mira.id, { sessionId: s2.id });
      expect(store.listPartyMembersBySession(s1.id)).toHaveLength(1);
      expect(store.listPartyMembersBySession(s2.id)).toHaveLength(0);
      expect(store.listPartyMembersBySession(s3.id).map((m) => m.notes)).toEqual(['edited in session 3']);
    });

    it('names are still unique inside a Campaign, across what a session can see', async () => {
      const c = await store.createCampaign({ name: 'The Wildwood' });
      const mira = await store.createPartyMember({ campaignId: c.id, name: 'Mira' });
      const s1 = await store.createSession({ campaignId: c.id, name: 'Session 1' });
      const again = await store.createPartyMember({ campaignId: c.id, sessionId: s1.id, name: 'mira' });
      expect(again.id).toBe(mira.id);
      const bram = await store.createPartyMember({ campaignId: c.id, sessionId: s1.id, name: 'Bram' });
      const renamed = await store.updatePartyMember(bram.id, { name: 'Mira' }, { sessionId: s1.id });
      expect(renamed.name).toBe('Bram');
    });

    it('rejects a session that belongs to a different Campaign', async () => {
      const a = await store.createCampaign({ name: 'A' });
      const b = await store.createCampaign({ name: 'B' });
      const sb = await store.createSession({ campaignId: b.id, name: 'Session 1' });
      await expect(store.createPartyMember({ campaignId: a.id, sessionId: sb.id, name: 'Mira' })).rejects.toThrow(
        'No session with id'
      );
    });

    it('a member created in session 2 does not exist in session 1', async () => {
      const c = await store.createCampaign({ name: 'The Wildwood' });
      const [s1, s2] = await threeSessions(c);
      await store.createPartyMember({ campaignId: c.id, sessionId: s2.id, name: 'Late Joiner' });
      expect(store.listPartyMembersBySession(s1.id)).toHaveLength(0);
      expect(store.listPartyMembersBySession(s2.id)).toHaveLength(1);
    });
  });

  describe('Adversaries and Environments', () => {
    async function board() {
      const gs = await store.createGameSet({ name: 'Core' });
      const ogre = await store.createAdversary({ name: 'Ogre', tier: 1, difficulty: 12, hp: 8, gameSetId: gs.id });
      const bog = await store.createEnvironment({ name: 'Bog', tier: 1, difficulty: 10, gameSetId: gs.id });
      const { c, sessions } = await campaignWithSessions();
      return { ogre, bog, c, sessions };
    }

    it('a combatant pulled in during session 1 is still on the board in session 2, marked HP and all', async () => {
      const { ogre, sessions } = await board();
      const pulled = await store.createSessionAdversary({ sessionId: sessions[0].id, adversaryId: ogre.id });
      await store.updateSessionAdversary(pulled.id, { hpMarked: 3 }, { sessionId: sessions[0].id });
      const seen = store.listSessionAdversariesBySession(sessions[1].id);
      expect(seen).toHaveLength(1);
      expect(seen[0]).toMatchObject({ id: pulled.id, hpMarked: 3, carried: true });
    });

    it('a combatant pulled in during session 2 is not on the board of session 1', async () => {
      const { ogre, sessions } = await board();
      await store.createSessionAdversary({ sessionId: sessions[1].id, adversaryId: ogre.id });
      expect(store.listSessionAdversariesBySession(sessions[0].id)).toHaveLength(0);
      expect(store.listSessionAdversariesBySession(sessions[2].id)).toHaveLength(1);
    });

    it('damage dealt in session 2 does not rewrite session 1, and session 3 inherits it', async () => {
      const { ogre, sessions } = await board();
      const pulled = await store.createSessionAdversary({ sessionId: sessions[0].id, adversaryId: ogre.id });
      await store.updateSessionAdversary(pulled.id, { hpMarked: 5 }, { sessionId: sessions[1].id });
      const hp = (i) => store.listSessionAdversariesBySession(sessions[i].id)[0].hpMarked;
      expect([hp(0), hp(1), hp(2)]).toEqual([0, 5, 5]);
    });

    it('pushing one out in session 2 leaves session 1 alone and removes it from 2 and 3', async () => {
      const { ogre, bog, sessions } = await board();
      const pulled = await store.createSessionAdversary({ sessionId: sessions[0].id, adversaryId: ogre.id });
      await store.createSessionEnvironment({ sessionId: sessions[0].id, environmentId: bog.id });
      await store.removeSessionAdversary(pulled.id, { sessionId: sessions[1].id });
      expect(store.listSessionAdversariesBySession(sessions[0].id)).toHaveLength(1);
      expect(store.listSessionAdversariesBySession(sessions[1].id)).toHaveLength(0);
      expect(store.listSessionAdversariesBySession(sessions[2].id)).toHaveLength(0);
      expect(store.listSessionEnvironmentsBySession(sessions[2].id)).toHaveLength(1);
    });

    it('two pulled-in copies of the same Adversary stay independent', async () => {
      const { ogre, sessions } = await board();
      const a = await store.createSessionAdversary({ sessionId: sessions[0].id, adversaryId: ogre.id, label: 'Ogre A' });
      const b = await store.createSessionAdversary({ sessionId: sessions[0].id, adversaryId: ogre.id, label: 'Ogre B' });
      expect(a.id).not.toBe(b.id);
      await store.removeSessionAdversary(a.id, { sessionId: sessions[1].id });
      expect(store.listSessionAdversariesBySession(sessions[2].id).map((x) => x.label)).toEqual(['Ogre B']);
    });

    it('rejects an edit made in a session outside the Campaign', async () => {
      const { ogre, sessions } = await board();
      const other = await store.createCampaign({ name: 'Other' });
      const foreign = await store.createSession({ campaignId: other.id, name: 'Session 1' });
      const pulled = await store.createSessionAdversary({ sessionId: sessions[0].id, adversaryId: ogre.id });
      await expect(store.updateSessionAdversary(pulled.id, { hpMarked: 1 }, { sessionId: foreign.id })).rejects.toThrow(
        'No session with id'
      );
    });

    it('records written before carrying existed (no lineage, no campaignId) still show in later sessions', async () => {
      const { c, sessions } = await board();
      store.flushPendingWrite();
      const raw = JSON.parse(fs.readFileSync(path.join(tempDir, 'data.json'), 'utf-8'));
      raw.sessionAdversaries.push({
        id: 'legacy-1',
        sessionId: sessions[0].id,
        adversaryId: 'x',
        label: 'Old Ogre',
        name: 'Ogre',
        hpMarked: 2,
        conditions: [],
      });
      raw.partyMembers.push({ id: 'legacy-pm', campaignId: c.id, name: 'Old Hand', notes: null, trackables: [] });
      fs.writeFileSync(path.join(tempDir, 'data.json'), JSON.stringify(raw));
      store.__resetCacheForTests();

      expect(store.listSessionAdversariesBySession(sessions[2].id).map((a) => a.id)).toEqual(['legacy-1']);
      expect(store.listSessionAdversariesBySession(sessions[0].id)).toHaveLength(1);
      expect(store.listPartyMembersBySession(sessions[0].id).map((m) => m.id)).toEqual(['legacy-pm']);
      await store.updateSessionAdversary('legacy-1', { hpMarked: 4 }, { sessionId: sessions[1].id });
      expect(store.listSessionAdversariesBySession(sessions[0].id)[0].hpMarked).toBe(2);
      expect(store.listSessionAdversariesBySession(sessions[2].id)[0].hpMarked).toBe(4);
    });

    it('a record written before difficultyModifier/thresholdsModifier/stacked Conditions existed is presented with safe defaults, not crashed on', async () => {
      // Regression test: a real user's live data.json had SessionAdversary
      // records from before this schema existed — no difficultyModifier/
      // thresholdsModifier keys at all, and old-format string Conditions
      // (including a bare ""). The frontend assumed the new shape
      // unconditionally and crashed the whole Session view opening them.
      const { sessions } = await board();
      store.flushPendingWrite();
      const raw = JSON.parse(fs.readFileSync(path.join(tempDir, 'data.json'), 'utf-8'));
      raw.sessionAdversaries.push({
        id: 'legacy-2',
        sessionId: sessions[0].id,
        adversaryId: 'x',
        label: 'Old Courtier',
        name: 'Courtier',
        hpMarked: 0,
        conditions: [''],
        // difficultyModifier/thresholdsModifier deliberately absent.
      });
      fs.writeFileSync(path.join(tempDir, 'data.json'), JSON.stringify(raw));
      store.__resetCacheForTests();

      const [presented] = store.listSessionAdversariesBySession(sessions[0].id).filter((a) => a.id === 'legacy-2');
      expect(presented.difficultyModifier).toBeNull();
      expect(presented.thresholdsModifier).toEqual({ major: null, severe: null });
      expect(presented.conditions).toEqual([{ name: '', count: 1 }]);
    });
  });

  describe('Combats', () => {
    it('a tab created in session 1 is still there in session 2', async () => {
      const { sessions } = await campaignWithSessions();
      const combat = await store.createCombat({ sessionId: sessions[0].id, name: 'Combat', order: 0 });
      expect(store.listCombatsBySession(sessions[1].id).map((c) => c.id)).toEqual([combat.id]);
    });

    it('renamed in session 2 leaves session 1 showing the old name, and session 3 the new one', async () => {
      const { sessions } = await campaignWithSessions();
      const combat = await store.createCombat({ sessionId: sessions[0].id, name: 'Combat', order: 0 });
      await store.updateCombat(combat.id, { name: 'Boss Fight' }, { sessionId: sessions[1].id });
      const name = (i) => store.listCombatsBySession(sessions[i].id)[0].name;
      expect([name(0), name(1), name(2)]).toEqual(['Combat', 'Boss Fight', 'Boss Fight']);
    });

    it('reordered in session 2 leaves session 1 alone and session 3 inherits it', async () => {
      const { sessions } = await campaignWithSessions();
      const combat = await store.createCombat({ sessionId: sessions[0].id, name: 'Combat', order: 0 });
      await store.updateCombat(combat.id, { order: 3 }, { sessionId: sessions[1].id });
      const order = (i) => store.listCombatsBySession(sessions[i].id)[0].order;
      expect([order(0), order(1), order(2)]).toEqual([0, 3, 3]);
    });

    it('deleted in session 2 is gone from 2 and 3, still present in 1', async () => {
      const { sessions } = await campaignWithSessions();
      const combat = await store.createCombat({ sessionId: sessions[0].id, name: 'Combat', order: 0 });
      await store.removeCombat(combat.id, { sessionId: sessions[1].id });
      expect(store.listCombatsBySession(sessions[0].id)).toHaveLength(1);
      expect(store.listCombatsBySession(sessions[1].id)).toHaveLength(0);
      expect(store.listCombatsBySession(sessions[2].id)).toHaveLength(0);
    });

    it('deleting a tab cascades to its own Adversaries/Environments, as of the same session, and leaves an earlier session alone', async () => {
      const gs = await store.createGameSet({ name: 'Core' });
      const ogre = await store.createAdversary({ name: 'Ogre', gameSetId: gs.id });
      const bog = await store.createEnvironment({ name: 'Bog', gameSetId: gs.id });
      const { sessions } = await campaignWithSessions();
      const combat = await store.createCombat({ sessionId: sessions[0].id, name: 'Boss Fight', order: 0 });
      const adv = await store.createSessionAdversary({ sessionId: sessions[0].id, adversaryId: ogre.id, combatId: combat.id });
      const env = await store.createSessionEnvironment({ sessionId: sessions[0].id, environmentId: bog.id, combatId: combat.id });

      await store.removeCombat(combat.id, { sessionId: sessions[1].id });

      expect(store.listCombatsBySession(sessions[1].id)).toHaveLength(0);
      expect(store.listSessionAdversariesBySession(sessions[1].id)).toHaveLength(0);
      expect(store.listSessionEnvironmentsBySession(sessions[1].id)).toHaveLength(0);
      // Session 1 never saw the delete — tab and contents both still there.
      expect(store.listCombatsBySession(sessions[0].id).map((c) => c.id)).toEqual([combat.id]);
      expect(store.listSessionAdversariesBySession(sessions[0].id).map((a) => a.id)).toEqual([adv.id]);
      expect(store.listSessionEnvironmentsBySession(sessions[0].id).map((e) => e.id)).toEqual([env.id]);
    });

    it('deleting a tab never removes an Adversary not yet adopted into any tab (combatId null)', async () => {
      const gs = await store.createGameSet({ name: 'Core' });
      const ogre = await store.createAdversary({ name: 'Ogre', gameSetId: gs.id });
      const session = await store.createSession({ campaignId: (await store.createCampaign({ name: 'The Wildwood' })).id, name: 'Session 1' });
      const combat = await store.createCombat({ sessionId: session.id, name: 'Combat', order: 0 });
      const legacy = await store.createSessionAdversary({ sessionId: session.id, adversaryId: ogre.id });

      await store.removeCombat(combat.id, { sessionId: session.id });

      expect(store.listSessionAdversariesBySession(session.id).map((a) => a.id)).toEqual([legacy.id]);
    });
  });

  describe('Loot log', () => {
    const roll = (total) => ({ rolledAt: `t${total}`, rarity: 'COMMON', poolSize: 1, rollTotal: total, results: [] });

    it('loot rolled in session 2 shows in later sessions and not in earlier ones', async () => {
      const { sessions } = await campaignWithSessions();
      await store.addSessionLoot(sessions[1].id, roll(5));
      expect(view(sessions[0].id).lootLog).toHaveLength(0);
      expect(view(sessions[1].id).lootLog).toHaveLength(1);
      expect(view(sessions[2].id).lootLog).toHaveLength(1);
      expect(view(sessions[2].id).lootLog[0].id).toBeTruthy();
    });

    it('removing an entry in session 2 keeps it in session 1 and hides it from 2 onward', async () => {
      const { sessions } = await campaignWithSessions();
      const withEntry = await store.addSessionLoot(sessions[0].id, roll(7));
      await store.removeSessionLoot(sessions[1].id, withEntry.lootLog[0].id);
      expect(view(sessions[0].id).lootLog).toHaveLength(1);
      expect(view(sessions[1].id).lootLog).toHaveLength(0);
      expect(view(sessions[2].id).lootLog).toHaveLength(0);
    });

    it('removing an entry rolled in that very session drops it entirely', async () => {
      const { sessions } = await campaignWithSessions(2);
      const withEntry = await store.addSessionLoot(sessions[0].id, roll(2));
      await store.removeSessionLoot(sessions[0].id, withEntry.lootLog[0].id);
      expect(view(sessions[1].id).lootLog).toHaveLength(0);
    });

    it('rejects removing an entry the session cannot see', async () => {
      const { sessions } = await campaignWithSessions(2);
      const withEntry = await store.addSessionLoot(sessions[1].id, roll(2));
      await expect(store.removeSessionLoot(sessions[0].id, withEntry.lootLog[0].id)).rejects.toThrow('No loot entry');
    });

    it('a log that predates entry ids gets ids on load, so old entries can be removed', async () => {
      const c = await store.createCampaign({ name: 'The Wildwood' });
      const s1 = await store.createSession({ campaignId: c.id, name: 'Session 1' });
      store.flushPendingWrite();
      const raw = JSON.parse(fs.readFileSync(path.join(tempDir, 'data.json'), 'utf-8'));
      raw.sessions[0].lootLog = [roll(9)];
      fs.writeFileSync(path.join(tempDir, 'data.json'), JSON.stringify(raw));
      store.__resetCacheForTests();
      const [entry] = view(s1.id).lootLog;
      expect(entry.id).toBeTruthy();
      await store.removeSessionLoot(s1.id, entry.id);
      expect(view(s1.id).lootLog).toHaveLength(0);
    });
  });

  describe('deleting a Session', () => {
    it('keeps what later sessions were showing: fear, loot, party, board, and Combat tabs', async () => {
      const gs = await store.createGameSet({ name: 'Core' });
      const ogre = await store.createAdversary({ name: 'Ogre', gameSetId: gs.id });
      const { c, sessions } = await campaignWithSessions();
      await store.updateSession(sessions[1].id, { fear: 9 });
      await store.addSessionLoot(sessions[1].id, { rolledAt: 't', rarity: 'COMMON', poolSize: 1, rollTotal: 3, results: [] });
      const pm = await store.createPartyMember({ campaignId: c.id, sessionId: sessions[1].id, name: 'Late Joiner' });
      const adv = await store.createSessionAdversary({ sessionId: sessions[1].id, adversaryId: ogre.id });
      const combat = await store.createCombat({ sessionId: sessions[1].id, name: 'Boss Fight', order: 0 });

      await store.removeSession(sessions[1].id);

      const after = view(sessions[2].id);
      expect(after).toMatchObject({ fear: 9 });
      expect(after.lootLog).toHaveLength(1);
      expect(store.listPartyMembersBySession(sessions[2].id).map((m) => m.id)).toEqual([pm.id]);
      expect(store.listSessionAdversariesBySession(sessions[2].id).map((a) => a.id)).toEqual([adv.id]);
      expect(store.listCombatsBySession(sessions[2].id).map((c) => c.id)).toEqual([combat.id]);
      // ...and session 1 still never saw any of it.
      expect(view(sessions[0].id).fear).toBe(0);
      expect(store.listPartyMembersBySession(sessions[0].id)).toHaveLength(0);
      expect(store.listCombatsBySession(sessions[0].id)).toHaveLength(0);
    });

    it('a later session that set its own value keeps it', async () => {
      const { sessions } = await campaignWithSessions();
      await store.updateSession(sessions[1].id, { fear: 9 });
      await store.updateSession(sessions[2].id, { fear: 2 });
      await store.removeSession(sessions[1].id);
      expect(view(sessions[2].id).fear).toBe(2);
    });

    it('deleting the Campaign removes every version of everything', async () => {
      const gs = await store.createGameSet({ name: 'Core' });
      const ogre = await store.createAdversary({ name: 'Ogre', gameSetId: gs.id });
      const { c, sessions } = await campaignWithSessions();
      const pm = await store.createPartyMember({ campaignId: c.id, sessionId: sessions[0].id, name: 'Mira' });
      await store.updatePartyMember(pm.id, { notes: 'v2' }, { sessionId: sessions[1].id });
      const adv = await store.createSessionAdversary({ sessionId: sessions[0].id, adversaryId: ogre.id });
      await store.removeSessionAdversary(adv.id, { sessionId: sessions[2].id });
      await store.createCombat({ sessionId: sessions[0].id, name: 'Combat', order: 0 });
      await store.createJournalEntry({ campaignId: c.id, kind: 'OTHER', label: 'Remember the bridge toll' });
      await store.removeCampaign(c.id);
      store.flushPendingWrite();
      const raw = JSON.parse(fs.readFileSync(path.join(tempDir, 'data.json'), 'utf-8'));
      expect(raw.partyMembers).toEqual([]);
      expect(raw.sessionAdversaries).toEqual([]);
      expect(raw.combats).toEqual([]);
      expect(raw.sessions).toEqual([]);
      expect(raw.journalEntries).toEqual([]);
    });
  });
});
