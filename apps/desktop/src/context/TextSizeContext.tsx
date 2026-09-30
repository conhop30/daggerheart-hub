import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type TextSizePreference = 'small' | 'normal' | 'large';

const STORAGE_KEY = 'daggerheart-text-size-preference';

function readStoredPreference(): TextSizePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'small' || stored === 'normal' || stored === 'large') return stored;
  } catch {
    // Private-mode/blocked storage: fall through to the default below.
  }
  return 'small';
}

interface TextSizeContextValue {
  preference: TextSizePreference;
  setPreference: (preference: TextSizePreference) => void;
}

const TextSizeContext = createContext<TextSizeContextValue | null>(null);

// A per-machine UI preference (not game content), same reasoning as
// ThemeContext for why this lives in localStorage instead of the
// Export/Import snapshot. "Small" is the app's original, deliberately
// compact density — the default, and needs no attribute at all. Setting
// [data-text-size] here just drives tokens.css's --text-scale, which
// scales the root font-size; nearly everything in this app sizes its own
// text in rem, so that one variable reaches the whole app without a
// per-component rewrite.
export function TextSizeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<TextSizePreference>(readStoredPreference);

  useEffect(() => {
    document.documentElement.dataset.textSize = preference;
  }, [preference]);

  function setPreference(next: TextSizePreference) {
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference just won't survive a relaunch — not worth surfacing.
    }
  }

  return <TextSizeContext.Provider value={{ preference, setPreference }}>{children}</TextSizeContext.Provider>;
}

export function useTextSize(): TextSizeContextValue {
  const ctx = useContext(TextSizeContext);
  if (!ctx) throw new Error('useTextSize must be used within a TextSizeProvider');
  return ctx;
}
