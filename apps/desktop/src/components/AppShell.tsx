import type { ReactNode } from 'react';
import './AppShell.css';

export type View =
  | 'home'
  | 'classes'
  | 'adversaries-environments'
  | 'domains'
  | 'heritage'
  | 'equipment'
  | 'optional-mechanics'
  | 'settings';

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
        <button
          type="button"
          className={`app-shell__settings${view === 'settings' ? ' active' : ''}`}
          onClick={() => onNavigate('settings')}
          aria-label="Settings"
        >
          <SettingsGlyph />
        </button>
      </nav>
      <div className="app-shell__page" key={view}>
        {children}
      </div>
    </div>
  );
}

function SettingsGlyph() {
  return (
    <svg className="app-shell__settings-glyph" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3.5v2.4M12 18.1v2.4M20.5 12h-2.4M5.9 12H3.5M17.7 6.3l-1.7 1.7M8 16l-1.7 1.7M17.7 17.7L16 16M8 8 6.3 6.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
