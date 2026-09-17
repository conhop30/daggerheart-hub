import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
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

  useEffect(() => {
    let cancelled = false;
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
    </div>
  );
}
