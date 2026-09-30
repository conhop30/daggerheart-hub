import { useState } from 'react';
import type { SessionAdversary, UpdateSessionAdversaryRequest } from '../api/sessionAdversaries';
import type { Thresholds } from './ThresholdsInput';
import type { FeatureSections } from '../lib/featureKinds';
import { featureRowsFor } from '../lib/featureKinds';
import { parseDamageNotation, rollDamage, type DamageRollResult } from '../lib/dice';
import { ContentCard, EditableMetaField, FeatureRowLines, MetaChip } from './ContentCard';
import StatStepper from './StatStepper';
import StringListEditor from './StringListEditor';
import './SessionTile.css';

interface SessionAdversaryTileProps {
  adversary: SessionAdversary;
  /** Looked up live from the master Adversary — see CombatPanel for why. */
  masterFeatures: FeatureSections | undefined;
  onChange: (patch: UpdateSessionAdversaryRequest) => void;
  onRemove: () => void;
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

  function handleThresholdChange(field: keyof Thresholds, value: number | null) {
    onChange({ thresholds: { ...adversary.thresholds, [field]: value } });
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
          <EditableMetaField
            label="Difficulty"
            value={adversary.difficulty}
            onChange={(difficulty) => onChange({ difficulty })}
          />
          <span className="content-card__chip content-card__chip--editable">
            Thresholds:{' '}
            <input
              type="number"
              value={adversary.thresholds.major ?? ''}
              onChange={(e) => handleThresholdChange('major', e.target.value === '' ? null : Number(e.target.value))}
              aria-label="Major Threshold"
            />{' '}
            /{' '}
            <input
              type="number"
              value={adversary.thresholds.severe ?? ''}
              onChange={(e) => handleThresholdChange('severe', e.target.value === '' ? null : Number(e.target.value))}
              aria-label="Severe Threshold"
            />
          </span>
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
      {rollResult && <p className="session-tile__roll-result roll-result">{rollResult.total}</p>}
      {adversary.experiences.length > 0 && (
        <p className="session-tile__experiences">
          <strong>Experience:</strong>{' '}
          {adversary.experiences.map((e, i) => (
            <span key={i}>
              {i > 0 && ', '}
              {e.name} {e.modifier >= 0 ? `+${e.modifier}` : e.modifier}
            </span>
          ))}
        </p>
      )}
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
