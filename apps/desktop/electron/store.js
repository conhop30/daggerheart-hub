// The local-first data layer: a single JSON file on disk is the entire
// database. This runs only in Electron's main process (it needs real
// filesystem access), and is the direct replacement for the deleted Spring
// Boot services — same validation rules, ported from
// HeroClassService/DomainService/SubclassService/GameSetService (see git
// history at the "first commit" tag for the originals), just keyed by
// client-generated UUIDs instead of server-assigned auto-increment ids,
// since there's no server left to assign them.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');

// Read lazily (not frozen into a top-level const) so tests can point this
// at a throwaway directory via DAGGERHEART_STORE_DIR without needing to
// mock fs/os — real usage never sets the env var, so this always resolves
// to the normal ~/.daggerheart-hub either way.
function getStoreDir() {
  return process.env.DAGGERHEART_STORE_DIR || path.join(os.homedir(), '.daggerheart-hub');
}
function getStorePath() {
  return path.join(getStoreDir(), 'data.json');
}
const STORE_VERSION = 1;
const COLLECTIONS = [
  'gameSets',
  'domains',
  'heroClasses',
  'subclasses',
  'cards',
  'adversaries',
  'environments',
  'weapons',
  'armors',
  'loot',
  'consumables',
  'communities',
  'ancestries',
  'transformations',
  'campaigns',
  'partyMembers',
  'lootTables',
  'consumableTables',
  'sessions',
  'sessionAdversaries',
  'sessionEnvironments',
];

let cache = null;
// Serializes every mutation so two overlapping IPC calls can't interleave
// a read-modify-write of the same file. A failed mutation still leaves the
// queue usable for the next one — see the .catch in mutate() below.
let writeQueue = Promise.resolve();

function emptyStore() {
  const store = { version: STORE_VERSION };
  for (const key of COLLECTIONS) store[key] = [];
  return store;
}

// Turns apps/desktop/seed/core-content.json (the Core Set flavor text
// carried over when the old backend was removed) into the first-run store,
// generating real ids and resolving the seed file's domain-name
// cross-references into those ids.
function buildSeedStore() {
  const seedPath = path.join(__dirname, '..', 'seed', 'core-content.json');
  const raw = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  const store = emptyStore();

  const gameSet = { id: randomUUID(), name: raw.gameSet, displayOrder: 0, badgeIcon: null };
  store.gameSets.push(gameSet);

  const domainIdByName = new Map();
  for (const d of raw.domains) {
    const domain = {
      id: randomUUID(),
      name: d.name,
      description: d.description ?? null,
      colorHex: d.colorHex ?? null,
      iconPath: null,
      gameSetId: gameSet.id,
    };
    store.domains.push(domain);
    domainIdByName.set(d.name, domain.id);
  }

  for (const c of raw.classes) {
    store.heroClasses.push({
      id: randomUUID(),
      name: c.name,
      description: c.description ?? null,
      primaryDomainId: domainIdByName.get(c.primaryDomain),
      secondaryDomainId: domainIdByName.get(c.secondaryDomain),
      startingEvasion: c.startingEvasion ?? null,
      startingHp: c.startingHp ?? null,
      classItems: c.classItems ?? null,
      hopeFeature: c.hopeFeature ?? null,
      classFeatures: c.classFeatures ?? [],
      gameSetId: gameSet.id,
    });
  }

  return store;
}

function writeStoreToDisk(store) {
  fs.mkdirSync(getStoreDir(), { recursive: true });
  fs.writeFileSync(getStorePath(), JSON.stringify(store, null, 2), 'utf-8');
}

function readStoreFromDisk() {
  if (!fs.existsSync(getStorePath())) {
    const seeded = buildSeedStore();
    writeStoreToDisk(seeded);
    return seeded;
  }
  const store = JSON.parse(fs.readFileSync(getStorePath(), 'utf-8'));
  // Forward-compat: a store written before some collection existed (e.g. an
  // install from before Cards were added) won't have that key at all.
  // Backfill it as empty rather than letting every list()/create() on it
  // crash on a missing array.
  for (const key of COLLECTIONS) {
    if (!Array.isArray(store[key])) store[key] = [];
  }
  return store;
}

function getCache() {
  if (!cache) cache = readStoreFromDisk();
  return cache;
}

