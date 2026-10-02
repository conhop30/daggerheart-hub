import { useRef, useState } from 'react';
import './forms.css';

interface ImageUploadFieldProps {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  /**
   * CSS `aspect-ratio` value for the preview/placeholder box — matches the
   * shape it'll actually be shown in (e.g. a wide ratio for Campaign's
   * full-bleed row art, a tall one for a Party member's portrait), just
   * smaller, so the preview reads as "this is roughly what you'll get"
   * instead of a generic square thumbnail. Defaults to a square.
   */
  aspectRatio?: string;
}

// Reads a picked file straight into a data: URL and hands it back — no
// managed directory, no IPC round trip, unlike Music's imports. Campaign/
// Party images are one-per-record and optional, so the simplest thing that
// actually uploads a file (not just a pasted URL, like Card's imagePath)
// is the right amount of machinery for now.
//
// The native <input type="file"> is visually hidden and triggered by a
// styled button instead of shown directly — every other control in this
// form (TextField, the Cancel/Submit buttons, ...) is custom-styled, and a
// raw file input's OS-chrome "Choose File" button was the one thing here
// that still looked unstyled.
export default function ImageUploadField({ label, hint, value, onChange, aspectRatio = '1' }: ImageUploadFieldProps) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        {value ? (
          <img
            className="image-upload-field__preview"
            src={value}
            alt=""
            style={{ aspectRatio }}
          />
        ) : (
          <span className="image-upload-field__placeholder" aria-hidden="true" style={{ aspectRatio }} />
        )}
        <div className="image-upload-field__controls">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            aria-label={label}
            className="image-upload-field__input"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button type="button" className="image-upload-field__choose" onClick={() => inputRef.current?.click()}>
            {value ? 'Choose Different Image' : 'Choose Image'}
          </button>
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
