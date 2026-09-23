import { forwardRef } from 'react';
import type { Environment } from '../api/environments';
import { titleCaseEnum } from '../lib/format';
import './StatSheet.css';

// Same book-accurate treatment as AdversarySheet, adapted to an
// Environment's simpler stat line (Difficulty only — no HP/Stress/
// Thresholds/ATK) and its Impulses/Potential Adversaries lines in place of
// Motives & Tactics/Experience.
const EnvironmentSheet = forwardRef<HTMLDivElement, { e: Environment }>(function EnvironmentSheet({ e }, ref) {
  const featureRows = [
    ...e.features.passives.map((f) => ({ ...f, kind: 'Passive' })),
    ...e.features.actions.map((f) => ({ ...f, kind: 'Action' })),
    ...e.features.reactions.map((f) => ({ ...f, kind: 'Reaction' })),
  ];

  return (
    <div className="stat-sheet" ref={ref}>
      <h3 className="stat-sheet__name">{e.name}</h3>
      <p className="stat-sheet__subtitle">
        {e.tier != null ? `Tier ${e.tier}` : null}
        {e.category ? ` ${titleCaseEnum(e.category)}` : ''}
      </p>
      {e.description && <p className="stat-sheet__description">{e.description}</p>}
      {e.impulses.length > 0 && (
        <p className="stat-sheet__line">
          <strong>Impulses:</strong> {e.impulses.join(', ')}
        </p>
      )}
      <hr className="stat-sheet__rule" />
      <div className="stat-sheet__box">
        <p className="stat-sheet__box-line">
          <strong>Difficulty:</strong> {e.difficulty ?? '—'}
        </p>
      </div>
      {e.potentialAdversaries.length > 0 && (
        <p className="stat-sheet__line">
          <strong>Potential Adversaries:</strong> {e.potentialAdversaries.join(', ')}
        </p>
      )}
      {featureRows.length > 0 && (
        <>
          <hr className="stat-sheet__rule" />
          <p className="stat-sheet__features-heading">Features</p>
          {featureRows.map((f, i) => (
            <p className="stat-sheet__feature" key={i}>
              <span className="stat-sheet__feature-name">{f.name}</span>
              <span className="stat-sheet__feature-kind"> - {f.kind}</span>
              {f.description ? `: ${f.description}` : ''}
            </p>
          ))}
        </>
      )}
    </div>
  );
});

export default EnvironmentSheet;
