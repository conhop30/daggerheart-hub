import type { ChangeEvent, ReactNode } from 'react';
import TextFieldFrame from './TextFieldFrame';

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  title?: string;
  children: ReactNode;
}

// The dropdown counterpart to TextField — same shared chrome
// (TextFieldFrame), just a <select> instead of an <input>. Callers keep
// passing plain <option> children and casting onChange's string to their
// own enum type, same as the raw <select>s this replaces.
export default function SelectField({ label, value, onChange, required, disabled, title, children }: SelectFieldProps) {
  function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    onChange(e.target.value);
  }

  return (
    <TextFieldFrame label={label}>
      <select
        className="text-field__input"
        value={value}
        onChange={handleChange}
        required={required}
        disabled={disabled}
        title={title}
      >
        {children}
      </select>
    </TextFieldFrame>
  );
}
