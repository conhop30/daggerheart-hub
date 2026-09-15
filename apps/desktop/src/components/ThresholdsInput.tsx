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
        <input
          type="number"
          value={value.major ?? ''}
          onChange={(e) => onChange({ ...value, major: e.target.value === '' ? null : Number(e.target.value) })}
        />
      </label>
      <label>
        Severe Threshold
        <input
          type="number"
          value={value.severe ?? ''}
          onChange={(e) => onChange({ ...value, severe: e.target.value === '' ? null : Number(e.target.value) })}
        />
      </label>
    </div>
  );
}
