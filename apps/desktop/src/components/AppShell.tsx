import type { ReactNode } from 'react';
import './AppShell.css';

export type View =
  | 'home'
  | 'classes'
  | 'adversaries-environments'
  | 'domains'
  | 'heritage'
  | 'equipment'
  | 'optional-mechanics';

interface NavLink {
  view: View;
  label: string;
}

// One entry per built gallery/browse page — everything the Home tiles link
// to is reachable from here too, so navigation never depends on having
// come from Home first.
const NAV_LINKS: NavLink[] = [
  { view: 'classes', label: 'Classes' },
  { view: 'adversaries-environments', label: 'Adversaries & Environments' },
  { view: 'domains', label: 'Domains' },
  { view: 'heritage', label: 'Heritage' },
  { view: 'equipment', label: 'Equipment' },
  { view: 'optional-mechanics', label: 'Optional Mechanics' },
];

interface AppShellProps {
  view: View;
  onNavigate: (view: View) => void;
  children: ReactNode;
}

// The persistent chrome every page renders inside — this is what makes
// navigation feel like moving around one app instead of swapping pages:
// the brand/nav bar never unmounts, only the content below it does. The
// content re-mounts on every view change (keyed by `view`) so it always
// gets the same fade-and-lift entrance every other stage transition in the
// app uses, instead of an instant swap.
export default function AppShell({ view, onNavigate, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <nav className="app-shell__bar">
        <button type="button" className="app-shell__brand" onClick={() => onNavigate('home')}>
          Daggerheart Hub
        </button>
        <div className="app-shell__nav">
          {NAV_LINKS.map((link) => (
            <button
              key={link.view}
              type="button"
              className={`app-shell__nav-link${view === link.view ? ' active' : ''}`}
              onClick={() => onNavigate(link.view)}
            >
              {link.label}
            </button>
          ))}
        </div>
      </nav>
      <div className="app-shell__page" key={view}>
        {children}
      </div>
    </div>
  );
}
