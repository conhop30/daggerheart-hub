import './QuantityStepper.css';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
}

// Same "-, n, +" shape as StatStepper, but floors at 1 instead of 0 — this
// is "how many copies to add next", never zero, so it can't reuse
// StatStepper as-is without breaking that component's HP/Stress/trackable
// callers, which rely on reaching a floor of 0.
export default function QuantityStepper({ value, onChange, max = 20 }: QuantityStepperProps) {
  function clamp(next: number): number {
    return Math.max(1, Math.min(max, next));
  }

  return (
    <div className="quantity-stepper">
      <button
        type="button"
        className="quantity-stepper__button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= 1}
        aria-label="Decrease quantity"
      >
        &minus;
      </button>
      <span className="quantity-stepper__value">{value}</span>
      <button
        type="button"
        className="quantity-stepper__button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