function mutate(fn) {
  const result = writeQueue.then(() => {
    const store = getCache();
    const value = fn(store);
    writeStoreToDisk(store);
    return value;
  });
  // Keep the shared queue on a resolved path even if this mutation failed,
  // so one validation error doesn't block every mutation queued after it.
  writeQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

// PATCH semantics matching the old UpdateXRequest DTOs: a key that's
// missing or explicitly undefined leaves the existing value alone; any
// other value (including null or []) overwrites it.
function mergePatch(existing, patch) {
  const result = { ...existing };
  for (const key of Object.keys(patch)) {
    if (patch[key] !== undefined) result[key] = patch[key];
  }
  return result;
}

function findByNameIgnoreCase(list, name) {
  const lower = name.toLowerCase();
  return list.find((r) => r.name.toLowerCase() === lower);
}

function requireName(data) {
  if (!data.name || !data.name.trim()) {
    throw new Error('Name is required.');
  }
}

// Renaming to a name that collides with a *different* existing record is
// silently skipped rather than erroring — ported as-is from
// GameSetService/DomainService/HeroClassService/SubclassService.update,
// which all treated a rename collision the same way create() treats a
// duplicate name: idempotently ignored, not rejected.
function applyRename(list, id, existing, patch, merged) {
  if (patch.name === undefined) return;
  const collision = findByNameIgnoreCase(list, patch.name);
  if (collision && collision.id !== id) {
    merged.name = existing.name;
  }
}

// ---- GameSets ----
// Unlike the other three, GameSet.create was never idempotent-by-name in
// the original service — every call just inserts. Kept as-is.

function listGameSets() {
  return getCache().gameSets;
}

function createGameSet(data) {
  return mutate((store) => {
    requireName(data);
    const record = {
      id: randomUUID(),
      name: data.name,
      displayOrder: data.displayOrder ?? null,
      badgeIcon: data.badgeIcon ?? null,
    };
    store.gameSets.push(record);
    return record;
  });
}

function updateGameSet(id, patch) {
  return mutate((store) => {
    const existing = store.gameSets.find((g) => g.id === id);
    if (!existing) throw new Error(`No game set with id ${id}`);
    const merged = mergePatch(existing, patch);
    applyRename(store.gameSets, id, existing, patch, merged);
    Object.assign(existing, merged);
    return existing;
  });
}

// ---- Domains ----

function listDomains() {
  return getCache().domains;
}

function createDomain(data) {
  return mutate((store) => {
    requireName(data);
    const existing = findByNameIgnoreCase(store.domains, data.name);
    if (existing) return existing;
    const record = {
      id: randomUUID(),
      name: data.name,
      description: data.description ?? null,
      colorHex: data.colorHex ?? null,
      iconPath: data.iconPath ?? null,
      gameSetId: data.gameSetId,
    };
    store.domains.push(record);
    return record;
  });
}

function updateDomain(id, patch) {
  return mutate((store) => {
    const existing = store.domains.find((d) => d.id === id);
    if (!existing) throw new Error(`No domain with id ${id}`);
    const merged = mergePatch(existing, patch);
    applyRename(store.domains, id, existing, patch, merged);
    Object.assign(existing, merged);
    return existing;
  });
}

// KNOWN LIMITATION, same as the original DomainService.delete: this does
// not check whether any HeroClass still references this Domain's id.
// Existing UI already renders that case gracefully (ClassSpread falls back
// to a placeholder color when a domain lookup misses), so a dangling
// reference degrades instead of crashing — revisit if that stops being
// true.
function removeDomain(id) {
  return mutate((store) => {
    const index = store.domains.findIndex((d) => d.id === id);
    if (index === -1) throw new Error(`No domain with id ${id}`);
    store.domains.splice(index, 1);
  });
}

// ---- HeroClasses ----

function validateDomainPair(store, primaryDomainId, secondaryDomainId) {
  if (primaryDomainId === secondaryDomainId) {
    throw new Error("A class's two domains must be different (got the same id twice)");
  }
  if (!store.domains.some((d) => d.id === primaryDomainId)) {
    throw new Error(`No domain with id ${primaryDomainId}`);
  }
  if (!store.domains.some((d) => d.id === secondaryDomainId)) {
    throw new Error(`No domain with id ${secondaryDomainId}`);
  }
}

function listHeroClasses() {
  return getCache().heroClasses;
}

function createHeroClass(data) {
  return mutate((store) => {
    requireName(data);
    const existing = findByNameIgnoreCase(store.heroClasses, data.name);
    if (existing) return existing;
    validateDomainPair(store, data.primaryDomainId, data.secondaryDomainId);
    const record = {
      id: randomUUID(),
      name: data.name,
      description: data.description ?? null,
      primaryDomainId: data.primaryDomainId,
      secondaryDomainId: data.secondaryDomainId,
      startingEvasion: data.startingEvasion ?? null,
      startingHp: data.startingHp ?? null,
      classItems: data.classItems ?? null,
      hopeFeature: data.hopeFeature ?? null,
      classFeatures: data.classFeatures ?? [],
      gameSetId: data.gameSetId,
    };
    store.heroClasses.push(record);
    return record;
  });
}

function updateHeroClass(id, patch) {
  return mutate((store) => {
    const existing = store.heroClasses.find((c) => c.id === id);
    if (!existing) throw new Error(`No hero class with id ${id}`);

    // Re-validate against the EFFECTIVE pair (existing merged with
    // whatever the patch changes), not just whichever half the patch
    // happens to touch — matches HeroClassService.update exactly.
    if (patch.primaryDomainId !== undefined || patch.secondaryDomainId !== undefined) {
      const effectivePrimary = patch.primaryDomainId ?? existing.primaryDomainId;
      const effectiveSecondary = patch.secondaryDomainId ?? existing.secondaryDomainId;
      validateDomainPair(store, effectivePrimary, effectiveSecondary);
    }

    const merged = mergePatch(existing, patch);
    applyRename(store.heroClasses, id, existing, patch, merged);
    Object.assign(existing, merged);
    return existing;
  });
}

// ---- Subclasses ----

function listSubclasses() {
  return getCache().subclasses;
}

function listSubclassesByParentClass(parentClassId) {
  return getCache().subclasses.filter((s) => s.parentClassId === parentClassId);
}

function createSubclass(data) {
  return mutate((store) => {
    requireName(data);
    const existing = findByNameIgnoreCase(store.subclasses, data.name);
    if (existing) return existing;
    if (!store.heroClasses.some((c) => c.id === data.parentClassId)) {
      throw new Error(`No hero class with id ${data.parentClassId}`);
    }
    const record = {
      id: randomUUID(),
      name: data.name,
      oneliner: data.oneliner ?? null,
      parentClassId: data.parentClassId,
      spellcastTrait: data.spellcastTrait ?? null,
      foundationFeatures: data.foundationFeatures ?? [],
      specializationFeatures: data.specializationFeatures ?? [],
      masteryFeatures: data.masteryFeatures ?? [],
      gameSetId: data.gameSetId,
    };
    store.subclasses.push(record);
    return record;
  });
}

function updateSubclass(id, patch) {
  return mutate((store) => {
    const existing = store.subclasses.find((s) => s.id === id);
    if (!existing) throw new Error(`No subclass with id ${id}`);
    if (patch.parentClassId !== undefined && !store.heroClasses.some((c) => c.id === patch.parentClassId)) {
      throw new Error(`No hero class with id ${patch.parentClassId}`);
    }
    const merged = mergePatch(existing, patch);
    applyRename(store.subclasses, id, existing, patch, merged);
    Object.assign(existing, merged);
    return existing;
  });
}

// ---- Generic collections ----
// Nine more content types (Adversary, Environment, Weapon, Armor, Loot,
// Consumable, Community, Ancestry, Transformation) share the exact same
// shape of rule as HeroClass/Domain/Subclass above: name required,
// idempotent-by-name create, rename-collision silently skipped. Hand-writing
// that CRUD block nine more times would just be copy-paste, so it's
// factored out here — the per-type differences (which fields exist, extra
// validation) are supplied as a buildRecord/validate pair.
function makeCollection(key, { buildRecord, validate } = {}) {
  function list() {
    return getCache()[key];
  }

  function create(data) {
    return mutate((store) => {
      requireName(data);
      const existing = findByNameIgnoreCase(store[key], data.name);
      if (existing) return existing;
      if (validate) validate(store, data);
      const record = buildRecord(data);
      store[key].push(record);
      return record;
    });
  }

  function update(id, patch) {
    return mutate((store) => {
      const existing = store[key].find((r) => r.id === id);
      if (!existing) throw new Error(`No record with id ${id}`);
      const merged = mergePatch(existing, patch);
      if (validate) validate(store, merged);
      applyRename(store[key], id, existing, patch, merged);
      Object.assign(existing, merged);
      return existing;
    });
  }

  function remove(id) {
    return mutate((store) => {
      const index = store[key].findIndex((r) => r.id === id);
      if (index === -1) throw new Error(`No record with id ${id}`);
      store[key].splice(index, 1);
    });
  }

  return { list, create, update, remove };
}

// ---- Cards ----
// One per Domain Card (Name, Type, Level, RecallCost, ...). Domain is
// required and validated the same way validateDomainPair checks its ids;
// unlike Domain's own fields, Type is a closed enum so it's checked too.

const CARD_TYPES = ['SPELL', 'GRIMOIRE', 'ABILITY'];

function validateCard(store, data) {
  if (!store.domains.some((d) => d.id === data.domainId)) {
    throw new Error(`No domain with id ${data.domainId}`);
  }
  if (!CARD_TYPES.includes(data.type)) {
    throw new Error(`Card type must be one of ${CARD_TYPES.join(', ')}`);
  }
}

const cards = makeCollection('cards', {
  validate: validateCard,
  buildRecord: (data) => {
    // DomainIcon is deliberately denormalized onto Card (see spec) so a
    // future Card-only gallery doesn't need to join back to Domain — auto-
    // fill it from the parent Domain on create rather than asking the user
    // to re-enter something already on record.
    const domain = getCache().domains.find((d) => d.id === data.domainId);
    return {
      id: randomUUID(),
      name: data.name,
      type: data.type,
      level: data.level ?? null,
      recallCost: data.recallCost ?? null,
      description: data.description ?? null,
      imagePath: data.imagePath ?? null,
      domainIcon: data.domainIcon ?? domain?.iconPath ?? null,
      domainId: data.domainId,
      gameSetId: data.gameSetId,
    };
  },
});

function listCardsByDomain(domainId) {
  return getCache().cards.filter((c) => c.domainId === domainId);
}

const emptyFeatureTiers = () => ({ passives: [], actions: [], reactions: [] });

const adversaries = makeCollection('adversaries', {
  buildRecord: (data) => ({
    id: randomUUID(),
    name: data.name,
    // The corebook's own taxonomy (Standard/Bruiser/Horde/Leader/Minion/
    // Ranged/Skulk/Social/Solo/Support) — printed as the word right after
    // "Tier X" in the stat block header. typeNote is free text for the one
    // type with an extra parenthetical in the book, Horde's "(N/HP)".
    type: data.type ?? null,
    typeNote: data.typeNote ?? null,
    tier: data.tier ?? null,
    description: data.description ?? null,
    motivesAndTactics: data.motivesAndTactics ?? [],
    difficulty: data.difficulty ?? null,
    thresholds: data.thresholds ?? { major: null, severe: null },
    hp: data.hp ?? null,
    stress: data.stress ?? null,
    attackModifier: data.attackModifier ?? null,
    attackDescription: data.attackDescription ?? null,
    attackRange: data.attackRange ?? null,
    attackType: data.attackType ?? null,
    experiences: data.experiences ?? [],
    features: data.features ?? emptyFeatureTiers(),
    gameSetId: data.gameSetId,
  }),
});

const environments = makeCollection('environments', {
  buildRecord: (data) => ({
    id: randomUUID(),
    name: data.name,
    // The corebook's Environment category (Exploration/Event/Social/
    // Traversal) — same "word right after Tier X" header convention as
    // Adversary's type, just a different fixed vocabulary.
    category: data.category ?? null,
    tier: data.tier ?? null,
    description: data.description ?? null,
    impulses: data.impulses ?? [],
    difficulty: data.difficulty ?? null,
    potentialAdversaries: data.potentialAdversaries ?? [],
    features: data.features ?? emptyFeatureTiers(),
    gameSetId: data.gameSetId,
  }),
});

// Burden locked to One-Handed when WeaponSlot = Secondary — enforced here,
// not just as a UI default, per the spec.
function validateWeapon(_store, data) {
  if (data.weaponSlot === 'SECONDARY' && data.burden !== 'ONE_HANDED') {
    throw new Error('A Secondary weapon must be One-Handed.');
  }
}

const weapons = makeCollection('weapons', {
  validate: validateWeapon,
  buildRecord: (data) => ({
    id: randomUUID(),
    weaponSlot: data.weaponSlot,
    name: data.name,
    tier: data.tier ?? null,
    feature: data.feature ?? null,
    burden: data.burden,
    damage: data.damage ?? null,
    trait: data.trait ?? null,
    damageType: data.damageType ?? null,
    gameSetId: data.gameSetId,
  }),
});

const armors = makeCollection('armors', {
  buildRecord: (data) => ({
    id: randomUUID(),
    name: data.name,
    tier: data.tier ?? null,
    baseScore: data.baseScore ?? null,
    thresholds: data.thresholds ?? { major: null, severe: null },
    feature: data.feature ?? null,
    gameSetId: data.gameSetId,
  }),
});

const loot = makeCollection('loot', {
  buildRecord: (data) => ({
    id: randomUUID(),
    name: data.name,
    description: data.description ?? null,
    gameSetId: data.gameSetId,
  }),
});

const consumables = makeCollection('consumables', {
  buildRecord: (data) => ({
    id: randomUUID(),
    name: data.name,
    description: data.description ?? null,
    gameSetId: data.gameSetId,
  }),
});

// ---- Loot Tables / Consumable Tables ----
// Reusable, rollable tables (see the Session Builder's Loot Roller):
// entries are grouped by rarity and each holds a `position` plus a
// reference to a real Loot/Consumable record — never a copy of one, so
// editing the master item later is reflected everywhere it's referenced.
// The corebook's actual item-rarity mechanic (roll the matching d12 pool,
// sum it, look up that position) caps each rarity's usable range at its
// larger pool's max — a table can be sparse; an unfilled position just
// means "nothing found" at roll time, no wraparound.
const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY'];
const RARITY_MAX = { COMMON: 24, UNCOMMON: 36, RARE: 48, LEGENDARY: 60 };

function emptyRarityEntries() {
  return { COMMON: [], UNCOMMON: [], RARE: [], LEGENDARY: [] };
}

// Shared by Loot and Consumable Tables — same rules, different item
// collection/id field (lootId vs consumableId), so it's parameterized
// rather than written out twice.
function validateEntriesTable(store, data, itemCollectionKey, idField, itemLabel) {
  if (!store.gameSets.some((g) => g.id === data.gameSetId)) {
    throw new Error(`No game set with id ${data.gameSetId}`);
  }
  const entries = data.entries ?? emptyRarityEntries();
  for (const rarity of RARITIES) {
    const rows = entries[rarity] ?? [];
    if (!Array.isArray(rows)) throw new Error(`entries.${rarity} must be an array`);
    const seenPositions = new Set();
    for (const row of rows) {
      const position = row.position;
      if (!Number.isInteger(position) || position < 1 || position > RARITY_MAX[rarity]) {
        throw new Error(`A ${rarity} entry's position must be a whole number between 1 and ${RARITY_MAX[rarity]}.`);
      }
      if (seenPositions.has(position)) {
        throw new Error(`Position ${position} is used more than once in ${rarity}.`);
      }
      seenPositions.add(position);
      if (!store[itemCollectionKey].some((item) => item.id === row[idField])) {
        throw new Error(`No ${itemLabel} with id ${row[idField]}`);
      }
    }
  }
}

const lootTables = makeCollection('lootTables', {
  validate: (store, data) => validateEntriesTable(store, data, 'loot', 'lootId', 'loot item'),
  buildRecord: (data) => ({
    id: randomUUID(),
    name: data.name,
    description: data.description ?? null,
    gameSetId: data.gameSetId,
    entries: data.entries ?? emptyRarityEntries(),
  }),
});

const consumableTables = makeCollection('consumableTables', {
  validate: (store, data) => validateEntriesTable(store, data, 'consumables', 'consumableId', 'consumable'),
  buildRecord: (data) => ({
    id: randomUUID(),
    name: data.name,
    description: data.description ?? null,
    gameSetId: data.gameSetId,
    entries: data.entries ?? emptyRarityEntries(),
  }),
});

const communities = makeCollection('communities', {
  buildRecord: (data) => ({
    id: randomUUID(),
    name: data.name,
    description: data.description ?? null,
    features: data.features ?? [],
    gameSetId: data.gameSetId,
  }),
});

const ancestries = makeCollection('ancestries', {
  buildRecord: (data) => ({
    id: randomUUID(),
    name: data.name,
    description: data.description ?? null,
    features: data.features ?? [],
    gameSetId: data.gameSetId,
  }),
});

const transformations = makeCollection('transformations', {
  buildRecord: (data) => ({
    id: randomUUID(),
    name: data.name,
    description: data.description ?? null,
    features: data.features ?? [],
    gameSetId: data.gameSetId,
  }),
});

// ---- Campaigns ----
// The container for the Session Builder feature: a standing Party (the
// PartyMember roster below) and, later, the Sessions run against it.
// Unlike most collections, deleting a Campaign cascades to its children —
// they have no other reachable gallery/list the way e.g. Card does off of
// Domain, so an orphaned PartyMember or Session would be permanently stuck
// with no UI path to it. removeSession cascades the same way to that
// Session's own SessionAdversaries/SessionEnvironments.

const campaigns = makeCollection('campaigns', {
  buildRecord: (data) => ({
    id: randomUUID(),
    name: data.name,
    notes: data.notes ?? null,
    colorHex: data.colorHex ?? null,
  }),
});

function removeCampaign(id) {
  return mutate((store) => {
    const index = store.campaigns.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`No campaign with id ${id}`);
    store.campaigns.splice(index, 1);
    store.partyMembers = store.partyMembers.filter((p) => p.campaignId !== id);
    const sessionIds = new Set(store.sessions.filter((s) => s.campaignId === id).map((s) => s.id));
    store.sessions = store.sessions.filter((s) => s.campaignId !== id);
    store.sessionAdversaries = store.sessionAdversaries.filter((sa) => !sessionIds.has(sa.sessionId));
    store.sessionEnvironments = store.sessionEnvironments.filter((se) => !sessionIds.has(se.sessionId));
  });
}

