import type { ReactNode } from 'react';
import './TextField.css';

interface TextFieldFrameProps {
  label: string;
  children: ReactNode;
}

// The shared chrome behind TextField/TextAreaField/SelectField: a neutral
// label (hidden — the control's own placeholder stands in for it) above a
// frame whose only resting border is the curved Hope/Fear bevel on the
// left, a pentagon badge where the two halves meet, and two Hope/Fear
// lines that grow out (askew — Top travels half the distance of Bottom in
// the same time) on focus. All of the actual visual logic lives in
// TextField.css; this just renders the shell and leaves the control itself
// (input/textarea/select) to the caller.
export default function TextFieldFrame({ label, children }: TextFieldFrameProps) {
  return (
    <label className="text-field">
      <span className="text-field__label">{label}</span>
      <span className="text-field__frame">
        <svg className="text-field__seam" viewBox="0 0 100 100" aria-hidden="true">
          {/* The pentagon's 5 edges, split into two polylines exactly where
              they cross the vertical midpoint (y=50) — stroke-only, no
              fill, so it reads as an outline rather than a solid badge. */}
          <polyline points="3.48,50 0,38 50,0 100,38 96.52,50" fill="var(--void)" stroke="var(--hope)" strokeWidth="10" />
          <polyline points="96.52,50 82,100 18,100 3.48,50" fill="var(--void)" stroke="var(--fear)" strokeWidth="10" />
        </svg>
        <span className="text-field__line text-field__line--top" aria-hidden="true" />
        <span className="text-field__line text-field__line--bottom" aria-hidden="true" />
        {children}
      </span>
    </label>
  );
}
