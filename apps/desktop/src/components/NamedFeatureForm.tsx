import { useState } from 'react';
import type { FormEvent } from 'react';
import type { GameSet } from '../api/gameSets';
import type { Feature } from '../api/heroClasses';
import FeatureListEditor from './FeatureListEditor';
import TextField from './TextField';
import './forms.css';

interface NamedFeatureFormProps<T> {
  title: string;
  submitLabel: string;
  gameSets: GameSet[];
  create: (body: { name: string; description?: string; features?: Feature[]; gameSetId: string }) => Promise<T>;
  onSaved: (item: T) => void;
  onCancel: () => void;
}

// Shared by Community, Ancestry, and Transformation — all three are Name +
// Description + a flat Dict(Name, Description) feature list + Set, with no
// other fields distinguishing them.
export default function NamedFeatureForm<T>({
  title,
  submitLabel,
  gameSets,
  create,
  onSaved,
  onCancel,
}: NamedFeatureFormProps<T>) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState<Feature[]>([]);
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
      const item = await create({ name, description, features, gameSetId });
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
      <FeatureListEditor label="Features" features={features} onChange={setFeatures} />
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