// ---- Party Members ----
// A standing roster per Campaign, reused across every Session run against
// it. Deliberately lightweight: name + notes plus a fully freeform
// trackables list (label/current/max) rather than a fixed HP/Stress/Hope
// schema, so a table can track whatever it wants without the store caring
// what "HP" means.
//
// Known limitation shared with Card/Subclass: makeCollection's
// idempotent-by-name create() checks name uniqueness across the WHOLE
// collection, not scoped to campaignId (same as Card isn't scoped to
// domainId) — two different Campaigns can't each have a same-named PC
// without the second create() silently returning the first Campaign's
// record. Consistent with existing behavior elsewhere; not a new gap.

function validatePartyMember(store, data) {
  if (!store.campaigns.some((c) => c.id === data.campaignId)) {
    throw new Error(`No campaign with id ${data.campaignId}`);
  }
}

const partyMembers = makeCollection('partyMembers', {
  validate: validatePartyMember,
  buildRecord: (data) => ({
    id: randomUUID(),
    name: data.name,
    campaignId: data.campaignId,
    notes: data.notes ?? null,
    trackables: data.trackables ?? [],
  }),
});

function listPartyMembersByCampaign(campaignId) {
  return getCache().partyMembers.filter((p) => p.campaignId === campaignId);
}

