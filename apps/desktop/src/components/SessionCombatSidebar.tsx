import type { SessionAdversary, UpdateSessionAdversaryRequest } from '../api/sessionAdversaries';
import StatStepper from './StatStepper';
import './SessionCombatSidebar.css';

interface SessionCombatSidebarProps {
  sessionAdversaries: SessionAdversary[];
  onChange: (adversary: SessionAdversary, patch: UpdateSessionAdversaryRequest) => void;
}

// A very condensed, glanceable readout of the Adversaries currently pulled
// into this Session — name, HP/Stress, and any Conditions — so running the
// full CombatPanel tiles below doesn't mean scrolling back up mid-fight to
// recall "wait, what's still Restrained?" Reads the same live list
// CombatPanel does (lifted to SessionView, see its own comment) so the two
// views of the same Session never disagree.
export default function SessionCombatSidebar({ sessionAdversaries, onChange }: SessionCombatSidebarProps) {
  if (sessionAdversaries.length === 0) return null;

  return (
    <div className="session-combat-sidebar">
      <p className="session-combat-sidebar__label">Adversaries</p>
      {sessionAdversaries.map((adversary) => (
        <div className="session-combat-sidebar__combatant" key={adversary.id}>
          <span className="session-combat-sidebar__name">{adversary.label}</span>
          {adversary.hpMax != null && (
            <StatStepper
              label="HP"
              current={adversary.hpMarked}
              max={adversary.hpMax}
              onChange={(hpMarked) => onChange(adversary, { hpMarked })}
            />
          )}
          {adversary.stressMax != null && (
            <StatStepper
              label="Stress"
              current={adversary.stressMarked}
              max={adversary.stressMax}
              onChange={(stressMarked) => onChange(adversary, { stressMarked })}
            />
          )}
          {adversary.conditions.length > 0 && (
            <p className="session-combat-sidebar__conditions">{adversary.conditions.join(', ')}</p>
          )}
        </div>
      ))}
    </div>
  );
}
