import type { SessionAdversary } from '../api/sessionAdversaries';
import { ContentCard, MetaChip } from './ContentCard';
import StatStepper from './StatStepper';
import StringListEditor from './StringListEditor';
import './SessionTile.css';

interface SessionAdversaryTileProps {
  adversary: SessionAdversary;
  onChange: (patch: { hpMarked?: number; stressMarked?: number; conditions?: string[] }) => void;
  onRemove: () => void;
}

// A live, mutable card for one Adversary pulled into a session — reads
// entirely off the props it's given and reports changes upward, so
// CombatPanel (the only thing that knows how to persist a change) is the
// only piece that has to know sessionAdversariesApi exists.
export default function SessionAdversaryTile({ adversary, onChange, onRemove }: SessionAdversaryTileProps) {
  return (
    <ContentCard
      title={adversary.label}
      onDelete={onRemove}
      deleteLabel="Push Out"
      meta={
        <>
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
      {adversary.attackDescription && <p className="session-tile__attack">{adversary.attackDescription}</p>}
      <StringListEditor
        label="Conditions"
        placeholder="e.g. Restrained"
        values={adversary.conditions}
        onChange={(conditions) => onChange({ conditions })}
      />
    </ContentCard>
  );
}
