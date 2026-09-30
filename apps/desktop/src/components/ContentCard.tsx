import type { ReactNode } from 'react';
import { groupFeatureRows, type FeatureRow } from '../lib/featureKinds';
import './ContentCard.css';

interface ContentCardProps {
  title: string;
  /** Optional color swatch — used by Domain. */
  accent?: string | null;
  /** A row of small stat chips (Tier, Difficulty, etc). */
  meta?: ReactNode;
  onEdit?: () => void;
  /** Overrides the onEdit button's label — e.g. "Open" for a card that drills into a detail page instead of inline-editing. Defaults to "Edit". */
  editLabel?: string;
  onDelete?: () => void;
  /** Overrides the onDelete button's label — e.g. "Push Out" for a session tile where nothing is actually destroyed. Defaults to "Delete". */
  deleteLabel?: string;
  children?: ReactNode;
}

// The shared minimal "here's what you made" card every browse page below
// uses — deliberately plain (no images, no filters) since the point of
// this pass is closing the write-only gap, not building the fully designed
// galleries the spec describes for later.
export function ContentCard({ title, accent, meta, onEdit, editLabel, onDelete, deleteLabel, children }: ContentCardProps) {
  return (
    <div className="content-card">
      {accent && <span className="content-card__swatch" style={{ background: accent }} aria-hidden="true" />}
      <div className="content-card__body">
        <div className="content-card__header">
          <h3 className="content-card__title">{title}</h3>
          {(onEdit || onDelete) && (
            <div className="content-card__actions">
              {onEdit && (
                <button type="button" className="content-card__action" onClick={onEdit}>
                  {editLabel ?? 'Edit'}
                </button>
              )}
              {onDelete && (
                <button type="button" className="content-card__action content-card__action--danger" onClick={onDelete}>
                  {deleteLabel ?? 'Delete'}
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
}

export function MetaChip({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <span className="content-card__chip">
      {label}: {value}
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
