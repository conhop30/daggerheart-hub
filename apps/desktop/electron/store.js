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
const carry = require('./carry.js');

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
  'combats',
  'noteTabs',
  'musicRegions',
  'musicTracks',
  'journalEntries',
];

// The built-in music region that always exists: it holds the library's
// "everywhere" defaults and any track not filed under a user-made region. A
// fixed id (not a random UUID) so Export/Import from another machine upserts
// onto the same record instead of creating a second default.
const DEFAULT_REGION_ID = 'everywhere';
const DEFAULT_REGION_NAME = 'Global';
function defaultMusicRegion() {
  return { id: DEFAULT_REGION_ID, name: DEFAULT_REGION_NAME, isDefault: true, campaignId: null, defaultTrackId: null };
}
// Backfills the default region if a store predates it entirely, AND — the
// one deliberate exception to "never rewrite existing data.json content on
// load" elsewhere in this file — fixes its name forward if an older default
// ("Everywhere") is still stored. Safe specifically because this region's
// name has never been user-editable (updateMusicRegion strips `name` from
// any patch when id === DEFAULT_REGION_ID), so a stored value that isn't
// the current default name can only be a leftover from an earlier version
// of this app, never something a user typed.
function ensureDefaultRegion(store) {
  const existing = store.musicRegions.find((r) => r.id === DEFAULT_REGION_ID);
  if (!existing) {
    store.musicRegions.unshift(defaultMusicRegion());
  } else if (existing.name !== DEFAULT_REGION_NAME) {
    existing.name = DEFAULT_REGION_NAME;
  }
}

let cache = null;
// Serializes every mutation so two overlapping IPC calls can't interleave
// a read-modify-write of the same file. A failed mutation still leaves the
// queue usable for the next one — see the .catch in mutate() below.
let writeQueue = Promise.resolve();

function emptyStore() {
  const store = { version: STORE_VERSION };
  for (const key of COLLECTIONS) store[key] = [];
  ensureDefaultRegion(store);
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

// mutate() used to call writeStoreToDisk synchronously on every single
// create/update/remove — a full JSON.stringify + writeFileSync of every
// collection, even for something like an HP-stepper click during combat.
// scheduleWrite/flushPendingWrite decouple the disk flush from the
// in-memory mutation: the write is debounced, but never delayed past
// WRITE_MAX_WAIT_MS, so a burst of rapid edits coalesces into one disk
// write instead of starving the flush indefinitely. flushPendingWrite is
// called directly (not scheduled) on app quit (see main.js) so the last
// edit before closing is never lost.
const WRITE_DEBOUNCE_MS = 250;
const WRITE_MAX_WAIT_MS = 2000;
let writeTimer = null;
let writeDeadline = null;

function scheduleWrite(store) {
  const now = Date.now();
  if (!writeDeadline) writeDeadline = now + WRITE_MAX_WAIT_MS;
  clearTimeout(writeTimer);
  writeTimer = setTimeout(flushPendingWrite, Math.max(0, Math.min(WRITE_DEBOUNCE_MS, writeDeadline - now)));
}

function flushPendingWrite() {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = null;
  writeDeadline = null;
  if (cache) writeStoreToDisk(cache);
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
  ensureDefaultRegion(store);
  // Loot log entries predate ids; carrying them forward (and removing one
  // from a later session on) needs each to be addressable.
  for (const session of store.sessions) {
    for (const entry of session.lootLog ?? []) if (!entry.id) entry.id = randomUUID();
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
    scheduleWrite(store);
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
    clampNumber(data, 'startingEvasion', { min: 0 });
    clampNumber(data, 'startingHp', { min: 0 });
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
    clampNumber(patch, 'startingEvasion', { min: 0 });
    clampNumber(patch, 'startingHp', { min: 0 });

    const merged = mergePatch(existing, patch);
    applyRename(store.heroClasses, id, existing, patch, merged);
    Object.assign(existing, merged);
    return existing;
  });
}

// ---- Subclasses ----

// backdropImage (the themed background a Party member of this Subclass
// gets on their tile) arrived after Subclasses existed.
const presentSubclass = (record) => ({ ...record, backdropImage: record.backdropImage ?? null });

function listSubclasses() {
  return getCache().subclasses.map(presentSubclass);
}

function listSubclassesByParentClass(parentClassId) {
  return getCache()
    .subclasses.filter((s) => s.parentClassId === parentClassId)
    .map(presentSubclass);
}

