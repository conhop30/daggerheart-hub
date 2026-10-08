import { useEffect, useRef, useState, type DragEvent } from 'react';
import type { SessionAdversary, UpdateSessionAdversaryRequest } from '../api/sessionAdversaries';
import type { FeatureSections } from '../lib/featureKinds';
import { difficultyModifierFromConditions } from '../lib/conditions';
import { ContentCard, MetaChip, ModifierMetaField } from './ContentCard';
import AdversaryStatBody, { ThresholdsModifierChip } from './AdversaryStatBody';
import StatStepper from './StatStepper';
import ConditionsEditor from './ConditionsEditor';
import './SessionTile.css';

interface SessionAdversaryStackTileProps {
  /** Two or more pulls of the same (non-Minion) Adversary, gathered by dragging — see lib/minionGroups. */
  members: SessionAdversary[];
  masterFeatures: FeatureSections | undefined;
  /** Each member's "#N" among un-renamed pulls of this Adversary — see CombatPanel. */
  duplicateSuffixes: Map<string, number>;
  featuresOpen: boolean;
  onToggleFeatures: () => void;
  bodyOpen: boolean;
  onToggleBody: () => void;
  /** The member a sidebar click just targeted, if it's one of these. */
  spotlightedId: string | null;
  onChange: (member: SessionAdversary, patch: UpdateSessionAdversaryRequest) => void;
  onRemove: (member: SessionAdversary) => void;
  onKill: (member: SessionAdversary) => void;
  /** Takes one member back out to a tile of its own. */
  onUnstack: (member: SessionAdversary) => void;
  /** A drag began on one member's row, to move just that one. (Dragging the stat block itself is CombatPanel's own business.) */
  onMemberDragStart: (member: SessionAdversary, e: DragEvent) => void;
  /** Pulls in one more of this Adversary, on a tile of its own. */
  onAddAnother: () => void;
  onRoll: (label: string, total: number) => void;
}

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

// What a member has that the rest of its stack doesn't, as one short line
// under its name: its own Difficulty or Thresholds if adjusted, and any
// Conditions. Empty when it's exactly as printed.
function differences(member: SessionAdversary): string[] {
  const parts: string[] = [];
  const conditions = member.conditions ?? [];
  const conditionDelta = difficultyModifierFromConditions(conditions);
  if (member.difficultyModifier != null || conditionDelta !== 0) {
    parts.push(`Difficulty ${(member.difficulty ?? 0) + (member.difficultyModifier ?? 0) + conditionDelta}`);
  }
  const mod = member.thresholdsModifier ?? { major: null, severe: null };
  if (mod.major != null || mod.severe != null) {
    parts.push(`Thresholds ${(member.thresholds.major ?? 0) + (mod.major ?? 0)} / ${(member.thresholds.severe ?? 0) + (mod.severe ?? 0)}`);
  }
  for (const c of conditions) parts.push(c.count > 1 ? `${c.name} ×${c.count}` : c.name);
  return parts;
}

