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

  it('defaults fear to 0 and mode to adventuring', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    const session = await store.createSession({ campaignId: c.id, name: 'Session 1' });
    expect(session.fear).toBe(0);
    expect(session.mode).toBe('adventuring');
    expect(session.pcNotes).toEqual([]);
    expect(session.lootLog).toEqual([]);
  });

  it('rejects a mode outside the enum', async () => {
    const c = await store.createCampaign({ name: 'The Wildwood' });
    await expect(store.createSession({ campaignId: c.id, name: 'Session 1', mode: 'stealth' })).rejects.toThrow(
      'Session mode must be one of'
    );
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

  it('remove cascades to delete its SessionAdversaries and SessionEnvironments', async () => {
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
    expect(store.listSessionAdversariesBySession(otherSession.id)).toHaveLength(1);
  });

  it('remove throws for an unknown id', async () => {
    await expect(store.removeSession('missing')).rejects.toThrow('No session with id');
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

    const updated = await store.updateSessionAdversary(pulled.id, { hpMarked: 3, conditions: ['Restrained'] });
    expect(updated.hpMarked).toBe(3);
    expect(updated.conditions).toEqual(['Restrained']);
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
    expect(Array.isArray(snapshot.lootTables)).toBe(true);
    expect(Array.isArray(snapshot.consumableTables)).toBe(true);
    expect(Array.isArray(snapshot.sessions)).toBe(true);
    expect(Array.isArray(snapshot.sessionAdversaries)).toBe(true);
    expect(Array.isArray(snapshot.sessionEnvironments)).toBe(true);
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