// ---- Sessions ----
// A persistent, resumable run of a Campaign: Fear (0-12), a combat/
// adventuring mode, notes, and a loot log. Built with makeCollection like
// Campaign itself — a Session genuinely has a user-given name ("The Ambush
// at Dawn") and idempotent-by-name create is an acceptable, already-
// familiar limitation here (same gap as PartyMember/Card: name uniqueness
// isn't scoped to campaignId).

const SESSION_MODES = ['adventuring', 'combat'];

function validateSession(store, data) {
  if (!store.campaigns.some((c) => c.id === data.campaignId)) {
    throw new Error(`No campaign with id ${data.campaignId}`);
  }
  if (data.mode !== undefined && !SESSION_MODES.includes(data.mode)) {
    throw new Error(`Session mode must be one of ${SESSION_MODES.join(', ')}`);
  }
  // Fear is a bounded 0-12 resource — clamp rather than reject an
  // out-of-range value (the UI's +/- controls can never produce one, but a
  // clamp is friendlier than an error for any other caller). validate runs
  // on the same object create()/update() go on to persist, so mutating it
  // here is enough to make the clamp stick, the same way Card's buildRecord
  // auto-fills domainIcon without a separate pass.
  if (data.fear !== undefined) {
    data.fear = Math.max(0, Math.min(12, data.fear));
  }
}

