import { useState, type ReactNode } from 'react';
import './StatGallery.css';

interface HistoryEntry {
  id: string;
  name: string;
  tier: number | null;
  subtitle: string | null;
}

type ViewMode = 'condensed' | 'standard' | 'expanded';

const HISTORY_LIMIT = 8;

interface StatGalleryProps<T> {
  items: T[];
  getKey: (item: T) => string;
  getName: (item: T) => string;
  getTier: (item: T) => number | null;
  /** Optional short tag shown next to history entries — e.g. an Adversary's type or an Environment's category. */
  getSubtitle?: (item: T) => string | null;
  searchMatch: (item: T, query: string) => boolean;
  /** Compact content shown inside a grid tile in Standard mode — name + a small StatRail, typically. */
  renderTile: (item: T) => ReactNode;
  /** Minimal content shown inside a grid tile in Condensed mode — name + tier/type only, no stats. Falls back to renderTile if omitted. */
  renderTileCondensed?: (item: T) => ReactNode;
  /** Full content shown in the spotlight column (Standard/Condensed) or inline per-tile (Expanded), including its own edit/delete chrome. */
  renderSpotlight: (item: T) => ReactNode;
  emptyMessage: string;
  /** Singular, lowercase-friendly label used in placeholder copy, e.g. "Adversary". */
  itemLabel: string;
}

// A condensed tile gallery paired with a spotlight column that shows one
// full stat block at a time without reflowing the grid, plus a compressed
// "recently viewed" history so a GM can jump back to something they looked
// at a minute ago. Deliberately not the Domain -> Card drill-down pattern
// (no page navigation) and not an in-grid accordion (the grid never
// reflows when a tile is selected).
//
// Three view modes, since "how much do I want to see at once" turned out
// to need more than one answer: Condensed (name/tier/type only, maximum
// items on screen), Standard (the default — compact stat tiles + a
// spotlight column), and Expanded (every match renders as its own full
// stat sheet inline, opting into the extra screen space on purpose).
export function StatGallery<T>({
  items,
  getKey,
  getName,
  getTier,
  getSubtitle,
  searchMatch,
  renderTile,
  renderTileCondensed,
  renderSpotlight,
  emptyMessage,
  itemLabel,
}: StatGalleryProps<T>) {
  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [mode, setMode] = useState<ViewMode>('standard');

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
  const renderCondensedTile = renderTileCondensed ?? renderTile;

  return (
    <div className="stat-gallery">
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
        <div className="stat-gallery__mode-toggle" role="group" aria-label="Viewing mode">
          <button
            type="button"
            className={`stat-gallery__mode-option${mode === 'condensed' ? ' stat-gallery__mode-option--active' : ''}`}
            onClick={() => setMode('condensed')}
          >
            Condense
          </button>
          <button
            type="button"
            className={`stat-gallery__mode-option${mode === 'standard' ? ' stat-gallery__mode-option--active' : ''}`}
            onClick={() => setMode('standard')}
          >
            Standard
          </button>
          <button
            type="button"
            className={`stat-gallery__mode-option${mode === 'expanded' ? ' stat-gallery__mode-option--active' : ''}`}
            onClick={() => setMode('expanded')}
          >
            Expand
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="content-card-list__empty">No {itemLabel}s match your search.</p>
      ) : mode === 'expanded' ? (
        <div className="stat-gallery__expanded-grid">
          {filtered.map((item) => (
            <div className="stat-gallery__expanded-item" key={getKey(item)}>
              {renderSpotlight(item)}
            </div>
          ))}
        </div>
      ) : (
        <div className="stat-gallery__browse">
          <div className={`stat-gallery__grid${mode === 'condensed' ? ' stat-gallery__grid--condensed' : ''}`}>
            {filtered.map((item) => {
              const key = getKey(item);
              return (
                <button
                  type="button"
                  key={key}
                  className={`stat-gallery__tile${mode === 'condensed' ? ' stat-gallery__tile--condensed' : ''}${key === selectedId ? ' stat-gallery__tile--selected' : ''}`}
                  onClick={() => selectItem(item)}
                >
                  {mode === 'condensed' ? renderCondensedTile(item) : renderTile(item)}
                </button>
              );
            })}
          </div>
          <div className="stat-gallery__spotlight">
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
            <div className="stat-gallery__sheet-scroll">
              {selected ? (
                renderSpotlight(selected)
              ) : (
                <p className="stat-gallery__spotlight-empty">
                  Select {article} {itemLabel} to view its full stat block.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
