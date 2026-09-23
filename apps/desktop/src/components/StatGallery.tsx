import { useState, type ReactNode } from 'react';
import './StatGallery.css';

interface HistoryEntry {
  id: string;
  name: string;
  tier: number | null;
  subtitle: string | null;
}

const HISTORY_LIMIT = 8;

interface StatGalleryProps<T> {
  items: T[];
  getKey: (item: T) => string;
  getName: (item: T) => string;
  getTier: (item: T) => number | null;
  /** Optional short tag shown next to history entries — e.g. an Adversary's type or an Environment's category. */
  getSubtitle?: (item: T) => string | null;
  searchMatch: (item: T, query: string) => boolean;
  /** Compact content shown inside a grid tile — name + a small StatRail, typically. */
  renderTile: (item: T) => ReactNode;
  /** Full content shown in the spotlight column, including its own edit/delete chrome. */
  renderSpotlight: (item: T) => ReactNode;
  emptyMessage: string;
  /** Singular, lowercase-friendly label used in placeholder copy, e.g. "Adversary". */
  itemLabel: string;
}

// A condensed tile gallery (many stat blocks visible at once) paired with a
// spotlight column that shows one full stat block at a time without
// reflowing the grid, plus a compressed "recently viewed" history so a GM
// can jump back to something they looked at a minute ago. Deliberately not
// the Domain -> Card drill-down pattern (no page navigation) and not an
// in-grid accordion (the grid never reflows when a tile is selected).
export function StatGallery<T>({
  items,
  getKey,
  getName,
  getTier,
  getSubtitle,
  searchMatch,
  renderTile,
  renderSpotlight,
  emptyMessage,
  itemLabel,
}: StatGalleryProps<T>) {
  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const tiers = Array.from(new Set(items.map((i) => getTier(i)).filter((t): t is number => t != null))).sort(
    (a, b) => a - b,
  );

  const filtered = items.filter((item) => {
    if (query.trim() && !searchMatch(item, query.trim().toLowerCase())) return false;
    if (tierFilter !== 'all' && String(getTier(item)) !== tierFilter) return false;
    return true;
  });

  const selected = selectedId != null ? (items.find((i) => getKey(i) === selectedId) ?? null) : null;
  const visibleHistory = history.filter((h) => items.some((i) => getKey(i) === h.id));

  function selectItem(item: T) {
    const key = getKey(item);
    if (key === selectedId) return;
    setHistory((prev) => {
      let next = prev;
      if (selectedId != null && selected) {
        const entry: HistoryEntry = {
          id: selectedId,
          name: getName(selected),
          tier: getTier(selected),
          subtitle: getSubtitle ? getSubtitle(selected) : null,
        };
        next = [entry, ...prev.filter((h) => h.id !== entry.id)];
      }
      return next.filter((h) => h.id !== key).slice(0, HISTORY_LIMIT);
    });
    setSelectedId(key);
  }

  function selectFromHistory(id: string) {
    const item = items.find((i) => getKey(i) === id);
    if (item) selectItem(item);
  }

  if (items.length === 0) {
    return <p className="content-card-list__empty">{emptyMessage}</p>;
  }

  const article = /^[aeiou]/i.test(itemLabel) ? 'an' : 'a';

  return (
    <div className="stat-gallery">
      <div className="stat-gallery__main">
        <div className="stat-gallery__toolbar">
          <input
            type="search"
            className="stat-gallery__search"
            placeholder={`Search ${itemLabel}s by name or description…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {tiers.length > 0 && (
            <select
              className="stat-gallery__tier-filter"
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              aria-label="Filter by Tier"
            >
              <option value="all">All Tiers</option>
              {tiers.map((t) => (
                <option key={t} value={String(t)}>
                  Tier {t}
                </option>
              ))}
            </select>
          )}
        </div>
        {filtered.length === 0 ? (
          <p className="content-card-list__empty">No {itemLabel}s match your search.</p>
        ) : (
          <div className="stat-gallery__grid">
            {filtered.map((item) => {
              const key = getKey(item);
              return (
                <button
                  type="button"
                  key={key}
                  className={`stat-gallery__tile${key === selectedId ? ' stat-gallery__tile--selected' : ''}`}
                  onClick={() => selectItem(item)}
                >
                  {renderTile(item)}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="stat-gallery__spotlight">
        {selected ? (
          renderSpotlight(selected)
        ) : (
          <p className="stat-gallery__spotlight-empty">
            Select {article} {itemLabel} to view its full stat block.
          </p>
        )}
        {visibleHistory.length > 0 && (
          <div className="stat-gallery__history">
            <p className="stat-gallery__history-title">Recently Viewed</p>
            {visibleHistory.map((h) => (
              <button
                type="button"
                key={h.id}
                className="stat-gallery__history-row"
                onClick={() => selectFromHistory(h.id)}
              >
                <span className="stat-gallery__history-name">{h.name}</span>
                <span className="stat-gallery__history-tier">
                  {h.tier != null ? `Tier ${h.tier}` : ''}
                  {h.subtitle ? ` ${h.subtitle}` : ''}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
