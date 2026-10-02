import type { ChangeEvent, InputHTMLAttributes } from 'react';
import { isValidNumberInput } from '../lib/numberInput';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'min'> {
  value: string | number;
  onChange: (value: string) => void;
  /** Negative values are allowed unless min is 0 or greater — same rule isValidNumberInput uses. */
  min?: number | string;
}

// The one place that knows how to render a number field without a native
// <input type="number">'s spinner buttons or its scroll/arrow-key
// stepping — see lib/numberInput for why. Every number field in the app
// (TextField's type="number" mode, and every raw inline one — Thresholds,
// Experience modifiers, session trackers, editable stat chips, table
// positions) renders through this instead of re-deriving the same
// type="text" + inputMode="numeric" + validated onChange by hand.
// Reports the validated raw string back, same as a normal text input —
// callers still do their own string -> number conversion at the point
// they actually need a number (same as before this existed).
export default function NumberInput({ value, onChange, min, ...rest }: NumberInputProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (isValidNumberInput(e.target.value, min)) {
      onChange(e.target.value);
    }
    // Invalid keystrokes are vetoed by simply not calling onChange — since
    // this is a controlled input, React then redraws it back to its last
    // valid value, so the rejected character never visibly lands.
  }

  return <input {...rest} type="text" inputMode="numeric" value={value} onChange={handleChange} />;
}
