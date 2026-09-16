import { useDragReorder } from '../lib/useDragReorder';
import './FeatureListEditor.css';

interface StringListEditorProps {
  label: string;
  placeholder?: string;
  values: string[];
  onChange: (values: string[]) => void;
}

// Shared editor for any Array[String] field entered via a repeatable
// add-a-field UI — Adversary.MotivesAndTactics, Environment.Impulses,
// Environment.PotentialAdversaries (all free text, none linked to real
// records).
export default function StringListEditor({ label, placeholder, values, onChange }: StringListEditorProps) {
  const { getHandleProps, getRowClassName } = useDragReorder(values, onChange);

  function update(index: number, value: string) {
    const next = values.slice();
    next[index] = value;
    onChange(next);
  }

  function remove(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...values, '']);
  }

  return (
    <div className="feature-editor">
      <div className="feature-editor__label">{label}</div>
      {values.map((value, index) => (
        <div className={`feature-editor__row feature-editor__row--single${getRowClassName(index)}`} key={index}>
          <span {...getHandleProps(index)}>⠿</span>
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => update(index, e.target.value)}
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
