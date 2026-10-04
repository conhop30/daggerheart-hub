import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { JournalEntry } from '../api/journal';
import { usePointerDrag } from '../lib/usePointerDrag';
import { kindLabelOf } from '../lib/journalKinds';
import { JournalEntryFields } from './JournalEntryFields';
import './JournalFloatingNote.css';

interface JournalFloatingNoteProps {
  entry: JournalEntry;
  /** Top-left corner, in viewport coordinates. */
  position: { x: number; y: number };
  onMove: (position: { x: number; y: number }) => void;
  onSave: (patch: { label?: string; notes?: string }) => void;
  onReattach: () => void;
  onRemove: () => void;
}

// A Journal entry dragged out of its list (see JournalBubble's detach
// detection on the entry row's drag handle) lands here — same underlying
// JournalEntry record, edited through the same JournalEntryFields the
// attached detail pane uses, just unpinned from the panel so it can sit
// wherever a GM wants it while they work. Its header drags with the same
// usePointerDrag hook the bubble itself uses, for the same free-movement
// feel.
export default function JournalFloatingNote({ entry, position, onMove, onSave, onReattach, onRemove }: JournalFloatingNoteProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  // Where within the header the pointer grabbed, so the note doesn't jump
  // to re-center itself under the cursor the instant a drag starts.
  const grabOffsetRef = useRef({ x: 0, y: 0 });

  const { onPointerDown, onPointerMove, onPointerUp } = usePointerDrag({
    onDrag(x, y) {
      if (!rootRef.current) return;
      rootRef.current.style.left = `${x - grabOffsetRef.current.x}px`;
      rootRef.current.style.top = `${y - grabOffsetRef.current.y}px`;
    },
    onDragEnd(x, y) {
      onMove({ x: x - grabOffsetRef.current.x, y: y - grabOffsetRef.current.y });
    },
  });

  function handleHeaderPointerDown(e: ReactPointerEvent) {
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) grabOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    onPointerDown(e);
  }

  return (
    <div ref={rootRef} className="journal-floating-note" style={{ left: position.x, top: position.y }}>
      <div
        className="journal-floating-note__header"
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="journal-floating-note__title">{kindLabelOf(entry.kind)}</span>
        {/* Stops the header's own onPointerDown from firing for this press —
            otherwise setPointerCapture retargets the eventual click away
            from this button and onReattach never runs. */}
        <button
          type="button"
          className="journal-floating-note__reattach"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onReattach}
        >
          Reattach
        </button>
      </div>
      <div className="journal-floating-note__body">
        <JournalEntryFields entry={entry} onSave={onSave} />
        <button type="button" className="journal-detail__remove" onClick={onRemove}>
          Remove entry
        </button>
      </div>
    </div>
  );
}
