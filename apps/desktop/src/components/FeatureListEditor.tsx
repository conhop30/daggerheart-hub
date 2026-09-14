import type { Feature } from '../api/heroClasses';
import './FeatureListEditor.css';

interface FeatureListEditorProps {
  label: string;
  features: Feature[];
  onChange: (features: Feature[]) => void;
}

// Shared editor for any Dict(Name, Description) feature list — classFeatures,
// specializationFeatures, masteryFeatures. Foundation features on Subclass
// have an extra per-feature spellcast-trait override and use their own
// editor rather than this one.
export default function FeatureListEditor({ label, features, onChange }: FeatureListEditorProps) {
  function update(index: number, field: keyof Feature, value: string) {
    const next = features.slice();
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  }

  function remove(index: number) {
    onChange(features.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...features, { name: '', description: '' }]);
  }

  return (
    <div className="feature-editor">
      <div className="feature-editor__label">{label}</div>
      {features.map((feature, index) => (
        <div className="feature-editor__row" key={index}>
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
          <button type="button" className="feature-editor__remove" onClick={() => remove(index)} aria-label={`Remove ${label} row`}>
            &times;
          </button>
        </div>
      ))}
      <button type="button" className="feature-editor__add" onClick={add}>
        + Add {label.toLowerCase()}
      </button>
    </div>
  );
}
