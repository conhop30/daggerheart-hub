import { useEffect, useRef, useState, type ReactNode } from 'react';
import './StatGallery.css';

interface HistoryEntry {
  id: string;
  name: string;
  tier: number | null;
  subtitle: string | null;
}

type ViewMode = 'table' | 'condensed' | 'standard' | 'expanded';

const VIEW_MODES: { mode: ViewMode; label: string }[] = [
  { mode: 'table', label: 'Table' },
  { mode: 'condensed', label: 'Condense' },
  { mode: 'standard', label: 'Standard' },
  { mode: 'expanded', label: 'Expand' },
];

const HISTORY_LIMIT = 8;

/** One column of Table mode, after the Name column every table starts with. */
export interface StatGalleryColumn<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  /** A CSS grid track, e.g. "70px" or "2fr". Defaults to 1fr. */
  width?: string;
  align?: 'left' | 'center';
}

// Which mode a gallery was last left in, remembered per kind of thing it
// lists. A per-machine UI choice like Equipment's Cards/Table switch, not
// game content.
function viewKey(itemLabel: string): string {
  return `daggerheart-stat-gallery-view-${itemLabel.toLowerCase()}`;
}

function loadView(itemLabel: string, hasTable: boolean): ViewMode {
  try {
    const stored = window.localStorage.getItem(viewKey(itemLabel));
    const known = VIEW_MODES.some((v) => v.mode === stored) && (stored !== 'table' || hasTable);
    if (known) return stored as ViewMode;
  } catch {
    // localStorage can be unavailable; the default is fine.
  }
  return 'standard';
}

function saveView(itemLabel: string, mode: ViewMode): void {
  try {
    window.localStorage.setItem(viewKey(itemLabel), mode);
  } catch {
    // Not persisting the choice is harmless.
  }
}

