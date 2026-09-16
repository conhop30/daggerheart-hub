import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Feature } from '../api/heroClasses';
import FeatureListEditor from './FeatureListEditor';
import GameSetSelect from './GameSetSelect';
import TextField from './TextField';
import './forms.css';

interface NamedFeatureRecord {
  id: string;
  name: string;
  description: string | null;
  features: Feature[];
  gameSetId: string;
}

interface NamedFeatureFormProps<T extends NamedFeatureRecord> {
  title: string;
  submitLabel: string;
  /** Pass an existing record to edit it; omit to create a new one. */
  initial?: T | null;
  create: (body: { name: string; description?: string; features?: Feature[]; gameSetId: string }) => Promise<T>;
  update: (
    id: string,
    body: { name?: string; description?: string; features?: Feature[]; gameSetId?: string }
  ) => Promise<T>;
  onSaved: (item: T) => void;
  onCancel: () => void;
}

// Shared by Community, Ancestry, and Transformation — all three are Name +
// Description + a flat Dict(Name, Description) feature list + Set, with no
// other fields distinguishing them.
export default function NamedFeatureForm<T extends NamedFeatureRecord>({
  title,
  submitLabel,
  initial,
  create,
  update,
  onSaved,
  onCancel,
}: NamedFeatureFormProps<T>) {
  const isEditing = initial != null;

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [features, setFeatures] = useState<Feature[]>(initial?.features ?? []);
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
    const body = { name, description, features, gameSetId };
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
      <FeatureListEditor label="Features" features={features} onChange={setFeatures} />
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
