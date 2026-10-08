import './ChipSelect.css';

interface ChipSelectProps {
  label: string;
  options: { id: string; name: string }[];
  /** The chosen option's id, or '' for none. */
  value: string;
  onChange: (id: string) => void;
  /** Shown in place of the chips when there's nothing to pick from — e.g. "Choose a Class first". */
  emptyHint?: string;
}

// Pick one of a short list, with every choice on show: a labelled row of
// chips instead of a dropdown. For the handful of places where the list is
// small enough to read at a glance (a Party member's Class, Subclass,
// Ancestry, Community) and a closed dropdown would hide both what the
// field is and what's in it. Clicking the chosen chip again clears it.
export default function ChipSelect({ label, options, value, onChange, emptyHint }: ChipSelectProps) {
  return (
    <div className="chip-select" role="group" aria-label={label}>
      <span className="chip-select__label">{label}</span>
      {options.length === 0 ? (
        <span className="chip-select__empty">{emptyHint ?? 'Nothing to choose from yet.'}</span>
      ) : (
        <div className="chip-select__options">
          {options.map((option) => {
            const chosen = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                className={`chip-select__chip${chosen ? ' chip-select__chip--chosen' : ''}`}
                aria-pressed={chosen}
                onClick={() => onChange(chosen ? '' : option.id)}
              >
                {option.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
