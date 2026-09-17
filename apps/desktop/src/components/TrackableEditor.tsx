import { useState } from 'react';
import type { Trackable } from '../api/partyMembers';
import './TrackableEditor.css';

interface TrackableEditorProps {
  trackables: Trackable[];
  onChange: (next: Trackable[]) => void;
}

// Common Daggerheart resources a GM will almost always want on a PC — pure
// convenience prefills, not a fixed schema: the underlying Trackable is
// still just { label, current, max }, and anything not listed here can be
// typed in by hand just as easily.
const QUICK_ADD = [
  { label: 'HP', max: 6 },
  { label: 'Stress', max: 6 },
  { label: 'Hope', max: 6 },
  { label: 'Armor Slots', max: 3 },
];

// The structural editor for a PartyMember's trackables array — add, rename,
// resize, remove. Lives inside PartyMemberForm and is submitted with the
// rest of the form; day-to-day "mark a box" adjustments happen via
// StatStepper on the roster row itself, not here. Rows are keyed by index,
// same convention as FeatureListEditor — these are plain display sub-
// records with no id of their own.
export default function TrackableEditor({ trackables, onChange }: TrackableEditorProps) {
  const [newLabel, setNewLabel] = useState('');
  const [newMax, setNewMax] = useState(6);

  function updateRow(index: number, patch: Partial<Trackable>) {
    const next = trackables.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function removeRow(index: number) {
    onChange(trackables.filter((_, i) => i !== index));
  }

  function addRow(label: string, max: number) {
    if (!label.trim()) return;
    onChange([...trackables, { label: label.trim(), current: max, max }]);
    setNewLabel('');
    setNewMax(6);
  }

  return (
    <div className="trackable-editor">
      <span className="trackable-editor__label">Trackables</span>

      {trackables.map((t, index) => (
        <div key={index} className="trackable-editor__row">
          <input
            className="trackable-editor__label-input"
            type="text"
            value={t.label}
            onChange={(e) => updateRow(index, { label: e.target.value })}
          />
          <input
            className="trackable-editor__max-input"
            type="number"
            min={0}
            value={t.max}
            onChange={(e) => {
              const max = Number(e.target.value);
              updateRow(index, { max, current: Math.min(t.current, max) });
            }}
          />
          <button
            type="button"
            className="trackable-editor__remove"
            onClick={() => removeRow(index)}
            aria-label={`Remove ${t.label}`}
          >
            &times;
          </button>
        </div>
      ))}

      <div className="trackable-editor__quick-add">
        {QUICK_ADD.map((q) => (
          <button key={q.label} type="button" className="trackable-editor__chip" onClick={() => addRow(q.label, q.max)}>
            + {q.label}
          </button>
        ))}
      </div>

      <div className="trackable-editor__add-row">
        <input
          className="trackable-editor__label-input"
          type="text"
          placeholder="Custom trackable"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
        />
        <input
          className="trackable-editor__max-input"
          type="number"
          min={0}
          value={newMax}
          onChange={(e) => setNewMax(Number(e.target.value))}
        />
        <button type="button" className="trackable-editor__add" onClick={() => addRow(newLabel, newMax)}>
          Add
        </button>
      </div>
    </div>
  );
}
