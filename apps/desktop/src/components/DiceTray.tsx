import { useState } from 'react';
import { DIE_SIZES, rollDiceQueue, type DiceTrayRollResult } from '../lib/dice';
import './DiceTray.css';

function dieLabel(sides: number): string {
  return `d${sides}`;
}

// A floating, freeform dice roller for the table — d4 through d100, click to
// queue, click Roll to resolve every queued die into one total. Deliberately
// separate from a stat block's own "Roll Damage" button (SessionAdversaryTile):
// this is for anything NOT already described by a stat block's own notation
// (attack rolls, saves, anything homebrew).
export default function DiceTray() {
  const [queue, setQueue] = useState<Record<number, number>>({});
  const [result, setResult] = useState<DiceTrayRollResult | null>(null);

  const hasQueued = DIE_SIZES.some((sides) => (queue[sides] ?? 0) > 0);

  function add(sides: number) {
    setResult(null);
    setQueue((prev) => ({ ...prev, [sides]: (prev[sides] ?? 0) + 1 }));
  }

  function remove(sides: number, e: React.MouseEvent) {
    e.preventDefault();
    setQueue((prev) => ({ ...prev, [sides]: Math.max(0, (prev[sides] ?? 0) - 1) }));
  }

  function roll() {
    const entries = DIE_SIZES.filter((sides) => (queue[sides] ?? 0) > 0).map((sides) => ({
      sides,
      count: queue[sides] ?? 0,
    }));
    if (entries.length === 0) return;
    setResult(rollDiceQueue(entries));
    setQueue({});
  }

  return (
    <div className="dice-tray">
      {result && (
        <div className="dice-tray__result">
          <span className="roll-result">{result.total}</span>
          <button type="button" className="dice-tray__dismiss" onClick={() => setResult(null)} aria-label="Clear result">
            ×
          </button>
        </div>
      )}
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
              {dieLabel(sides)}
              {count > 0 && <span className="dice-tray__badge">×{count}</span>}
            </button>
          );
        })}
        {hasQueued && (
          <button type="button" className="dice-tray__roll" onClick={roll}>
            Roll
          </button>
        )}
      </div>
    </div>
  );
}
