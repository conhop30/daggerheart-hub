import { useState } from 'react';
import type { SessionMode } from '../api/sessions';
import ModeTransitionFX from './ModeTransitionFX';
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
  // A fresh key per switch remounts ModeTransitionFX so its animation
  // always restarts from the beginning, even if you flip modes rapidly.
  const [fx, setFx] = useState<{ mode: SessionMode; key: number } | null>(null);

  function select(next: SessionMode) {
    if (next !== mode) {
      setFx({ mode: next, key: Date.now() });
    }
    onChange(next);
  }

  return (
    <div className="mode-toggle" role="group" aria-label="Session mode">
      <button
        type="button"
        className={`mode-toggle__option${mode === 'adventuring' ? ' mode-toggle__option--active' : ''}`}
        onClick={() => select('adventuring')}
      >
        Adventuring
      </button>
      <button
        type="button"
        className={`mode-toggle__option${mode === 'combat' ? ' mode-toggle__option--active' : ''}`}
        onClick={() => select('combat')}
      >
        Combat
      </button>
      {fx && <ModeTransitionFX key={fx.key} mode={fx.mode} onDone={() => setFx(null)} />}
    </div>
  );
}
