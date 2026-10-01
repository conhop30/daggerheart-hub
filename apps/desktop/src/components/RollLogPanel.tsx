import { useEffect, useRef, useState } from 'react';
import type { RollLogEntry } from '../lib/rollLog';
import './RollLogPanel.css';

interface RollLogPanelProps {
  entries: RollLogEntry[];
  onClear: () => void;
}

// A fixed, scrollable readout of every roll made in this Session — Roll
// Damage/Roll Attack (SessionAdversaryTile) and the freeform DiceTray both
// feed the same list (see SessionView, RollLogContext), oldest at the top,
// newest at the bottom, so it reads like a running table log instead of
// something that has to be re-sorted in your head. Kept alive for the
// Session's whole session (not this component's mount) — see
// RollLogContext — but still never written to disk; see lib/rollLog.
export default function RollLogPanel({ entries, onClear }: RollLogPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [entries.length, collapsed]);

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
        <div className="roll-log__list" ref={listRef}>
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
