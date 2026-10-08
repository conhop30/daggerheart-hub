import type { SessionAdversary, UpdateSessionAdversaryRequest } from '../api/sessionAdversaries';
import { isMinion, toBoardCells } from '../lib/minionGroups';
import StatStepper from './StatStepper';
import './SessionCombatSidebar.css';

interface SessionCombatSidebarProps {
  /** Still in the fight. */
  sessionAdversaries: SessionAdversary[];
  /** Killed this fight — listed by name only, below the live ones, as a record of what's been dealt with. */
  slain: SessionAdversary[];
  onChange: (adversary: SessionAdversary, patch: UpdateSessionAdversaryRequest) => void;
  /** Clicking a row here targets that Adversary's full tile in CombatPanel below — see SessionView, which owns the resulting spotlight signal. */
  onSelect: (adversaryId: string) => void;
  /** Removes the Adversary from this Session entirely, without having to scroll down to its full CombatPanel tile first. */
  onRemove: (adversary: SessionAdversary) => void;
  /** Add or defeat Minions in a stack — a Minion row has this in place of an HP stepper. */
  onMinionCount: (adversary: SessionAdversary, delta: number) => void;
}

interface SlainRow {
  name: string;
  /** How many this row stands for (a slain Minion record can itself be several). */
  total: number;
  /** The records behind the row, oldest first. */
  members: SessionAdversary[];
}

// The Slain list is a tally, not a roster: five dead Goblins are one line,
// "Goblin x5", not five. Only ones still under their book name are gathered
// this way — one the GM bothered to rename ("Grak the Bold") was somebody,
// and keeps a line of its own.
function slainRows(slain: SessionAdversary[]): SlainRow[] {
  const rows: SlainRow[] = [];
  const byAdversary = new Map<string, SlainRow>();
  for (const adversary of slain) {
    const renamed = adversary.label.trim() !== adversary.name.trim();
    const existing = renamed ? undefined : byAdversary.get(adversary.adversaryId);
    if (existing) {
      existing.total += adversary.count;
      existing.members.push(adversary);
      continue;
    }
    const row = { name: adversary.label, total: adversary.count, members: [adversary] };
    rows.push(row);
    if (!renamed) byAdversary.set(adversary.adversaryId, row);
  }
  return rows;
}

// A very condensed, glanceable readout of the Adversaries currently pulled
// into this Session — name, HP/Stress, and any Conditions — so running the
// full CombatPanel tiles below doesn't mean scrolling back up mid-fight to
// recall "wait, what's still Restrained?" Reads the same live list
// CombatPanel does (lifted to SessionView, see its own comment) so the two
// views of the same Session never disagree.
export default function SessionCombatSidebar({
  sessionAdversaries,
  slain,
  onChange,
  onSelect,
  onRemove,
  onMinionCount,
}: SessionCombatSidebarProps) {
  if (sessionAdversaries.length === 0 && slain.length === 0) return null;

  return (
    <div className="session-combat-sidebar">
      {sessionAdversaries.length > 0 && <p className="session-combat-sidebar__label">Adversaries</p>}
      {toBoardCells(sessionAdversaries).flatMap((cell) => cell.stacks.map((adversary) => (
        <div
          // Stacks of one mixed group read as a bracketed run, same order
          // as the board.
          className={`session-combat-sidebar__combatant${cell.groupId ? ' session-combat-sidebar__combatant--grouped' : ''}`}
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
          <span className="session-combat-sidebar__name">
            {adversary.label}
            {isMinion(adversary) && <span className="session-combat-sidebar__count"> ×{adversary.count}</span>}
          </span>
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
          {isMinion(adversary) && (
            <div className="stat-stepper">
              <span className="stat-stepper__label">Minions</span>
              <div className="stat-stepper__controls">
                <button
                  type="button"
                  className="stat-stepper__button"
                  onClick={() => onMinionCount(adversary, -1)}
                  aria-label={`Defeat one ${adversary.label}`}
                >
                  &minus;
                </button>
                <span className="stat-stepper__value">{adversary.count}</span>
                <button
                  type="button"
                  className="stat-stepper__button"
                  onClick={() => onMinionCount(adversary, 1)}
                  aria-label={`Add one ${adversary.label}`}
                >
                  +
                </button>
              </div>
            </div>
          )}
          {!isMinion(adversary) && adversary.hpMax != null && (
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
      )))}
      {slain.length > 0 && (
        <div className="session-combat-sidebar__slain">
          <p className="session-combat-sidebar__label">Slain</p>
          {slainRows(slain).map((row) => {
            // Restore and remove take one off the pile at a time: the most
            // recently slain, which is the one a GM is likeliest to be
            // correcting.
            const latest = row.members[row.members.length - 1];
            return (
              <div className="session-combat-sidebar__slain-row" key={row.members[0].id}>
                <span className="session-combat-sidebar__slain-name">{row.name}</span>
                {row.total > 1 && <span className="session-combat-sidebar__slain-count">×{row.total}</span>}
                <button
                  type="button"
                  className="session-combat-sidebar__restore"
                  onClick={() => onChange(latest, { slain: false })}
                  aria-label={`Restore ${row.name}`}
                  title={row.members.length > 1 ? 'Put one back on the board' : 'Put back on the board'}
                >
                  Restore
                </button>
                <button
                  type="button"
                  className="session-combat-sidebar__slain-remove"
                  onClick={() => onRemove(latest)}
                  aria-label={`Remove ${row.name} from Slain`}
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
