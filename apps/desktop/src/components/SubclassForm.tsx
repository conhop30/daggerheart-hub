import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Feature } from '../api/heroClasses';
import {
  subclassesApi,
  type FoundationFeature,
  type Subclass,
  type SpellcastTrait,
} from '../api/subclasses';
import FeatureListEditor from './FeatureListEditor';
import FoundationFeatureListEditor from './FoundationFeatureListEditor';
import GameSetSelect from './GameSetSelect';
import ImageUploadField from './ImageUploadField';
import TextField from './TextField';
import SelectField from './SelectField';
import './forms.css';

interface SubclassFormProps {
  parentClassId: string;
  parentClassName: string;
  /** Pass an existing Subclass to edit it; omit to create a new one. */
  initial?: Subclass | null;
  onSaved: (subclass: Subclass) => void;
  onCancel: () => void;
}

const SPELLCAST_TRAITS: SpellcastTrait[] = [
  'STRENGTH',
  'FINESSE',
  'KNOWLEDGE',
  'PRESENCE',
  'AGILITY',
  'INSTINCT',
  'NONE',
];

export default function SubclassForm({
  parentClassId,
  parentClassName,
  initial,
  onSaved,
  onCancel,
}: SubclassFormProps) {
  const isEditing = initial != null;

  const [name, setName] = useState(initial?.name ?? '');
  const [oneliner, setOneliner] = useState(initial?.oneliner ?? '');
  // Undecided ("not yet chosen") is represented by null, matching the
  // backend's own null-vs-NONE distinction.
  const [spellcastTrait, setSpellcastTrait] = useState<SpellcastTrait | ''>(initial?.spellcastTrait ?? '');
  const [foundationFeatures, setFoundationFeatures] = useState<FoundationFeature[]>(
    initial?.foundationFeatures ?? []
  );
  const [specializationFeatures, setSpecializationFeatures] = useState<Feature[]>(
    initial?.specializationFeatures ?? []
  );
  const [masteryFeatures, setMasteryFeatures] = useState<Feature[]>(initial?.masteryFeatures ?? []);
  const [gameSetId, setGameSetId] = useState<string>(initial?.gameSetId ?? '');
  const [backdropImage, setBackdropImage] = useState<string | null>(initial?.backdropImage ?? null);
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
      oneliner,
      parentClassId,
      spellcastTrait: spellcastTrait || null,
      foundationFeatures,
      specializationFeatures,
      masteryFeatures,
      backdropImage,
      gameSetId,
    };
    try {
      const subclass = isEditing ? await subclassesApi.update(initial!.id, body) : await subclassesApi.create(body);
      onSaved(subclass);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${isEditing ? 'save' : 'create'} the Subclass.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <h3 className="create-form__title">
        {isEditing ? `Edit ${initial!.name}` : 'New Subclass'} — {parentClassName}
      </h3>
      <TextField label="Name" value={name} onChange={setName} required />
      <TextField label="One-liner" value={oneliner} onChange={setOneliner} />
      <SelectField
        label="Spellcast Trait"
        value={spellcastTrait}
        onChange={(v) => setSpellcastTrait(v as SpellcastTrait | '')}
      >
        <option value="">Not yet chosen</option>
        {SPELLCAST_TRAITS.map((trait) => (
          <option key={trait} value={trait}>
            {trait === 'NONE' ? 'None (actually has no spellcast trait)' : trait}
          </option>
        ))}
      </SelectField>
      <FoundationFeatureListEditor features={foundationFeatures} onChange={setFoundationFeatures} />
      <FeatureListEditor
        label="Specialization Features"
        features={specializationFeatures}
        onChange={setSpecializationFeatures}
      />
      <FeatureListEditor label="Mastery Features" features={masteryFeatures} onChange={setMasteryFeatures} />
      <ImageUploadField
        label="Party Background"
        hint="Shown behind any Party member of this Subclass on the Campaign page. Optional: a picture named after this Subclass in your subclass-backdrops folder is used automatically, and anything else falls back to its Class's Domain colours. A tall image centers and fades on both sides; a wide one fills the tile."
        value={backdropImage}
        onChange={setBackdropImage}
        aspectRatio="2.2"
      />
      <GameSetSelect value={gameSetId} onChange={setGameSetId} />
      {error && <p className="create-form__error">{error}</p>}
      <div className="create-form__actions">
        <button type="button" onClick={onCancel} className="create-form__cancel">
          Cancel
        </button>
        <button type="submit" className="create-form__submit" disabled={submitting}>
          {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Subclass'}
        </button>
      </div>
    </form>
  );
}