const sessions = makeCollection('sessions', {
  validate: validateSession,
  buildRecord: (data) => ({
    id: randomUUID(),
    campaignId: data.campaignId,
    name: data.name,
    fear: data.fear ?? 0,
    mode: data.mode ?? 'adventuring',
    generalNotes: data.generalNotes ?? null,
    npcNotes: data.npcNotes ?? null,
    pcNotes: data.pcNotes ?? [],
    lootLog: data.lootLog ?? [],
  }),
});

function removeSession(id) {
  return mutate((store) => {
    const index = store.sessions.findIndex((s) => s.id === id);
    if (index === -1) throw new Error(`No session with id ${id}`);
    store.sessions.splice(index, 1);
    store.sessionAdversaries = store.sessionAdversaries.filter((sa) => sa.sessionId !== id);
    store.sessionEnvironments = store.sessionEnvironments.filter((se) => se.sessionId !== id);
  });
}

function listSessionsByCampaign(campaignId) {
  return getCache().sessions.filter((s) => s.campaignId === campaignId);
}

// ---- Session Adversaries / Session Environments ----
// Deliberately NOT built with makeCollection. Pulling the same Adversary
// into a session twice (two Ogres) must create two independent records —
// makeCollection's idempotent-by-name create would collapse the second
// pull-in into the first instead of inserting a new one — and there's no
// user-supplied "name" to key that on anyway, since name is snapshotted
// from the master record. Every create here just inserts, the same
// reasoning as GameSet.
//
// These are snapshots, not live references: the master Adversary/
// Environment is only ever looked up at create time (inside the
// buildX functions below), so editing or even deleting the master later
// can never disturb a session already in progress. Daggerheart tracks
// HP/Stress as *marked boxes* during play, not a countdown, hence
// hpMarked/stressMarked starting at 0 against a snapshotted hpMax/stressMax.

