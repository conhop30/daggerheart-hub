// Every module's API calls go through this. There's no backend anymore —
// `window.daggerheart` is exposed by electron/preload.cjs and talks to the
// local JSON store in electron/main.js over IPC, not HTTP. See
// daggerheart-hub-spec.md Section 6 for why (React Native can't embed the
// Spring Boot backend this used to call, so nothing embeds a backend now).
export interface DaggerheartBridge {
  list: (collection: string) => Promise<unknown[]>;
  listSubclassesByParentClass: (parentClassId: string) => Promise<unknown[]>;
  create: (collection: string, data: unknown) => Promise<unknown>;
  update: (collection: string, id: string, patch: unknown) => Promise<unknown>;
  exportData: () => Promise<{ canceled: boolean; filePath?: string }>;
  importData: () => Promise<{ canceled: boolean; filePath?: string; importedCount?: number }>;
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

export const apiClient = {
  list: <T>(collection: string) => unwrap(bridge().list(collection)) as Promise<T[]>,
  listSubclassesByParentClass: <T>(parentClassId: string) =>
    unwrap(bridge().listSubclassesByParentClass(parentClassId)) as Promise<T[]>,
  create: <T>(collection: string, data: unknown) => unwrap(bridge().create(collection, data)) as Promise<T>,
  update: <T>(collection: string, id: string, patch: unknown) =>
    unwrap(bridge().update(collection, id, patch)) as Promise<T>,
  exportData: () => unwrap(bridge().exportData()),
  importData: () => unwrap(bridge().importData()),
};
