import type { ChangeEvent, InputHTMLAttributes } from 'react';
import TextFieldFrame from './TextFieldFrame';
import NumberInput from './NumberInput';

interface TextFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
  required?: boolean;
  min?: InputHTMLAttributes<HTMLInputElement>['min'];
}

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
    <TextFieldFrame label={label}>
      {type === 'number' ? (
        <NumberInput
          className="text-field__input"
          value={value}
          onChange={onChange}
          min={min}
          placeholder={placeholder ?? label}
          required={required}
        />
      ) : (
        <input
          className="text-field__input"
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder ?? label}
          required={required}
        />
      )}
    </TextFieldFrame>
  );
}
