import { forwardRef, type ReactNode } from 'react';
import { groupFeatureRows, type FeatureRow } from '../lib/featureKinds';
import './ContentCard.css';

interface ContentCardProps {
  title: string;
  /** Appended onto the root element's class — e.g. a temporary highlight state driven by a parent. */
  className?: string;
  /** Replaces the plain `<h3>{title}</h3>` with custom content (e.g. an editable name field) — `title` is still required as the semantic fallback. */
  titleNode?: ReactNode;
  /** Optional color swatch — used by Domain. */
  accent?: string | null;
  /** A row of small stat chips (Tier, Difficulty, etc). */
  meta?: ReactNode;
  onEdit?: () => void;
  /** Overrides the onEdit button's label — e.g. "Open" for a card that drills into a detail page instead of inline-editing. Defaults to "Edit". */
  editLabel?: string;
  onDelete?: () => void;
  /** Overrides the onDelete button's label — e.g. "Remove" for a session tile where nothing is actually destroyed. Defaults to "Delete". */
  deleteLabel?: string;
  children?: ReactNode;
}

// The shared minimal "here's what you made" card every browse page below
// uses — deliberately plain (no images, no filters) since the point of
// this pass is closing the write-only gap, not building the fully designed
// galleries the spec describes for later.
export const ContentCard = forwardRef<HTMLDivElement, ContentCardProps>(function ContentCard(
  { title, className, titleNode, accent, meta, onEdit, editLabel, onDelete, deleteLabel, children },
  ref
) {
  return (
    <div ref={ref} className={className ? `content-card ${className}` : 'content-card'}>
      {accent && <span className="content-card__swatch" style={{ background: accent }} aria-hidden="true" />}
      <div className="content-card__body">
        <div className="content-card__header">
          {titleNode ?? <h3 className="content-card__title">{title}</h3>}
          {(onEdit || onDelete) && (
            <div className="content-card__actions">
              {onEdit && (
                <button type="button" className="content-card__action" onClick={onEdit}>
                  <span>{editLabel ?? 'Edit'}</span>
                </button>
              )}
              {onDelete && (
                <button type="button" className="content-card__action content-card__action--danger" onClick={onDelete}>
                  <span>{deleteLabel ?? 'Delete'}</span>
                </button>
              )}
            </div>
          )}
        </div>
        {meta && <div className="content-card__meta">{meta}</div>}
        {children}
      </div>
    </div>
  );
});

export function MetaChip({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <span className="content-card__chip">
      {label}: {value}
    </span>
  );
}

// Like MetaChip, but the value is a live number input instead of static
// text — for stats that stay adjustable once pulled into a Session (e.g. a
// pulled-in Adversary's Difficulty), where the master record's number is
// only ever a starting point. `null` renders as an empty box, not "0".
export function EditableMetaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <span className="content-card__chip content-card__chip--editable">
      {label}:{' '}
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        aria-label={label}
      />
    </span>
  );
}

// A stat that's adjusted once pulled into a Session, while the book's own
// base value is kept as a visible record rather than folded invisibly into
// the math. Empty input -> nothing's been typed yet, so the box shows the
// current default (base + any non-editable `extra`, e.g. a Condition's
// penalty) as a greyed placeholder. Non-empty input -> what's typed IS the
// effective value (not a delta added on top of the book's number — typing
// "16" sets Difficulty to 16, full stop), and the original book value shows
// as a small greyed reference line underneath so it's never lost track of.
// Internally this is still stored as a modifier (base + modifier + extra =
// what's typed), since `extra` can keep shifting out from under a typed
// value (a Condition added/removed later) and the GM's override should
// shift right along with it rather than snapping back to the book number.
export function ModifierMetaField({
  label,
  base,
  modifier,
  extra = 0,
  onChange,
}: {
  label: string;
  base: number | null;
  modifier: number | null;
  /** A computed adjustment already folded into the effective value but not itself directly editable — e.g. a stacked Condition's penalty. */
  extra?: number;
  onChange: (value: number | null) => void;
}) {
  const defaultValue = (base ?? 0) + extra;
  const effective = defaultValue + (modifier ?? 0);
  return (
    <span className="content-card__chip content-card__chip--editable content-card__chip--modifier">
      <span>
        {label}:{' '}
        <input
          type="number"
          value={modifier != null ? effective : ''}
          placeholder={String(defaultValue)}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value) - defaultValue)}
          aria-label={label}
        />
      </span>
      {modifier != null && base != null && <span className="content-card__chip-note">Book: {base}</span>}
    </span>
  );
}

interface NamedFeature {
  name: string;
  description?: string | null;
}

export function FeatureLines({ label, features }: { label?: string; features: NamedFeature[] }) {
  if (!features || features.length === 0) return null;
  return (
    <div className="content-card__section">
      {label && <p className="content-card__section-label">{label}</p>}
      <ul className="content-card__feature-list">
        {features.map((f, i) => (
          <li key={i}>
            <strong>{f.name}</strong>
            {f.description ? `: ${f.description}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Like FeatureLines, but for rows already flattened by featureRowsFor() —
// grouped back into their sections (Passives/Actions/Reactions/…) since
// that distinction matters a lot mid-combat (a Reaction reads very
// differently from a Passive) and reading three run-together lists is
// slower than reading three short ones. Pass `label={null}` when a caller
// supplies its own heading (e.g. a collapsible toggle) instead of this one.
export function FeatureRowLines({ label = 'Features', rows }: { label?: string | null; rows: FeatureRow[] }) {
  if (!rows || rows.length === 0) return null;
  const groups = groupFeatureRows(rows);
  return (
    <div className="content-card__section">
      {label && <p className="content-card__section-label">{label}</p>}
      {groups.map((group) => (
        <div className="content-card__feature-group" key={group.heading}>
          <p className="content-card__feature-group-label">{group.heading}</p>
          <ul className="content-card__feature-list">
            {group.rows.map((f, i) => (
              <li key={i}>
                <strong>{f.name}</strong>
                {f.description ? `: ${f.description}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function StringLines({ label, values }: { label: string; values: string[] }) {
  if (!values || values.length === 0) return null;
  return (
    <div className="content-card__section">
      <p className="content-card__section-label">{label}</p>
      <ul className="content-card__feature-list">
        {values.map((v, i) => (
          <li key={i}>{v}</li>
        ))}
      </ul>
    </div>
  );
}

interface ContentCardListProps<T> {
  items: T[];
  emptyMessage: string;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** 'grid' packs items into responsive columns instead of one full-width row each — see PartyRoster/CombatPanel. Defaults to 'list'. */
  layout?: 'list' | 'grid';
}

export function ContentCardList<T>({ items, emptyMessage, getKey, renderItem, layout = 'list' }: ContentCardListProps<T>) {
  if (items.length === 0) {
    return <p className="content-card-list__empty">{emptyMessage}</p>;
  }
  return (
    <div className={layout === 'grid' ? 'content-card-list content-card-list--grid' : 'content-card-list'}>
      {items.map((item) => (
        <div key={getKey(item)}>{renderItem(item)}</div>
      ))}
    </div>
  );
}
