import { useState } from 'react';
import type { Combat, UpdateCombatRequest } from '../api/combats';
import { computeBattlePoints, tierForLevel, type BattlePointsCombatant } from '../lib/battlePoints';
import NumberInput from './NumberInput';
import './BattlePointsBar.css';

interface BattlePointsBarProps {
  /** The active Combat tab — its own roster is what's being scored, and its own fields hold the GM's adjustments. */
  combat: Combat;
  combatants: BattlePointsCombatant[];
  /** The Party roster's own size; the tab's partySizeOverride wins when set. */
  partyCount: number;
  campaignLevel: number;
  onChange: (patch: UpdateCombatRequest) => void;
}

// The corebook's encounter budget for the active Combat tab: what the
// roster costs against what a party this size can take. All of the rules
// live in lib/battlePoints; this only lays the result out and reports the
// GM's own choices (a party-size override, the three intent toggles) back
// up to be saved on the tab. Advisory only — going over budget colors the
// total, it never blocks pulling anything in.
export default function BattlePointsBar({ combat, combatants, partyCount, campaignLevel, onChange }: BattlePointsBarProps) {
  const [open, setOpen] = useState(false);
  const partySize = combat.partySizeOverride ?? partyCount;
  const partyTier = tierForLevel(campaignLevel);
  const result = computeBattlePoints({
    partySize,
    partyTier,
    combatants,
    easier: combat.easier,
    harder: combat.harder,
    bonusDamage: combat.bonusDamage,
  });
  const over = result.spent > result.budget;

  return (
    <div className={`battle-points${over ? ' battle-points--over' : ''}`}>
      <div className="battle-points__summary">
        <button
          type="button"
          className="battle-points__toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? 'Hide Battle Points breakdown' : 'Show Battle Points breakdown'}
        >
          {open ? '▾' : '▸'} Battle Points
        </button>
        <span className="battle-points__total" title={over ? 'Over budget' : undefined}>
          <strong className="battle-points__spent">{result.spent}</strong> / <span className="battle-points__budget">{result.budget}</span>
        </span>
        <label className="battle-points__party">
          <NumberInput
            min={1}
            value={combat.partySizeOverride ?? ''}
            placeholder={String(Math.max(1, partyCount))}
            onChange={(raw) => onChange({ partySizeOverride: raw === '' ? null : Math.max(1, Number(raw)) })}
            aria-label="Number of PCs"
          />{' '}
          PCs · Tier {partyTier}
        </label>
        {partyCount === 0 && combat.partySizeOverride == null && (
          <span className="battle-points__note">No one in the Party yet — budgeting for 1.</span>
        )}
      </div>

      {open && (
        <div className="battle-points__breakdown">
          <ul className="battle-points__lines">
            {result.lines.length === 0 && <li className="battle-points__empty">Nothing pulled in yet.</li>}
            {result.lines.map((line) => (
              <li key={line.label}>
                <span>
                  {line.count} {line.label}
                  {line.label === 'Minion' && ` (${line.cost} group${line.cost === 1 ? '' : 's'} of ${Math.max(1, partySize)})`}
                </span>
                <span className="battle-points__cost">{line.cost}</span>
              </li>
            ))}
            {result.untyped > 0 && (
              <li className="battle-points__warning">
                {result.untyped} with no type set — not counted. Give {result.untyped === 1 ? 'it' : 'them'} a type on the
                Adversaries page.
              </li>
            )}
          </ul>
          <ul className="battle-points__adjustments">
            <li className="battle-points__base">
              <span>
                (3 × {Math.max(1, partySize)}) + 2
              </span>
              <span className="battle-points__cost">{result.base}</span>
            </li>
            {result.adjustments.map((a) => (
              <li key={a.key} className={a.applied ? 'battle-points__adjustment--on' : undefined}>
                {a.manual ? (
                  <label>
                    <input
                      type="checkbox"
                      checked={a.applied}
                      onChange={(e) => onChange({ [a.key]: e.target.checked })}
                    />{' '}
                    {a.label}
                  </label>
                ) : (
                  <span title="Worked out from this tab's roster">{a.label}</span>
                )}
                <span className="battle-points__cost">{a.delta > 0 ? `+${a.delta}` : a.delta}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