function buildSessionAdversary(store, data) {
  const adversary = store.adversaries.find((a) => a.id === data.adversaryId);
  if (!adversary) throw new Error(`No adversary with id ${data.adversaryId}`);
  return {
    id: randomUUID(),
    sessionId: data.sessionId,
    adversaryId: data.adversaryId,
    label: data.label && data.label.trim() ? data.label.trim() : adversary.name,
    name: adversary.name,
    tier: adversary.tier,
    difficulty: adversary.difficulty,
    thresholds: adversary.thresholds,
    hpMax: adversary.hp,
    stressMax: adversary.stress,
    attackModifier: adversary.attackModifier,
    attackDescription: adversary.attackDescription,
    attackRange: adversary.attackRange,
    attackType: adversary.attackType,
    hpMarked: 0,
    stressMarked: 0,
    conditions: [],
  };
}

function listSessionAdversaries() {
  return getCache().sessionAdversaries;
}
function listSessionAdversariesBySession(sessionId) {
  return getCache().sessionAdversaries.filter((sa) => sa.sessionId === sessionId);
}
function createSessionAdversary(data) {
  return mutate((store) => {
    if (!store.sessions.some((s) => s.id === data.sessionId)) {
      throw new Error(`No session with id ${data.sessionId}`);
    }
    const record = buildSessionAdversary(store, data);
    store.sessionAdversaries.push(record);
    return record;
  });
}
function updateSessionAdversary(id, patch) {
  return mutate((store) => {
    const existing = store.sessionAdversaries.find((r) => r.id === id);
    if (!existing) throw new Error(`No record with id ${id}`);
    Object.assign(existing, mergePatch(existing, patch));
    return existing;
  });
}
function removeSessionAdversary(id) {
  return mutate((store) => {
    const index = store.sessionAdversaries.findIndex((r) => r.id === id);
    if (index === -1) throw new Error(`No record with id ${id}`);
    store.sessionAdversaries.splice(index, 1);
  });
}

