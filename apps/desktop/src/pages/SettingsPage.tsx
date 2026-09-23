import { useEffect, useState } from 'react';
import { apiClient, type UpdateInfo } from '../api/client';
import { isLaunchCheckEnabled, setLaunchCheckEnabled } from '../lib/updatePrefs';
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

export default function SettingsPage() {
  const { preference, setPreference } = useTheme();
  const [currentSize, setCurrentSize] = useState<[number, number] | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [launchCheck, setLaunchCheck] = useState(isLaunchCheckEnabled);

  async function runUpdateCheck() {
    setChecking(true);
    try {
      const info = await apiClient.checkForUpdate();
      setVersion(info.currentVersion);
      setUpdateInfo(info);
    } catch {
      // Running outside Electron — nothing to check.
    } finally {
      setChecking(false);
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

      <section className="settings-page__section">
        <h2 className="settings-page__section-title">Appearance</h2>
        <p className="settings-page__section-hint">Choose how Daggerheart Hub looks.</p>
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
      </section>

      <section className="settings-page__section">
        <h2 className="settings-page__section-title">Window Size</h2>
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
      </section>

      <section className="settings-page__section">
        <h2 className="settings-page__section-title">About &amp; Updates</h2>
        <p className="settings-page__section-hint">
          {version ? `You're running version ${version}.` : 'Check whether a newer version is out.'} The
          check only reads the project's public release page on GitHub; nothing is downloaded or installed for you.
        </p>
        <div className="settings-page__update-row">
          <button type="button" className="settings-page__option" onClick={runUpdateCheck} disabled={checking}>
            <span className="settings-page__option-label">{checking ? 'Checking…' : 'Check for updates'}</span>
          </button>
          {updateInfo && (
            <p className="settings-page__update-status" role="status">
              {updateInfo.error
                ? "Couldn't reach GitHub right now — try again later."
                : updateInfo.updateAvailable
                  ? `Version ${updateInfo.latestVersion} is available.`
                  : `You're up to date (${updateInfo.currentVersion}).`}
              {updateInfo.updateAvailable && updateInfo.url && (
                <>
                  {' '}
                  <button
                    type="button"
                    className="settings-page__link"
                    onClick={() => apiClient.openReleasePage(updateInfo.url!).catch(() => {})}
                  >
                    View download
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
      </section>
    </div>
  );
}
