import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { makeRollLogEntry, type RollLogEntry } from '../lib/rollLog';

interface RollLogContextValue {
  entriesFor: (sessionId: string) => RollLogEntry[];
  addRoll: (sessionId: string, label: string, total: number) => void;
  clear: (sessionId: string) => void;
}

const RollLogContext = createContext<RollLogContextValue | null>(null);

// Keeps each Session's roll history alive in memory for as long as the app
// keeps running, even while the GM steps away from that Session's view (the
// Campaign/session list, another top-level page) and back — mounted once at
// the app root (see App.tsx) for the same reason MusicContext is: a
// useState living inside SessionView itself is destroyed the moment that
// view unmounts, which is exactly what stopped the log from being "a true
// record for that session's rolls." Still never written to disk — table
// chatter, not campaign data — so it resets on an app restart; see
// lib/rollLog.
export function RollLogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<Record<string, RollLogEntry[]>>({});

  // Appended to the end, not the front — the log reads oldest-to-newest,
  // top-to-bottom, so the newest roll is the one nearest the panel's
  // always-visible bottom edge instead of requiring a scroll-up to find.
  const addRoll = useCallback((sessionId: string, label: string, total: number) => {
    setLogs((prev) => ({
      ...prev,
      [sessionId]: [...(prev[sessionId] ?? []), makeRollLogEntry(label, total)].slice(-50),
    }));
  }, []);

  const clear = useCallback((sessionId: string) => {
    setLogs((prev) => ({ ...prev, [sessionId]: [] }));
  }, []);

  const entriesFor = useCallback((sessionId: string) => logs[sessionId] ?? [], [logs]);

  return <RollLogContext.Provider value={{ entriesFor, addRoll, clear }}>{children}</RollLogContext.Provider>;
}

// One Session's slice of the shared log, plus bound mutators — SessionView
// only ever needs its own current session's entries, never another's.
export function useRollLog(sessionId: string) {
  const ctx = useContext(RollLogContext);
  if (!ctx) throw new Error('useRollLog must be used inside <RollLogProvider>.');
  return {
    entries: ctx.entriesFor(sessionId),
    addRoll: (label: string, total: number) => ctx.addRoll(sessionId, label, total),
    clear: () => ctx.clear(sessionId),
  };
}