function buildSessionEnvironment(store, data) {
  const environment = store.environments.find((e) => e.id === data.environmentId);
  if (!environment) throw new Error(`No environment with id ${data.environmentId}`);
  return {
    id: randomUUID(),
    sessionId: data.sessionId,
    environmentId: data.environmentId,
    label: data.label && data.label.trim() ? data.label.trim() : environment.name,
    name: environment.name,
    tier: environment.tier,
    difficulty: environment.difficulty,
    description: environment.description,
    impulses: environment.impulses,
    notes: data.notes ?? null,
  };
}

function listSessionEnvironments() {
  return getCache().sessionEnvironments;
}
function listSessionEnvironmentsBySession(sessionId) {
  return getCache().sessionEnvironments.filter((se) => se.sessionId === sessionId);
}
function createSessionEnvironment(data) {
  return mutate((store) => {
    if (!store.sessions.some((s) => s.id === data.sessionId)) {
      throw new Error(`No session with id ${data.sessionId}`);
    }
    const record = buildSessionEnvironment(store, data);
    store.sessionEnvironments.push(record);
    return record;
  });
}
function updateSessionEnvironment(id, patch) {
  return mutate((store) => {
    const existing = store.sessionEnvironments.find((r) => r.id === id);
    if (!existing) throw new Error(`No record with id ${id}`);
    Object.assign(existing, mergePatch(existing, patch));
    return existing;
  });
}
function removeSessionEnvironment(id) {
  return mutate((store) => {
    const index = store.sessionEnvironments.findIndex((r) => r.id === id);
    if (index === -1) throw new Error(`No record with id ${id}`);
    store.sessionEnvironments.splice(index, 1);
  });
}

