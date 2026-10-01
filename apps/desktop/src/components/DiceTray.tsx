import { useState } from 'react';
import { DIE_SIZES, rollDiceQueue, formatDiceQueueLabel, type DiceTrayRollResult } from '../lib/dice';
import { DIE_PATHS } from '../lib/diceShapes';
import './DiceTray.css';

// A d100 has no solid of its own, so it's a plain stroked circle; every
// other size gets its wireframe outline from DIE_PATHS.
function DieIcon({ sides }: { sides: number }) {
  return (
    <svg className="dice-tray__die-icon" viewBox="0 0 100 100" aria-hidden="true">
      {sides === 100 ? (
        <circle cx="50" cy="50" r="42" />
      ) : (
        <path d={DIE_PATHS[sides]} />
      )}
    </svg>
  );
}

interface DiceTrayProps {
  onRoll: (label: string, total: number) => void;
}

function dieLabel(sides: number): string {
  return `d${sides}`;
}

// A floating, freeform dice roller for the table — d4 through d100, click to
// queue, click Roll to resolve every queued die into one total. Deliberately
// separate from a stat block's own "Roll Damage" button (SessionAdversaryTile):
// this is for anything NOT already described by a stat block's own notation
// (attack rolls, saves, anything homebrew).
export default function DiceTray({ onRoll }: DiceTrayProps) {
  const [queue, setQueue] = useState<Record<number, number>>({});
  const [roll, setRoll] = useState<{ notation: string; result: DiceTrayRollResult } | null>(null);

  const hasQueued = DIE_SIZES.some((sides) => (queue[sides] ?? 0) > 0);

  function add(sides: number) {
    setRoll(null);
    setQueue((prev) => ({ ...prev, [sides]: (prev[sides] ?? 0) + 1 }));
  }

  function remove(sides: number, e: React.MouseEvent) {
    e.preventDefault();
    setQueue((prev) => ({ ...prev, [sides]: Math.max(0, (prev[sides] ?? 0) - 1) }));
  }

  function rollQueue() {
    const entries = DIE_SIZES.filter((sides) => (queue[sides] ?? 0) > 0).map((sides) => ({
      sides,
      count: queue[sides] ?? 0,
    }));
    if (entries.length === 0) return;
    const result = rollDiceQueue(entries);
    const notation = entries.map((e) => `${e.count}d${e.sides}`).join(' + ');
    setRoll({ notation, result });
    setQueue({});
    onRoll(`Dice roller ${formatDiceQueueLabel(entries)}`, result.total);
  }

  return (
    <div className="dice-tray">
      <div className="dice-tray__row">
        {DIE_SIZES.map((sides) => {
          const count = queue[sides] ?? 0;
          return (
            <button
              key={sides}
              type="button"
              className={`dice-tray__die${count > 0 ? ' queued' : ''}`}
              onClick={() => add(sides)}
              onContextMenu={(e) => remove(sides, e)}
              aria-label={`${dieLabel(sides)}${count > 0 ? `, ${count} queued — right-click to remove one` : ''}`}
            >
              <DieIcon sides={sides} />
              <span className="dice-tray__die-label">{dieLabel(sides)}</span>
              {count > 0 && <span className="dice-tray__badge">{count}</span>}
            </button>
          );
        })}
        {hasQueued && (
          <button type="button" className="dice-tray__roll" onClick={rollQueue}>
            Roll
          </button>
        )}
      </div>
      {roll && (
        <div className="dice-tray__result">
          <span className="dice-tray__result-notation">{roll.notation}</span>
          <span className="dice-tray__result-equals">=</span>
          <span className="dice-tray__result-total">{roll.result.total}</span>
          <button type="button" className="dice-tray__dismiss" onClick={() => setRoll(null)} aria-label="Clear result">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
