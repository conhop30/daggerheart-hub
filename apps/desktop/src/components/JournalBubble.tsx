import { useEffect, useState } from 'react';
import { campaignsApi, type Campaign } from '../api/campaigns';
import { journalApi, type JournalEntry, type JournalEntryKind } from '../api/journal';
import { useDragReorder } from '../lib/useDragReorder';
import './JournalBubble.css';

interface JournalBubbleProps {
  /** The campaign row's "Open →" action — navigates the whole app there. See App.tsx. */
  onOpenCampaign: (campaignId: string) => void;
}

interface KindDef {
  key: JournalEntryKind;
  label: string;
}

const KIND_DEFS: KindDef[] = [
  { key: 'ADVERSARIES', label: 'Adversaries' },
  { key: 'LOOT', label: 'Loot' },
  { key: 'CONSUMABLES', label: 'Consumables' },
  { key: 'ARMOR', label: 'Armor' },
  { key: 'WEAPONS', label: 'Weapons' },
  { key: 'WORLDBUILDING', label: 'Worldbuilding' },
  { key: 'OTHER', label: 'Other' },
];

function kindLabelOf(kind: JournalEntryKind): string {
  return KIND_DEFS.find((d) => d.key === kind)?.label ?? kind;
}

// App-wide and always visible (like FloatingMusicPlayer), so a GM can browse
// Adversaries/Equipment/etc. on the app's own tabs and jot a quick note
// against whichever Campaign they're running, without leaving that page.
// Deliberately lightweight — no heavy editor, no docking: see TODO.md and
// the plan this was built from for why.
export default function JournalBubble({ onOpenCampaign }: JournalBubbleProps) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  useEffect(() => {
    if (!selectedCampaignId) {
      setEntries([]);
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
  }, [selectedCampaignId]);

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
      if (target.closest('.journal-panel, .journal-detail, .journal-bubble')) return;
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
  }

  function backToList() {
    setSelectedCampaignId(null);
    setDetailEntryId(null);
    setMenuOpen(false);
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
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete the entry.');
    }
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
    items: entries.filter((e) => e.kind === def.key).sort((a, b) => a.order - b.order),
  })).filter((g) => g.items.length > 0);

  const detailEntry = detailEntryId != null ? entries.find((e) => e.id === detailEntryId) ?? null : null;
  const detailOpen = Boolean(open && detailEntry);

  return (
    <div className="journal-bubble-wrap">
      <div className="journal-stack">
        {open && (
          <div className={`journal-panel${detailOpen ? ' journal-panel--attached' : ''}`}>
            {selectedCampaign ? (
              <>
                <div className="journal-panel__header">
                  <button type="button" className="journal-panel__back" onClick={backToList}>
                    &larr; All Campaigns
                  </button>
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
                </div>
                <div className="journal-panel__title">{selectedCampaign.name}</div>

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
                      />
                    ))}
                </div>
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
        onClick={toggleOpen}
        aria-label={open ? 'Close Journal' : 'Open Journal'}
        title="Journal"
      >
        <JournalBookIcon />
        {selectedCampaignId && entries.length > 0 && <span className="journal-bubble__badge">{entries.length}</span>}
      </button>
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
}: {
  label: string;
  items: JournalEntry[];
  activeEntryId: string | null;
  onReorder: (orderedIds: string[]) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { getHandleProps, getRowClassName } = useDragReorder(items, (reordered) =>
    onReorder(reordered.map((e) => e.id))
  );

  return (
    <div className="journal-panel__group">
      <span className="journal-panel__group-label">{label}</span>
      {items.map((entry, index) => (
        <div
          className={`journal-entry-row${entry.id === activeEntryId ? ' journal-entry-row--active' : ''}${getRowClassName(index)}`}
          key={entry.id}
        >
          <span {...getHandleProps(index)}>⠿</span>
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
  const [label, setLabel] = useState(entry.label);
  const [notes, setNotes] = useState(entry.notes);

  // The pane can be reopened on a different entry without remounting (same
  // component instance, new `entry` prop) — resync local drafts when that
  // happens.
  useEffect(() => {
    setLabel(entry.label);
    setNotes(entry.notes);
  }, [entry.id, entry.label, entry.notes]);

  function commitLabel() {
    if (label !== entry.label) onSave({ label });
  }

  function commitNotes() {
    if (notes !== entry.notes) onSave({ notes });
  }

  return (
    <div className="journal-detail">
      <div className="journal-detail__header">
        <span className="journal-detail__title">{kindLabel}</span>
        <button type="button" className="journal-detail__close" onClick={onClose} aria-label="Close">
          &times;
        </button>
      </div>
      <div className="journal-detail__body">
        <input
          type="text"
          className="journal-detail__label"
          placeholder="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={commitLabel}
        />
        <textarea
          className="journal-detail__notes"
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={commitNotes}
        />
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
