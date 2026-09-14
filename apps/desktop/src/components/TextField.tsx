import type { ChangeEvent, InputHTMLAttributes } from 'react';
import './TextField.css';

interface TextFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
  required?: boolean;
  min?: InputHTMLAttributes<HTMLInputElement>['min'];
}

// The reference text-input pattern for the whole app: a neutral uppercase
// label above a field whose only resting border is the curved bevel on the
// left. Focusing the field grows a Hope-gold line along the top and a
// Fear-violet line along the bottom out from that bevel; blurring retracts
// them the same way. All of the actual animation lives in TextField.css —
// this component just renders the markup and wires the label to the input.
export default function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  min,
}: TextFieldProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
  }

  return (
    <label className="text-field">
      <span className="text-field__label">{label}</span>
      <span className="text-field__frame">
        <input
          className="text-field__input"
          type={type}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          min={min}
        />
      </span>
    </label>
  );
}
