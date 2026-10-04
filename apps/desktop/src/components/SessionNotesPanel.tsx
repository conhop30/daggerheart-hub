import { useEffect, useState } from 'react';
import { journalApi, type JournalEntry } from '../api/journal';
import type { Session } from '../api/sessions';
import './SessionNotesPanel.css';

interface SessionNotesPanelProps {
  campaignId: string;
  session: Session;
}

// The live-session half of Session Notes — see JournalBubble's "Session"
// toggle for the other half. Both read/write the same JournalEntry record,
// found by matching this Session's own name against a SESSION-kind entry's
// label (electron/store.js's updateSessionAndSyncNotes keeps that label in
// sync if the Session is ever renamed). The entry is created lazily, on the
// first actual edit here — merely opening this panel to look should never
// spawn a blank entry.
export default function SessionNotesPanel({ campaignId, session }: SessionNotesPanelProps) {
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    journalApi
      .listByCampaign(campaignId)
      .then((entries) => {
        if (cancelled) return;
        const match = entries.find((e) => e.kind === 'SESSION' && e.label.trim() === session.name.trim()) ?? null;
        setEntry(match);
        setNotes(match?.notes ?? '');
      })
      .catch(() => {
        // A failed lookup just means notes start blank for this visit —
        // not worth an alert over what's otherwise an optional, low-stakes
        // field.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, session.id, session.name]);

  async function commit() {
    try {
      if (entry) {
        if (notes === entry.notes) return;
        setEntry(await journalApi.update(entry.id, { notes }));
      } else {
        if (!notes.trim()) return;
        setEntry(await journalApi.create({ campaignId, kind: 'SESSION', label: session.name, notes }));
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save these notes.');
    }
  }

  return (
    <div className="session-notes-panel">
      <h2 className="session-notes-panel__title">{session.name}</h2>
      {!loading && (
        <textarea
          className="session-notes-panel__notes"
          placeholder="Notes for this session…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={commit}
        />
      )}
    </div>
  );
}