// Several identical Adversaries as ONE stat block. The bulky part of a stat
// block — attack, Experiences, Features — is the same for every copy, so
// it's printed once at the bottom (AdversaryStatBody, same as a single
// tile), and each copy is reduced to the only things that actually differ
// between them: a name, HP and Stress. Anything else that needs to differ
// for one copy (its Difficulty, its Thresholds, a Condition) sits behind
// that row's "Modify", and shows as a line under its name once set.
export default function SessionAdversaryStackTile({
  members,
  masterFeatures,
  duplicateSuffixes,
  featuresOpen,
  onToggleFeatures,
  bodyOpen,
  onToggleBody,
  spotlightedId,
  onChange,
  onRemove,
  onKill,
  onUnstack,
  onMemberDragStart,
  onAddAnother,
  onRoll,
}: SessionAdversaryStackTileProps) {
  const [modifying, setModifying] = useState<string | null>(null);
  // Whose Modify / Kill / Remove are showing, if anyone's.
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const first = members[0];
  const spotlighted = spotlightedId != null && members.some((m) => m.id === spotlightedId);

  useEffect(() => {
    if (spotlighted) rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [spotlighted]);

  return (
    <ContentCard
      ref={rootRef}
      className={`session-stack${spotlighted ? ' session-tile--spotlight' : ''}`}
      title={first.name}
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
          <button type="button" className="session-tile__add" onClick={onAddAnother} aria-label={`Add another ${first.name}`} title={`Add another ${first.name}`}>
            +
          </button>
          <span className="session-stack__name">{first.name}</span>
          <span className="session-tile__count">×{members.length}</span>
        </h3>
      }
    >
      <div className="session-stack__rows">
        {members.map((member) => {
          const isCustomLabel = member.label.trim() !== member.name.trim();
          const suffix = duplicateSuffixes.get(member.id);
          const diffs = differences(member);
          const open = modifying === member.id;
          const menuOpen = menuFor === member.id || open;
          return (
            <div
              key={member.id}
              className={`session-stack__row${spotlightedId === member.id ? ' session-stack__row--spotlight' : ''}`}
              // A row is its own handle: drag it out to unstack that one.
              draggable
              onDragStart={(e) => onMemberDragStart(member, e)}
              title="Drag out to unstack"
            >
              {/* Name on its own line, the two trackers under it. What can be
                  done to this one copy stays folded away behind the "⋯"
                  until it's wanted, so a row is never wider than its name. */}
              <div className="session-stack__head">
                <span className="session-stack__who">
                  <input
                    type="text"
                    className="session-tile__name-input"
                    value={member.label}
                    // Sized to what's typed, so the "#2" sits right after it.
                    style={{ width: `${Math.max(member.label.length, 4) + 1}ch` }}
                    onChange={(e) => onChange(member, { label: e.target.value })}
                    aria-label="Name"
                  />
                  {!isCustomLabel && suffix != null && <span className="session-tile__name-suffix">#{suffix}</span>}
                </span>
                {menuOpen && (
                  <span className="session-stack__actions">
                    <button
                      type="button"
                      className="session-stack__action"
                      onClick={() => setModifying(open ? null : member.id)}
                      aria-expanded={open}
                      aria-label={`Modify ${member.label}`}
                    >
                      Modify
                    </button>
                    <button type="button" className="session-stack__action" onClick={() => onKill(member)} aria-label={`Kill ${member.label}`}>
                      Kill
                    </button>
                    <button
                      type="button"
                      className="session-stack__action session-stack__action--danger"
                      onClick={() => onRemove(member)}
                      aria-label={`Remove ${member.label}`}
                    >
                      Remove
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  className="session-stack__menu-toggle"
                  onClick={() => {
                    setMenuFor(menuOpen ? null : member.id);
                    if (menuOpen && open) setModifying(null);
                  }}
                  aria-expanded={menuOpen}
                  aria-label={`Actions for ${member.label}`}
                  title="Modify, Kill or Remove"
                >
                  &#8943;
                </button>
              </div>
              <div className="session-stack__line">
                {member.hpMax != null && (
                  <StatStepper
                    label="HP"
                    current={member.hpMax - member.hpMarked}
                    max={member.hpMax}
                    onChange={(remaining) => onChange(member, { hpMarked: member.hpMax! - remaining })}
                  />
                )}
                {member.stressMax != null && (
                  <StatStepper
                    label="Stress"
                    current={member.stressMax - member.stressMarked}
                    max={member.stressMax}
                    onChange={(remaining) => onChange(member, { stressMarked: member.stressMax! - remaining })}
                  />
                )}
              </div>
              {diffs.length > 0 && !open && <p className="session-stack__diffs">{diffs.join(' · ')}</p>}
              {open && (
                <div className="session-stack__modify">
                  <div className="content-card__meta">
                    <ModifierMetaField
                      label="Difficulty"
                      base={member.difficulty}
                      modifier={member.difficultyModifier}
                      extra={difficultyModifierFromConditions(member.conditions ?? [])}
                      onChange={(difficultyModifier) => onChange(member, { difficultyModifier })}
                    />
                    <ThresholdsModifierChip adversary={member} onChange={(patch) => onChange(member, patch)} />
                  </div>
                  <ConditionsEditor values={member.conditions ?? []} onChange={(conditions) => onChange(member, { conditions })} />
                  <button type="button" className="session-stack__action" onClick={() => onUnstack(member)}>
                    Unstack {member.label}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* As printed, for all of them; one member's own adjustments live on its row. */}
      <div className="content-card__meta session-stack__shared">
        <MetaChip label="Tier" value={first.tier} />
        <MetaChip label="Atk" value={first.attackModifier != null ? signed(first.attackModifier) : null} />
        <MetaChip label="Difficulty" value={first.difficulty} />
        <MetaChip
          label="Thresholds"
          value={first.thresholds.major != null || first.thresholds.severe != null ? `${first.thresholds.major ?? '–'} / ${first.thresholds.severe ?? '–'}` : null}
        />
      </div>
      <AdversaryStatBody
        adversary={first}
        masterFeatures={masterFeatures}
        rollLabel={first.name}
        bodyOpen={bodyOpen}
        featuresOpen={featuresOpen}
        onToggleFeatures={onToggleFeatures}
        onRoll={onRoll}
      />
    </ContentCard>
  );
}
