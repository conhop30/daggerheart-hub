import type { ReactNode } from 'react';
import './StatRail.css';

export interface StatRailItem {
  label: string;
  value: ReactNode;
}

// The corebook's own stat blocks present Tier/Difficulty/HP/Stress/
// Thresholds as one boxed line under the name, not as separate rounded
// chips. This is that: a single bordered band, cells divided by hairlines,
// label-over-value — used at both gallery-tile scale (compact) and full
// spotlight scale.
export function StatRail({ items, compact }: { items: StatRailItem[]; compact?: boolean }) {
  const visible = items.filter((i) => i.value !== null && i.value !== undefined && i.value !== '');
  if (visible.length === 0) return null;
  return (
    <div className={`stat-rail${compact ? ' stat-rail--compact' : ''}`}>
      {visible.map((item, i) => (
        <div className="stat-rail__cell" key={i}>
          <span className="stat-rail__label">{item.label}</span>
          <span className="stat-rail__value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
