import type { FoundationFeature, SpellcastTrait } from '../api/subclasses';
import AutoGrowTextarea from './AutoGrowTextarea';
import { useListEditor } from '../lib/useListEditor';
import './FeatureListEditor.css';
import './FoundationFeatureListEditor.css';

interface FoundationFeatureListEditorProps {
  features: FoundationFeature[];
  onChange: (features: FoundationFeature[]) => void;
}

const TRAIT_OPTIONS: SpellcastTrait[] = [
  'STRENGTH',
  'FINESSE',
  'KNOWLEDGE',
  'PRESENCE',
  'AGILITY',
  'INSTINCT',
  'NONE',
];

// Foundation features are the one feature list with an extra optional
// per-feature Spellcast Trait override (see subclass/dto/FoundationFeatureDto
// on the backend) — everything else about them is the same Name+Description
// shape as FeatureListEditor, so this reuses its CSS and just adds a third
// column for the override select.
export default function FoundationFeatureListEditor({ features, onChange }: FoundationFeatureListEditorProps) {
  const { getHandleProps, getRowClassName, update, remove, add } = useListEditor(features, onChange, () => ({
    name: '',
    description: '',
    spellcastTrait: null,
  }));

  return (
    <div className="feature-editor">
      <div className="feature-editor__label">Foundation Features</div>
      {features.map((feature, index) => (
        <div className={`foundation-feature-editor__row${getRowClassName(index)}`} key={index}>
          <span {...getHandleProps(index)}>⠿</span>
          <input
            type="text"
            placeholder="Name"
            value={feature.name}
            onChange={(e) => update(index, (f) => ({ ...f, name: e.target.value }))}
          />
          <AutoGrowTextarea
            placeholder="Description"
            value={feature.description ?? ''}
            onChange={(e) => update(index, (f) => ({ ...f, description: e.target.value }))}
          />
          <select
            value={feature.spellcastTrait ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              update(index, (f) => ({ ...f, spellcastTrait: value === '' ? null : (value as SpellcastTrait) }));
            }}
            title="Optional per-feature Spellcast Trait override"
          >
            <option value="">No override</option>
            {TRAIT_OPTIONS.map((trait) => (
              <option key={trait} value={trait}>
                {trait === 'NONE' ? 'None' : trait}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="feature-editor__remove"
            onClick={() => remove(index)}
            aria-label="Remove foundation feature row"
          >
            &times;
          </button>
        </div>
      ))}
      <button type="button" className="feature-editor__add" onClick={add}>
        + Add foundation feature
      </button>
    </div>
  );
}
