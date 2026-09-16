import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useGameSets } from '../context/GameSetsContext';
import './GameSetSelect.css';

interface GameSetSelectProps {
  value: string;
  onChange: (id: string) => void;
}

const NEW_SET_VALUE = '__new__';

// Every content type requires a Set (see spec Section 4) — this is the one
// place that requirement is satisfied, reused by every create/edit form
// instead of each rendering its own <select>. "+ New Set…" lets a user add
// one on the spot instead of being stuck with whatever already exists
// (originally just "Core").
export default function GameSetSelect({ value, onChange }: GameSetSelectProps) {
  const { gameSets, createGameSet } = useGameSets();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default a brand-new record to the first available Set once the list
  // has loaded — a no-op once something's already selected (editing an
  // existing record, or the user already picked one).
  useEffect(() => {
    if (!value && gameSets.length > 0) {
      onChange(gameSets[0].id);
    }
  }, [gameSets, value, onChange]);

  function handleSelectChange(e: ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === NEW_SET_VALUE) {
      setCreating(true);
      setError(null);
    } else {
      onChange(e.target.value);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) {
      setError('Name is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await createGameSet(newName.trim());
      onChange(created.id);
      setCreating(false);
      setNewName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the Set.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    setCreating(false);
    setNewName('');
    setError(null);
  }

  if (creating) {
    return (
      <label className="game-set-select__new">
        New Set Name
        <div className="game-set-select__new-row">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Hope and Fear"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          <button type="button" onClick={handleCreate} disabled={submitting}>
            {submitting ? 'Adding…' : 'Add'}
          </button>
          <button type="button" onClick={handleCancel} disabled={submitting}>
            Cancel
          </button>
        </div>
        {error && <p className="create-form__error">{error}</p>}
      </label>
    );
  }

  return (
    <label>
      Game Set
      <select value={value} onChange={handleSelectChange}>
        {gameSets.map((gs) => (
          <option key={gs.id} value={gs.id}>
            {gs.name}
          </option>
        ))}
        <option value={NEW_SET_VALUE}>+ New Set&hellip;</option>
      </select>
    </label>
  );
}
