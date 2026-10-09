import { useState } from 'react';
import './EntryCard.css';

interface NamedFeature {
  name: string;
  description?: string | null;
}

interface EntryCardItem {
  name: string;
  description?: string | null;
  features: NamedFeature[];
}

interface EntryCardProps {
  item: EntryCardItem;
  onEdit: () => void;
  onDelete: () => void;
}

// Splits a free-text Description into its first sentence — the book's own
// italic one-liner, always shown — and everything after it, which collapses
// behind the "Expand" toggle. Presentation
// only: the record still has one Description field, not a separate tagline.
function splitTagline(description: string): { tagline: string; rest: string } {
  const match = description.match(/^(.+?[.!?])(\s+([\s\S]*))?$/);
  if (!match) return { tagline: description, rest: '' };
  return { tagline: match[1], rest: (match[3] ?? '').trim() };
}

// Direction C's "Structured Panel" treatment: a thin left accent bar is the
// only boundary (no card box), title and an explicit toggle sit together,
// and the description/feature body is collapsed by default — used by
// Heritage (Community, Ancestry) and Optional Mechanics (Transformation),
// the three record types that are mostly long-form flavor text.
export default function EntryCard({ item, onEdit, onDelete }: EntryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { tagline, rest } = item.description ? splitTagline(item.description) : { tagline: '', rest: '' };
  // Features are crunchy, at-a-glance gameplay info (a Community's
  // signature trait, an Ancestry's two features) — always shown, not
  // gated behind the same toggle as the long-form flavor text. Only
  // `rest` (the elaboration paragraph past the tagline) stays collapsible,
  // so the toggle itself only needs to exist when there's prose to reveal.
  const hasMore = rest.length > 0;

  return (
    <div className="entry-card">
      <span className="entry-card__bar" aria-hidden="true" />
      <div className="entry-card__body">
        <div className="entry-card__header">
          <h3 className="entry-card__title">{item.name}</h3>
          {hasMore && (
            <button
              type="button"
              className="entry-card__toggle"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
            >
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          )}
          <div className="entry-card__actions">
            <button type="button" className="entry-card__action" onClick={onEdit}>
              Edit
            </button>
            <button type="button" className="entry-card__action entry-card__action--danger" onClick={onDelete}>
              Delete
            </button>
          </div>
        </div>
        {tagline && <p className="entry-card__tagline">{tagline}</p>}
        {item.features.length > 0 && (
          <div className="entry-card__features">
            {item.features.map((f, i) => (
              <p className="entry-card__feature" key={i}>
                <strong>{f.name}</strong>
                {f.description ? ` — ${f.description}` : ''}
              </p>
            ))}
          </div>
        )}
        {expanded && rest && <p className="entry-card__description">{rest}</p>}
      </div>
    </div>
  );
}
