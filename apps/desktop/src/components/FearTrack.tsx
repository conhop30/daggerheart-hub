import './FearTrack.css';

const MAX_FEAR = 12;

interface FearTrackProps {
  fear: number;
  onChange: (next: number) => void;
}

// Purely controlled, no API awareness of its own — same shape as
// StatStepper, so whoever owns the Session record decides how (and
// whether) a change gets persisted. Clicking a pip sets Fear to that pip's
// position; clicking the currently-topmost filled pip again empties back
// to it minus one, so a misclick is one click to undo. The +/- buttons
// exist for exact single-step control, matching StatStepper's affordance.
// Laid out as a vertical rail pinned to the window's left edge (see
// FearTrack.css), so it stays in reach however far the Session page is
// scrolled.
export default function FearTrack({ fear, onChange }: FearTrackProps) {
  function clamp(value: number): number {
    return Math.max(0, Math.min(MAX_FEAR, value));
  }

  function handlePipClick(index: number) {
    const level = index + 1;
    onChange(fear === level ? level - 1 : level);
  }

  return (
    <div className="fear-track">
      <span className="fear-track__label">Fear</span>
      <span className="fear-track__value">
        {fear} / {MAX_FEAR}
      </span>
      <button
        type="button"
        className="fear-track__step"
        onClick={() => onChange(clamp(fear + 1))}
        disabled={fear >= MAX_FEAR}
        aria-label="Increase Fear"
      >
        +
      </button>
      {/* Fills from the bottom up, like a gauge: the column is reversed in
          CSS so pip 1 sits lowest while the DOM stays in counting order. */}
      <div className="fear-track__pips">
        {Array.from({ length: MAX_FEAR }, (_, index) => (
          <button
            key={index}
            type="button"
            className={`fear-track__pip${index < fear ? ' fear-track__pip--filled' : ''}`}
            onClick={() => handlePipClick(index)}
            aria-label={`Set Fear to ${index + 1}`}
          />
        ))}
      </div>
      <button
        type="button"
        className="fear-track__step"
        onClick={() => onChange(clamp(fear - 1))}
        disabled={fear <= 0}
        aria-label="Decrease Fear"
      >
        &minus;
      </button>
    </div>
  );
}
