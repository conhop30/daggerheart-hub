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
  function update(index: number, field: keyof Experience, value: string) {
    const next = experiences.slice();
    next[index] = {
      ...next[index],
      [field]: field === 'modifier' ? Number(value) || 0 : value,
    };
    onChange(next);
  }

  function remove(index: number) {
    onChange(experiences.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...experiences, { name: '', modifier: 0 }]);
  }

  return (
    <div className="feature-editor">
      <div className="feature-editor__label">Experiences</div>
      {experiences.map((experience, index) => (
        <div className="feature-editor__row feature-editor__row--experience" key={index}>
          <input
            type="text"
            placeholder="Name"
            value={experience.name}
            onChange={(e) => update(index, 'name', e.target.value)}
          />
          <input
            type="number"
            placeholder="Modifier"
            value={experience.modifier}
            onChange={(e) => update(index, 'modifier', e.target.value)}
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
