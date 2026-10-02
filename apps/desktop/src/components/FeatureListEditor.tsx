import type { Feature } from '../api/heroClasses';
import AutoGrowTextarea from './AutoGrowTextarea';
import { useListEditor } from '../lib/useListEditor';
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
  const { getHandleProps, getRowClassName, update, remove, add } = useListEditor(features, onChange, () => ({
    name: '',
    description: '',
  }));

  return (
    <div className="feature-editor">
      <div className="feature-editor__label">{label}</div>
      {features.map((feature, index) => (
        <div className={`feature-editor__row${getRowClassName(index)}`} key={index}>
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
