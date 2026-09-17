import type { SessionMode } from '../api/sessions';
import './ModeToggle.css';

interface ModeToggleProps {
  mode: SessionMode;
  onChange: (mode: SessionMode) => void;
}

// Purely controlled, like FearTrack — switches which panel SessionView
// renders below it. A segmented pair rather than a checkbox/select since
// there are exactly two mutually exclusive states, same visual idea as
// SettingsPage's theme picker.
export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="mode-toggle" role="group" aria-label="Session mode">
      <button
        type="button"
        className={`mode-toggle__option${mode === 'adventuring' ? ' mode-toggle__option--active' : ''}`}
        onClick={() => onChange('adventuring')}
      >
        Adventuring
      </button>
      <button
        type="button"
        className={`mode-toggle__option${mode === 'combat' ? ' mode-toggle__option--active' : ''}`}
        onClick={() => onChange('combat')}
      >
        Combat
      </button>
    </div>
  );
}
