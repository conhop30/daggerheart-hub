import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'daggerheart-theme-preference';
const media = window.matchMedia?.('(prefers-color-scheme: dark)');

function systemTheme(): ResolvedTheme {
  return media?.matches ?? true ? 'dark' : 'light';
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // Private-mode/blocked storage: fall through to the default below.
  }
  return 'system';
}

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// A user's theme choice is a per-machine UI preference, not game content —
// it doesn't belong in the Export/Import snapshot (see store.js), so this
// lives in localStorage instead of going through the IPC data layer.
// "System" is resolved here (not left to a CSS @media query) because the
// Settings page needs to show which of the three the user actually picked,
// not just which one currently renders.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    preference === 'system' ? systemTheme() : preference
  );

  useEffect(() => {
    const resolved = preference === 'system' ? systemTheme() : preference;
    setResolvedTheme(resolved);
    document.documentElement.dataset.theme = resolved;

    if (preference !== 'system' || !media) return;
    const onChange = () => {
      const next = systemTheme();
      setResolvedTheme(next);
      document.documentElement.dataset.theme = next;
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference just won't survive a relaunch — not worth surfacing.
    }
  }

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
