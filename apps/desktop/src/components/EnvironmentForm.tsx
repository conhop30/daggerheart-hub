import { useState } from 'react';
import type { FormEvent } from 'react';
import type { GameSet } from '../api/gameSets';
import { environmentsApi, type Environment } from '../api/environments';
import type { Feature } from '../api/heroClasses';
import FeatureListEditor from './FeatureListEditor';
import StringListEditor from './StringListEditor';
import TextField from './TextField';
import './forms.css';

interface EnvironmentFormProps {
  gameSets: GameSet[];
  onSaved: (environment: Environment) => void;
  onCancel: () => void;
}

export default function EnvironmentForm({ gameSets, onSaved, onCancel }: EnvironmentFormProps) {
  const [name, setName] = useState('');
  const [tier, setTier] = useState('');
  const [description, setDescription] = useState('');
  const [impulses, setImpulses] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState('');
  const [potentialAdversaries, setPotentialAdversaries] = useState<string[]>([]);
  const [passives, setPassives] = useState<Feature[]>([]);
  const [actions, setActions] = useState<Feature[]>([]);
  const [reactions, setReactions] = useState<Feature[]>([]);
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
      const environment = await environmentsApi.create({
        name,
        tier: tier ? Number(tier) : undefined,
        description,
        impulses,
        difficulty: difficulty ? Number(difficulty) : undefined,
        potentialAdversaries,
        features: { passives, actions, reactions },
        gameSetId,
      });
      onSaved(environment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the Environment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <h3 className="create-form__title">New Environment</h3>
      <TextField label="Name" value={name} onChange={setName} required />
      <label>
        Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </label>
      <div className="create-form__row">
        <TextField label="Tier" type="number" value={tier} onChange={setTier} min={1} />
        <TextField label="Difficulty" type="number" value={difficulty} onChange={setDifficulty} min={0} />
      </div>
      <StringListEditor label="Impulses" placeholder="An impulse" values={impulses} onChange={setImpulses} />
      <StringListEditor
        label="Potential Adversaries"
        placeholder="An adversary name (free text)"
        values={potentialAdversaries}
        onChange={setPotentialAdversaries}
      />
      <FeatureListEditor label="Passives" features={passives} onChange={setPassives} />
      <FeatureListEditor label="Actions" features={actions} onChange={setActions} />
      <FeatureListEditor label="Reactions" features={reactions} onChange={setReactions} />
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
          {submitting ? 'Creating…' : 'Create Environment'}
        </button>
      </div>
    </form>
  );
}
