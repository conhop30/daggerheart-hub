import { useState } from 'react';
import type { FormEvent } from 'react';
import type { GameSet } from '../api/gameSets';
import { armorsApi, type Armor } from '../api/armors';
import ThresholdsInput, { type Thresholds } from './ThresholdsInput';
import TextField from './TextField';
import './forms.css';

interface ArmorFormProps {
  gameSets: GameSet[];
  onSaved: (armor: Armor) => void;
  onCancel: () => void;
}

export default function ArmorForm({ gameSets, onSaved, onCancel }: ArmorFormProps) {
  const [name, setName] = useState('');
  const [tier, setTier] = useState('');
  const [baseScore, setBaseScore] = useState('');
  const [thresholds, setThresholds] = useState<Thresholds>({ major: null, severe: null });
  const [feature, setFeature] = useState('');
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
      const armor = await armorsApi.create({
        name,
        tier: tier ? Number(tier) : undefined,
        baseScore: baseScore ? Number(baseScore) : undefined,
        thresholds,
        feature,
        gameSetId,
      });
      onSaved(armor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the Armor.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <h3 className="create-form__title">New Armor</h3>
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
          {submitting ? 'Creating…' : 'Create Armor'}
        </button>
      </div>
    </form>
  );
}
