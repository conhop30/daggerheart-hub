// Every module's API calls go through this. There's no backend anymore —
// `window.daggerheart` is exposed by electron/preload.cjs and talks to the
// local JSON store in electron/main.js over IPC, not HTTP. See
// daggerheart-hub-spec.md Section 6 for why (React Native can't embed the
// Spring Boot backend this used to call, so nothing embeds a backend now).
export interface UpdateInfo {
  currentVersion: string;
  updateAvailable: boolean;
  latestVersion?: string;
  url?: string;
  /** Set when the check itself failed (offline, rate-limited...) — not an app error. */
  error?: string;
}

/** Which Session an edit or delete is made in (see electron/carry.js). Omit for the Campaign's latest. */
export interface SessionContext {
  sessionId?: string | null;
}

export interface DaggerheartBridge {
  list: (collection: string) => Promise<unknown[]>;
  listSubclassesByParentClass: (parentClassId: string) => Promise<unknown[]>;
  listCardsByDomain: (domainId: string) => Promise<unknown[]>;
  listPartyMembersByCampaign: (campaignId: string) => Promise<unknown[]>;
  listPartyMembersBySession: (sessionId: string) => Promise<unknown[]>;
  listSessionsByCampaign: (campaignId: string) => Promise<unknown[]>;
  addSessionLoot: (sessionId: string, entry: unknown) => Promise<unknown>;
  removeSessionLoot: (sessionId: string, entryId: string) => Promise<unknown>;
  listSessionAdversariesBySession: (sessionId: string) => Promise<unknown[]>;
  listSessionEnvironmentsBySession: (sessionId: string) => Promise<unknown[]>;
  cloneSession: (sourceId: string, options?: { name?: string }) => Promise<unknown>;
  importMusicFiles: (regionId: string) => Promise<{ canceled: boolean; tracks: unknown[] }>;
  create: (collection: string, data: unknown) => Promise<unknown>;
  update: (collection: string, id: string, patch: unknown, ctx?: SessionContext) => Promise<unknown>;
  remove: (collection: string, id: string, ctx?: SessionContext) => Promise<void>;
  exportData: () => Promise<{ canceled: boolean; filePath?: string }>;
  importData: () => Promise<{ canceled: boolean; filePath?: string; importedCount?: number }>;
  saveImage: (dataUrl: string, defaultName: string) => Promise<{ canceled: boolean; filePath?: string }>;
  getVersion: () => Promise<string>;
  checkForUpdate: () => Promise<UpdateInfo>;
  openReleasePage: (url: string) => Promise<void>;
  getWindowSize: () => Promise<[number, number]>;
  setWindowSize: (width: number, height: number) => Promise<[number, number]>;
}

declare global {
  interface Window {
    daggerheart?: DaggerheartBridge;
  }
}

function bridge(): DaggerheartBridge {
  if (!window.daggerheart) {
    throw new Error(
      'This app needs to run inside the Electron shell, not a plain browser tab — use "npm run electron:dev".'
    );
  }
  return window.daggerheart;
}

// Electron's ipcMain.handle wraps a thrown Error's message with boilerplate
// like `Error invoking remote method 'store:create': Error: <message>` —
// strip that so the UI shows the same clean message a caller wrote.
async function unwrap<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''));
  }
}

// Every method here is `async` on purpose, even though most bodies are a
// single expression — that's what turns bridge()'s synchronous throw (no
// window.daggerheart, i.e. running outside Electron) into a rejected
// Promise instead of an uncaught exception. Callers throughout the app
// (useApiList, GameSetsContext, HomePage) rely on being able to `.catch()`
// or `try/await` this — a non-async version defeats that, since the throw
// happens before any Promise exists to attach a handler to. This is
// exactly what caused a plain `npm run dev` browser tab (no Electron) to
// render a blank page: the throw happened inside a useEffect with no
// Promise to catch it, and with no error boundary anywhere in the app,
// React unmounts the whole tree on an uncaught effect error.
export const apiClient = {
  list: async <T>(collection: string): Promise<T[]> => (await unwrap(bridge().list(collection))) as T[],
  listSubclassesByParentClass: async <T>(parentClassId: string): Promise<T[]> =>
    (await unwrap(bridge().listSubclassesByParentClass(parentClassId))) as T[],
  listCardsByDomain: async <T>(domainId: string): Promise<T[]> =>
    (await unwrap(bridge().listCardsByDomain(domainId))) as T[],
  listPartyMembersByCampaign: async <T>(campaignId: string): Promise<T[]> =>
    (await unwrap(bridge().listPartyMembersByCampaign(campaignId))) as T[],
  listPartyMembersBySession: async <T>(sessionId: string): Promise<T[]> =>
    (await unwrap(bridge().listPartyMembersBySession(sessionId))) as T[],
  listSessionsByCampaign: async <T>(campaignId: string): Promise<T[]> =>
    (await unwrap(bridge().listSessionsByCampaign(campaignId))) as T[],
  addSessionLoot: async <T>(sessionId: string, entry: unknown): Promise<T> =>
    (await unwrap(bridge().addSessionLoot(sessionId, entry))) as T,
  removeSessionLoot: async <T>(sessionId: string, entryId: string): Promise<T> =>
    (await unwrap(bridge().removeSessionLoot(sessionId, entryId))) as T,
  listSessionAdversariesBySession: async <T>(sessionId: string): Promise<T[]> =>
    (await unwrap(bridge().listSessionAdversariesBySession(sessionId))) as T[],
  listSessionEnvironmentsBySession: async <T>(sessionId: string): Promise<T[]> =>
    (await unwrap(bridge().listSessionEnvironmentsBySession(sessionId))) as T[],
  cloneSession: async <T>(sourceId: string, options?: { name?: string }): Promise<T> =>
    (await unwrap(bridge().cloneSession(sourceId, options))) as T,
  importMusicFiles: async <T>(regionId: string): Promise<{ canceled: boolean; tracks: T[] }> =>
    (await unwrap(bridge().importMusicFiles(regionId))) as { canceled: boolean; tracks: T[] },
  create: async <T>(collection: string, data: unknown): Promise<T> =>
    (await unwrap(bridge().create(collection, data))) as T,
  update: async <T>(collection: string, id: string, patch: unknown, ctx?: SessionContext): Promise<T> =>
    (await unwrap(bridge().update(collection, id, patch, ctx))) as T,
  remove: async (collection: string, id: string, ctx?: SessionContext): Promise<void> => {
    await unwrap(bridge().remove(collection, id, ctx));
  },
  exportData: async () => unwrap(bridge().exportData()),
  importData: async () => unwrap(bridge().importData()),
  saveImage: async (dataUrl: string, defaultName: string) => unwrap(bridge().saveImage(dataUrl, defaultName)),
  getVersion: async () => unwrap(bridge().getVersion()),
  checkForUpdate: async () => unwrap(bridge().checkForUpdate()),
  openReleasePage: async (url: string) => unwrap(bridge().openReleasePage(url)),
  getWindowSize: async () => unwrap(bridge().getWindowSize()),
  setWindowSize: async (width: number, height: number) => unwrap(bridge().setWindowSize(width, height)),
};
