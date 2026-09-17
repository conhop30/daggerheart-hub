import './StatStepper.css';

interface StatStepperProps {
  label: string;
  current: number;
  max: number;
  onChange: (current: number) => void;
}

// A small "label, -, current / max, +" control — purely controlled, no API
// awareness of its own, so it's reusable both for a PartyMember's live
// trackables (PartyRoster) and a pulled-in Adversary's HP/Stress boxes
// (SessionAdversaryTile).
export default function StatStepper({ label, current, max, onChange }: StatStepperProps) {
  function clamp(value: number): number {
    return Math.max(0, Math.min(max, value));
  }

  return (
    <div className="stat-stepper">
      <span className="stat-stepper__label">{label}</span>
      <div className="stat-stepper__controls">
        <button
          type="button"
          className="stat-stepper__button"
          onClick={() => onChange(clamp(current - 1))}
          disabled={current <= 0}
          aria-label={`Decrease ${label}`}
        >
          &minus;
        </button>
        <span className="stat-stepper__value">
          {current} / {max}
        </span>
        <button
          type="button"
          className="stat-stepper__button"
          onClick={() => onChange(clamp(current + 1))}
          disabled={current >= max}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
