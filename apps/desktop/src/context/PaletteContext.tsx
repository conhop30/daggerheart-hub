import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type PalettePreference = 'ember' | 'abyss' | 'verdant' | 'frost' | 'cvd-redgreen' | 'cvd-blueyellow';

const STORAGE_KEY = 'daggerheart-palette-preference';
const VALID: PalettePreference[] = ['ember', 'abyss', 'verdant', 'frost', 'cvd-redgreen', 'cvd-blueyellow'];

function readStoredPreference(): PalettePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (VALID.includes(stored as PalettePreference)) return stored as PalettePreference;
  } catch {
    // Private-mode/blocked storage: fall through to the default below.
  }
  return 'ember';
}

interface PaletteContextValue {
  preference: PalettePreference;
  setPreference: (preference: PalettePreference) => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

// A per-machine UI preference (not game content), same reasoning as
// ThemeContext/TextSizeContext for why this lives in localStorage instead
// of the Export/Import snapshot. "Ember" is the app's original Hope/Fear
// accent pair and needs no attribute at all — tokens.css's base :root
// block already is Ember; [data-palette] on <html> only matters once a
// different palette is chosen.
export function PaletteProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<PalettePreference>(readStoredPreference);

  useEffect(() => {
    if (preference === 'ember') {
      delete document.documentElement.dataset.palette;
    } else {
      document.documentElement.dataset.palette = preference;
    }
  }, [preference]);

  function setPreference(next: PalettePreference) {
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference just won't survive a relaunch — not worth surfacing.
    }
  }

  return <PaletteContext.Provider value={{ preference, setPreference }}>{children}</PaletteContext.Provider>;
}

export function usePalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error('usePalette must be used within a PaletteProvider');
  return ctx;
}
