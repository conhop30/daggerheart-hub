import { useState } from 'react';
import FeatureListEditor from './FeatureListEditor';
import { isRegisteredKind, keyForCustomSection, kindsFor, type FeatureSections } from '../lib/featureKinds';
import './FeatureSectionsEditor.css';

interface FeatureSectionsEditorProps {
  value: FeatureSections;
  onChange: (next: FeatureSections) => void;
}

// One editor for a record's whole set of feature sections. Which sections
// exist comes from lib/featureKinds (plus any extra keys already on the
// record), so a new rules element is a one-line registry change and a
// homebrew section can be added right here without touching code.
// Registered sections are always offered; custom ones can be removed.
export default function FeatureSectionsEditor({ value, onChange }: FeatureSectionsEditorProps) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const kinds = kindsFor(value);

  function setSection(key: string, features: FeatureSections[string]) {
    onChange({ ...value, [key]: features });
  }

  function removeSection(key: string) {
    const rest = { ...value };
    delete rest[key];
    onChange(rest);
  }

  function addSection() {
    const key = keyForCustomSection(newName);
    if (!key) {
      setError('Give the section a name.');
      return;
    }
    if (kinds.some((k) => k.key === key)) {
      setError('That section already exists.');
      return;
    }
    setError(null);
    onChange({ ...value, [key]: [] });
    setNewName('');
  }

  return (
    <div className="feature-sections">
      {kinds.map((kind) => (
        <div className="feature-sections__section" key={kind.key}>
          <FeatureListEditor
            label={kind.plural}
            features={value[kind.key] ?? []}
            onChange={(features) => setSection(kind.key, features)}
          />
          {!isRegisteredKind(kind.key) && (
            <button
              type="button"
              className="feature-sections__remove"
              onClick={() => {
                const count = (value[kind.key] ?? []).length;
                if (count > 0 && !window.confirm(`Remove the "${kind.plural}" section and its ${count} feature(s)?`)) return;
                removeSection(kind.key);
              }}
            >
              Remove &ldquo;{kind.plural}&rdquo; section
            </button>
          )}
        </div>
      ))}
      <div className="feature-sections__add">
        <input
          type="text"
          placeholder="Add a custom section (e.g. Lair Actions)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addSection();
            }
          }}
        />
        <button type="button" onClick={addSection}>
          + Add section
        </button>
      </div>
      {error && <p className="create-form__error">{error}</p>}
    </div>
  );
}