// Root cause of a real bug (reproduced with Ranger — an official/core
// class — but not inside a freshly-created custom class): this lookup used
// to be a plain findByNameIgnoreCase(store.subclasses, ...), scoped to
// nothing. Two DIFFERENT classes having a same-named Subclass (easy to hit
// once real corebook content is seeded, or just by testing with the same
// placeholder name under two classes) silently matched the WRONG class's
// existing record and returned it — "doesn't accept input" was really
// "silently returned someone else's Subclass instead of creating this
// one." Scoped to parentClassId now, the same fix Session already got
// (scope: (r) => r.campaignId, via makeCollection) for the identical
// "two different parents can each have their own same-named child" shape.
// Subclass is hand-rolled rather than makeCollection-based (it needs the
// extra parentClassId existence check below), so the scoping is inline
// instead of makeCollection's own scope option.
function createSubclass(data) {
  return mutate((store) => {
    requireName(data);
    const existing = store.subclasses.find(
      (s) => s.parentClassId === data.parentClassId && s.name.toLowerCase() === data.name.toLowerCase()
    );
    if (existing) return presentSubclass(existing);
    if (!store.heroClasses.some((c) => c.id === data.parentClassId)) {
      throw new Error(`No hero class with id ${data.parentClassId}`);
    }
    validateImageDataUrl(data, 'backdropImage');
    const record = {
      id: randomUUID(),
      name: data.name,
      oneliner: data.oneliner ?? null,
      parentClassId: data.parentClassId,
      spellcastTrait: data.spellcastTrait ?? null,
      foundationFeatures: data.foundationFeatures ?? [],
      specializationFeatures: data.specializationFeatures ?? [],
      masteryFeatures: data.masteryFeatures ?? [],
      backdropImage: data.backdropImage ?? null,
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
    validateImageDataUrl(patch, 'backdropImage');
    const merged = mergePatch(existing, patch);
    // Same parentClassId scoping as createSubclass above, applied to the
    // rename-collision check too — pre-filtered to siblings under the same
    // class before handing off to the shared (deliberately global, correct
    // for GameSet/Domain/HeroClass) applyRename helper.
    applyRename(
      store.subclasses.filter((s) => s.parentClassId === merged.parentClassId),
      id,
      existing,
      patch,
      merged
    );
    Object.assign(existing, merged);
    return presentSubclass(existing);
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
//
// `scope` (optional) narrows the by-name uniqueness check to records that
// share a scope value — e.g. a Session name only has to be unique within its
// Campaign, so two Campaigns can each have a "Session 1". Without it, names
// are unique across the whole collection.
//
// Two optional hooks for records that aren't stored exactly as they're shown:
// `mergeExtra(existing, patch, merged)` adjusts the merged record before it's
// saved (a Session merges its per-member notes rather than replacing them),
// and `present(store, record)` turns a stored record into what callers see
// (a Session shows its Fear/notes as carried forward from earlier sessions).
function makeCollection(key, { buildRecord, validate, scope, mergeExtra, present } = {}) {
  const sameScope = (data) => (r) => !scope || scope(r) === scope(data);
  const findDuplicate = (store, data, ignoreId) =>
    store[key].find((r) => r.id !== ignoreId && sameScope(data)(r) && r.name.toLowerCase() === data.name.toLowerCase());
  const show = (store, record) => (present ? present(store, record) : record);

  function list() {
    const store = getCache();
    return store[key].map((r) => show(store, r));
  }

  function create(data) {
    return mutate((store) => {
      requireName(data);
      const existing = findDuplicate(store, data);
      if (existing) return show(store, existing);
      if (validate) validate(store, data);
      const record = buildRecord(data);
      store[key].push(record);
      return show(store, record);
    });
  }

  // Unwrapped from `mutate` so a caller already inside its own `mutate`
  // callback (e.g. Session's rename-sync wrapper below) can run this same
  // merge/validate logic atomically alongside other store writes, instead
  // of nesting a second `mutate` call — nesting would never resolve, since
  // the inner call would chain onto the writeQueue position the outer
  // call has already claimed but not yet settled.
  function applyUpdate(store, id, patch) {
    const existing = store[key].find((r) => r.id === id);
    if (!existing) throw new Error(`No record with id ${id}`);
    const merged = mergePatch(existing, patch);
    if (mergeExtra) mergeExtra(existing, patch, merged);
    if (validate) validate(store, merged);
    if (patch.name !== undefined && findDuplicate(store, merged, id)) merged.name = existing.name;
    Object.assign(existing, merged);
    return show(store, existing);
  }

  function update(id, patch) {
    return mutate((store) => applyUpdate(store, id, patch));
  }

  function remove(id) {
    return mutate((store) => {
      const index = store[key].findIndex((r) => r.id === id);
      if (index === -1) throw new Error(`No record with id ${id}`);
      store[key].splice(index, 1);
    });
  }

  return { list, create, update, remove, applyUpdate };
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

// `features` is a map of section key -> [{name, description}], deliberately
// schema-free: which sections exist (passives, actions, reactions,
// evolutions, or a homebrew one) is defined renderer-side in
// src/lib/featureKinds.ts, and the store persists whatever keys it's given.
const emptyFeatures = () => ({});

// Kept in sync by hand with AdversaryForm.tsx's ATTACK_RANGES/ATTACK_TYPES/
// ADVERSARY_TYPES — store.js is CJS and can't import the .ts source, so a
// new enum value added there needs the matching literal added here too.
const ADVERSARY_TYPES = ['STANDARD', 'BRUISER', 'HORDE', 'LEADER', 'MINION', 'RANGED', 'SKULK', 'SOCIAL', 'SOLO', 'SUPPORT'];
const ATTACK_RANGES = ['MELEE', 'VERY_CLOSE', 'CLOSE', 'FAR', 'VERY_FAR', 'OUT_OF_RANGE'];
const ATTACK_TYPES = ['PHYSICAL', 'MAGICAL', 'DIRECT_PHYSICAL', 'DIRECT_MAGICAL'];

function validateAdversary(_store, data) {
  requireEnum(data, 'type', ADVERSARY_TYPES);
  requireEnum(data, 'attackRange', ATTACK_RANGES);
  requireEnum(data, 'attackType', ATTACK_TYPES);
  clampNumber(data, 'tier', { min: 1 });
  clampNumber(data, 'difficulty', { min: 0 });
  clampNumber(data, 'hp', { min: 0 });
  clampNumber(data, 'stress', { min: 0 });
  clampNumber(data, 'attackModifier');
  clampThresholds(data);
}

const adversaries = makeCollection('adversaries', {
  validate: validateAdversary,
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
    features: data.features ?? emptyFeatures(),
    gameSetId: data.gameSetId,
  }),
});

// Kept in sync by hand with EnvironmentForm.tsx's ENVIRONMENT_CATEGORIES.
const ENVIRONMENT_CATEGORIES = ['EXPLORATION', 'EVENT', 'SOCIAL', 'TRAVERSAL'];

function validateEnvironment(_store, data) {
  requireEnum(data, 'category', ENVIRONMENT_CATEGORIES);
  clampNumber(data, 'tier', { min: 1 });
  clampNumber(data, 'difficulty', { min: 0 });
}

const environments = makeCollection('environments', {
  validate: validateEnvironment,
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
    features: data.features ?? emptyFeatures(),
    gameSetId: data.gameSetId,
  }),
});

// Kept in sync by hand with src/api/weapons.ts's WeaponSlot/Burden/
// WeaponTrait/DamageType unions.
const WEAPON_SLOTS = ['PRIMARY', 'SECONDARY'];
const BURDENS = ['ONE_HANDED', 'TWO_HANDED'];
const WEAPON_TRAITS = ['AGILITY', 'PRESENCE', 'INSTINCT', 'KNOWLEDGE', 'FINESSE', 'STRENGTH'];
const DAMAGE_TYPES = ['PHYSICAL', 'MAGICAL'];

// Burden locked to One-Handed when WeaponSlot = Secondary — enforced here,
// not just as a UI default, per the spec.
function validateWeapon(_store, data) {
  requireEnum(data, 'weaponSlot', WEAPON_SLOTS);
  requireEnum(data, 'burden', BURDENS);
  requireEnum(data, 'trait', WEAPON_TRAITS);
  requireEnum(data, 'damageType', DAMAGE_TYPES);
  clampNumber(data, 'tier', { min: 1 });
  if (data.weaponSlot === 'SECONDARY' && data.burden !== 'ONE_HANDED') {
    throw new Error('A Secondary weapon must be One-Handed.');
  }
}

function validateArmor(_store, data) {
  clampNumber(data, 'tier', { min: 1 });
  clampNumber(data, 'baseScore', { min: 0 });
  clampThresholds(data);
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
  validate: validateArmor,
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

// Loot/Consumable have no numeric fields to clamp — their real sanitization
// gap is referential, not numeric: confirming gameSetId actually points at a
// real Game Set, same rule validateEntriesTable already enforces below for
// the tables that reference these records.
function validateGameSetRef(store, data) {
  if (!store.gameSets.some((g) => g.id === data.gameSetId)) {
    throw new Error(`No game set with id ${data.gameSetId}`);
  }
}

const loot = makeCollection('loot', {
  validate: validateGameSetRef,
  buildRecord: (data) => ({
    id: randomUUID(),
    name: data.name,
    description: data.description ?? null,
    gameSetId: data.gameSetId,
  }),
});

const consumables = makeCollection('consumables', {
  validate: validateGameSetRef,
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

// ---- Carry-forward across sessions ----
// A Campaign's data follows it from session to session (see carry.js for the
// rules): Party members, pulled-in Adversaries/Environments, Fear, the music
// region, and the loot log all carry; only a Session's own name stays put.
// Editing or deleting inside session N reaches N and everything after it,
// never the sessions before.

const VERSIONED = ['partyMembers', 'sessionAdversaries', 'sessionEnvironments', 'combats', 'noteTabs'];
const CARRIED_SESSION_FIELDS = ['fear', 'regionId'];

function sessionOrder(store, campaignId) {
  return store.sessions.filter((s) => s.campaignId === campaignId).map((s) => s.id);
}

function latestSessionId(store, campaignId) {
  const order = sessionOrder(store, campaignId);
  return order.length ? order[order.length - 1] : null;
}

// Party members carry their campaignId; a session-level record's Campaign is
// its session's. (Older stores never wrote campaignId on the latter.)
function campaignIdOfVersion(store, v) {
  return v.campaignId ?? store.sessions.find((s) => s.id === v.sessionId)?.campaignId ?? null;
}

function versionsOf(store, key, campaignId) {
  return store[key].filter((v) => campaignIdOfVersion(store, v) === campaignId);
}

// Which session an edit/delete is made "in": the one the caller says they're
// viewing, else the Campaign's latest (or the baseline when it has none yet).
function editSession(store, campaignId, ctx) {
  const order = sessionOrder(store, campaignId);
  const requested = ctx && ctx.sessionId ? ctx.sessionId : null;
  if (requested === null) return { order, sessionId: order.length ? order[order.length - 1] : null };
  if (!order.includes(requested)) throw new Error(`No session with id ${requested} in that campaign`);
  return { order, sessionId: requested };
}

const lineageOfVersion = (v) => v.lineageId ?? v.id;

// `present`, when given, runs on every record this collection returns
// (list/create/update) — a read-time-only shape fixup, never written back to
// disk. It exists for the case validate()/build() can't cover: a field added
// to the schema after records already existed on someone's disk. Those
// records keep their old shape forever (this store's stated policy: never
// silently rewrite existing data.json content), so any code that assumes
// the new field is always present will throw the instant it touches one —
// present() is what makes "new field, old record" safe to read without
// touching what's actually stored. See presentSessionAdversary for why this
// exists: a real crash it fixed, not a hypothetical one.
function makeVersionedCollection(key, { context, build, validate, uniqueByName = false, present = (record) => record }) {
  const viewsAsOf = (store, campaignId, sessionId) =>
    carry.resolveVersions(versionsOf(store, key, campaignId), sessionOrder(store, campaignId), sessionId).map(present);

  function list() {
    const store = getCache();
    return store.campaigns.flatMap((c) => viewsAsOf(store, c.id, latestSessionId(store, c.id)));
  }
  function listByCampaign(campaignId) {
    const store = getCache();
    return viewsAsOf(store, campaignId, latestSessionId(store, campaignId));
  }
  function listBySession(sessionId) {
    const store = getCache();
    const session = store.sessions.find((s) => s.id === sessionId);
    return session ? viewsAsOf(store, session.campaignId, sessionId) : [];
  }

  function create(data) {
    return mutate((store) => {
      if (uniqueByName) requireName(data);
      const { campaignId, sessionId } = context(store, data);
      if (uniqueByName) {
        const taken = viewsAsOf(store, campaignId, sessionId).find((v) => v.name.toLowerCase() === data.name.toLowerCase());
        if (taken) return taken;
      }
      if (validate) validate(store, data);
      const record = build(store, data, { campaignId, sessionId });
      store[key].push(record);
      return present({ ...record, carried: false });
    });
  }

  function update(id, patch, ctx) {
    return mutate((store) => {
      const first = store[key].find((v) => lineageOfVersion(v) === id);
      if (!first) throw new Error(`No record with id ${id}`);
      const campaignId = campaignIdOfVersion(store, first);
      const { order, sessionId } = editSession(store, campaignId, ctx);
      const safePatch = { ...patch };
      // Same rule as makeCollection: renaming onto another member's name is skipped, not rejected.
      if (uniqueByName && safePatch.name !== undefined) {
        const clash = viewsAsOf(store, campaignId, sessionId).find(
          (v) => v.id !== id && v.name.toLowerCase() === String(safePatch.name).toLowerCase()
        );
        if (clash) delete safePatch.name;
      }
      if (validate) validate(store, safePatch);
      carry.editVersion(store[key], order, id, sessionId, safePatch, randomUUID);
      return viewsAsOf(store, campaignId, sessionId).find((v) => v.id === id);
    });
  }

  // Unwrapped from `mutate`, same reasoning as makeCollection's applyUpdate:
  // a caller already inside its own mutate() (removeCombatAndContents, see
  // below) needs to run this exact removal logic atomically alongside other
  // store writes, without nesting a second mutate() call.
  function applyRemove(store, id, ctx) {
    const first = store[key].find((v) => lineageOfVersion(v) === id);
    if (!first) throw new Error(`No record with id ${id}`);
    const campaignId = campaignIdOfVersion(store, first);
    const { order, sessionId } = editSession(store, campaignId, ctx);
    store[key] = carry.removeVersions(store[key], order, id, sessionId, randomUUID);
  }

  function remove(id, ctx) {
    return mutate((store) => applyRemove(store, id, ctx));
  }

  return { list, listByCampaign, listBySession, create, update, remove, applyRemove };
}

// ---- Campaigns ----
// The container for the Session Builder feature: a standing Party (the
// PartyMember roster below) and the Sessions run against it. Unlike most
// collections, deleting a Campaign cascades to its children — they have no
// other reachable gallery/list the way e.g. Card does off of Domain, so an
// orphaned PartyMember or Session would be permanently stuck with no UI path
// to it. removeSession moves what it authored to the next session instead
// (see below).

// The party's level, shown at a glance on the Campaign banner. Daggerheart
// characters run level 1-10, so clamp into that range (same normalize-then-
// persist use of validate as Session's fear).
function validateCampaign(store, data) {
  if (data.level !== undefined) {
    data.level = Math.max(1, Math.min(10, Math.round(Number(data.level)) || 1));
  }
  validateImageDataUrl(data, 'coverImage');
  if (data.defaultRegionId != null) {
    const region = store.musicRegions.find((r) => r.id === data.defaultRegionId);
    if (!region) throw new Error(`No music region with id ${data.defaultRegionId}`);
    // data.id is only present on update (create assigns it after validate
    // runs) — a brand-new Campaign can't yet own a region scoped to it, so
    // this naturally rejects any Campaign-scoped region at create time too.
    if (region.campaignId != null && region.campaignId !== data.id) {
      throw new Error('A Campaign can only default to an application-wide region or one of its own.');
    }
  }
}

// ---- Shared data-sanitization helpers ----
// Several stat-block-shaped collections (Adversary, Environment, Weapon,
// Armor, ...) previously had no validate() at all, so a garbled paste or a
// bypassed <input type="number"> could leave a non-numeric string or a
// nonsense value (negative HP, an attack type that isn't one of the ones
// the UI offers) sitting in stored data indefinitely. clampNumber/
// requireEnum are the reusable building blocks for that, following the same
// "mutate the record in place before it's persisted" idiom validateCampaign
// already established above. Both makeCollection and makeVersionedCollection
// call validate() on an object whose mutations are exactly what gets
// persisted (the raw `data` on create, the merged/patched record on
// update) — see each factory's own validate call site.
//
// Only clamps/normalizes going forward: an already-stored bad record is
// left alone until it's next created/updated through this path — this
// deliberately does not rewrite existing data.json content on load, since
// silently rewriting someone's existing homebrew on startup is its own risk.
function clampNumber(data, field, { min = -Infinity, max = Infinity, allowNull = true } = {}) {
  if (data[field] === undefined) return;
  if (data[field] === null) {
    if (!allowNull) data[field] = min;
    return;
  }
  const n = Math.round(Number(data[field]));
  data[field] = Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : allowNull ? null : min;
}

function requireEnum(data, field, allowed) {
  if (data[field] != null && !allowed.includes(data[field])) {
    throw new Error(`${field} must be one of ${allowed.join(', ')}`);
  }
}

// coverImage/portraitImage (Campaign/PartyMember) are raw data: URLs with no
// managed file directory behind them yet (see ImageUploadField.tsx) — stored
// straight in store.json, which gets rewritten whole on every mutation (see
// scheduleWrite above), so an unbounded image would bloat every single save
// from then on. Rejects outright rather than clamping — there's no sensible
// way to "clamp" an oversized image down. ImageUploadField already enforces
// the same cap client-side before even reading the file; this is the
// defense-in-depth backstop for any other caller of the IPC bridge.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function validateImageDataUrl(data, field, { maxBytes = MAX_IMAGE_BYTES } = {}) {
  if (data[field] === undefined || data[field] === null) return;
  const value = data[field];
  if (typeof value !== 'string' || !/^data:image\//.test(value)) {
    throw new Error(`${field} must be an image data URL`);
  }
  // Decoded byte size from the base64 payload length, not the data: URL's
  // own string length (which overcounts by ~33% thanks to base64 overhead).
  const base64 = value.slice(value.indexOf(',') + 1);
  const approxBytes = Math.floor((base64.length * 3) / 4);
  if (approxBytes > maxBytes) {
    throw new Error(`${field} is too large (max ${Math.floor(maxBytes / (1024 * 1024))}MB)`);
  }
}

function clampThresholds(data, field = 'thresholds', { min = 0 } = {}) {
  if (data[field] === undefined || data[field] === null) return;
  clampNumber(data[field], 'major', { min });
  clampNumber(data[field], 'severe', { min });
}

// Conditions are stacked ({name, count}), not a flat free-text list — count
// is what lets e.g. two stacks of Corrosive actually double its Difficulty
// penalty instead of just showing "Corrosive" twice. Name stays free text
// (no fixed condition list exists in the corebook data), only count is
// numeric and needs clamping.
function sanitizeConditions(data) {
  if (!Array.isArray(data.conditions)) return;
  data.conditions = data.conditions.map((c) => ({
    name: typeof c?.name === 'string' ? c.name : '',
    count: Number.isFinite(Number(c?.count)) ? Math.max(1, Math.round(Number(c.count))) : 1,
  }));
}

const campaigns = makeCollection('campaigns', {
  validate: validateCampaign,
  buildRecord: (data) => ({
    id: randomUUID(),
    name: data.name,
    notes: data.notes ?? null,
    colorHex: data.colorHex ?? null,
    level: data.level ?? 1,
    coverImage: data.coverImage ?? null,
    defaultRegionId: data.defaultRegionId ?? null,
  }),
  // A Campaign created before coverImage/defaultRegionId existed has no
  // such keys at all — default them at read time (never rewriting the
  // stored record), same fix as the Music track volume read-time default
  // above.
  present: (_store, record) => ({ ...record, coverImage: record.coverImage ?? null, defaultRegionId: record.defaultRegionId ?? null }),
});

function removeCampaign(id) {
  return mutate((store) => {
    const index = store.campaigns.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`No campaign with id ${id}`);
    store.campaigns.splice(index, 1);
    const sessionIds = new Set(store.sessions.filter((s) => s.campaignId === id).map((s) => s.id));
    for (const key of VERSIONED) {
      store[key] = store[key].filter((v) => v.campaignId !== id && !sessionIds.has(v.sessionId));
    }
    store.sessions = store.sessions.filter((s) => s.campaignId !== id);
    store.journalEntries = store.journalEntries.filter((j) => j.campaignId !== id);
    // Music folders are the user's, so a Campaign-scoped one is promoted to
    // application-wide rather than destroyed along with the Campaign — same
    // "keep the folder's tracks" spirit as removeMusicRegion above.
    for (const region of store.musicRegions) if (region.campaignId === id) region.campaignId = null;
  });
}

// ---- Journal Entries ----
// Freeform "chicken scratch" notes a GM jots against a Campaign while
// browsing the app's own tabs (Adversaries, Equipment, ...) — deliberately
// NOT a makeCollection: label is not unique (two blank/same-labeled notes
// are completely normal here) and starts blank (an entry is created first,
// then typed into), so the generic name-required/name-deduped shape this
// store's other collections share doesn't fit. Kind mirrors the app's own
// content types rather than generic GM-notes buckets, so a note taken while
// looking at the Equipment page's Weapons section lands in the category a
// user would expect.

// SESSION is not a manually-pickable category (the renderer never offers it
// in the "+" add-entry menu) — it's created automatically the first time a
// GM types into a live Session's Notes panel, with its label kept in sync
// with that Session's name (see updateSessionAndSyncNotes below).
const JOURNAL_ENTRY_KINDS = ['ADVERSARIES', 'LOOT', 'CONSUMABLES', 'ARMOR', 'WEAPONS', 'WORLDBUILDING', 'OTHER', 'SESSION'];

function listJournalEntries() {
  return getCache().journalEntries;
}

function listJournalEntriesByCampaign(campaignId) {
  return getCache()
    .journalEntries.filter((j) => j.campaignId === campaignId)
    .sort((a, b) => a.order - b.order);
}

function createJournalEntry(data) {
  return mutate((store) => {
    if (!store.campaigns.some((c) => c.id === data.campaignId)) {
      throw new Error(`No campaign with id ${data.campaignId}`);
    }
    if (!JOURNAL_ENTRY_KINDS.includes(data.kind)) {
      throw new Error(`Journal entry kind must be one of ${JOURNAL_ENTRY_KINDS.join(', ')}`);
    }
    // New entries append to the end of their own (campaign, kind) group —
    // order is otherwise only ever changed by explicit reordering.
    const highestOrder = store.journalEntries
      .filter((j) => j.campaignId === data.campaignId && j.kind === data.kind)
      .reduce((max, j) => Math.max(max, j.order), -1);
    const record = {
      id: randomUUID(),
      campaignId: data.campaignId,
      kind: data.kind,
      label: data.label ?? '',
      notes: data.notes ?? '',
      order: highestOrder + 1,
    };
    store.journalEntries.push(record);
    return record;
  });
}

function updateJournalEntry(id, patch) {
  return mutate((store) => {
    const entry = store.journalEntries.find((j) => j.id === id);
    if (!entry) throw new Error(`No record with id ${id}`);
    // Kind is fixed at creation — recategorizing isn't a thing this does.
    if (patch.label !== undefined) entry.label = patch.label;
    if (patch.notes !== undefined) entry.notes = patch.notes;
    if (patch.order !== undefined) entry.order = patch.order;
    return entry;
  });
}

function removeJournalEntry(id) {
  return mutate((store) => {
    const index = store.journalEntries.findIndex((j) => j.id === id);
    if (index === -1) throw new Error(`No record with id ${id}`);
    store.journalEntries.splice(index, 1);
  });
}

// ---- Party Members ----
// A standing roster per Campaign, carried across its Sessions: who each PC
// is (name, Class and Subclass — two of each for a multiclassed PC —
// Ancestry and Community), not a tracker for what they've marked. A roster
// from before this had a freeform `trackables` list (HP, Stress and the
// like); that's no longer accepted, and is left off whatever is read back.
//
// Name uniqueness is scoped to the Campaign (two Campaigns can each have a
// same-named PC). Called with no session, edits land on the Campaign's latest
// session (or the baseline, before any session exists).

const PARTY_MEMBER_REFS = [
  ['classId', 'heroClasses'],
  ['subclassId', 'subclasses'],
  ['secondClassId', 'heroClasses'],
  ['secondSubclassId', 'subclasses'],
  ['ancestryId', 'ancestries'],
  ['communityId', 'communities'],
];

const partyMembers = makeVersionedCollection('partyMembers', {
  uniqueByName: true,
  validate: (store, data) => {
    delete data.trackables;
    validateImageDataUrl(data, 'portraitImage');
    for (const [field, collection] of PARTY_MEMBER_REFS) {
      if (data[field] != null && !store[collection].some((r) => r.id === data[field])) {
        throw new Error(`${field} does not match anything in ${collection}`);
      }
    }
    // A Subclass belongs to one Class; picking it settles the Class too.
    if (data.subclassId != null) {
      data.classId = store.subclasses.find((s) => s.id === data.subclassId).parentClassId;
    }
    if (data.secondSubclassId != null) {
      data.secondClassId = store.subclasses.find((s) => s.id === data.secondSubclassId).parentClassId;
    }
  },
  context(store, data) {
    if (!store.campaigns.some((c) => c.id === data.campaignId)) {
      throw new Error(`No campaign with id ${data.campaignId}`);
    }
    const { sessionId } = editSession(store, data.campaignId, { sessionId: data.sessionId });
    return { campaignId: data.campaignId, sessionId };
  },
  build: (_store, data, { campaignId, sessionId }) => ({
    id: randomUUID(),
    campaignId,
    sessionId,
    name: data.name,
    notes: data.notes ?? null,
    portraitImage: data.portraitImage ?? null,
    classId: data.classId ?? null,
    subclassId: data.subclassId ?? null,
    secondClassId: data.secondClassId ?? null,
    secondSubclassId: data.secondSubclassId ?? null,
    ancestryId: data.ancestryId ?? null,
    communityId: data.communityId ?? null,
  }),
  // Same read-time default as Campaign's coverImage, for members created
  // before portraitImage (and, later, Class/Heritage) existed.
  present: ({ trackables: _trackables, ...record }) => ({
    ...record,
    portraitImage: record.portraitImage ?? null,
    classId: record.classId ?? null,
    subclassId: record.subclassId ?? null,
    secondClassId: record.secondClassId ?? null,
    secondSubclassId: record.secondSubclassId ?? null,
    ancestryId: record.ancestryId ?? null,
    communityId: record.communityId ?? null,
  }),
});

const listPartyMembersByCampaign = partyMembers.listByCampaign;
const listPartyMembersBySession = partyMembers.listBySession;

// ---- Sessions ----
// A persistent, resumable run of a Campaign: everything that carries
// forward (Fear, music region, loot log). Built with makeCollection like
// Campaign itself — a Session always has a user-given name ("The Ambush at
// Dawn") and idempotent-by-name create is an acceptable, already-familiar
// behavior here, scoped to the Campaign so two Campaigns can each have a
// "Session 1".
//
// A carried field is stored on a session only when it was set *in* that
// session (`hasOwnProperty`); every read resolves the rest from earlier
// sessions — see presentSession.

function validateSession(store, data) {
  if (!store.campaigns.some((c) => c.id === data.campaignId)) {
    throw new Error(`No campaign with id ${data.campaignId}`);
  }
  if (data.regionId != null && !store.musicRegions.some((r) => r.id === data.regionId)) {
    throw new Error(`No music region with id ${data.regionId}`);
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

// What callers see of a stored session: its own fields plus the carried ones
// resolved from this session back through earlier ones. A session's own
// regionId falls back to its Campaign's defaultRegionId — but only for the
// very first session in that Campaign; every later session instead carries
// forward whatever the previous one had (resolveScalar walks earlier
// sessions first and only reaches this fallback when none of them set it).
function presentSession(store, session) {
  const inCampaign = store.sessions.filter((s) => s.campaignId === session.campaignId);
  const index = inCampaign.findIndex((s) => s.id === session.id);
  const { lootRemoved: _removed, ...own } = session;
  const campaignDefaultRegionId = store.campaigns.find((c) => c.id === session.campaignId)?.defaultRegionId ?? null;
  return {
    ...own,
    fear: carry.resolveScalar(inCampaign, index, 'fear', 0),
    regionId: carry.resolveScalar(inCampaign, index, 'regionId', campaignDefaultRegionId),
    lootLog: carry.resolveLootLog(inCampaign, index),
  };
}

const sessions = makeCollection('sessions', {
  validate: validateSession,
  scope: (r) => r.campaignId,
  present: presentSession,
  mergeExtra(existing, _patch, merged) {
    // The loot log has its own add/remove calls (addSessionLoot/removeSessionLoot).
    merged.lootLog = existing.lootLog ?? [];
    merged.lootRemoved = existing.lootRemoved ?? [];
  },
  buildRecord: (data) => {
    const record = {
      id: randomUUID(),
      campaignId: data.campaignId,
      name: data.name,
      lootLog: (data.lootLog ?? []).map((e) => ({ ...e, id: e.id ?? randomUUID() })),
      lootRemoved: [],
    };
    for (const field of CARRIED_SESSION_FIELDS) if (data[field] !== undefined) record[field] = data[field];
    return record;
  },
});

// A renamed Session keeps its linked SESSION-kind Journal entry (if one
// exists yet) in sync by label, so the two never drift into "same session,
// two names" — one orphaned under the old label, a blank one created fresh
// under the new one next time someone opens Notes. Uses sessions.applyUpdate
// rather than sessions.update so the rename and the journal-entry relabel
// happen inside one mutate call (see applyUpdate's own comment for why
// nesting mutate calls doesn't work). Compares against the *saved* name,
// not the raw patch — a rename that collides with another Session in the
// same Campaign is silently reverted by applyUpdate's own dedupe check, and
// a reverted rename must not relabel the journal entry either.
function updateSessionAndSyncNotes(id, patch) {
  return mutate((store) => {
    const existing = store.sessions.find((s) => s.id === id);
    if (!existing) throw new Error(`No session with id ${id}`);
    const oldName = existing.name;
    const saved = sessions.applyUpdate(store, id, patch);
    if (saved.name !== oldName) {
      const linked = store.journalEntries.find(
        (j) => j.kind === 'SESSION' && j.campaignId === existing.campaignId && j.label.trim() === oldName.trim()
      );
      if (linked) linked.label = saved.name;
    }
    return saved;
  });
}

function listSessionsByCampaign(campaignId) {
  const store = getCache();
  return store.sessions.filter((s) => s.campaignId === campaignId).map((s) => presentSession(store, s));
}

// Rolled loot joins the log from this session onward; removing an entry hides
// it from this session onward (an entry rolled in this very session is simply
// dropped) — sessions before it are never touched.
function addSessionLoot(sessionId, entry) {
  return mutate((store) => {
    const session = store.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error(`No session with id ${sessionId}`);
    session.lootLog = [...(session.lootLog ?? []), { ...entry, id: randomUUID() }];
    return presentSession(store, session);
  });
}

function removeSessionLoot(sessionId, entryId) {
  return mutate((store) => {
    const session = store.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error(`No session with id ${sessionId}`);
    if (!presentSession(store, session).lootLog.some((e) => e.id === entryId)) {
      throw new Error(`No loot entry with id ${entryId}`);
    }
    const own = (session.lootLog ?? []).findIndex((e) => e.id === entryId);
    if (own >= 0) session.lootLog.splice(own, 1);
    else session.lootRemoved = [...(session.lootRemoved ?? []), entryId];
    return presentSession(store, session);
  });
}

// Deleting a Session must not change what the *later* ones show, so anything
// it authored (versions, carried fields, loot) moves to the session right
// after it — unless that session already set its own. With no later session
// it just goes away.
function removeSession(id) {
  return mutate((store) => {
    const index = store.sessions.findIndex((s) => s.id === id);
    if (index === -1) throw new Error(`No session with id ${id}`);
    const session = store.sessions[index];
    const order = sessionOrder(store, session.campaignId);
    const next = store.sessions.find((s) => s.id === order[order.indexOf(id) + 1]);

    for (const key of VERSIONED) store[key] = carry.rehomeVersions(store[key], order, id);

    if (next) {
      const has = (s, field) => Object.prototype.hasOwnProperty.call(s, field);
      for (const field of CARRIED_SESSION_FIELDS) {
        if (has(session, field) && !has(next, field)) next[field] = session[field];
      }
      next.lootLog = [...(session.lootLog ?? []), ...(next.lootLog ?? [])];
      next.lootRemoved = [...new Set([...(session.lootRemoved ?? []), ...(next.lootRemoved ?? [])])];
    }
    store.sessions.splice(index, 1);
  });
}

// ---- Session Adversaries / Session Environments ----
// Versioned (see carry.js), not built with makeCollection. Pulling the same
// Adversary into a session twice (two Ogres) must create two independent
// items — idempotent-by-name create would collapse the second pull-in into
// the first — and there's no user-supplied "name" to key that on anyway,
// since name is snapshotted from the master record. So every create just
// inserts, the same reasoning as GameSet.
//
// These are snapshots, not live references: the master Adversary/
// Environment is only ever looked up at create time (inside the build
// functions below), so editing or even deleting the master later can never
// disturb a session already in progress. Daggerheart tracks HP/Stress as
// *marked boxes* during play, not a countdown, hence hpMarked/stressMarked
// starting at 0 against a snapshotted hpMax/stressMax. A pulled-in combatant
// stays on the board in later sessions (with whatever was marked) until
// someone pushes it out from some session on.

function sessionContext(store, data) {
  const session = store.sessions.find((s) => s.id === data.sessionId);
  if (!session) throw new Error(`No session with id ${data.sessionId}`);
  return { campaignId: session.campaignId, sessionId: session.id };
}

// Most of a SessionAdversary's fields are a snapshot copied from an already-
// validated master Adversary at pull-in time (see build() below), so the
// only real sanitization gap is on values a GM can edit live during Combat
// — Difficulty/Thresholds (editable once pulled in) and the HP/Stress
// marked-boxes trackers.
function validateSessionAdversary(store, data) {
  // combatId is optional, not required: the renderer always sends one when
  // pulling an Adversary in through the Combat tab bar, but nothing else
  // about this record depends on it, and a missing/null value is itself a
  // meaningful state (pulled in before Combat tabs existed — see
  // presentSessionAdversary) rather than an error.
  if (data.combatId && !store.combats.some((c) => (c.lineageId ?? c.id) === data.combatId)) {
    throw new Error(`No combat with id ${data.combatId}`);
  }
  clampNumber(data, 'count', { min: 1, allowNull: false });
  if (data.slain !== undefined) data.slain = Boolean(data.slain);
  clampNumber(data, 'hpMarked', { min: 0 });
  clampNumber(data, 'stressMarked', { min: 0 });
  clampNumber(data, 'attackModifier');
  clampNumber(data, 'difficulty', { min: 0 });
  // Modifiers, unlike the base Difficulty/Thresholds they're layered onto,
  // are deliberately allowed negative (and unbounded) — a GM pushing a
  // fight harder or softer isn't clamped to "at least as hard as the book".
  clampNumber(data, 'difficultyModifier');
  clampThresholds(data);
  clampThresholds(data, 'thresholdsModifier', { min: -Infinity });
  sanitizeConditions(data);
}

// Real bug this fixed: difficultyModifier/thresholdsModifier were added to
// the schema after live data already had SessionAdversary records on disk
// (e.g. adversaries pulled into a session weeks ago), and Conditions moved
// from plain strings to {name, count}. Those older records keep their old
// shape — validate()/build() only ever touch a record going forward, they
// don't rewrite what's already stored — so the frontend (which assumes the
// new shape unconditionally, e.g. `adversary.thresholdsModifier.major`)
// crashed outright opening a Session with anything pulled in before today.
// present() below patches the shape on the way OUT, every time, without
// ever touching the file on disk.
function presentSessionAdversary(record) {
  return {
    ...record,
    // combatId predates this too. A record pulled in before Combat tabs
    // existed reads as null; the renderer adopts it into the session's
    // first tab the next time that session is opened (an ordinary update,
    // see SessionView/CombatPanel) rather than this file migrating it.
    combatId: record.combatId ?? null,
    // type/count/groupId arrived with Minion groups. An older record never
    // snapshotted its type, so it's read off the master Adversary instead
    // (null if that master has since been deleted).
    type: record.type ?? getCache().adversaries.find((a) => a.id === record.adversaryId)?.type ?? null,
    count: record.count ?? 1,
    groupId: record.groupId ?? null,
    slain: record.slain ?? false,
    difficultyModifier: record.difficultyModifier ?? null,
    thresholdsModifier: record.thresholdsModifier ?? { major: null, severe: null },
    conditions: normalizeConditionsForRead(record.conditions),
    // experiences predates this too — records pulled in before Experience
    // snapshotting shipped have no key for it at all.
    experiences: Array.isArray(record.experiences) ? record.experiences : [],
  };
}

function normalizeConditionsForRead(conditions) {
  if (!Array.isArray(conditions)) return [];
  return conditions.map((c) => {
    if (typeof c === 'string') return { name: c, count: 1 };
    if (c && typeof c === 'object') {
      return {
        name: typeof c.name === 'string' ? c.name : '',
        count: Number.isFinite(Number(c.count)) ? Math.max(1, Math.round(Number(c.count))) : 1,
      };
    }
    return { name: '', count: 1 };
  });
}

const sessionAdversaries = makeVersionedCollection('sessionAdversaries', {
  context: sessionContext,
  validate: validateSessionAdversary,
  present: presentSessionAdversary,
  build(store, data, { campaignId, sessionId }) {
    const adversary = store.adversaries.find((a) => a.id === data.adversaryId);
    if (!adversary) throw new Error(`No adversary with id ${data.adversaryId}`);
    return {
      id: randomUUID(),
      campaignId,
      sessionId,
      combatId: data.combatId ?? null,
      adversaryId: data.adversaryId,
      label: data.label && data.label.trim() ? data.label.trim() : adversary.name,
      name: adversary.name,
      type: adversary.type ?? null,
      // A stack of identical Minions is one record with a count, not N
      // records; groupId ties stacks of different Minions into one mixed
      // group. Both are meaningless (1 / null) for every other type.
      count: data.count ?? 1,
      groupId: data.groupId ?? null,
      // Killed rather than removed: off the board, but kept on the
      // session's Slain list as a record of the fight.
      slain: Boolean(data.slain),
      tier: adversary.tier,
      difficulty: adversary.difficulty,
      thresholds: adversary.thresholds,
      hpMax: adversary.hp,
      stressMax: adversary.stress,
      attackModifier: adversary.attackModifier,
      attackDescription: adversary.attackDescription,
      attackRange: adversary.attackRange,
      attackType: adversary.attackType,
      experiences: adversary.experiences ?? [],
      hpMarked: 0,
      stressMarked: 0,
      difficultyModifier: null,
      thresholdsModifier: { major: null, severe: null },
      conditions: [],
    };
  },
});

function validateSessionEnvironment(store, data) {
  // See validateSessionAdversary's comment: combatId is optional on purpose.
  if (data.combatId && !store.combats.some((c) => (c.lineageId ?? c.id) === data.combatId)) {
    throw new Error(`No combat with id ${data.combatId}`);
  }
  clampNumber(data, 'difficulty', { min: 0 });
}

const sessionEnvironments = makeVersionedCollection('sessionEnvironments', {
  context: sessionContext,
  validate: validateSessionEnvironment,
  // combatId predates this collection's other fields too — same
  // treatment as presentSessionAdversary's, see its comment.
  present: (record) => ({ ...record, combatId: record.combatId ?? null }),
  build(store, data, { campaignId, sessionId }) {
    const environment = store.environments.find((e) => e.id === data.environmentId);
    if (!environment) throw new Error(`No environment with id ${data.environmentId}`);
    return {
      id: randomUUID(),
      campaignId,
      sessionId,
      combatId: data.combatId ?? null,
      environmentId: data.environmentId,
      label: data.label && data.label.trim() ? data.label.trim() : environment.name,
      name: environment.name,
      tier: environment.tier,
      difficulty: environment.difficulty,
      description: environment.description,
      impulses: environment.impulses,
      notes: data.notes ?? null,
    };
  },
});

// ---- Combats (Combat tabs) ----
// A GM-visible workspace inside a Session that scopes a subset of pulled-in
// Adversaries/Environments ("Boss Fight" vs "Random Encounter"), prepped
// ahead of the fight that's actually live. Versioned exactly like
// partyMembers/sessionAdversaries/sessionEnvironments — a tab created in
// session 1 is still there in session 2 unless deleted from some session on.
// Only two fields beyond identity: name (renamed via double-click) and
// order (drag-reordered) — Fear/Loot/Dice Tray stay session-wide and never
// touch this collection at all.
function validateCombat(_store, data) {
  if (data.name !== undefined) {
    // A blank name is treated as "leave it alone" (update) rather than an
    // error — undefined is what applyPatch/editVersion skip, and what
    // build() below falls back from on create — not something that needs
    // its own rejection path on top of that.
    const trimmed = String(data.name).trim();
    data.name = trimmed || undefined;
  }
  clampNumber(data, 'partySizeOverride', { min: 1 });
  for (const flag of COMBAT_FLAGS) {
    if (data[flag] !== undefined) data[flag] = Boolean(data[flag]);
  }
}

// The three Battle Points adjustments that are a GM's intent rather than
// something readable off the roster — see src/lib/battlePoints.ts.
const COMBAT_FLAGS = ['easier', 'harder', 'bonusDamage'];

// Battle Points fields arrived after Combat tabs shipped.
function presentCombat(record) {
  return {
    ...record,
    partySizeOverride: record.partySizeOverride ?? null,
    easier: record.easier ?? false,
    harder: record.harder ?? false,
    bonusDamage: record.bonusDamage ?? false,
  };
}

const combats = makeVersionedCollection('combats', {
  context: sessionContext,
  validate: validateCombat,
  present: presentCombat,
  build(store, data, { campaignId, sessionId }) {
    // order is always supplied by the caller (the renderer already knows
    // the current tab count when it creates one) rather than computed here
    // by calling back into combats.listBySession — one less self-
    // referential subtlety in a file that otherwise keeps build() boring.
    if (data.order === undefined) throw new Error('order is required');
    return {
      id: randomUUID(),
      campaignId,
      sessionId,
      name: data.name && data.name.trim() ? data.name.trim() : 'Combat',
      order: Math.round(Number(data.order)) || 0,
      partySizeOverride: data.partySizeOverride ?? null,
      easier: data.easier ?? false,
      harder: data.harder ?? false,
      bonusDamage: data.bonusDamage ?? false,
    };
  },
});

// ---- Note tabs ----
// The tabs of a Session's Notes section: a name, an order, and the text.
// Versioned exactly like Combat tabs, so they carry forward the same way —
// a tab written in session 1 is there in session 2 with its text, and
// editing it in session 2 leaves session 1's copy as it was. (The older
// per-Session note, a SESSION-kind Journal entry, is a separate thing that
// still lives in the Journal bubble; see SessionNotesPanel for how its text
// seeds a Campaign's first tab.)
function validateNoteTab(_store, data) {
  if (data.name !== undefined) {
    const trimmed = String(data.name).trim();
    data.name = trimmed || undefined;
  }
  if (data.notes !== undefined) data.notes = String(data.notes ?? '');
}

const noteTabs = makeVersionedCollection('noteTabs', {
  context: sessionContext,
  validate: validateNoteTab,
  build(_store, data, { campaignId, sessionId }) {
    if (data.order === undefined) throw new Error('order is required');
    return {
      id: randomUUID(),
      campaignId,
      sessionId,
      name: data.name && data.name.trim() ? data.name.trim() : 'Notes',
      order: Math.round(Number(data.order)) || 0,
      notes: data.notes ?? '',
    };
  },
});

// Deleting a Combat tab must also remove everything currently resolved
// under it, as of the same session being viewed — same no-undo, same-
// session-onward semantics as removing one Adversary/Environment today
// (not a blanket wipe of the tab's whole history). Mirrors
// updateSessionAndSyncNotes's "one mutate(), call the unwrapped mechanics
// directly" shape rather than nesting mutate() calls. A record still at
// combatId === null (not yet adopted into a tab, see presentSessionAdversary)
// belongs to no tab, so deleting one never deletes it.
function removeCombatAndContents(id, ctx) {
  return mutate((store) => {
    const first = store.combats.find((c) => (c.lineageId ?? c.id) === id);
    if (!first) throw new Error(`No combat with id ${id}`);
    const campaignId = first.campaignId ?? store.sessions.find((s) => s.id === first.sessionId)?.campaignId;
    const { sessionId } = editSession(store, campaignId, ctx);

    for (const a of sessionAdversaries.listBySession(sessionId)) {
      if (a.combatId === id) sessionAdversaries.applyRemove(store, a.id, { sessionId });
    }
    for (const e of sessionEnvironments.listBySession(sessionId)) {
      if (e.combatId === id) sessionEnvironments.applyRemove(store, e.id, { sessionId });
    }
    combats.applyRemove(store, id, { sessionId });
  });
}

// ---- Starting the next Session ----
// "New Session" is just createSession: everything that carries is inherited
// automatically, so it starts with the Party, the board, and Fear as the
// previous session left them.
//
// "Clone Most Recent" is functionally the same now that a Session has no
// non-carried field left to copy on top of that (the one that used to
// exist, mode, is gone) — it still exists as its own entry point since nothing
// asked for it to be removed, but it always lands at the end of the
// timeline the same way a plain new session does.

function nextSessionName(name, taken) {
  const numbered = name.match(/^(.*?)(\d+)\s*$/);
  if (numbered) {
    let n = Number(numbered[2]) + 1;
    while (taken.has(`${numbered[1]}${n}`.toLowerCase())) n++;
    return `${numbered[1]}${n}`;
  }
  let candidate = `${name} (copy)`;
  let n = 2;
  while (taken.has(candidate.toLowerCase())) candidate = `${name} (copy ${n++})`;
  return candidate;
}

function cloneSession(sourceId, { name } = {}) {
  return mutate((store) => {
    const source = store.sessions.find((s) => s.id === sourceId);
    if (!source) throw new Error(`No session with id ${sourceId}`);
    const taken = new Set(store.sessions.filter((s) => s.campaignId === source.campaignId).map((s) => s.name.toLowerCase()));
    const copy = {
      id: randomUUID(),
      campaignId: source.campaignId,
      name: name && name.trim() ? name.trim() : nextSessionName(source.name, taken),
      lootLog: [],
      lootRemoved: [],
    };
    store.sessions.push(copy);
    return presentSession(store, copy);
  });
}

// ---- Music ----
// A small library the GM files into "regions" (folders like "The Sunken
// Coast"), each with one default track: what loops when a Session picks
// that region to play from — the GM switches regions by hand whenever they
// want different music playing, there's no mode-based auto-switching. The
// built-in "Everywhere" region holds the app-wide fallback default; a user
// region can set its own. A region's campaignId is null for an
// application-wide folder (offered from every Campaign's Sessions) or set
// to scope it to just one Campaign (offered only from that Campaign's own
// Sessions) — see resolveDefaultTrack (src/lib/music.ts) and
// CampaignForm/SessionMusicPanel for how each side of that is surfaced.
// The audio files themselves live on disk under <store dir>/music (copied
// there at import time, so the library survives the originals moving) —
// only their metadata is in data.json, which is also why an Export/Import
// moves the library's structure but not the audio.

function validateRegionDefault(store, data) {
  if (data.campaignId != null && !store.campaigns.some((c) => c.id === data.campaignId)) {
    throw new Error(`No campaign with id ${data.campaignId}`);
  }
  if (data.defaultTrackId == null) return;
  const track = store.musicTracks.find((t) => t.id === data.defaultTrackId);
  if (!track) throw new Error(`No music track with id ${data.defaultTrackId}`);
  // A user region's default comes from its own tracks; the built-in
  // region's is the app-wide fallback, so any track in the library works.
  if (!data.isDefault && track.regionId !== data.id) {
    throw new Error('A region can only default to a track filed under it.');
  }
}

const musicRegions = makeCollection('musicRegions', {
  validate: validateRegionDefault,
  // Name uniqueness is per scope, not global — two different Campaigns (or
  // a Campaign and the application-wide library) can each have their own
  // "Battle Music" folder without colliding into the same record.
  scope: (r) => r.campaignId ?? null,
  present: (_store, record) => presentMusicRegion(record),
  buildRecord: (data) => ({
    id: randomUUID(),
    name: data.name,
    isDefault: false,
    campaignId: data.campaignId ?? null,
    defaultTrackId: null,
  }),
});

function updateMusicRegion(id, patch) {
  // isDefault and campaignId are never client-settable after creation, and
  // the built-in region keeps its name.
  const { isDefault: _ignored, campaignId: _scope, ...rest } = patch;
  if (id === DEFAULT_REGION_ID) delete rest.name;
  return musicRegions.update(id, rest);
}

function removeMusicRegion(id) {
  return mutate((store) => {
    if (id === DEFAULT_REGION_ID) throw new Error('The Everywhere region cannot be removed.');
    const index = store.musicRegions.findIndex((r) => r.id === id);
    if (index === -1) throw new Error(`No record with id ${id}`);
    store.musicRegions.splice(index, 1);
    // Tracks are the user's, so they're kept (moved to Everywhere), not
    // destroyed along with the folder; Sessions and Campaigns that pointed
    // at the region fall back to it too.
    for (const track of store.musicTracks) if (track.regionId === id) track.regionId = DEFAULT_REGION_ID;
    for (const session of store.sessions) if (session.regionId === id) session.regionId = null;
    for (const campaign of store.campaigns) if (campaign.defaultRegionId === id) campaign.defaultRegionId = null;
  });
}

// A read-time backfill, same spirit as the track-volume one below: a region
// stored by a version of this app before campaignId/defaultTrackId existed
// has neither key at all. campaignId simply defaults to null (application-
// wide); defaultTrackId recovers whichever of the two now-removed mode
// defaults was set (adventuring preferred — it's the "normal", non-combat
// state) rather than silently losing the GM's existing choice.
function presentMusicRegion(region) {
  if (region.campaignId !== undefined && region.defaultTrackId !== undefined) return region;
  const { adventuringTrackId, combatTrackId, ...rest } = region;
  return {
    ...rest,
    campaignId: region.campaignId ?? null,
    defaultTrackId: region.defaultTrackId ?? adventuringTrackId ?? combatTrackId ?? null,
  };
}

function listMusicRegions() {
  return musicRegions.list();
}

// A read-only fixup, same spirit as the Global-rename one above: tracks
// created before `volume` existed have no such key on disk at all (the
// store's policy is to never rewrite old records on load), so every read
// defaults it here rather than letting every consumer assume the field is
// always present. clampNumber() rounds to an integer, which would wreck a
// 0–1 fraction, hence the hand-rolled clamp instead of reusing it.
function clampVolume(value, fallback = 1) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
}

function listMusicTracks() {
  return getCache().musicTracks.map((t) => (t.volume == null ? { ...t, volume: 1 } : t));
}

// Tracks are hand-written, not makeCollection: two files can share a name
// ("Battle.mp3" from two albums), and a track is only ever created by the
// import flow, which has already copied the file (fileName) into place.
function createMusicTrack(data) {
  return mutate((store) => {
    requireName(data);
    const regionId = data.regionId ?? DEFAULT_REGION_ID;
    if (!store.musicRegions.some((r) => r.id === regionId)) throw new Error(`No music region with id ${regionId}`);
    if (!data.fileName) throw new Error('A track needs an audio file.');
    const record = {
      id: randomUUID(),
      name: data.name.trim(),
      regionId,
      fileName: data.fileName,
      sizeBytes: data.sizeBytes ?? null,
      // Tracks are innately different in loudness; a fresh import starts at
      // full (1) and the GM trims it down per-file from there, not the
      // other way round — matches how <audio>.volume itself is capped.
      volume: data.volume === undefined ? 1 : clampVolume(data.volume),
    };
    store.musicTracks.push(record);
    return record;
  });
}

function updateMusicTrack(id, patch) {
  return mutate((store) => {
    const track = store.musicTracks.find((t) => t.id === id);
    if (!track) throw new Error(`No record with id ${id}`);
    if (patch.name !== undefined) {
      if (!patch.name.trim()) throw new Error('Name is required.');
      track.name = patch.name.trim();
    }
    if (patch.volume !== undefined) {
      track.volume = clampVolume(patch.volume, track.volume ?? 1);
    }
    if (patch.regionId !== undefined && patch.regionId !== track.regionId) {
      if (!store.musicRegions.some((r) => r.id === patch.regionId)) throw new Error(`No music region with id ${patch.regionId}`);
      // A user region can't keep defaulting to a track it no longer holds.
      const from = store.musicRegions.find((r) => r.id === track.regionId);
      if (from && !from.isDefault && from.defaultTrackId === id) from.defaultTrackId = null;
      track.regionId = patch.regionId;
    }
    return track;
  });
}

// Resolves with the removed record so the caller (main.js) can delete the
// audio file that backed it.
function removeMusicTrack(id) {
  return mutate((store) => {
    const index = store.musicTracks.findIndex((t) => t.id === id);
    if (index === -1) throw new Error(`No record with id ${id}`);
    const [removed] = store.musicTracks.splice(index, 1);
    for (const region of store.musicRegions) {
      if (region.defaultTrackId === id) region.defaultTrackId = null;
    }
    return removed;
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
      throw new Error('That file is not a valid Daggerheart Brewery export.');
    }
    for (const key of COLLECTIONS) {
      if (incoming[key] !== undefined && !Array.isArray(incoming[key])) {
        throw new Error(`That file is not a valid Daggerheart Brewery export (bad "${key}").`);
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
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = null;
  writeDeadline = null;
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
  listJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  removeJournalEntry,
  listJournalEntriesByCampaign,
  listPartyMembers: partyMembers.list,
  createPartyMember: partyMembers.create,
  updatePartyMember: partyMembers.update,
  removePartyMember: partyMembers.remove,
  listPartyMembersByCampaign,
  listPartyMembersBySession,
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
  updateSession: updateSessionAndSyncNotes,
  removeSession,
  listSessionsByCampaign,
  addSessionLoot,
  removeSessionLoot,
  cloneSession,
  listSessionAdversaries: sessionAdversaries.list,
  createSessionAdversary: sessionAdversaries.create,
  updateSessionAdversary: sessionAdversaries.update,
  removeSessionAdversary: sessionAdversaries.remove,
  listSessionAdversariesBySession: sessionAdversaries.listBySession,
  listSessionEnvironments: sessionEnvironments.list,
  createSessionEnvironment: sessionEnvironments.create,
  updateSessionEnvironment: sessionEnvironments.update,
  removeSessionEnvironment: sessionEnvironments.remove,
  listSessionEnvironmentsBySession: sessionEnvironments.listBySession,
  listCombats: combats.list,
  createCombat: combats.create,
  updateCombat: combats.update,
  removeCombat: removeCombatAndContents,
  listCombatsBySession: combats.listBySession,
  listNoteTabs: noteTabs.list,
  createNoteTab: noteTabs.create,
  updateNoteTab: noteTabs.update,
  removeNoteTab: noteTabs.remove,
  listNoteTabsBySession: noteTabs.listBySession,
  listMusicRegions,
  createMusicRegion: musicRegions.create,
  updateMusicRegion,
  removeMusicRegion,
  listMusicTracks,
  createMusicTrack,
  updateMusicTrack,
  removeMusicTrack,
  getStoreDir,
  DEFAULT_REGION_ID,
  exportSnapshot,
  importSnapshot,
  flushPendingWrite,
};
