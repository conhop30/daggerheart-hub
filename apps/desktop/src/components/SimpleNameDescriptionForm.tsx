import { useState } from 'react';
import type { FormEvent } from 'react';
import type { GameSet } from '../api/gameSets';
import TextField from './TextField';
import './forms.css';

interface SimpleNameDescriptionFormProps<T> {
  title: string;
  submitLabel: string;
  gameSets: GameSet[];
  create: (body: { name: string; description?: string; gameSetId: string }) => Promise<T>;
  onSaved: (item: T) => void;
  onCancel: () => void;
}

// Shared by Loot and Consumable — both are just Name + Description + Set,
// no other fields, so a bespoke form per type would be pure duplication.
export default function SimpleNameDescriptionForm<T>({
  title,
  submitLabel,
  gameSets,
  create,
  onSaved,
  onCancel,
}: SimpleNameDescriptionFormProps<T>) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [gameSetId, setGameSetId] = useState<string>(gameSets[0]?.id ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!gameSetId) {
      setError('Choose a Game Set.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const item = await create({ name, description, gameSetId });
      onSaved(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not create the ${title}.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <h3 className="create-form__title">New {title}</h3>
      <TextField label="Name" value={name} onChange={setName} required />
      <label>
        Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </label>
      <label>
        Game Set
        <select value={gameSetId} onChange={(e) => setGameSetId(e.target.value)}>
          {gameSets.map((gs) => (
            <option key={gs.id} value={gs.id}>
              {gs.name}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="create-form__error">{error}</p>}
      <div className="create-form__actions">
        <button type="button" onClick={onCancel} className="create-form__cancel">
          Cancel
        </button>
        <button type="submit" className="create-form__submit" disabled={submitting}>
          {submitting ? 'Creating…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
