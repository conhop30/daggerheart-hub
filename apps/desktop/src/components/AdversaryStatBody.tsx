import { useState, type ReactNode } from 'react';
import type { SessionAdversary, UpdateSessionAdversaryRequest } from '../api/sessionAdversaries';
import type { Thresholds } from './ThresholdsInput';
import type { FeatureSections } from '../lib/featureKinds';
import { featureRowsFor } from '../lib/featureKinds';
import { parseDamageNotation, rollDamage, damageNotationLabel, rollDie, type DamageRollResult } from '../lib/dice';
import { FeatureRowLines } from './ContentCard';
import NumberInput from './NumberInput';

// The parts of a pulled-in Adversary's stat block that are the same for
// every copy of it — its attack and the rolls off it, Experiences, and
// Features. A single tile (SessionAdversaryTile) and a stack of identical
// ones (SessionAdversaryStackTile) both end with exactly this, which is the
// whole reason stacking saves room: it's printed once however many there are.

interface AdversaryStatBodyProps {
  adversary: SessionAdversary;
  /** Looked up live from the master Adversary — see CombatPanel for why. */
  masterFeatures: FeatureSections | undefined;
  /** What a roll is logged against: one Adversary's own name, or the shared name of a stack. */
  rollLabel: string;
  bodyOpen: boolean;
  featuresOpen: boolean;
  onToggleFeatures: () => void;
  onRoll: (label: string, total: number) => void;
  /** Rendered between Experiences and Features — a single tile puts its Conditions here. */
  beforeFeatures?: ReactNode;
}

export default function AdversaryStatBody({
  adversary,
  masterFeatures,
  rollLabel,
  bodyOpen,
  featuresOpen,
  onToggleFeatures,
  onRoll,
  beforeFeatures,
}: AdversaryStatBodyProps) {
  const [roll, setRoll] = useState<{ notation: string; result: DamageRollResult } | null>(null);
  const [attackRoll, setAttackRoll] = useState<{ notation: string; total: number } | null>(null);
  const parsedDamage = parseDamageNotation(adversary.attackDescription);
  const featureRows = featureRowsFor(masterFeatures);
  const experiences = adversary.experiences ?? [];

  function handleRollDamage() {
    if (!parsedDamage) return;
    const result = rollDamage(parsedDamage);
    setRoll({ notation: damageNotationLabel(adversary.attackDescription, parsedDamage), result });
    onRoll(`${rollLabel} damage`, result.total);
  }

  // The adversary's own to-hit roll (d20 + its book attack modifier, rolled
  // against the target's Evasion) — separate from Roll Damage above, which
  // only ever fires once a hit's already been decided at the table.
  function handleRollAttack() {
    if (adversary.attackModifier == null) return;
    const d20 = rollDie(20);
    const total = d20 + adversary.attackModifier;
    const modifierLabel = adversary.attackModifier > 0 ? `+${adversary.attackModifier}` : adversary.attackModifier < 0 ? `${adversary.attackModifier}` : '';
    setAttackRoll({ notation: `d20${modifierLabel} (rolled ${d20})`, total });
    onRoll(`${rollLabel} attack`, total);
  }

  return (
    <>
      {(adversary.attackDescription || adversary.attackModifier != null) && (
        <p className="session-tile__attack">
          {bodyOpen && adversary.attackDescription}
          {adversary.attackModifier != null && (
            <button type="button" className="session-tile__roll-attack" onClick={handleRollAttack}>
              Roll Attack
            </button>
          )}
          {parsedDamage && (
            <button type="button" className="session-tile__roll-damage" onClick={handleRollDamage}>
              Roll Damage
            </button>
          )}
        </p>
      )}
      {/* Shown even on a collapsed tile: a roll you can't see is no roll. */}
      {attackRoll && (
        <p className="session-tile__roll-result">
          {attackRoll.notation} = <strong>{attackRoll.total}</strong>
        </p>
      )}
      {roll && (
        <p className="session-tile__roll-result">
          {roll.notation} = <strong>{roll.result.total}</strong>
        </p>
      )}
      {bodyOpen && experiences.length > 0 && (
        <p className="session-tile__experiences">
          <strong>Experience:</strong>{' '}
          {experiences.map((e, i) => (
            <span key={i}>
              {i > 0 && ', '}
              {e.name} {e.modifier >= 0 ? `+${e.modifier}` : e.modifier}
            </span>
          ))}
        </p>
      )}
      {bodyOpen && beforeFeatures}
      {bodyOpen && featureRows.length > 0 && (
        <div className="session-tile__features">
          <button type="button" className="session-tile__features-toggle" onClick={onToggleFeatures} aria-expanded={featuresOpen}>
            {featuresOpen ? '▾' : '▸'} Features
          </button>
          {featuresOpen && <FeatureRowLines label={null} rows={featureRows} />}
        </div>
      )}
    </>
  );
}

// One Adversary's own Thresholds, editable. Absolute value in, stored as a
// modifier on top of the book value (consistent with ModifierMetaField's
// Difficulty field, which sits beside this everywhere it's used) — so an
// empty box means "as printed" and the book value shows as the placeholder.
export function ThresholdsModifierChip({
  adversary,
  onChange,
}: {
  adversary: SessionAdversary;
  onChange: (patch: UpdateSessionAdversaryRequest) => void;
}) {
  // electron/store.js's presentSessionAdversary always fills this in now,
  // but the fallback stays cheap insurance against ever crashing the whole
  // Combat panel over one tile's stale shape again.
  const modifier: Thresholds = adversary.thresholdsModifier ?? { major: null, severe: null };
  const hasModifier = modifier.major != null || modifier.severe != null;

  function change(field: 'major' | 'severe', bookValue: number | null, typed: string) {
    const value = typed === '' ? null : Number(typed) - (bookValue ?? 0);
    onChange({ thresholdsModifier: { ...modifier, [field]: value } });
  }

  return (
    <span className="content-card__chip content-card__chip--editable content-card__chip--modifier">
      <span>
        Thresholds:{' '}
        <NumberInput
          value={modifier.major != null ? (adversary.thresholds.major ?? 0) + modifier.major : ''}
          placeholder={String(adversary.thresholds.major ?? '')}
          onChange={(raw) => change('major', adversary.thresholds.major, raw)}
          aria-label="Major Threshold"
        />{' '}
        /{' '}
        <NumberInput
          value={modifier.severe != null ? (adversary.thresholds.severe ?? 0) + modifier.severe : ''}
          placeholder={String(adversary.thresholds.severe ?? '')}
          onChange={(raw) => change('severe', adversary.thresholds.severe, raw)}
          aria-label="Severe Threshold"
        />
      </span>
      {hasModifier && (
        <span className="content-card__chip-note">
          Book: {adversary.thresholds.major ?? 0} / {adversary.thresholds.severe ?? 0}
        </span>
      )}
    </span>
  );
}