interface StatGalleryProps<T> {
  items: T[];
  getKey: (item: T) => string;
  getName: (item: T) => string;
  getTier: (item: T) => number | null;
  /** Optional short tag shown next to history entries — e.g. an Adversary's type or an Environment's category. */
  getSubtitle?: (item: T) => string | null;
  /** Optional — adds a second filter dropdown alongside Tier's, e.g. Adversary's type (Standard/Minion/Solo/...). Omit for item types with no such field (Environment has none today), same as Tier's own `tiers.length > 0` guard. */
  getType?: (item: T) => string | null;
  searchMatch: (item: T, query: string) => boolean;
  /** Compact content shown inside a grid tile in Standard mode — name + a small StatRail, typically. */
  renderTile: (item: T) => ReactNode;
  /** Minimal content shown inside a grid tile in Condensed mode — name + tier/type only, no stats. Falls back to renderTile if omitted. */
  renderTileCondensed?: (item: T) => ReactNode;
  /** Full content shown in the spotlight column (Standard/Condensed) or inline per-tile (Expanded), including its own edit/delete chrome. */
  renderSpotlight: (item: T) => ReactNode;
  /** Turns on Table mode: one row per item under these columns, a row opening in place to its full stat block. */
  tableColumns?: StatGalleryColumn<T>[];
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
// Four view modes, since "how much do I want to see at once" turned out
// to need more than one answer: Table (a reference table like Equipment's,
// the full width of the page, a row opening in place to its stat block),
// Condensed (name/tier/type only, maximum items on screen), Standard (the
// default — compact stat tiles + a spotlight column), and Expanded (every
// match renders as its own full stat sheet inline, opting into the extra
// screen space on purpose).
export function StatGallery<T>({
  items,
  getKey,
  getName,
  getTier,
  getSubtitle,
  getType,
  searchMatch,
  renderTile,
  renderTileCondensed,
  renderSpotlight,
  tableColumns,
  emptyMessage,
  itemLabel,
}: StatGalleryProps<T>) {
  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [mode, setMode] = useState<ViewMode>(() => loadView(itemLabel, tableColumns != null));
  const openRowRef = useRef<HTMLDivElement>(null);

  function changeMode(next: ViewMode) {
    setMode(next);
    saveView(itemLabel, next);
  }

  // In Table mode the open stat block sits wherever its row does, which
  // can be well off screen when it was picked from Recently Viewed.
  useEffect(() => {
    if (mode === 'table' && selectedId != null) openRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [mode, selectedId]);

  const tiers = Array.from(new Set(items.map((i) => getTier(i)).filter((t): t is number => t != null))).sort(
    (a, b) => a - b,
  );
  const types = getType
    ? Array.from(new Set(items.map((i) => getType(i)).filter((t): t is string => t != null))).sort((a, b) =>
        a.localeCompare(b),
      )
    : [];

  const filtered = items.filter((item) => {
    if (query.trim() && !searchMatch(item, query.trim().toLowerCase())) return false;
    if (tierFilter !== 'all' && String(getTier(item)) !== tierFilter) return false;
    if (typeFilter !== 'all' && getType?.(item) !== typeFilter) return false;
    return true;
  });

  const selected = selectedId != null ? (items.find((i) => getKey(i) === selectedId) ?? null) : null;
  const visibleHistory = history
    .filter((h) => items.some((i) => getKey(i) === h.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  // The list with whatever's being left added to the front of it. Stored
  // newest-first — that's what decides which 8 survive once the cap is hit
  // ("recently viewed" has to mean recency for *eviction* purposes).
  // Display order is a separate concern, see visibleHistory above, which
  // re-sorts alphabetically for the list a GM actually scans, so it reads
  // as a stable A-Z lookup instead of reshuffling on every click.
  function withSelectedRemembered(prev: HistoryEntry[]): HistoryEntry[] {
    if (selectedId == null || !selected) return prev;
    const entry: HistoryEntry = {
      id: selectedId,
      name: getName(selected),
      tier: getTier(selected),
      subtitle: getSubtitle ? getSubtitle(selected) : null,
    };
    return [entry, ...prev.filter((h) => h.id !== entry.id)];
  }

  function selectItem(item: T) {
    const key = getKey(item);
    if (key === selectedId) return;
    setHistory((prev) => withSelectedRemembered(prev).filter((h) => h.id !== key).slice(0, HISTORY_LIMIT));
    setSelectedId(key);
  }

  // Table mode only: clicking the open row again shuts it.
  function closeSelected() {
    setHistory((prev) => withSelectedRemembered(prev).slice(0, HISTORY_LIMIT));
    setSelectedId(null);
  }

  function selectFromHistory(id: string) {
    const item = items.find((i) => getKey(i) === id);
    if (!item) return;
    // A table row that the search or filters are hiding has nowhere to open.
    if (mode === 'table' && !filtered.includes(item)) {
      setQuery('');
      setTierFilter('all');
      setTypeFilter('all');
    }
    selectItem(item);
  }

  if (items.length === 0) {
    return <p className="content-card-list__empty">{emptyMessage}</p>;
  }

  const article = /^[aeiou]/i.test(itemLabel) ? 'an' : 'a';
  const plural = itemLabel.endsWith('y') ? `${itemLabel.slice(0, -1)}ies` : `${itemLabel}s`;
  const renderCondensedTile = renderTileCondensed ?? renderTile;

  return (
    <div className="stat-gallery">
      <div className="stat-gallery__toolbar">
        <input
          type="search"
          className="stat-gallery__search"
          placeholder={`Search ${plural} by name or description…`}
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
        {types.length > 0 && (
          <select
            className="stat-gallery__type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by Type"
          >
            <option value="all">All Types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
        <div className="stat-gallery__mode-toggle" role="group" aria-label="Viewing mode">
          {VIEW_MODES.filter((v) => v.mode !== 'table' || tableColumns).map((v) => (
            <button
              type="button"
              key={v.mode}
              className={`stat-gallery__mode-option${mode === v.mode ? ' stat-gallery__mode-option--active' : ''}`}
              onClick={() => changeMode(v.mode)}
              aria-pressed={mode === v.mode}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'table' && visibleHistory.length > 0 && (
        <div className="stat-gallery__history-strip">
          <span className="stat-gallery__history-title">Recently Viewed</span>
          {visibleHistory.map((h) => (
            <button type="button" key={h.id} className="stat-gallery__history-chip" onClick={() => selectFromHistory(h.id)}>
              {h.name}
              {h.tier != null && <span className="stat-gallery__history-tier">T{h.tier}</span>}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="content-card-list__empty">No {plural} match your search.</p>
      ) : mode === 'table' && tableColumns ? (
        <div className="stat-gallery__table-scroll">
          <div
            className="stat-gallery__table"
            role="table"
            style={{ gridTemplateColumns: ['minmax(150px, 1.5fr)', ...tableColumns.map((c) => c.width ?? '1fr')].join(' ') }}
          >
            <div className="stat-gallery__table-row" role="row">
              <span className="stat-gallery__table-cell stat-gallery__table-cell--head" role="columnheader">
                Name
              </span>
              {tableColumns.map((col) => (
                <span
                  key={col.key}
                  role="columnheader"
                  className={`stat-gallery__table-cell stat-gallery__table-cell--head stat-gallery__table-cell--${col.align ?? 'left'}`}
                >
                  {col.label}
                </span>
              ))}
            </div>
            {filtered.map((item, index) => {
              const key = getKey(item);
              const open = key === selectedId;
              return (
                // A fragment-like pair: the row, then (when open) its stat
                // block on a line of its own under it. The row is `display:
                // contents`, so a click anywhere on it bubbles up to here.
                <div className="stat-gallery__table-entry" key={key}>
                  <div
                    className={`stat-gallery__table-row stat-gallery__table-row--item${index % 2 === 1 ? ' stat-gallery__table-row--alt' : ''}${open ? ' stat-gallery__table-row--open' : ''}`}
                    role="row"
                    ref={open ? openRowRef : undefined}
                    onClick={() => (open ? closeSelected() : selectItem(item))}
                  >
                    <span className="stat-gallery__table-cell stat-gallery__table-cell--name" role="cell">
                      <button type="button" className="stat-gallery__table-name" aria-expanded={open}>
                        {getName(item)}
                      </button>
                    </span>
                    {tableColumns.map((col) => (
                      <span key={col.key} role="cell" className={`stat-gallery__table-cell stat-gallery__table-cell--${col.align ?? 'left'}`}>
                        {col.render(item)}
                      </span>
                    ))}
                  </div>
                  {open && <div className="stat-gallery__table-detail">{renderSpotlight(item)}</div>}
                </div>
              );
            })}
          </div>
        </div>
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
