import { useState } from 'react';
import './forms.css';

interface ImageUploadFieldProps {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

// Reads a picked file straight into a data: URL and hands it back — no
// managed directory, no IPC round trip, unlike Music's imports. Campaign/
// Party images are one-per-record and optional, so the simplest thing that
// actually uploads a file (not just a pasted URL, like Card's imagePath)
// is the right amount of machinery for now.
export default function ImageUploadField({ label, hint, value, onChange }: ImageUploadFieldProps) {
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onChange(reader.result);
    };
    reader.onerror = () => setError('Could not read that image.');
    reader.readAsDataURL(file);
  }

  return (
    <div className="image-upload-field">
      <span className="image-upload-field__label">{label}</span>
      <div className="image-upload-field__row">
        {value && <img className="image-upload-field__preview" src={value} alt="" />}
        <div className="image-upload-field__controls">
          <input
            type="file"
            accept="image/*"
            aria-label={label}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {value && (
            <button type="button" className="image-upload-field__clear" onClick={() => onChange(null)}>
              Remove
            </button>
          )}
        </div>
      </div>
      {hint && !error && <p className="create-form__hint">{hint}</p>}
      {error && <p className="create-form__error">{error}</p>}
    </div>
  );
}
