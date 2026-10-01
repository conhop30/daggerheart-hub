import type { SessionAdversary, UpdateSessionAdversaryRequest } from '../api/sessionAdversaries';
import StatStepper from './StatStepper';
import './SessionCombatSidebar.css';

interface SessionCombatSidebarProps {
  sessionAdversaries: SessionAdversary[];
  onChange: (adversary: SessionAdversary, patch: UpdateSessionAdversaryRequest) => void;
  /** Clicking a row here targets that Adversary's full tile in CombatPanel below — see SessionView, which owns the resulting spotlight signal. */
  onSelect: (adversaryId: string) => void;
  /** Removes the Adversary from this Session entirely, without having to scroll down to its full CombatPanel tile first. */
  onRemove: (adversary: SessionAdversary) => void;
}

// A very condensed, glanceable readout of the Adversaries currently pulled
// into this Session — name, HP/Stress, and any Conditions — so running the
// full CombatPanel tiles below doesn't mean scrolling back up mid-fight to
// recall "wait, what's still Restrained?" Reads the same live list
// CombatPanel does (lifted to SessionView, see its own comment) so the two
// views of the same Session never disagree.
export default function SessionCombatSidebar({ sessionAdversaries, onChange, onSelect, onRemove }: SessionCombatSidebarProps) {
  if (sessionAdversaries.length === 0) return null;

  return (
    <div className="session-combat-sidebar">
      <p className="session-combat-sidebar__label">Adversaries</p>
      {sessionAdversaries.map((adversary) => (
        <div
          className="session-combat-sidebar__combatant"
          key={adversary.id}
          role="button"
          tabIndex={0}
          onClick={(e) => {
            // A click landing on a stepper's own +/-/value control should
            // only adjust HP/Stress, not also jump to the full tile — but
            // everywhere else on the row (including the empty space around
            // a stepper) is fair game, unlike a wrapper that swallows the
            // stepper's whole bounding box.
            if ((e.target as HTMLElement).closest('.stat-stepper')) return;
            onSelect(adversary.id);
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            onSelect(adversary.id);
          }}
        >
          <span className="session-combat-sidebar__name">{adversary.label}</span>
          <button
            type="button"
            className="session-combat-sidebar__remove"
            aria-label={`Remove ${adversary.label}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(adversary);
            }}
          >
            &times;
          </button>
          {adversary.hpMax != null && (
            <StatStepper
              label="HP"
              current={adversary.hpMax - adversary.hpMarked}
              max={adversary.hpMax}
              onChange={(remaining) => onChange(adversary, { hpMarked: adversary.hpMax! - remaining })}
            />
          )}
          {adversary.stressMax != null && (
            <StatStepper
              label="Stress"
              current={adversary.stressMax - adversary.stressMarked}
              max={adversary.stressMax}
              onChange={(remaining) => onChange(adversary, { stressMarked: adversary.stressMax! - remaining })}
            />
          )}
          {adversary.conditions.length > 0 && (
            <p className="session-combat-sidebar__conditions">
              {adversary.conditions.map((c) => (c.count > 1 ? `${c.name} ×${c.count}` : c.name)).join(', ')}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
