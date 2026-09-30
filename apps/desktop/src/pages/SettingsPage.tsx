import { useEffect, useState } from 'react';
import { apiClient, type UpdateState } from '../api/client';
import { isLaunchCheckEnabled, setLaunchCheckEnabled } from '../lib/updatePrefs';
import { useUpdateState } from '../lib/useUpdateState';
import { useTheme, type ThemePreference } from '../context/ThemeContext';
import './SettingsPage.css';

const THEME_OPTIONS: { value: ThemePreference; label: string; description: string }[] = [
  { value: 'light', label: 'Light', description: 'Always use the light theme.' },
  { value: 'dark', label: 'Dark', description: 'Always use the dark theme.' },
  { value: 'system', label: 'System', description: "Match your OS's appearance, live." },
];

interface WindowSizePreset {
  label: string;
  width: number;
  height: number;
}

// A few common desktop sizes — a laptop-friendly compact size, the app's
// own launch default, and two larger sizes for bigger displays. setSize
// clamps to the current display's work area (see main.js), so picking
// "Large" on a smaller screen just fills what's available instead of
// pushing the window off-screen.
const WINDOW_PRESETS: WindowSizePreset[] = [
  { label: 'Compact', width: 1024, height: 720 },
  { label: 'Standard', width: 1320, height: 880 },
  { label: 'Large', width: 1600, height: 1000 },
  { label: 'Extra Large', width: 1920, height: 1080 },
];

function describeUpdate(update: UpdateState): string {
  switch (update.phase) {
    case 'checking':
      return 'Checking…';
    case 'available':
      return `Version ${update.latestVersion} is available.${update.error ? " The download didn't finish — try again." : ''}`;
    case 'downloading':
      return `Downloading version ${update.latestVersion}… ${update.percent ?? 0}%`;
    case 'downloaded':
      return `Version ${update.latestVersion} is ready to install.`;
    case 'error':
      return "Couldn't check for updates right now — try again later.";
    default:
      return `You're up to date (${update.currentVersion}).`;
  }
}

