import { useEffect, useRef } from 'react';
import type { SessionAdversary, UpdateSessionAdversaryRequest } from '../api/sessionAdversaries';
import type { FeatureSections } from '../lib/featureKinds';
import { difficultyModifierFromConditions } from '../lib/conditions';
import { isMinion } from '../lib/minionGroups';
import { ContentCard, MetaChip, ModifierMetaField } from './ContentCard';
import AdversaryStatBody, { ThresholdsModifierChip } from './AdversaryStatBody';
import StatStepper from './StatStepper';
import ConditionsEditor from './ConditionsEditor';
import './SessionTile.css';

interface SessionAdversaryTileProps {
  adversary: SessionAdversary;
  /** Looked up live from the master Adversary — see CombatPanel for why. */
  masterFeatures: FeatureSections | undefined;
  /** This tile's "#N" among other un-renamed pulls of the same Adversary in this session — null when it's the only one, or once it's been given a custom name. See CombatPanel. */
  duplicateSuffix: number | null;
  /** Lifted up to CombatPanel so clicking this Adversary in SessionCombatSidebar can close every other tile's Features and open just this one — see CombatPanel's spotlight comment. */
  featuresOpen: boolean;
  onToggleFeatures: () => void;
  /** A second, independent collapse: hides everything below the header/meta chips except the roll buttons themselves, for a GM who wants the grid to read as just name/tier/thresholds/rolls. Orthogonal to featuresOpen — collapsing the body hides Features too (nothing to show below unconditional roll buttons otherwise), but featuresOpen's own value is untouched and restores exactly as it was once the body reopens. */
  bodyOpen: boolean;
  onToggleBody: () => void;
  /** Briefly true right after a sidebar click targets this tile — drives a fading highlight and scrolls the tile into view. Never blocks onToggleFeatures from working normally once it's passed. */
  spotlighted: boolean;
  onChange: (patch: UpdateSessionAdversaryRequest) => void;
  onRemove: () => void;
  /** Takes this Adversary off the board but keeps it on the Slain list, unlike onRemove, which forgets it entirely. */
  onKill: () => void;
  /** Minions only: add (+1) or defeat (-1) one of the stack. Defeating the last one takes the tile off the board. */
  onCountChange: (delta: number) => void;
  /** Minions only: a drag began on one pip, to move just that Minion. (Dragging the tile itself is CombatPanel's own business.) */
  onPipDragStart: () => void;
  /** Pulls in one more of this Adversary, on a tile of its own (for a Minion, a new stack of one). */
  onAddAnother: () => void;
  onRoll: (label: string, total: number) => void;
}

/** Past this many, the rest of a stack's pips collapse into a "+N" so a huge stack can't swamp its tile. */
const MAX_PIPS = 20;