// ---- Export / Import ----
// Export hands back the whole store as-is. Import upserts by id, one
// collection at a time — a record whose id already exists is overwritten
// by the imported version, a new id is added. This is a deliberately
// simple substitute for real sync (see spec Section 6): no conflict
// resolution, no timestamps, last-imported-wins.

function exportSnapshot() {
  return getCache();
}

function importSnapshot(incoming) {
  return mutate((store) => {
    if (!incoming || typeof incoming !== 'object') {
      throw new Error('That file is not a valid Daggerheart Hub export.');
    }
    for (const key of COLLECTIONS) {
      if (incoming[key] !== undefined && !Array.isArray(incoming[key])) {
        throw new Error(`That file is not a valid Daggerheart Hub export (bad "${key}").`);
      }
    }

    let importedCount = 0;
    for (const key of COLLECTIONS) {
      for (const record of incoming[key] ?? []) {
        if (!record || !record.id) continue;
        const list = store[key];
        const index = list.findIndex((r) => r.id === record.id);
        if (index >= 0) list[index] = record;
        else list.push(record);
        importedCount++;
      }
    }
    return { importedCount };
  });
}

// Test-only hooks. Real usage never calls these — the module is loaded
// exactly once per process, so `cache` staying populated for the process's
// lifetime is exactly the desired behavior there. Tests need a fresh read
// every time DAGGERHEART_STORE_DIR points somewhere new, which this forces.
function __resetCacheForTests() {
  cache = null;
  writeQueue = Promise.resolve();
}

module.exports = {
  emptyStore,
  __resetCacheForTests,
  listGameSets,
  createGameSet,
  updateGameSet,
  listDomains,
  createDomain,
  updateDomain,
  removeDomain,
  listHeroClasses,
  createHeroClass,
  updateHeroClass,
  listSubclasses,
  listSubclassesByParentClass,
  createSubclass,
  updateSubclass,
  listCards: cards.list,
  createCard: cards.create,
  updateCard: cards.update,
  removeCard: cards.remove,
  listCardsByDomain,
  listAdversaries: adversaries.list,
  createAdversary: adversaries.create,
  updateAdversary: adversaries.update,
  removeAdversary: adversaries.remove,
  listEnvironments: environments.list,
  createEnvironment: environments.create,
  updateEnvironment: environments.update,
  removeEnvironment: environments.remove,
  listWeapons: weapons.list,
  createWeapon: weapons.create,
  updateWeapon: weapons.update,
  removeWeapon: weapons.remove,
  listArmors: armors.list,
  createArmor: armors.create,
  updateArmor: armors.update,
  removeArmor: armors.remove,
  listLoot: loot.list,
  createLoot: loot.create,
  updateLoot: loot.update,
  removeLoot: loot.remove,
  listConsumables: consumables.list,
  createConsumable: consumables.create,
  updateConsumable: consumables.update,
  removeConsumable: consumables.remove,
  listCommunities: communities.list,
  createCommunity: communities.create,
  updateCommunity: communities.update,
  removeCommunity: communities.remove,
  listAncestries: ancestries.list,
  createAncestry: ancestries.create,
  updateAncestry: ancestries.update,
  removeAncestry: ancestries.remove,
  listTransformations: transformations.list,
  createTransformation: transformations.create,
  updateTransformation: transformations.update,
  removeTransformation: transformations.remove,
  listCampaigns: campaigns.list,
  createCampaign: campaigns.create,
  updateCampaign: campaigns.update,
  removeCampaign,
  listPartyMembers: partyMembers.list,
  createPartyMember: partyMembers.create,
  updatePartyMember: partyMembers.update,
  removePartyMember: partyMembers.remove,
  listPartyMembersByCampaign,
  listLootTables: lootTables.list,
  createLootTable: lootTables.create,
  updateLootTable: lootTables.update,
  removeLootTable: lootTables.remove,
  listConsumableTables: consumableTables.list,
  createConsumableTable: consumableTables.create,
  updateConsumableTable: consumableTables.update,
  removeConsumableTable: consumableTables.remove,
  listSessions: sessions.list,
  createSession: sessions.create,
  updateSession: sessions.update,
  removeSession,
  listSessionsByCampaign,
  listSessionAdversaries,
  createSessionAdversary,
  updateSessionAdversary,
  removeSessionAdversary,
  listSessionAdversariesBySession,
  listSessionEnvironments,
  createSessionEnvironment,
  updateSessionEnvironment,
  removeSessionEnvironment,
  listSessionEnvironmentsBySession,
  exportSnapshot,
  importSnapshot,
};
