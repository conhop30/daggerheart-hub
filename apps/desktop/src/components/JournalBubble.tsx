import { useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { campaignsApi, type Campaign } from '../api/campaigns';
import { journalApi, type JournalEntry, type JournalEntryKind } from '../api/journal';
import { sessionsApi, type Session } from '../api/sessions';
import { useDragReorder } from '../lib/useDragReorder';
import { usePointerDrag } from '../lib/usePointerDrag';
import { clampOffset, loadBubblePosition, saveBubblePosition, snapToNearestEdge, type BubblePosition } from '../lib/bubblePosition';
import { findNonOverlappingSpot, type Point } from '../lib/floatingLayout';
import { KIND_DEFS, kindLabelOf } from '../lib/journalKinds';
import { JournalEntryFields } from './JournalEntryFields';
import JournalFloatingNote from './JournalFloatingNote';
import './JournalBubble.css';

const NOTE_SIZE = { width: 260, height: 320 };
const BUBBLE_HALF = 26;

interface JournalBubbleProps {
  /** The campaign row's "Open →" action — navigates the whole app there. See App.tsx. */
  onOpenCampaign: (campaignId: string) => void;
}

// App-wide and always visible (like FloatingMusicPlayer), so a GM can browse
// Adversaries/Equipment/etc. on the app's own tabs and jot a quick note
// against whichever Campaign they're running, without leaving that page.
// Deliberately lightweight — no heavy editor, no docking: see TODO.md and
// the plan this was built from for why.
export default function JournalBubble({ onOpenCampaign }: JournalBubbleProps) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Where the bubble is snapped on the window's edge — null until the user
  // actually drags it, meaning "use the default bottom-left corner" (see
  // wrapStyle below). Persisted; a resting layout preference, not data.
  const [bubblePosition, setBubblePosition] = useState<BubblePosition | null>(loadBubblePosition());
  // Entries dragged out of the list into their own floating note — a
  // transient "what I'm working on right now" arrangement, reset every
  // launch (same category as selectedCampaignId below), never persisted.
  const [detached, setDetached] = useState<Record<string, Point>>({});

  const bubbleDrag = usePointerDrag({
    onDragStart() {
      // Mirrors a mobile chat-head bubble: you can't drag while its panel
      // is open, so the panel's anchor only ever needs computing once, when
      // it next opens (bubble stationary) — never live mid-drag.
      setOpen(false);
    },
    onDrag(x, y) {
      const wrap = wrapRef.current;
      if (!wrap) return;
      // Direct DOM mutation for 1:1 tracking during the drag itself —
      // cheaper than funneling every pointermove through React state.
      // React takes back over once onDragEnd commits the snapped position.
      wrap.style.left = `${x - BUBBLE_HALF}px`;
      wrap.style.top = `${y - BUBBLE_HALF}px`;
      wrap.style.right = 'auto';
      wrap.style.bottom = 'auto';
    },
    onDragEnd(x, y) {
      const snapped = snapToNearestEdge(x, y);
      setBubblePosition(snapped);
      saveBubblePosition(snapped);
    },
  });
  // Which Campaign the Journal is currently showing — a quick "what am I
  // working on right now" pick, not data: resets to the global list on
  // every launch, entirely decoupled from app navigation/current page.
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  // Which entry's "expand" detail pane is open — not cleared when the
  // Journal itself closes, only the pane's own visibility depends on
  // `open`, so reopening via the bubble restores it exactly as it was.
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);

  // Refetches every time the global list becomes visible (panel opens, or
  // backing out of a selected Campaign) rather than once on mount — this
  // bubble is mounted for the app's whole lifetime, so a once-only fetch
  // would never see a Campaign created after launch, which is the normal
  // case, not an edge case.
  useEffect(() => {
    if (!open || selectedCampaignId) return;
    let cancelled = false;
    setCampaignsLoading(true);
    setCampaignsError(null);
    campaignsApi
      .list()
      .then((list) => {
        if (cancelled) return;
        setCampaigns(list);
      })
      .catch((err) => {
        if (cancelled) return;
        setCampaignsError(err instanceof Error ? err.message : 'Could not load Campaigns.');
      })
      .finally(() => {
        if (!cancelled) setCampaignsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, selectedCampaignId]);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState<string | null>(null);

  // "Campaign" is today's kind-grouped notes; "Session" lists that
  // Campaign's own Sessions, one note per Session kept in sync by name
  // (see SessionNotesPanel + updateSessionAndSyncNotes). Resets to
  // Campaign whenever a different Campaign is selected.
  const [notesScope, setNotesScope] = useState<'CAMPAIGN' | 'SESSION'>('CAMPAIGN');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCampaignId || notesScope !== 'SESSION') return;
    let cancelled = false;
    setSessionsLoading(true);
    setSessionsError(null);
    sessionsApi
      .listByCampaign(selectedCampaignId)
      .then((list) => {
        if (!cancelled) setSessions(list);
      })
      .catch((err) => {
        if (!cancelled) setSessionsError(err instanceof Error ? err.message : 'Could not load Sessions.');
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCampaignId, notesScope]);

  // Refetches every time the panel becomes visible (not just when the
  // selected Campaign changes) — a Session's notes can now be edited from
  // a completely different surface (SessionNotesPanel on the live Session
  // page), so reopening the bubble on the *same* Campaign must still pick
  // up whatever changed elsewhere while it was closed, the same reasoning
  // as the Campaigns-list effect above.
  useEffect(() => {
    if (!open || !selectedCampaignId) {
      if (!selectedCampaignId) setEntries([]);
      return;
    }
    let cancelled = false;
    setEntriesLoading(true);
    setEntriesError(null);
    journalApi
      .listByCampaign(selectedCampaignId)
      .then((list) => {
        if (cancelled) return;
        setEntries(list);
      })
      .catch((err) => {
        if (cancelled) return;
        setEntriesError(err instanceof Error ? err.message : 'Could not load the Journal.');
      })
      .finally(() => {
        if (!cancelled) setEntriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, selectedCampaignId]);

  // Closes the Journal on a click anywhere outside the panel, the detail
  // pane, or the bubble itself — only attached while actually open.
  // Listens on mousedown, not click: a click that selects a Campaign (or
  // otherwise swaps the panel's content) detaches the clicked element from
  // the DOM synchronously before the "click" event finishes bubbling up to
  // document, which would make target.closest() fail to find its own
  // ancestor and misfire as an outside click. mousedown fires first, before
  // that re-render happens.
  useEffect(() => {
    if (!open) return;
    function handleDocumentMouseDown(event: MouseEvent) {
      const target = event.target as HTMLElement;
      // Floating notes render outside the panel/detail/bubble DOM subtree
      // (position: fixed, siblings of the stack) but are still part of the
      // Journal's own surface — clicking Reattach, or just editing one,
      // must never count as "outside" and close the whole panel.
      if (target.closest('.journal-panel, .journal-detail, .journal-bubble, .journal-floating-note')) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [open]);

  function toggleOpen() {
    setOpen((prev) => !prev);
    setMenuOpen(false);
  }

  function selectCampaign(id: string) {
    setSelectedCampaignId(id);
    setDetailEntryId(null);
    setNotesScope('CAMPAIGN');
  }

  function backToList() {
    setSelectedCampaignId(null);
    setDetailEntryId(null);
    setMenuOpen(false);
    setNotesScope('CAMPAIGN');
  }

  // Explicit click, not a keystroke — same "create now, fill in after"
  // convention the "+" add-entry menu already uses (addEntry above), so
  // this isn't a new pattern. Browsing the Session list itself creates
  // nothing; only clicking one to actually open its notes does.
  async function openSessionNotes(session: Session) {
    const match = entries.find((e) => e.kind === 'SESSION' && e.label.trim() === session.name.trim());
    if (match) {
      setDetailEntryId(match.id);
      return;
    }
    if (!selectedCampaignId) return;
    try {
      const created = await journalApi.create({ campaignId: selectedCampaignId, kind: 'SESSION', label: session.name });
      setEntries((prev) => [...prev, created]);
      setDetailEntryId(created.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not open that Session’s notes.');
    }
  }

  async function addEntry(kind: JournalEntryKind) {
    if (!selectedCampaignId) return;
    setMenuOpen(false);
    try {
      const created = await journalApi.create({ campaignId: selectedCampaignId, kind });
      setEntries((prev) => [...prev, created]);
      setDetailEntryId(created.id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not create the entry.');
    }
  }

  async function saveEntry(id: string, patch: { label?: string; notes?: string }) {
    try {
      const saved = await journalApi.update(id, patch);
      setEntries((prev) => prev.map((e) => (e.id === id ? saved : e)));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save the entry.');
    }
  }

  async function removeEntry(id: string) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    const label = entry.label.trim();
    const prompt = label ? `Delete "${label}"? This can't be undone.` : "Delete this entry? This can't be undone.";
    if (!window.confirm(prompt)) return;
    try {
      await journalApi.remove(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setDetailEntryId((current) => (current === id ? null : current));
      setDetached((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the entry.');
    }
  }

  // A row's drag handle fires this when it's dropped outside the panel's
  // own body — see JournalCategoryGroup's wrapped onDragEnd. Detaching never
  // touches the underlying record, only where it's displayed.
  function detachEntry(entry: JournalEntry, point: Point) {
    setDetailEntryId((current) => (current === entry.id ? null : current));
    setDetached((prev) => {
      const existingRects = Object.entries(prev)
        .filter(([id]) => id !== entry.id)
        .map(([, pos]) => ({ ...pos, ...NOTE_SIZE }));
      const spot = findNonOverlappingSpot(
        { x: point.x - NOTE_SIZE.width / 2, y: point.y - 16 },
        NOTE_SIZE,
        existingRects,
        { width: window.innerWidth, height: window.innerHeight }
      );
      return { ...prev, [entry.id]: spot };
    });
  }

  function reattachEntry(id: string) {
    setDetached((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  // Reordering within one category only ever touches that category's own
  // entries — each gets renumbered to its new position.
  async function reorderGroup(kind: JournalEntryKind, orderedIds: string[]) {
    try {
      const saved = await Promise.all(orderedIds.map((id, index) => journalApi.update(id, { order: index })));
      setEntries((prev) => {
        const others = prev.filter((e) => e.kind !== kind);
        return [...others, ...saved];
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not reorder the entries.');
    }
  }

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId) ?? null;
  const groups = KIND_DEFS.map((def) => ({
    ...def,
    items: entries.filter((e) => e.kind === def.key && !(e.id in detached)).sort((a, b) => a.order - b.order),
  })).filter((g) => g.items.length > 0);

  const detailEntry = detailEntryId != null ? entries.find((e) => e.id === detailEntryId) ?? null : null;
  const detailOpen = Boolean(open && detailEntry);

  // Anchors the panel/detail stack toward the middle of the screen rather
  // than off it — which side depends on which edge the bubble is snapped to
  // (direct for the edge it's pinned against) and, along that edge, which
  // half of the screen it currently sits in (for the perpendicular axis).
  const anchor = (() => {
    if (!bubblePosition) return { horizontal: 'left' as const, vertical: 'bottom' as const };
    const { edge, offset } = bubblePosition;
    if (edge === 'left') return { horizontal: 'left' as const, vertical: offset < window.innerHeight / 2 ? ('top' as const) : ('bottom' as const) };
    if (edge === 'right') return { horizontal: 'right' as const, vertical: offset < window.innerHeight / 2 ? ('top' as const) : ('bottom' as const) };
    if (edge === 'top') return { horizontal: offset < window.innerWidth / 2 ? ('left' as const) : ('right' as const), vertical: 'top' as const };
    return { horizontal: offset < window.innerWidth / 2 ? ('left' as const) : ('right' as const), vertical: 'bottom' as const };
  })();
  const stackClassName = `journal-stack${anchor.horizontal === 'right' ? ' journal-stack--anchor-right' : ''}${anchor.vertical === 'top' ? ' journal-stack--anchor-top' : ''}`;

  const wrapStyle = (() => {
    if (!bubblePosition) return undefined;
    const offset = clampOffset(bubblePosition.edge, bubblePosition.offset);
    switch (bubblePosition.edge) {
      case 'left':
        return { left: 'var(--space-3)', right: 'auto', top: offset, bottom: 'auto' };
      case 'right':
        return { right: 'var(--space-3)', left: 'auto', top: offset, bottom: 'auto' };
      case 'top':
        return { top: 'var(--space-3)', bottom: 'auto', left: offset, right: 'auto' };
      case 'bottom':
      default:
        return { bottom: 'var(--space-3)', top: 'auto', left: offset, right: 'auto' };
    }
  })();

  return (
    <div className="journal-bubble-wrap" ref={wrapRef} style={wrapStyle}>
      <div className={stackClassName}>
        {open && (
          <div className={`journal-panel${detailOpen ? ' journal-panel--attached' : ''}`}>
            {selectedCampaign ? (
              <>
                <div className="journal-panel__header">
                  <button type="button" className="journal-panel__back" onClick={backToList}>
                    &larr; All Campaigns
                  </button>
                  {notesScope === 'CAMPAIGN' && (
                    <div className="journal-panel__plus-wrap">
                      <button
                        type="button"
                        className="journal-panel__plus"
                        onClick={() => setMenuOpen((prev) => !prev)}
                        aria-label="Add a journal entry"
                      >
                        +
                      </button>
                      {menuOpen && (
                        <div className="journal-panel__menu">
                          {KIND_DEFS.map((def) => (
                            <button
                              type="button"
                              key={def.key}
                              className="journal-panel__menu-item"
                              onClick={() => addEntry(def.key)}
                            >
                              + {def.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="journal-panel__title">{selectedCampaign.name}</div>

                <div className="journal-panel__scope-toggle" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={notesScope === 'CAMPAIGN'}
                    className={`journal-panel__scope-btn${notesScope === 'CAMPAIGN' ? ' journal-panel__scope-btn--active' : ''}`}
                    onClick={() => setNotesScope('CAMPAIGN')}
                  >
                    Campaign
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={notesScope === 'SESSION'}
                    className={`journal-panel__scope-btn${notesScope === 'SESSION' ? ' journal-panel__scope-btn--active' : ''}`}
                    onClick={() => setNotesScope('SESSION')}
                  >
                    Session
                  </button>
                </div>

                {notesScope === 'CAMPAIGN' ? (
                  <div className="journal-panel__body">
                    {entriesLoading && <p className="journal-panel__status">Loading&hellip;</p>}
                    {entriesError && (
                      <p className="journal-panel__status journal-panel__status--error">{entriesError}</p>
                    )}
                    {!entriesLoading && !entriesError && entries.length === 0 && (
                      <p className="journal-panel__status">No notes yet &mdash; tap + above to add one.</p>
                    )}
                    {!entriesLoading &&
                      !entriesError &&
                      groups.map((group) => (
                        <JournalCategoryGroup
                          key={group.key}
                          label={group.label}
                          items={group.items}
                          activeEntryId={detailEntryId}
                          onReorder={(ids) => reorderGroup(group.key, ids)}
                          onEdit={setDetailEntryId}
                          onRemove={removeEntry}
                          onDetach={detachEntry}
                        />
                      ))}
                  </div>
                ) : (
                  <div className="journal-panel__body">
                    {sessionsLoading && <p className="journal-panel__status">Loading&hellip;</p>}
                    {sessionsError && (
                      <p className="journal-panel__status journal-panel__status--error">{sessionsError}</p>
                    )}
                    {!sessionsLoading && !sessionsError && sessions.length === 0 && (
                      <p className="journal-panel__status">No Sessions yet in this Campaign.</p>
                    )}
                    {!sessionsLoading &&
                      !sessionsError &&
                      sessions.map((s) => (
                        <button type="button" key={s.id} className="journal-session-row" onClick={() => openSessionNotes(s)}>
                          {s.name}
                        </button>
                      ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="journal-panel__title">Journal</div>
                <div className="journal-panel__body">
                  {campaignsLoading && <p className="journal-panel__status">Loading&hellip;</p>}
                  {campaignsError && (
                    <p className="journal-panel__status journal-panel__status--error">{campaignsError}</p>
                  )}
                  {!campaignsLoading && !campaignsError && campaigns.length === 0 && (
                    <p className="journal-panel__status">No Campaigns yet &mdash; create one from the Campaigns tab.</p>
                  )}
                  {!campaignsLoading &&
                    !campaignsError &&
                    campaigns.map((campaign) => (
                      <div className="journal-campaign-row" key={campaign.id}>
                        <button
                          type="button"
                          className="journal-campaign-row__name"
                          onClick={() => selectCampaign(campaign.id)}
                        >
                          {campaign.name}
                        </button>
                        <button
                          type="button"
                          className="journal-campaign-row__open"
                          onClick={() => onOpenCampaign(campaign.id)}
                        >
                          Open &rarr;
                        </button>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        )}

        {detailOpen && detailEntry && (
          <JournalDetailPane
            entry={detailEntry}
            kindLabel={kindLabelOf(detailEntry.kind)}
            onSave={(patch) => saveEntry(detailEntry.id, patch)}
            onClose={() => setDetailEntryId(null)}
            onRemove={() => removeEntry(detailEntry.id)}
          />
        )}
      </div>

      <button
        type="button"
        className="journal-bubble"
        onClick={() => {
          // A real drag shouldn't also register as a click — see
          // usePointerDrag's wasDragged comment.
          if (bubbleDrag.wasDragged()) return;
          toggleOpen();
        }}
        onPointerDown={bubbleDrag.onPointerDown}
        onPointerMove={bubbleDrag.onPointerMove}
        onPointerUp={bubbleDrag.onPointerUp}
        aria-label={open ? 'Close Journal' : 'Open Journal'}
        title="Journal"
      >
        <JournalBookIcon />
      </button>

      {Object.entries(detached).map(([id, position]) => {
        const entry = entries.find((e) => e.id === id);
        if (!entry) return null;
        return (
          <JournalFloatingNote
            key={id}
            entry={entry}
            position={position}
            onMove={(next) => setDetached((prev) => ({ ...prev, [id]: next }))}
            onSave={(patch) => saveEntry(id, patch)}
            onReattach={() => reattachEntry(id)}
            onRemove={() => removeEntry(id)}
          />
        );
      })}
    </div>
  );
}

function JournalCategoryGroup({
  label,
  items,
  activeEntryId,
  onReorder,
  onEdit,
  onRemove,
  onDetach,
}: {
  label: string;
  items: JournalEntry[];
  activeEntryId: string | null;
  onReorder: (orderedIds: string[]) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onDetach: (entry: JournalEntry, point: Point) => void;
}) {
  const { getHandleProps, getRowClassName } = useDragReorder(items, (reordered) =>
    onReorder(reordered.map((e) => e.id))
  );

  // Dropped outside the panel's own body (with a little slop so an
  // overshot in-list reorder doesn't misfire as a detach) → pop it out
  // into its own floating note instead of treating it as a reorder.
  // useDragReorder itself stays untouched — this just wraps the handle
  // props it already returns, same pattern any other consumer could use.
  function handleDragEnd(e: DragEvent<HTMLSpanElement>, index: number, entry: JournalEntry) {
    const SLOP = 24;
    const body = document.querySelector('.journal-panel__body');
    const rect = body?.getBoundingClientRect();
    const inside =
      rect &&
      e.clientX >= rect.left - SLOP &&
      e.clientX <= rect.right + SLOP &&
      e.clientY >= rect.top - SLOP &&
      e.clientY <= rect.bottom + SLOP;
    getHandleProps(index).onDragEnd();
    if (!inside) onDetach(entry, { x: e.clientX, y: e.clientY });
  }

  return (
    <div className="journal-panel__group">
      <span className="journal-panel__group-label">{label}</span>
      {items.map((entry, index) => (
        <div
          className={`journal-entry-row${entry.id === activeEntryId ? ' journal-entry-row--active' : ''}${getRowClassName(index)}`}
          key={entry.id}
        >
          <span {...getHandleProps(index)} onDragEnd={(e) => handleDragEnd(e, index, entry)}>
            ⠿
          </span>
          <div className="journal-entry-row__body">
            <div className="journal-entry-row__label">{entry.label || 'Untitled'}</div>
            {entry.notes && <div className="journal-entry-row__notes">{entry.notes}</div>}
          </div>
          <div className="journal-entry-row__actions">
            <button type="button" className="journal-entry-row__edit" onClick={() => onEdit(entry.id)}>
              Edit
            </button>
            <button
              type="button"
              className="journal-entry-row__remove"
              onClick={() => onRemove(entry.id)}
              aria-label="Remove entry"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function JournalDetailPane({
  entry,
  kindLabel,
  onSave,
  onClose,
  onRemove,
}: {
  entry: JournalEntry;
  kindLabel: string;
  onSave: (patch: { label?: string; notes?: string }) => void;
  onClose: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="journal-detail">
      <div className="journal-detail__header">
        <span className="journal-detail__title">{kindLabel}</span>
        <button type="button" className="journal-detail__close" onClick={onClose} aria-label="Close">
          &times;
        </button>
      </div>
      <div className="journal-detail__body">
        <JournalEntryFields entry={entry} onSave={onSave} />
        <button type="button" className="journal-detail__remove" onClick={onRemove}>
          Remove entry
        </button>
      </div>
    </div>
  );
}

function JournalBookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="journal-bubble__icon">
      <path
        d="M12 5c-1.8-1.3-4-2-6.5-2S3 3.4 3 4.2v14.6c0 .8.9 1 1.5.6C6 18.5 8.2 18 10 18s3 .7 4 1.6c1-.9 2.5-1.6 4-1.6s4 .5 5.5 1.4c.6.4 1.5.2 1.5-.6V4.2C21 3.4 19 3 17.5 3S14.8 3.7 12 5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 5v14.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
