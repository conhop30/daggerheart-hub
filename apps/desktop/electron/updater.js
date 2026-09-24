// The app's update flow, kept free of Electron imports so it can be unit
// tested with a fake updater. It ASKS before doing anything:
//
//   idle -> checking -> available -> (user says yes) downloading -> downloaded
//                                  \-> (user says later: nothing happens)
//
// Nothing is downloaded until the user opts in, and a downloaded update
// installs when they choose "Restart & install" or, failing that, the next
// time they quit — never in the middle of a session.
//
// Where the app can replace itself (a packaged Windows install or a Linux
// AppImage) this drives electron-updater. Everywhere else — a dev build, an
// unsigned macOS app, or when the release has no update manifest — it
// degrades to the notify-only GitHub check and "Update" just opens the
// download page, so an update is always at least *announced*.

const BUSY = new Set(['checking', 'downloading', 'downloaded']);

/**
 * @param {object} deps
 * @param {string} deps.currentVersion
 * @param {object|null} deps.autoUpdater  electron-updater's autoUpdater (or a fake), null when self-updating isn't possible
 * @param {() => Promise<{updateAvailable:boolean, latestVersion?:string, url?:string, error?:string}>} deps.fallbackCheck
 * @param {(url:string) => Promise<void>} deps.openReleasePage
 * @param {(state:object) => void} deps.onState  called with every new state
 */
function createUpdateManager({ currentVersion, autoUpdater, fallbackCheck, openReleasePage, onState }) {
  let state = { phase: 'idle', currentVersion, canInstall: Boolean(autoUpdater) };

  function set(patch) {
    state = { ...state, ...patch };
    onState(state);
  }

  const messageOf = (err) => (err instanceof Error ? err.message : String(err));

  if (autoUpdater) {
    // Ask first: never download on our own, and only install an update the
    // user chose to download.
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;

    autoUpdater.on('checking-for-update', () => set({ phase: 'checking', error: undefined }));
    autoUpdater.on('update-available', (info) =>
      set({ phase: 'available', latestVersion: info.version, url: undefined, canInstall: true, error: undefined })
    );
    autoUpdater.on('update-not-available', (info) =>
      set({ phase: 'upToDate', latestVersion: info?.version ?? currentVersion, canInstall: true })
    );
    autoUpdater.on('download-progress', (p) => set({ phase: 'downloading', percent: Math.round(p.percent) }));
    autoUpdater.on('update-downloaded', (info) => set({ phase: 'downloaded', latestVersion: info.version, percent: 100 }));
    autoUpdater.on('error', (err) => {
      // A failed check is handled where it was started (check() falls back);
      // a failed download drops back to "available" so the user can retry.
      if (state.phase === 'downloading') set({ phase: 'available', percent: undefined, error: messageOf(err) });
    });
  }

  async function runFallback() {
    set({ phase: 'checking', error: undefined, canInstall: false });
    const info = await fallbackCheck();
    if (info.error) {
      set({ phase: 'error', error: info.error });
    } else if (info.updateAvailable) {
      set({ phase: 'available', latestVersion: info.latestVersion, url: info.url });
    } else {
      set({ phase: 'upToDate', latestVersion: info.latestVersion ?? currentVersion });
    }
  }

  async function check() {
    if (BUSY.has(state.phase)) return state;
    if (autoUpdater) {
      set({ phase: 'checking', error: undefined, canInstall: true });
      try {
        await autoUpdater.checkForUpdates();
        // The updater reports its result through events; if it stayed silent, don't sit on "checking".
        if (state.phase === 'checking') set({ phase: 'upToDate' });
        return state;
      } catch {
        // Typically a release published without an update manifest (latest.yml),
        // or being offline. Fall through to the plain "is there a newer release?" check.
      }
    }
    await runFallback();
    return state;
  }

  async function download() {
    if (state.phase !== 'available') return state;
    if (!state.canInstall) {
      if (state.url) await openReleasePage(state.url);
      return state;
    }
    set({ phase: 'downloading', percent: 0, error: undefined });
    try {
      await autoUpdater.downloadUpdate();
    } catch (err) {
      if (state.phase === 'downloading') set({ phase: 'available', percent: undefined, error: messageOf(err) });
    }
    return state;
  }

  function install() {
    if (state.phase === 'downloaded' && autoUpdater) autoUpdater.quitAndInstall(false, true);
    return state;
  }

  return { check, download, install, getState: () => state };
}

module.exports = { createUpdateManager };
