import type { SessionEnvironment } from '../api/sessionEnvironments';
import { ContentCard, MetaChip, StringLines } from './ContentCard';
import './SessionTile.css';

interface SessionEnvironmentTileProps {
  environment: SessionEnvironment;
  onChange: (patch: { notes?: string }) => void;
  onRemove: () => void;
}

// Environments have no HP/Stress in Daggerheart, so this is lighter than
// SessionAdversaryTile — description, impulses, and a session-scoped notes
// field are the only things a GM actually touches during play.
export default function SessionEnvironmentTile({ environment, onChange, onRemove }: SessionEnvironmentTileProps) {
  return (
    <ContentCard
      title={environment.label}
      onDelete={onRemove}
      deleteLabel="Push Out"
      meta={
        <>
          <MetaChip label="Tier" value={environment.tier} />
          <MetaChip label="Difficulty" value={environment.difficulty} />
        </>
      }
    >
      {environment.description && <p className="content-card__description">{environment.description}</p>}
      <StringLines label="Impulses" values={environment.impulses} />
      <label className="session-tile__notes-label">
        Session Notes
        <textarea
          value={environment.notes ?? ''}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={2}
        />
      </label>
    </ContentCard>
  );
}
