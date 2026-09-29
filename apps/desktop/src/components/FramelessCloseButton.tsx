import { apiClient } from '../api/client';
import './FramelessCloseButton.css';

// Frameless-fullscreen mode (toggled from Settings) recreates the window
// with no OS title bar — see electron/main.js — which means no OS close
// button either. The renderer that window loads gets a `?frameless=1` query
// string so it knows to render this in its place. Its only job is quitting;
// getting back to a normal window is done from Settings, which stays
// reachable through the app's own nav regardless of window chrome.
const isFrameless = new URLSearchParams(window.location.search).get('frameless') === '1';

export default function FramelessCloseButton() {
  if (!isFrameless) return null;
  return (
    <button
      type="button"
      className="frameless-close"
      aria-label="Quit Daggerheart Brewery"
      title="Quit Daggerheart Brewery"
      onClick={() => apiClient.quitApp().catch(() => {})}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}
