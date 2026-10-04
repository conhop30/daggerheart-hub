import { useEffect, useState } from 'react';
import type { JournalEntry } from '../api/journal';

// The label+notes editing body, shared between JournalBubble's attached
// detail pane and a detached JournalFloatingNote — same fields, same
// on-blur commit contract, so detaching an entry never changes how editing
// it feels. Lives in its own file (rather than inside JournalBubble.tsx)
// specifically so JournalFloatingNote can import it without the two
// components importing each other.
export function JournalEntryFields({
  entry,
  onSave,
}: {
  entry: JournalEntry;
  onSave: (patch: { label?: string; notes?: string }) => void;
}) {
  const [label, setLabel] = useState(entry.label);
  const [notes, setNotes] = useState(entry.notes);

  // Can be repointed at a different entry without remounting (same
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
    <>
      {entry.kind === 'SESSION' ? (
        // A SESSION entry's label is that Session's own name, kept in sync
        // by electron/store.js's updateSessionAndSyncNotes when the Session
        // is renamed — editing it freely here would desync the two, so
        // renaming only ever happens from the Session itself.
        <div className="journal-detail__label journal-detail__label--readonly">{label}</div>
      ) : (
        <input
          type="text"
          className="journal-detail__label"
          placeholder="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={commitLabel}
        />
      )}
      <textarea
        className="journal-detail__notes"
        placeholder="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={commitNotes}
      />
    </>
  );
}
