import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { gameSetsApi, type GameSet } from '../api/gameSets';
import { upsertById } from '../lib/upsert';

interface GameSetsContextValue {
  gameSets: GameSet[];
  loading: boolean;
  createGameSet: (name: string) => Promise<GameSet>;
}

const GameSetsContext = createContext<GameSetsContextValue | null>(null);

// Game Sets are truly global reference data — every content type needs the
// list, and now anywhere can create a new one (see GameSetSelect). Loading
// it once here instead of every page/form fetching its own copy is what
// makes that possible without threading a callback through two dozen call
// sites every time a new one is created.
export function GameSetsProvider({ children }: { children: ReactNode }) {
  const [gameSets, setGameSets] = useState<GameSet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    gameSetsApi
      .list()
      .then((sets) => {
        if (!cancelled) setGameSets(sets);
      })
      .catch(() => {
        // Swallowed on purpose: this fires in a plain browser tab (no
        // Electron), where every other loader in the app shows its own
        // "needs to run inside Electron" message already — this context
        // just falls back to an empty list rather than duplicating that.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function createGameSet(name: string) {
    const created = await gameSetsApi.create({ name });
    setGameSets((prev) => upsertById(prev, created));
    return created;
  }

  return (
    <GameSetsContext.Provider value={{ gameSets, loading, createGameSet }}>{children}</GameSetsContext.Provider>
  );
}

export function useGameSets(): GameSetsContextValue {
  const ctx = useContext(GameSetsContext);
  if (!ctx) throw new Error('useGameSets must be used within a GameSetsProvider');
  return ctx;
}
