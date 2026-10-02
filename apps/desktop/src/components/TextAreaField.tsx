import type { ChangeEvent } from 'react';
import TextFieldFrame from './TextFieldFrame';

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}

// The multi-line counterpart to TextField — same shared chrome
// (TextFieldFrame), just a <textarea> instead of an <input>.
export default function TextAreaField({ label, value, onChange, placeholder, rows = 3, required }: TextAreaFieldProps) {
  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
  }

  return (
    <TextFieldFrame label={label}>
      <textarea
        className="text-field__input"
        value={value}
        onChange={handleChange}
        placeholder={placeholder ?? label}
        rows={rows}
        required={required}
      />
    </TextFieldFrame>
  );
}
