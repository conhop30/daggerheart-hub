import { useListEditor } from '../lib/useListEditor';
import NumberInput from './NumberInput';
import './FeatureListEditor.css';

export interface Experience {
  name: string;
  modifier: number;
}

interface ExperienceListEditorProps {
  experiences: Experience[];
  onChange: (experiences: Experience[]) => void;
}

// Adversary.Experiences: Dict(Name -> Modifier: Int) — the one feature-list
// shape that pairs a name with a number instead of a description.
export default function ExperienceListEditor({ experiences, onChange }: ExperienceListEditorProps) {
  const { getHandleProps, getRowClassName, update, remove, add } = useListEditor(experiences, onChange, () => ({
    name: '',
    modifier: 0,
  }));

  return (
    <div className="feature-editor">
      <div className="feature-editor__label">Experiences</div>
      {experiences.map((experience, index) => (
        <div className={`feature-editor__row feature-editor__row--experience${getRowClassName(index)}`} key={index}>
          <span {...getHandleProps(index)}>⠿</span>
          <input
            type="text"
            placeholder="Name"
            value={experience.name}
            onChange={(e) => update(index, (exp) => ({ ...exp, name: e.target.value }))}
          />
          <NumberInput
            placeholder="Modifier"
            value={experience.modifier}
            onChange={(raw) => update(index, (exp) => ({ ...exp, modifier: Number(raw) || 0 }))}
          />
          <button
            type="button"
            className="feature-editor__remove"
            onClick={() => remove(index)}
            aria-label="Remove experience row"
          >
            &times;
          </button>
        </div>
      ))}
      <button type="button" className="feature-editor__add" onClick={add}>
        + Add experience
      </button>
    </div>
  );
}