export default function SettingsPage() {
  const { preference, setPreference } = useTheme();
  const [currentSize, setCurrentSize] = useState<[number, number] | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The window itself (not just this component) is recreated to toggle
  // frameless mode — see apiClient.setFramelessMode — so there's no in-memory
  // state to read this back from after a toggle; the reloaded page's own URL
  // (set by electron/main.js) is the source of truth instead.
  const [frameless, setFrameless] = useState(
    () => new URLSearchParams(window.location.search).get('frameless') === '1'
  );
  const [applyingFrameless, setApplyingFrameless] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const update = useUpdateState();
  // The status line only appears once someone has asked; the launch-time check
  // shouldn't make Settings claim "you're up to date" unprompted.
  const [asked, setAsked] = useState(false);
  const [launchCheck, setLaunchCheck] = useState(isLaunchCheckEnabled);
  const checking = update?.phase === 'checking';

  async function runUpdateCheck() {
    setAsked(true);
    try {
      await apiClient.checkForUpdates();
    } catch {
      // Running outside Electron — nothing to check.
    }
  }

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getVersion()
      .then((v) => {
        if (!cancelled) setVersion(v);
      })
      .catch(() => {});
    apiClient
      .getWindowSize()
      .then((size) => {
        if (!cancelled) setCurrentSize(size);
      })
      .catch(() => {
        // Running outside Electron (plain browser tab) — no window to size.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function applyFrameless(enabled: boolean) {
    setApplyingFrameless(true);
    setFrameless(enabled);
    try {
      // This recreates the window; the current one closes shortly after,
      // so there's no useful state to come back and update here.
      await apiClient.setFramelessMode(enabled);
    } catch (err) {
      setFrameless(!enabled);
      setError(err instanceof Error ? err.message : 'Could not change window mode.');
      setApplyingFrameless(false);
    }
  }

  async function applyPreset(preset: WindowSizePreset) {
    setApplying(preset.label);
    setError(null);
    try {
      const size = await apiClient.setWindowSize(preset.width, preset.height);
      setCurrentSize(size);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resize the window.');
    } finally {
      setApplying(null);
    }
  }

  return (
    <div className="settings-page">
      <h1 className="settings-page__title">Settings</h1>

      <div className="settings-page__ledger">
        <div className="settings-page__row">
          <div className="settings-page__row-label">
            <span className="settings-page__row-index">01</span>
            <div className="settings-page__row-title">Appearance</div>
          </div>
          <div className="settings-page__row-content">
            <p className="settings-page__section-hint">Choose how Daggerheart Brewery looks.</p>
            <div className="settings-page__options">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`settings-page__option${preference === option.value ? ' active' : ''}`}
                  onClick={() => setPreference(option.value)}
                >
                  <span className="settings-page__option-label">{option.label}</span>
                  <span className="settings-page__option-description">{option.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-page__row">
          <div className="settings-page__row-label">
            <span className="settings-page__row-index">02</span>
            <div className="settings-page__row-title">Window Size</div>
          </div>
          <div className="settings-page__row-content">
            <p className="settings-page__section-hint">
              {currentSize ? `Current size: ${currentSize[0]} × ${currentSize[1]}` : 'Pick a standard window size.'}
            </p>
            <div className="settings-page__options">
              {WINDOW_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className={`settings-page__option${
                    currentSize && currentSize[0] === preset.width && currentSize[1] === preset.height ? ' active' : ''
                  }`}
                  onClick={() => applyPreset(preset)}
                  disabled={applying !== null}
                >
                  <span className="settings-page__option-label">{preset.label}</span>
                  <span className="settings-page__option-description">
                    {applying === preset.label ? 'Applying…' : `${preset.width} × ${preset.height}`}
                  </span>
                </button>
              ))}
            </div>
            {error && <p className="settings-page__error">{error}</p>}
            <label className="settings-page__checkbox">
              <input
                type="checkbox"
                checked={frameless}
                onChange={(e) => applyFrameless(e.target.checked)}
                disabled={applyingFrameless}
              />
              Frameless fullscreen mode (no title bar — use the close button that appears in the corner to quit)
            </label>
          </div>
        </div>

        <div className="settings-page__row">
          <div className="settings-page__row-label">
            <span className="settings-page__row-index">03</span>
            <div className="settings-page__row-title">About &amp; Updates</div>
          </div>
          <div className="settings-page__row-content">
            <p className="settings-page__section-hint">
              {version ? `You're running version ${version}.` : 'Check whether a newer version is out.'} When one is,
              you'll be asked — nothing is downloaded or installed unless you say so.
            </p>
            <div className="settings-page__update-row">
              <button type="button" className="settings-page__option" onClick={runUpdateCheck} disabled={checking}>
                <span className="settings-page__option-label">{checking ? 'Checking…' : 'Check for updates'}</span>
              </button>
              {update && (asked || update.phase === 'downloading' || update.phase === 'downloaded') && (
                <p className="settings-page__update-status" role="status">
                  {describeUpdate(update)}
                  {update.phase === 'available' && (
                    <>
                      {' '}
                      <button
                        type="button"
                        className="settings-page__link"
                        onClick={() => apiClient.downloadUpdate().catch(() => {})}
                      >
                        {update.canInstall ? 'Update now' : 'View download'}
                      </button>
                    </>
                  )}
                  {update.phase === 'downloaded' && (
                    <>
                      {' '}
                      <button
                        type="button"
                        className="settings-page__link"
                        onClick={() => apiClient.installUpdate().catch(() => {})}
                      >
                        Restart &amp; install
                      </button>
                    </>
                  )}
                </p>
              )}
            </div>
            <label className="settings-page__checkbox">
              <input
                type="checkbox"
                checked={launchCheck}
                onChange={(e) => {
                  setLaunchCheck(e.target.checked);
                  setLaunchCheckEnabled(e.target.checked);
                }}
              />
              Check for updates when the app starts
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
