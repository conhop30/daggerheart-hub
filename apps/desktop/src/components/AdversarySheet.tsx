import { forwardRef } from 'react';
import type { Adversary } from '../api/adversaries';
import { titleCaseEnum } from '../lib/format';
import './StatSheet.css';

function thresholdsValue(a: Adversary): string {
  return a.thresholds.major != null || a.thresholds.severe != null
    ? `${a.thresholds.major ?? '—'}/${a.thresholds.severe ?? '—'}`
    : '—';
}

function attackLine(a: Adversary): string | null {
  if (a.attackModifier == null && !a.attackRange && !a.attackType && !a.attackDescription) return null;
  const parts: string[] = [];
  if (a.attackModifier != null) parts.push(a.attackModifier >= 0 ? `+${a.attackModifier}` : String(a.attackModifier));
  if (a.attackRange) parts.push(titleCaseEnum(a.attackRange));
  const tail = a.attackDescription ?? (a.attackType ? titleCaseEnum(a.attackType) : null);
  return tail ? `${parts.join(' · ')} · ${tail}` : parts.join(' · ');
}

// Recreates the corebook's own printed stat-block layout and coloring —
// see StatSheet.css for why this deliberately breaks from the app's usual
// dark theme. Forwards its ref to the outermost .stat-sheet node so an
// "Export as Image" action can capture exactly this element and nothing
// else (no surrounding Edit/Delete toolbar).
const AdversarySheet = forwardRef<HTMLDivElement, { a: Adversary }>(function AdversarySheet({ a }, ref) {
  const atk = attackLine(a);
  const featureRows = [
    ...a.features.passives.map((f) => ({ ...f, kind: 'Passive' })),
    ...a.features.actions.map((f) => ({ ...f, kind: 'Action' })),
    ...a.features.reactions.map((f) => ({ ...f, kind: 'Reaction' })),
  ];

  return (
    <div className="stat-sheet" ref={ref}>
      <h3 className="stat-sheet__name">{a.name}</h3>
      <p className="stat-sheet__subtitle">
        {a.tier != null ? `Tier ${a.tier}` : null}
        {a.type ? ` ${titleCaseEnum(a.type)}` : ''}
        {a.typeNote ? ` ${a.typeNote}` : ''}
      </p>
      {a.description && <p className="stat-sheet__description">{a.description}</p>}
      {a.motivesAndTactics.length > 0 && (
        <p className="stat-sheet__line">
          <strong>Motives &amp; Tactics:</strong> {a.motivesAndTactics.join(', ')}
        </p>
      )}
      <hr className="stat-sheet__rule" />
      <div className="stat-sheet__box">
        <div className="stat-sheet__stat-grid">
          <span className="stat-sheet__stat">
            <strong>Difficulty:</strong> {a.difficulty ?? '—'}
          </span>
          <span className="stat-sheet__stat">
            <strong>Thresholds:</strong> {thresholdsValue(a)}
          </span>
          <span className="stat-sheet__stat">
            <strong>HP:</strong> {a.hp ?? '—'}
          </span>
          <span className="stat-sheet__stat">
            <strong>Stress:</strong> {a.stress ?? '—'}
          </span>
        </div>
        {atk && (
          <p className="stat-sheet__box-line">
            <strong>ATK:</strong> {atk}
          </p>
        )}
        {a.experiences.length > 0 && (
          <p className="stat-sheet__box-line stat-sheet__box-line--spaced">
            <strong>Experience:</strong>{' '}
            {a.experiences.map((e, i) => (
              <span key={i}>
                {i > 0 && ', '}
                {e.name} {e.modifier >= 0 ? `+${e.modifier}` : e.modifier}
              </span>
            ))}
          </p>
        )}
      </div>
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

export default AdversarySheet;
