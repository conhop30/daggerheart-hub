import { useState } from 'react';
import type { SessionEnvironment, UpdateSessionEnvironmentRequest } from '../api/sessionEnvironments';
import type { FeatureSections } from '../lib/featureKinds';
import { featureRowsFor } from '../lib/featureKinds';
import { ContentCard, EditableMetaField, FeatureRowLines, MetaChip, StringLines } from './ContentCard';
import TextAreaField from './TextAreaField';
import './SessionTile.css';

interface SessionEnvironmentTileProps {
  environment: SessionEnvironment;
  /** Looked up live from the master Environment — see CombatPanel for why. */
  masterFeatures: FeatureSections | undefined;
  onChange: (patch: UpdateSessionEnvironmentRequest) => void;
  onRemove: () => void;
}

// Environments have no HP/Stress in Daggerheart, so this is lighter than
// SessionAdversaryTile — description, impulses, and a notes field are the
// only things a GM actually touches during play. (These notes travel with the
// Environment into later sessions — they live on the Environment record
// itself, unrelated to Session-level note-taking.)
export default function SessionEnvironmentTile({ environment, masterFeatures, onChange, onRemove }: SessionEnvironmentTileProps) {
  const [featuresOpen, setFeaturesOpen] = useState(true);
  const featureRows = featureRowsFor(masterFeatures);
  return (
    <ContentCard
      title={environment.label}
      onDelete={onRemove}
      deleteLabel="Remove"
      meta={
        <>
          <MetaChip label="Tier" value={environment.tier} />
          <EditableMetaField
            label="Difficulty"
            value={environment.difficulty}
            onChange={(difficulty) => onChange({ difficulty })}
          />
        </>
      }
    >
      {environment.description && <p className="content-card__description">{environment.description}</p>}
      <StringLines label="Impulses" values={environment.impulses} />
      <TextAreaField label="Notes" value={environment.notes ?? ''} onChange={(notes) => onChange({ notes })} rows={2} />
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
