import { useState } from 'react';
import type { FormEvent } from 'react';
import type { GameSet } from '../api/gameSets';
import type { Domain } from '../api/domains';
import { heroClassesApi, type Feature, type HeroClass } from '../api/heroClasses';
import FeatureListEditor from './FeatureListEditor';
import TextField from './TextField';
import './forms.css';

interface ClassFormProps {
  gameSets: GameSet[];
  domains: Domain[];
  /** Pass an existing HeroClass to edit it; omit to create a new one. */
  initial?: HeroClass | null;
  onSaved: (heroClass: HeroClass) => void;
  onCancel: () => void;
}

export default function ClassForm({ gameSets, domains, initial, onSaved, onCancel }: ClassFormProps) {
  const isEditing = initial != null;

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [primaryDomainId, setPrimaryDomainId] = useState<number | ''>(
    initial?.primaryDomainId ?? domains[0]?.id ?? ''
  );
  const [secondaryDomainId, setSecondaryDomainId] = useState<number | ''>(
    initial?.secondaryDomainId ?? domains[1]?.id ?? ''
  );
  const [startingEvasion, setStartingEvasion] = useState(initial?.startingEvasion?.toString() ?? '');
  const [startingHp, setStartingHp] = useState(initial?.startingHp?.toString() ?? '');
  const [classItems, setClassItems] = useState(initial?.classItems ?? '');
  const [hopeFeature, setHopeFeature] = useState(initial?.hopeFeature ?? '');
  const [classFeatures, setClassFeatures] = useState<Feature[]>(initial?.classFeatures ?? []);
  const [gameSetId, setGameSetId] = useState<number | ''>(initial?.gameSetId ?? gameSets[0]?.id ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!primaryDomainId || !secondaryDomainId || !gameSetId) {
      setError('Choose both Domains and a Game Set.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const body = {
      name,
      description,
      primaryDomainId,
      secondaryDomainId,
      startingEvasion: startingEvasion ? Number(startingEvasion) : undefined,
      startingHp: startingHp ? Number(startingHp) : undefined,
      classItems,
      hopeFeature,
      classFeatures,
      gameSetId,
    };
    try {
      const heroClass = isEditing
        ? await heroClassesApi.update(initial!.id, body)
        : await heroClassesApi.create(body);
      onSaved(heroClass);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${isEditing ? 'save' : 'create'} the Class.`);
    } finally {
      setSubmitting(false);
    }
  }

  if (domains.length < 2) {
    return (
      <div className="create-form">
        <p className="create-form__empty">
          A Class needs two Domains to pick from — create at least two Domains first.
        </p>
        <button type="button" className="create-form__cancel" onClick={onCancel}>
          Back
        </button>
      </div>
    );
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <h3 className="create-form__title">{isEditing ? `Edit ${initial!.name}` : 'New Class'}</h3>
      <TextField label="Name" value={name} onChange={setName} required />
      <label>
        Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </label>
      <div className="create-form__row">
        <label>
          Primary Domain
          <select value={primaryDomainId} onChange={(e) => setPrimaryDomainId(Number(e.target.value))}>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Secondary Domain
          <select value={secondaryDomainId} onChange={(e) => setSecondaryDomainId(Number(e.target.value))}>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="create-form__row">
        <TextField
          label="Starting Evasion"
          type="number"
          value={startingEvasion}
          onChange={setStartingEvasion}
          min={0}
        />
        <TextField label="Starting HP" type="number" value={startingHp} onChange={setStartingHp} min={0} />
      </div>
      <label>
        Class Items
        <textarea value={classItems} onChange={(e) => setClassItems(e.target.value)} rows={2} />
      </label>
      <label>
        Hope Feature
        <textarea value={hopeFeature} onChange={(e) => setHopeFeature(e.target.value)} rows={2} />
      </label>
      <FeatureListEditor label="Class Features" features={classFeatures} onChange={setClassFeatures} />
      <label>
        Game Set
        <select value={gameSetId} onChange={(e) => setGameSetId(Number(e.target.value))}>
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
          {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Class'}
        </button>
      </div>
    </form>
  );
}
