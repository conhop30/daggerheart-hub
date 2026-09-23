import type { Feature } from '../api/heroClasses';

/** A record's features, keyed by section (e.g. "passives", "evolutions"). */
export type FeatureSections = Record<string, Feature[]>;

export interface FeatureKind {
  /** Key the section is stored under in `features`. */
  key: string;
  /** Singular label, printed after a feature's name on a stat sheet ("Name - Passive"). */
  label: string;
  /** Plural label, used as the section's heading in editors. */
  plural: string;
}

// The one place that defines which feature sections the game currently has.
// Adding a section for a new rules element or a homebrew system is one line
// here — every editor and stat sheet is driven from this list (plus any
// extra keys already present on a record), and the store persists whatever
// keys it's given, so nothing else needs to change. Order here is display
// order.
export const FEATURE_KINDS: FeatureKind[] = [
  { key: 'passives', label: 'Passive', plural: 'Passives' },
  { key: 'actions', label: 'Action', plural: 'Actions' },
  { key: 'reactions', label: 'Reaction', plural: 'Reactions' },
  { key: 'evolutions', label: 'Evolution', plural: 'Evolutions' },
];

function titleCaseKey(key: string): string {
  return key
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Turn a section name someone typed ("Lair Actions") into a storage key ("lair-actions"). */
export function keyForCustomSection(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** A section that isn't in FEATURE_KINDS (homebrew, or from an older/newer version) still displays. */
function customKind(key: string): FeatureKind {
  const label = titleCaseKey(key);
  return { key, label, plural: label };
}

/**
 * The sections to show for one record: every registered kind (so an editor
 * always offers them), followed by any additional keys found in the data.
 * `includeEmptyRegistered: false` is for read-only views, which should only
 * show sections that actually have features.
 */
export function kindsFor(
  features: FeatureSections | undefined,
  { includeEmptyRegistered = true }: { includeEmptyRegistered?: boolean } = {},
): FeatureKind[] {
  const data = features ?? {};
  const registered = FEATURE_KINDS.filter(
    (k) => includeEmptyRegistered || (data[k.key] ?? []).length > 0,
  );
  const known = new Set(FEATURE_KINDS.map((k) => k.key));
  const extras = Object.keys(data)
    .filter((key) => !known.has(key))
    .filter((key) => includeEmptyRegistered || (data[key] ?? []).length > 0)
    .map(customKind);
  return [...registered, ...extras];
}

export function isRegisteredKind(key: string): boolean {
  return FEATURE_KINDS.some((k) => k.key === key);
}

export interface FeatureRow extends Feature {
  /** Singular section label, e.g. "Passive" — printed after the name on a stat sheet. */
  kind: string;
}

/** Flatten a record's features into display order for read-only views, skipping empty sections. */
export function featureRowsFor(features: FeatureSections | undefined): FeatureRow[] {
  const data = features ?? {};
  return kindsFor(data, { includeEmptyRegistered: false }).flatMap((kind) =>
    (data[kind.key] ?? []).map((f) => ({ ...f, kind: kind.label })),
  );
}
