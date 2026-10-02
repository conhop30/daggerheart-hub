import NumberInput from './NumberInput';

export interface Thresholds {
  major: number | null;
  severe: number | null;
}

interface ThresholdsInputProps {
  value: Thresholds;
  onChange: (value: Thresholds) => void;
}

// Shared by Adversary and Armor: a Tuple of exactly 2 (Major, Severe).
export default function ThresholdsInput({ value, onChange }: ThresholdsInputProps) {
  return (
    <div className="create-form__row">
      <label>
        Major Threshold
        <NumberInput
          value={value.major ?? ''}
          min={0}
          onChange={(raw) => onChange({ ...value, major: raw === '' ? null : Number(raw) })}
        />
      </label>
      <label>
        Severe Threshold
        <NumberInput
          value={value.severe ?? ''}
          min={0}
          onChange={(raw) => onChange({ ...value, severe: raw === '' ? null : Number(raw) })}
        />
      </label>
    </div>
  );
}
