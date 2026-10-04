import type { ReactNode } from 'react';
import './SessionSectionShell.css';

interface SessionSectionShellProps {
  title: string;
  dragHandleProps: Record<string, unknown>;
  children: ReactNode;
}

// A thin drag-affordance strip above a Session-page section (Party/
// Adversaries/Notes), so the three can be reordered the same way Journal
// entries already are — see useDragReorder, which this wraps at section
// rather than row granularity. Deliberately doesn't replace a section's own
// internal header (Party already has one); this just adds the one thing
// none of them has today, a handle to grab.
export default function SessionSectionShell({ title, dragHandleProps, children }: SessionSectionShellProps) {
  return (
    <div className="session-section-shell">
      <div className="session-section-shell__handle-row">
        <span {...dragHandleProps}>⠿</span>
        <span className="session-section-shell__label">{title}</span>
      </div>
      {children}
    </div>
  );
}
