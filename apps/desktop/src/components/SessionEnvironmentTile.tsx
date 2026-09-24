import type { SessionEnvironment } from '../api/sessionEnvironments';
import { ContentCard, MetaChip, StringLines } from './ContentCard';
import './SessionTile.css';

interface SessionEnvironmentTileProps {
  environment: SessionEnvironment;
  onChange: (patch: { notes?: string }) => void;
  onRemove: () => void;
}

// Environments have no HP/Stress in Daggerheart, so this is lighter than
// SessionAdversaryTile — description, impulses, and a notes field are the
// only things a GM actually touches during play. (These notes travel with the
// Environment into later sessions; they're not the per-session "Session Notes".)
export default function SessionEnvironmentTile({ environment, onChange, onRemove }: SessionEnvironmentTileProps) {
  return (
    <ContentCard
      title={environment.label}
      onDelete={onRemove}
      deleteLabel="Push Out"
      meta={
        <>
          {environment.carried && <MetaChip label="Status" value="Carried over" />}
          <MetaChip label="Tier" value={environment.tier} />
          <MetaChip label="Difficulty" value={environment.difficulty} />
        </>
      }
    >
      {environment.description && <p className="content-card__description">{environment.description}</p>}
      <StringLines label="Impulses" values={environment.impulses} />
      <label className="session-tile__notes-label">
        Notes
        <textarea
          value={environment.notes ?? ''}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={2}
        />
      </label>
    </ContentCard>
  );
}
