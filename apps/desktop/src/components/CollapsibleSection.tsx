import { useState, type ReactNode } from 'react';
import './CollapsibleSection.css';

interface CollapsibleSectionProps {
  title: string;
  /** Starts open when true. Defaults to closed — the common case (SessionAdversaryTile's Features) starts open instead, so this isn't shared as a default. */
  defaultOpen?: boolean;
  children: ReactNode;
}

// A generic "▸ Title" / "▾ Title" disclosure — modeled on the toggle
// SessionAdversaryTile already uses for its Features section. Children are
// conditionally rendered, not CSS-hidden, so whatever's inside (here:
// MusicLibraryEditor) doesn't fetch anything until actually expanded.
export default function CollapsibleSection({ title, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="collapsible-section">
      <button
        type="button"
        className="collapsible-section__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? '▾' : '▸'} {title}
      </button>
      {open && <div className="collapsible-section__body">{children}</div>}
    </div>
  );
}
