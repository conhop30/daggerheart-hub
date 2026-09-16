import { useState } from 'react';
import type { FormEvent } from 'react';
import GameSetSelect from './GameSetSelect';
import TextField from './TextField';
import './forms.css';

interface NameDescriptionRecord {
  id: string;
  name: string;
  description: string | null;
  gameSetId: string;
}

interface SimpleNameDescriptionFormProps<T extends NameDescriptionRecord> {
  title: string;
  submitLabel: string;
  /** Pass an existing record to edit it; omit to create a new one. */
  initial?: T | null;
  create: (body: { name: string; description?: string; gameSetId: string }) => Promise<T>;
  update: (id: string, body: { name?: string; description?: string; gameSetId?: string }) => Promise<T>;
  onSaved: (item: T) => void;
  onCancel: () => void;
}

// Shared by Loot and Consumable — both are just Name + Description + Set,
// no other fields, so a bespoke form per type would be pure duplication.
export default function SimpleNameDescriptionForm<T extends NameDescriptionRecord>({
  title,
  submitLabel,
  initial,
  create,
  update,
  onSaved,
  onCancel,
}: SimpleNameDescriptionFormProps<T>) {
  const isEditing = initial != null;

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [gameSetId, setGameSetId] = useState<string>(initial?.gameSetId ?? '');
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
    const body = { name, description, gameSetId };
    try {
      const item = isEditing ? await update(initial!.id, body) : await create(body);
      onSaved(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${isEditing ? 'save' : 'create'} the ${title}.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <h3 className="create-form__title">{isEditing ? `Edit ${initial!.name}` : `New ${title}`}</h3>
      <TextField label="Name" value={name} onChange={setName} required />
      <label>
        Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </label>
      <GameSetSelect value={gameSetId} onChange={setGameSetId} />
      {error && <p className="create-form__error">{error}</p>}
      <div className="create-form__actions">
        <button type="button" onClick={onCancel} className="create-form__cancel">
          Cancel
        </button>
        <button type="submit" className="create-form__submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEditing ? 'Save Changes' : submitLabel}
        </button>
      </div>
    </form>
  );
}
