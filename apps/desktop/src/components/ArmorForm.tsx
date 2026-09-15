import { useState } from 'react';
import type { FormEvent } from 'react';
import type { GameSet } from '../api/gameSets';
import { armorsApi, type Armor } from '../api/armors';
import ThresholdsInput, { type Thresholds } from './ThresholdsInput';
import TextField from './TextField';
import './forms.css';

interface ArmorFormProps {
  gameSets: GameSet[];
  /** Pass an existing Armor to edit it; omit to create a new one. */
  initial?: Armor | null;
  onSaved: (armor: Armor) => void;
  onCancel: () => void;
}

export default function ArmorForm({ gameSets, initial, onSaved, onCancel }: ArmorFormProps) {
  const isEditing = initial != null;

  const [name, setName] = useState(initial?.name ?? '');
  const [tier, setTier] = useState(initial?.tier?.toString() ?? '');
  const [baseScore, setBaseScore] = useState(initial?.baseScore?.toString() ?? '');
  const [thresholds, setThresholds] = useState<Thresholds>(initial?.thresholds ?? { major: null, severe: null });
  const [feature, setFeature] = useState(initial?.feature ?? '');
  const [gameSetId, setGameSetId] = useState<string>(initial?.gameSetId ?? gameSets[0]?.id ?? '');
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
    const body = {
      name,
      tier: tier ? Number(tier) : undefined,
      baseScore: baseScore ? Number(baseScore) : undefined,
      thresholds,
      feature,
      gameSetId,
    };
    try {
      const armor = isEditing ? await armorsApi.update(initial!.id, body) : await armorsApi.create(body);
      onSaved(armor);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${isEditing ? 'save' : 'create'} the Armor.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <h3 className="create-form__title">{isEditing ? `Edit ${initial!.name}` : 'New Armor'}</h3>
      <TextField label="Name" value={name} onChange={setName} required />
      <div className="create-form__row">
        <TextField label="Tier" type="number" value={tier} onChange={setTier} min={1} />
        <TextField label="Base Score" type="number" value={baseScore} onChange={setBaseScore} min={0} />
      </div>
      <ThresholdsInput value={thresholds} onChange={setThresholds} />
      <label>
        Feature
        <textarea value={feature} onChange={(e) => setFeature(e.target.value)} rows={2} />
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
          {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Armor'}
        </button>
      </div>
    </form>
  );
}
