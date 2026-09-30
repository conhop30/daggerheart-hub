import { useState } from 'react';
import type { SessionAdversary } from '../api/sessionAdversaries';
import type { FeatureSections } from '../lib/featureKinds';
import { featureRowsFor } from '../lib/featureKinds';
import { parseDamageNotation, rollDamage, type DamageRollResult } from '../lib/dice';
import { ContentCard, FeatureRowLines, MetaChip } from './ContentCard';
import StatStepper from './StatStepper';
import StringListEditor from './StringListEditor';
import './SessionTile.css';

interface SessionAdversaryTileProps {
  adversary: SessionAdversary;
  /** Looked up live from the master Adversary — see CombatPanel for why. */
  masterFeatures: FeatureSections | undefined;
  onChange: (patch: { hpMarked?: number; stressMarked?: number; conditions?: string[] }) => void;
  onRemove: () => void;
}

function formatDamageRoll(result: DamageRollResult): string {
  if (result.rolls.length === 0) return `${result.total}`;
  const sign = result.modifier > 0 ? ' + ' : result.modifier < 0 ? ' − ' : '';
  const modifierText = result.modifier !== 0 ? `${sign}${Math.abs(result.modifier)}` : '';
  return `${result.rolls.join(' + ')}${modifierText} = ${result.total}`;
}

// A live, mutable card for one Adversary pulled into a session — reads
// entirely off the props it's given and reports changes upward, so
// CombatPanel (the only thing that knows how to persist a change) is the
// only piece that has to know sessionAdversariesApi exists.
export default function SessionAdversaryTile({ adversary, masterFeatures, onChange, onRemove }: SessionAdversaryTileProps) {
  const [rollResult, setRollResult] = useState<DamageRollResult | null>(null);
  const [featuresOpen, setFeaturesOpen] = useState(true);
  const parsedDamage = parseDamageNotation(adversary.attackDescription);
  const featureRows = featureRowsFor(masterFeatures);

  function handleRollDamage() {
    if (!parsedDamage) return;
    setRollResult(rollDamage(parsedDamage));
  }

  return (
    <ContentCard
      title={adversary.label}
      onDelete={onRemove}
      deleteLabel="Push Out"
      meta={
        <>
          {adversary.carried && <MetaChip label="Status" value="Carried over" />}
          <MetaChip label="Tier" value={adversary.tier} />
          <MetaChip label="Difficulty" value={adversary.difficulty} />
          <MetaChip
            label="Thresholds"
            value={
              adversary.thresholds.major != null || adversary.thresholds.severe != null
                ? `${adversary.thresholds.major ?? '—'} / ${adversary.thresholds.severe ?? '—'}`
                : null
            }
          />
        </>
      }
    >
      <div className="session-tile__stats">
        {adversary.hpMax != null && (
          <StatStepper
            label="HP Marked"
            current={adversary.hpMarked}
            max={adversary.hpMax}
            onChange={(hpMarked) => onChange({ hpMarked })}
          />
        )}
        {adversary.stressMax != null && (
          <StatStepper
            label="Stress Marked"
            current={adversary.stressMarked}
            max={adversary.stressMax}
            onChange={(stressMarked) => onChange({ stressMarked })}
          />
        )}
      </div>
      {adversary.attackDescription && (
        <p className="session-tile__attack">
          {adversary.attackDescription}
          {parsedDamage && (
            <button type="button" className="session-tile__roll-damage" onClick={handleRollDamage}>
              Roll Damage
            </button>
          )}
        </p>
      )}
      {rollResult && <p className="session-tile__roll-result">{formatDamageRoll(rollResult)}</p>}
      <StringListEditor
        label="Conditions"
        placeholder="e.g. Restrained"
        values={adversary.conditions}
        onChange={(conditions) => onChange({ conditions })}
      />
      {featureRows.length > 0 && (
        <div className="session-tile__features">
          <button
            type="button"
            className="session-tile__features-toggle"
            onClick={() => setFeaturesOpen((open) => !open)}
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
