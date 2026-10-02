import type { SessionMode } from '../api/sessions';
import './ModeTransitionFX.css';

interface ModeTransitionFXProps {
  mode: SessionMode;
  onDone: () => void;
}

// A quick (~0.25s), purely decorative flourish that plays once when
// ModeToggle switches — footsteps walking off for Adventuring, two swords
// crossing for Combat. Mounted fresh on every switch (ModeToggle gives it a
// new `key`) and unmounts itself via onAnimationEnd on the outer wrapper,
// so there's no timer to clean up and no state beyond "is it mounted."
export default function ModeTransitionFX({ mode, onDone }: ModeTransitionFXProps) {
  return (
    <div className="mode-fx" aria-hidden="true" onAnimationEnd={onDone}>
      {mode === 'combat' ? (
        <svg className="mode-fx__art mode-fx__swords" viewBox="0 0 100 60">
          <path className="mode-fx__sword mode-fx__sword--a" d="M20,8 L80,52 M20,8 L28,8 M20,8 L20,16" />
          <path className="mode-fx__sword mode-fx__sword--b" d="M80,8 L20,52 M80,8 L72,8 M80,8 L80,16" />
        </svg>
      ) : (
        <svg className="mode-fx__art mode-fx__steps" viewBox="0 0 100 40">
          <ellipse className="mode-fx__step mode-fx__step--1" cx="18" cy="24" rx="7" ry="4" />
          <ellipse className="mode-fx__step mode-fx__step--2" cx="47" cy="14" rx="7" ry="4" />
          <ellipse className="mode-fx__step mode-fx__step--3" cx="76" cy="24" rx="7" ry="4" />
        </svg>
      )}
    </div>
  );
}
