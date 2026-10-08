import { useEffect, useRef, useState } from 'react';
import { journalApi } from '../api/journal';
import { noteTabsApi, type NoteTab } from '../api/noteTabs';
import type { Session } from '../api/sessions';
import TabBar, { type Tab } from './TabBar';
import './SessionNotesPanel.css';
import { confirmDialog } from '../lib/confirm';

/** SessionView sets this when a Combat tab is clicked — `key` changes on every click, so re-clicking the same tab still counts. */
export interface NotesTabSignal {
  name: string;
  key: number;
}

interface SessionNotesPanelProps {
  campaignId: string;
  session: Session;
  /** Selects the Notes tab with the same name as the Combat tab just clicked, if there is one. */
  tabSignal: NotesTabSignal | null;
}

/** The stand-in id of the one tab shown before anything has been saved — see `tabs` below. */
const UNSAVED = '__unsaved__';

interface NotesTab extends Tab {
  saved: NoteTab | null;
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// A live Session's notes, as renamable tabs — the same bar the Adversaries
// section uses, and carried forward the same way: a tab written in one
// Session is there in the Campaign's later ones, text included, and a
// change made later never rewrites an earlier Session's copy (see
// api/noteTabs).
//
// A Campaign that has never had a tab shows one, "Notes", that isn't saved
// yet: merely opening this panel to look should never write anything. It
// becomes real on the first edit, rename, or when a second tab is added
// beside it. If this Session has a note from before tabs existed (a
// SESSION-kind Journal entry named after it, still reachable from the
// Journal bubble), that unsaved tab starts out holding its text, so those
// notes aren't stranded.
export default function SessionNotesPanel({ campaignId, session, tabSignal }: SessionNotesPanelProps) {
  const [saved, setSaved] = useState<NoteTab[]>([]);
  const [legacyNotes, setLegacyNotes] = useState('');
  const [activeId, setActiveId] = useState<string>(UNSAVED);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const ctx = { sessionId: session.id };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      noteTabsApi.listBySession(session.id),
      // Only ever a seed for the unsaved first tab; failing to read it
      // just means that tab starts blank.
      journalApi.listByCampaign(campaignId).catch(() => []),
    ])
      .then(([list, journal]) => {
        if (cancelled) return;
        const sorted = [...list].sort((a, b) => a.order - b.order);
        setSaved(sorted);
        setLegacyNotes(journal.find((e) => e.kind === 'SESSION' && e.label.trim() === session.name.trim())?.notes ?? '');
        setActiveId((prev) => (sorted.some((t) => t.id === prev) ? prev : sorted[0]?.id ?? UNSAVED));
      })
      .catch((err) => window.alert(err instanceof Error ? err.message : 'Could not load this session’s Notes.'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, session.id, session.name]);

  const tabs: NotesTab[] = saved.length
    ? saved.map((tab) => ({ id: tab.id, name: tab.name, saved: tab }))
    : [{ id: UNSAVED, name: 'Notes', saved: null }];
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  // The textarea shows a draft of the active tab, reloaded whenever a
  // different tab becomes active (or the active one's saved text changes
  // underneath it). Saving happens on blur, which a click on another tab
  // causes first, so switching tabs never drops what was just typed.
  const activeNotes = active.saved ? active.saved.notes : legacyNotes;
  useEffect(() => {
    setDraft(activeNotes);
  }, [active.id, activeNotes]);

  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  useEffect(() => {
    if (!tabSignal) return;
    const match = tabsRef.current.find((t) => sameName(t.name, tabSignal.name));
    if (match) setActiveId(match.id);
  }, [tabSignal]);

  function fail(err: unknown, fallback: string) {
    window.alert(err instanceof Error ? err.message : fallback);
  }

  // Turns the not-yet-saved first tab into a real one, so there is
  // something to rename, or to sit beside a second tab.
  async function saveFirstTab(fields: { name?: string; notes?: string }): Promise<NoteTab> {
    const created = await noteTabsApi.create({
      sessionId: session.id,
      name: fields.name ?? 'Notes',
      order: 0,
      notes: fields.notes ?? draft,
    });
    setSaved([created]);
    setActiveId(created.id);
    return created;
  }

  async function patch(tab: NoteTab, fields: { name?: string; notes?: string; order?: number }) {
    setSaved((prev) => prev.map((t) => (t.id === tab.id ? { ...t, ...fields } : t)));
    await noteTabsApi.update(tab.id, fields, ctx);
  }

  async function commitNotes() {
    try {
      if (active.saved) {
        if (draft !== active.saved.notes) await patch(active.saved, { notes: draft });
      } else if (draft.trim()) {
        await saveFirstTab({ notes: draft });
      }
    } catch (err) {
      fail(err, 'Could not save these notes.');
    }
  }

  async function rename(tab: NotesTab, name: string) {
    try {
      if (tab.saved) await patch(tab.saved, { name });
      else await saveFirstTab({ name });
    } catch (err) {
      fail(err, 'Could not rename that tab.');
    }
  }

  async function add() {
    try {
      const existing = saved.length ? saved : [await saveFirstTab({})];
      const created = await noteTabsApi.create({
        sessionId: session.id,
        name: `Notes ${existing.length + 1}`,
        order: existing.length,
      });
      setSaved((prev) => [...prev, created]);
      setActiveId(created.id);
    } catch (err) {
      fail(err, 'Could not create that tab.');
    }
  }

  async function remove(tab: NotesTab) {
    // Nothing saved, nothing to delete.
    if (!tab.saved) return;
    if (!(await confirmDialog(`Delete "${tab.name}"? Its notes can't be recovered.`))) return;
    try {
      await noteTabsApi.remove(tab.saved.id, ctx);
      const next = saved.filter((t) => t.id !== tab.saved!.id);
      setSaved(next);
      if (activeId === tab.id) setActiveId(next[0]?.id ?? UNSAVED);
    } catch (err) {
      fail(err, 'Could not delete that tab.');
    }
  }

  // Sequential, not Promise.all, same as Combat tabs: the order shown is
  // the order the writes are issued in.
  async function reorder(next: NotesTab[]) {
    const reordered = next.flatMap((t) => (t.saved ? [t.saved] : []));
    setSaved(reordered.map((t, i) => ({ ...t, order: i })));
    try {
      for (let i = 0; i < reordered.length; i++) {
        if (reordered[i].order !== i) await noteTabsApi.update(reordered[i].id, { order: i }, ctx);
      }
    } catch (err) {
      fail(err, 'Could not save that reorder.');
    }
  }

  if (loading) return <div className="session-notes-panel" />;

  return (
    <div className="session-notes-panel">
      <TabBar
        tabs={tabs}
        activeId={active.id}
        noun="Notes"
        hook="notes-tab-bar"
        onSelect={setActiveId}
        onReorder={reorder}
        onRename={rename}
        onAdd={add}
        onDelete={remove}
      />
      <textarea
        className="session-notes-panel__notes"
        placeholder={`Notes for ${active.name}…`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitNotes}
      />
    </div>
  );
}
