import { useState } from 'react';
import type { RollLogEntry } from '../lib/rollLog';
import './RollLogPanel.css';

interface RollLogPanelProps {
  entries: RollLogEntry[];
  onClear: () => void;
}

// A fixed, scrollable readout of every roll made in this Session — Roll
// Damage (SessionAdversaryTile) and the freeform DiceTray both feed the same
// list (see SessionView), newest first, so "wait, what did I just roll"
// never means scrolling back up mid-fight. Not persisted — see lib/rollLog.
export default function RollLogPanel({ entries, onClear }: RollLogPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  if (entries.length === 0) return null;

  return (
    <div className="roll-log">
      <div className="roll-log__header">
        <button type="button" className="roll-log__toggle" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed}>
          {collapsed ? '▸' : '▾'} Roll Log ({entries.length})
        </button>
        {!collapsed && (
          <button type="button" className="roll-log__clear" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="roll-log__list">
          {entries.map((entry) => (
            <div className="roll-log__entry" key={entry.id}>
              <span className="roll-log__label" title={entry.label}>
                {entry.label}
              </span>
              <span className="roll-log__equals">=</span>
              <span className="roll-log__total">{entry.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
