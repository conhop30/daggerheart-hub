import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Domain } from '../api/domains';
import { heroClassesApi, type Feature, type HeroClass } from '../api/heroClasses';
import FeatureListEditor from './FeatureListEditor';
import GameSetSelect from './GameSetSelect';
import TextField from './TextField';
import TextAreaField from './TextAreaField';
import SelectField from './SelectField';
import './forms.css';

interface ClassFormProps {
  domains: Domain[];
  /** Pass an existing HeroClass to edit it; omit to create a new one. */
  initial?: HeroClass | null;
  onSaved: (heroClass: HeroClass) => void;
  onCancel: () => void;
}

export default function ClassForm({ domains, initial, onSaved, onCancel }: ClassFormProps) {
  const isEditing = initial != null;

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [primaryDomainId, setPrimaryDomainId] = useState<string>(
    initial?.primaryDomainId ?? domains[0]?.id ?? ''
  );
  const [secondaryDomainId, setSecondaryDomainId] = useState<string>(
    initial?.secondaryDomainId ?? domains[1]?.id ?? ''
  );
  const [startingEvasion, setStartingEvasion] = useState(initial?.startingEvasion?.toString() ?? '');
  const [startingHp, setStartingHp] = useState(initial?.startingHp?.toString() ?? '');
  const [classItems, setClassItems] = useState(initial?.classItems ?? '');
  const [hopeFeature, setHopeFeature] = useState(initial?.hopeFeature ?? '');
  const [classFeatures, setClassFeatures] = useState<Feature[]>(initial?.classFeatures ?? []);
  const [gameSetId, setGameSetId] = useState<string>(initial?.gameSetId ?? '');
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
      <TextAreaField label="Description" value={description} onChange={setDescription} />
      <div className="create-form__row">
        <SelectField label="Primary Domain" value={primaryDomainId} onChange={setPrimaryDomainId}>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Secondary Domain" value={secondaryDomainId} onChange={setSecondaryDomainId}>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </SelectField>
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
      <TextAreaField label="Class Items" value={classItems} onChange={setClassItems} />
      <TextAreaField label="Hope Feature" value={hopeFeature} onChange={setHopeFeature} />
      <FeatureListEditor label="Class Features" features={classFeatures} onChange={setClassFeatures} />
      <GameSetSelect value={gameSetId} onChange={setGameSetId} />
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
