import { useState } from 'react';
import type { FormEvent } from 'react';
import type { GameSet } from '../api/gameSets';
import { adversariesApi, type Adversary, type AttackRange, type AttackType } from '../api/adversaries';
import type { Feature } from '../api/heroClasses';
import FeatureListEditor from './FeatureListEditor';
import StringListEditor from './StringListEditor';
import ExperienceListEditor, { type Experience } from './ExperienceListEditor';
import ThresholdsInput, { type Thresholds } from './ThresholdsInput';
import TextField from './TextField';
import { titleCaseEnum } from '../lib/format';
import './forms.css';

interface AdversaryFormProps {
  gameSets: GameSet[];
  onSaved: (adversary: Adversary) => void;
  onCancel: () => void;
}

const ATTACK_RANGES: AttackRange[] = ['MELEE', 'VERY_CLOSE', 'CLOSE', 'FAR', 'VERY_FAR', 'OUT_OF_RANGE'];
const ATTACK_TYPES: AttackType[] = ['PHYSICAL', 'MAGICAL', 'DIRECT_PHYSICAL', 'DIRECT_MAGICAL'];

export default function AdversaryForm({ gameSets, onSaved, onCancel }: AdversaryFormProps) {
  const [name, setName] = useState('');
  const [tier, setTier] = useState('');
  const [description, setDescription] = useState('');
  const [motivesAndTactics, setMotivesAndTactics] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState('');
  const [thresholds, setThresholds] = useState<Thresholds>({ major: null, severe: null });
  const [hp, setHp] = useState('');
  const [stress, setStress] = useState('');
  const [attackModifier, setAttackModifier] = useState('');
  const [attackDescription, setAttackDescription] = useState('');
  const [attackRange, setAttackRange] = useState<AttackRange | ''>('');
  const [attackType, setAttackType] = useState<AttackType | ''>('');
  const [experiences, setExperiences] = useState<Experience[]>([]);
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
      const adversary = await adversariesApi.create({
        name,
        tier: tier ? Number(tier) : undefined,
        description,
        motivesAndTactics,
        difficulty: difficulty ? Number(difficulty) : undefined,
        thresholds,
        hp: hp ? Number(hp) : undefined,
        stress: stress ? Number(stress) : undefined,
        attackModifier: attackModifier ? Number(attackModifier) : undefined,
        attackDescription,
        attackRange: attackRange || null,
        attackType: attackType || null,
        experiences,
        features: { passives, actions, reactions },
        gameSetId,
      });
      onSaved(adversary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the Adversary.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <h3 className="create-form__title">New Adversary</h3>
      <TextField label="Name" value={name} onChange={setName} required />
      <label>
        Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </label>
      <div className="create-form__row">
        <TextField label="Tier" type="number" value={tier} onChange={setTier} min={1} />
        <TextField label="Difficulty" type="number" value={difficulty} onChange={setDifficulty} min={0} />
      </div>
      <StringListEditor
        label="Motives and Tactics"
        placeholder="A motive or tactic"
        values={motivesAndTactics}
        onChange={setMotivesAndTactics}
      />
      <ThresholdsInput value={thresholds} onChange={setThresholds} />
      <div className="create-form__row">
        <TextField label="HP" type="number" value={hp} onChange={setHp} min={0} />
        <TextField label="Stress" type="number" value={stress} onChange={setStress} min={0} />
      </div>
      <div className="create-form__row">
        <TextField label="Attack Modifier" type="number" value={attackModifier} onChange={setAttackModifier} />
        <label>
          Attack Range
          <select value={attackRange} onChange={(e) => setAttackRange(e.target.value as AttackRange | '')}>
            <option value="">Not yet chosen</option>
            {ATTACK_RANGES.map((range) => (
              <option key={range} value={range}>
                {titleCaseEnum(range)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Attack Type
        <select value={attackType} onChange={(e) => setAttackType(e.target.value as AttackType | '')}>
          <option value="">Not yet chosen</option>
          {ATTACK_TYPES.map((type) => (
            <option key={type} value={type}>
              {titleCaseEnum(type)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Attack Description
        <textarea value={attackDescription} onChange={(e) => setAttackDescription(e.target.value)} rows={2} />
      </label>
      <ExperienceListEditor experiences={experiences} onChange={setExperiences} />
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
          {submitting ? 'Creating…' : 'Create Adversary'}
        </button>
      </div>
    </form>
  );
}
