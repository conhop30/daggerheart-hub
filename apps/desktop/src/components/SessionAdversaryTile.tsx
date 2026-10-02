import { useEffect, useRef, useState } from 'react';
import type { SessionAdversary, UpdateSessionAdversaryRequest } from '../api/sessionAdversaries';
import type { FeatureSections } from '../lib/featureKinds';
import { featureRowsFor } from '../lib/featureKinds';
import { parseDamageNotation, rollDamage, damageNotationLabel, rollDie, type DamageRollResult } from '../lib/dice';
import { difficultyModifierFromConditions } from '../lib/conditions';
import { ContentCard, FeatureRowLines, MetaChip, ModifierMetaField } from './ContentCard';
import StatStepper from './StatStepper';
import ConditionsEditor from './ConditionsEditor';
import NumberInput from './NumberInput';
import './SessionTile.css';

interface SessionAdversaryTileProps {
  adversary: SessionAdversary;
  /** Looked up live from the master Adversary — see CombatPanel for why. */
  masterFeatures: FeatureSections | undefined;
  /** This tile's "#N" among other un-renamed pulls of the same Adversary in this session — null when it's the only one, or once it's been given a custom name. See CombatPanel. */
  duplicateSuffix: number | null;
  /** Lifted up to CombatPanel so clicking this Adversary in SessionCombatSidebar can close every other tile's Features and open just this one — see CombatPanel's spotlight comment. */
  featuresOpen: boolean;
  onToggleFeatures: () => void;
  /** Briefly true right after a sidebar click targets this tile — drives a fading highlight and scrolls the tile into view. Never blocks onToggleFeatures from working normally once it's passed. */
  spotlighted: boolean;
  onChange: (patch: UpdateSessionAdversaryRequest) => void;
  onRemove: () => void;
  onRoll: (label: string, total: number) => void;
}

