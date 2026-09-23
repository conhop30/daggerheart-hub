import { useState } from 'react';
import type { FormEvent } from 'react';
import { environmentsApi, type Environment, type EnvironmentCategory } from '../api/environments';
import type { Feature } from '../api/heroClasses';
import FeatureListEditor from './FeatureListEditor';
import StringListEditor from './StringListEditor';
import GameSetSelect from './GameSetSelect';
import TextField from './TextField';
import { titleCaseEnum } from '../lib/format';
import './forms.css';

interface EnvironmentFormProps {
  /** Pass an existing Environment to edit it; omit to create a new one. */
  initial?: Environment | null;
  onSaved: (environment: Environment) => void;
  onCancel: () => void;
}

const ENVIRONMENT_CATEGORIES: EnvironmentCategory[] = ['EXPLORATION', 'EVENT', 'SOCIAL', 'TRAVERSAL'];

export default function EnvironmentForm({ initial, onSaved, onCancel }: EnvironmentFormProps) {
  const isEditing = initial != null;

  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<EnvironmentCategory | ''>(initial?.category ?? '');
  const [tier, setTier] = useState(initial?.tier?.toString() ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [impulses, setImpulses] = useState<string[]>(initial?.impulses ?? []);
  const [difficulty, setDifficulty] = useState(initial?.difficulty?.toString() ?? '');
  const [potentialAdversaries, setPotentialAdversaries] = useState<string[]>(initial?.potentialAdversaries ?? []);
  const [passives, setPassives] = useState<Feature[]>(initial?.features.passives ?? []);
  const [actions, setActions] = useState<Feature[]>(initial?.features.actions ?? []);
  const [reactions, setReactions] = useState<Feature[]>(initial?.features.reactions ?? []);
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
    const body = {
      name,
      category: category || null,
      tier: tier ? Number(tier) : undefined,
      description,
      impulses,
      difficulty: difficulty ? Number(difficulty) : undefined,
      potentialAdversaries,
      features: { passives, actions, reactions },
      gameSetId,
    };
    try {
      const environment = isEditing
        ? await environmentsApi.update(initial!.id, body)
        : await environmentsApi.create(body);
      onSaved(environment);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${isEditing ? 'save' : 'create'} the Environment.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <h3 className="create-form__title">{isEditing ? `Edit ${initial!.name}` : 'New Environment'}</h3>
      <TextField label="Name" value={name} onChange={setName} required />
      <label>
        Category
        <select value={category} onChange={(e) => setCategory(e.target.value as EnvironmentCategory | '')}>
          <option value="">Not yet chosen</option>
          {ENVIRONMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {titleCaseEnum(c)}
            </option>
          ))}
        </select>
      </label>
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
      <GameSetSelect value={gameSetId} onChange={setGameSetId} />
      {error && <p className="create-form__error">{error}</p>}
      <div className="create-form__actions">
        <button type="button" onClick={onCancel} className="create-form__cancel">
          Cancel
        </button>
        <button type="submit" className="create-form__submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Environment'}
        </button>
      </div>
    </form>
  );
}
