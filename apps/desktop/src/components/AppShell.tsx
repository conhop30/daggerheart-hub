import type { ReactNode } from 'react';
import UpdateBanner from './UpdateBanner';
import FramelessCloseButton from './FramelessCloseButton';
import TankardMark from './TankardMark';
import './AppShell.css';

export type View =
  | 'home'
  | 'classes'
  | 'adversaries-environments'
  | 'domains'
  | 'heritage'
  | 'equipment'
  | 'optional-mechanics'
  | 'campaigns'
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
  { view: 'campaigns', label: 'Campaigns' },
];

interface AppShellProps {
  view: View;
  onNavigate: (view: View) => void;
  children: ReactNode;
}

// The persistent chrome every page renders inside — the brand/nav bar never
// unmounts. `children` is App.tsx's job now, not this component's: it keeps
// every visited page mounted (hidden via CSS, not unmounted) so revisiting
// one doesn't refetch its data, and gives each page its own `.app-shell__page`
// wrapper + key so the fade-and-lift entrance (see AppShell.css) still plays
// on a page's first appearance, just not on every later revisit.
export default function AppShell({ view, onNavigate, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <nav className="app-shell__bar">
        <button type="button" className="app-shell__brand" onClick={() => onNavigate('home')}>
          <span className="app-shell__brand-mark">
            <TankardMark className="app-shell__brand-mark-svg" />
            <span className="app-shell__brand-drip app-shell__brand-drip--1" />
            <span className="app-shell__brand-drip app-shell__brand-drip--2" />
          </span>
          Daggerheart Brewery
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
        <FramelessCloseButton />
      </nav>
      <UpdateBanner />
      {children}
    </div>
  );
}

// A real gear/cog — the previous glyph was straight sun-rays around a
// circle, which read as a dark-mode toggle rather than Settings.
function SettingsGlyph() {
  return (
    <svg className="app-shell__settings-glyph" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
