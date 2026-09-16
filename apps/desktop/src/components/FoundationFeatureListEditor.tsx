import type { FoundationFeature, SpellcastTrait } from '../api/subclasses';
import { useDragReorder } from '../lib/useDragReorder';
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
  const { getHandleProps, getRowClassName } = useDragReorder(features, onChange);

  function update(index: number, field: keyof FoundationFeature, value: string) {
    const next = features.slice();
    if (field === 'spellcastTrait') {
      next[index] = { ...next[index], spellcastTrait: value === '' ? null : (value as SpellcastTrait) };
    } else {
      next[index] = { ...next[index], [field]: value };
    }
    onChange(next);
  }

  function remove(index: number) {
    onChange(features.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...features, { name: '', description: '', spellcastTrait: null }]);
  }

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
            onChange={(e) => update(index, 'name', e.target.value)}
          />
          <input
            type="text"
            placeholder="Description"
            value={feature.description ?? ''}
            onChange={(e) => update(index, 'description', e.target.value)}
          />
          <select
            value={feature.spellcastTrait ?? ''}
            onChange={(e) => update(index, 'spellcastTrait', e.target.value)}
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