// A live, mutable card for one Adversary pulled into a session — reads
// entirely off the props it's given and reports changes upward, so
// CombatPanel (the only thing that knows how to persist a change) is the
// only piece that has to know sessionAdversariesApi exists. Several
// identical non-Minions stacked together are SessionAdversaryStackTile's
// job instead; the two share AdversaryStatBody for everything below the
// trackers.
export default function SessionAdversaryTile({
  adversary,
  masterFeatures,
  duplicateSuffix,
  featuresOpen,
  onToggleFeatures,
  bodyOpen,
  onToggleBody,
  spotlighted,
  onChange,
  onRemove,
  onKill,
  onCountChange,
  onPipDragStart,
  onAddAnother,
  onRoll,
}: SessionAdversaryTileProps) {
  const minion = isMinion(adversary);
  const rootRef = useRef<HTMLDivElement>(null);
  const isCustomLabel = adversary.label.trim() !== adversary.name.trim();
  const conditionDifficultyDelta = difficultyModifierFromConditions(adversary.conditions ?? []);

  // A sidebar click targeting this tile should bring it into view even if
  // the Combat grid has scrolled it off-screen — the highlight alone does
  // nothing for a tile you can't see.
  useEffect(() => {
    if (spotlighted) rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [spotlighted]);

  return (
    <ContentCard
      ref={rootRef}
      className={spotlighted ? 'session-tile--spotlight' : undefined}
      title={adversary.label}
      titleNode={
        <h3 className="content-card__title session-tile__title">
          <button
            type="button"
            className="session-tile__body-toggle"
            onClick={onToggleBody}
            aria-expanded={bodyOpen}
            aria-label={bodyOpen ? 'Collapse details' : 'Expand details'}
          >
            {bodyOpen ? '▾' : '▸'}
          </button>
          <button type="button" className="session-tile__add" onClick={onAddAnother} aria-label={`Add another ${adversary.name}`} title={`Add another ${adversary.name}`}>
            +
          </button>
          <input
            type="text"
            className="session-tile__name-input"
            value={adversary.label}
            onChange={(e) => onChange({ label: e.target.value })}
            aria-label="Name"
          />
          {!isCustomLabel && duplicateSuffix != null && <span className="session-tile__name-suffix">#{duplicateSuffix}</span>}
          {isCustomLabel && <span className="session-tile__name-original">{adversary.name}</span>}
          {minion && <span className="session-tile__count">×{adversary.count}</span>}
        </h3>
      }
      // ContentCard's two action slots, relabelled: neither is an "edit"
      // or a "delete" here.
      onEdit={onKill}
      editLabel="Kill"
      onDelete={onRemove}
      deleteLabel="Remove"
      meta={
        <>
          <MetaChip label="Tier" value={adversary.tier} />
          <MetaChip
            label="Atk"
            value={adversary.attackModifier != null ? (adversary.attackModifier >= 0 ? `+${adversary.attackModifier}` : adversary.attackModifier) : null}
          />
          <ModifierMetaField
            label="Difficulty"
            base={adversary.difficulty}
            modifier={adversary.difficultyModifier}
            extra={conditionDifficultyDelta}
            onChange={(difficultyModifier) => onChange({ difficultyModifier })}
          />
          <ThresholdsModifierChip adversary={adversary} onChange={onChange} />
        </>
      }
    >
      {bodyOpen && (
        <div className="session-tile__stats">
          {minion && (
            // A Minion has no HP track of its own: one hit defeats it, so
            // the stack's count is the only thing there is to mark down.
            <div className="stat-stepper session-tile__minions">
              <span className="stat-stepper__label">Minions</span>
              <div className="session-tile__pips">
                {Array.from({ length: Math.min(adversary.count, MAX_PIPS) }, (_, i) => (
                  <span
                    key={i}
                    className="session-tile__pip"
                    draggable
                    onDragStart={(e) => {
                      // Its own drag, not the tile's: just this one Minion.
                      e.stopPropagation();
                      onPipDragStart();
                    }}
                    title="Drag one Minion out, or onto another Minion"
                  />
                ))}
                {adversary.count > MAX_PIPS && <span className="session-tile__pips-more">+{adversary.count - MAX_PIPS}</span>}
              </div>
              <div className="stat-stepper__controls">
                <button type="button" className="stat-stepper__button" onClick={() => onCountChange(-1)} aria-label="Defeat one Minion">
                  &minus;
                </button>
                <span className="stat-stepper__value">{adversary.count}</span>
                <button type="button" className="stat-stepper__button" onClick={() => onCountChange(1)} aria-label="Add one Minion">
                  +
                </button>
              </div>
            </div>
          )}
          {!minion && adversary.hpMax != null && (
            <StatStepper
              label="HP"
              current={adversary.hpMax - adversary.hpMarked}
              max={adversary.hpMax}
              onChange={(remaining) => onChange({ hpMarked: adversary.hpMax! - remaining })}
            />
          )}
          {adversary.stressMax != null && (
            <StatStepper
              label="Stress"
              current={adversary.stressMax - adversary.stressMarked}
              max={adversary.stressMax}
              onChange={(remaining) => onChange({ stressMarked: adversary.stressMax! - remaining })}
            />
          )}
        </div>
      )}
      <AdversaryStatBody
        adversary={adversary}
        masterFeatures={masterFeatures}
        rollLabel={adversary.label}
        bodyOpen={bodyOpen}
        featuresOpen={featuresOpen}
        onToggleFeatures={onToggleFeatures}
        onRoll={onRoll}
        beforeFeatures={<ConditionsEditor values={adversary.conditions ?? []} onChange={(conditions) => onChange({ conditions })} />}
      />
    </ContentCard>
  );
}