// A live, mutable card for one Adversary pulled into a session — reads
// entirely off the props it's given and reports changes upward, so
// CombatPanel (the only thing that knows how to persist a change) is the
// only piece that has to know sessionAdversariesApi exists.
export default function SessionAdversaryTile({
  adversary,
  masterFeatures,
  duplicateSuffix,
  featuresOpen,
  onToggleFeatures,
  spotlighted,
  onChange,
  onRemove,
  onRoll,
}: SessionAdversaryTileProps) {
  const [roll, setRoll] = useState<{ notation: string; result: DamageRollResult } | null>(null);
  const [attackRoll, setAttackRoll] = useState<{ notation: string; total: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const parsedDamage = parseDamageNotation(adversary.attackDescription);
  const featureRows = featureRowsFor(masterFeatures);
  const isCustomLabel = adversary.label.trim() !== adversary.name.trim();
  const conditionDifficultyDelta = difficultyModifierFromConditions(adversary.conditions ?? []);
  // electron/store.js's presentSessionAdversary always fills this in now,
  // but the fallback stays cheap insurance against ever crashing the whole
  // Combat panel over one tile's stale shape again.
  const thresholdsModifier = adversary.thresholdsModifier ?? { major: null, severe: null };
  const hasThresholdsModifier = thresholdsModifier.major != null || thresholdsModifier.severe != null;
  const experiences = adversary.experiences ?? [];

  function handleRollDamage() {
    if (!parsedDamage) return;
    const result = rollDamage(parsedDamage);
    setRoll({ notation: damageNotationLabel(adversary.attackDescription, parsedDamage), result });
    onRoll(`${adversary.label} damage`, result.total);
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
    onRoll(`${adversary.label} attack`, total);
  }

  // Absolute value in, absolute value stored as a modifier (consistent with
  // ModifierMetaField's Difficulty field just above it — see its comment).
  function handleThresholdChange(field: 'major' | 'severe', bookValue: number | null, typed: string) {
    if (typed === '') {
      handleThresholdsModifierChange(field, null);
      return;
    }
    handleThresholdsModifierChange(field, Number(typed) - (bookValue ?? 0));
  }

  function handleThresholdsModifierChange(field: 'major' | 'severe', value: number | null) {
    onChange({ thresholdsModifier: { ...thresholdsModifier, [field]: value } });
  }

  // A sidebar click targeting this tile should bring it into view even if
  // the Combat grid has scrolled it off-screen — the highlight alone does
  // nothing for a tile you can't see.
  useEffect(() => {
    if (spotlighted) rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [spotlighted]);

  return (
    <ContentCard
      ref={rootRef}
      className={spotlighted ? 'session-tile--spotlight' : undefined}
      title={adversary.label}
      titleNode={
        <h3 className="content-card__title session-tile__title">
          <input
            type="text"
            className="session-tile__name-input"
            value={adversary.label}
            onChange={(e) => onChange({ label: e.target.value })}
            aria-label="Name"
          />
          {!isCustomLabel && duplicateSuffix != null && <span className="session-tile__name-suffix">#{duplicateSuffix}</span>}
          {isCustomLabel && <span className="session-tile__name-original">{adversary.name}</span>}
        </h3>
      }
      onDelete={onRemove}
      deleteLabel="Remove"
      meta={
        <>
          <MetaChip label="Tier" value={adversary.tier} />
          <MetaChip
            label="Atk"
            value={adversary.attackModifier != null ? (adversary.attackModifier >= 0 ? `+${adversary.attackModifier}` : adversary.attackModifier) : null}
          />
          <ModifierMetaField
            label="Difficulty"
            base={adversary.difficulty}
            modifier={adversary.difficultyModifier}
            extra={conditionDifficultyDelta}
            onChange={(difficultyModifier) => onChange({ difficultyModifier })}
          />
          <span className="content-card__chip content-card__chip--editable content-card__chip--modifier">
            <span>
              Thresholds:{' '}
              <NumberInput
                value={thresholdsModifier.major != null ? (adversary.thresholds.major ?? 0) + thresholdsModifier.major : ''}
                placeholder={String(adversary.thresholds.major ?? '')}
                onChange={(raw) => handleThresholdChange('major', adversary.thresholds.major, raw)}
                aria-label="Major Threshold"
              />{' '}
              /{' '}
              <NumberInput
                value={thresholdsModifier.severe != null ? (adversary.thresholds.severe ?? 0) + thresholdsModifier.severe : ''}
                placeholder={String(adversary.thresholds.severe ?? '')}
                onChange={(raw) => handleThresholdChange('severe', adversary.thresholds.severe, raw)}
                aria-label="Severe Threshold"
              />
            </span>
            {hasThresholdsModifier && (
              <span className="content-card__chip-note">
                Book: {adversary.thresholds.major ?? 0} / {adversary.thresholds.severe ?? 0}
              </span>
            )}
          </span>
        </>
      }
    >
      <div className="session-tile__stats">
        {adversary.hpMax != null && (
          <StatStepper
            label="HP"
            current={adversary.hpMax - adversary.hpMarked}
            max={adversary.hpMax}
            onChange={(remaining) => onChange({ hpMarked: adversary.hpMax! - remaining })}
          />
        )}
        {adversary.stressMax != null && (
          <StatStepper
            label="Stress"
            current={adversary.stressMax - adversary.stressMarked}
            max={adversary.stressMax}
            onChange={(remaining) => onChange({ stressMarked: adversary.stressMax! - remaining })}
          />
        )}
      </div>
      {(adversary.attackDescription || adversary.attackModifier != null) && (
        <p className="session-tile__attack">
          {adversary.attackDescription}
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
      {experiences.length > 0 && (
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
      <ConditionsEditor values={adversary.conditions ?? []} onChange={(conditions) => onChange({ conditions })} />
      {featureRows.length > 0 && (
        <div className="session-tile__features">
          <button
            type="button"
            className="session-tile__features-toggle"
            onClick={onToggleFeatures}
            aria-expanded={featuresOpen}
          >
            {featuresOpen ? '▾' : '▸'} Features
          </button>
          {featuresOpen && <FeatureRowLines label={null} rows={featureRows} />}
        </div>
      )}
    </ContentCard>
  );
}
