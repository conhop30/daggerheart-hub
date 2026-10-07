// CommonJS on purpose, like preload.cjs — see electron/package.json.
// Electron's main process can run ESM in principle, but `import ... from
// 'electron'` crashes at load time ("Cannot read properties of undefined
// (reading 'exports')") because the `electron` module's CJS shape isn't a
// real file Node's ESM/CJS interop can statically preparse. CJS sidesteps
// the problem entirely.
const { app, BrowserWindow, ipcMain, dialog, screen, shell, protocol } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Readable } = require('node:stream');
const store = require('./store.js');
const updateCheck = require('./updateCheck.js');
const { createUpdateManager } = require('./updater.js');

// DAGGERHEART_STORE_DIR already isolates the JSON data store per e2e test
// (see store.js), but Electron's userData directory — which backs a
// renderer's localStorage (Theme/Palette/Text Size/Music Volume, the
// Journal bubble's position, the Session section order) — otherwise
// defaults to one fixed real path and leaks state between separate test
// runs. Must run before app.whenReady(); mirroring the same env var keeps
// both isolated together.
if (process.env.DAGGERHEART_STORE_DIR) {
  app.setPath('userData', path.join(process.env.DAGGERHEART_STORE_DIR, 'userData'));
}

// Whatever size/mode the window was last left at is what the next launch
// should open with — kept in its own small JSON file (not data.json; this
// is a per-machine UI preference, not campaign content) next to the store,
// so import/export and the "no published book content" data file stay
// untouched by it.
function getWindowPrefsPath() {
  return path.join(store.getStoreDir(), 'window.json');
}

function loadWindowPrefs() {
  try {
    const raw = JSON.parse(fs.readFileSync(getWindowPrefsPath(), 'utf-8'));
    return { width: raw.width ?? 1320, height: raw.height ?? 880, frameless: raw.frameless ?? false };
  } catch {
    return { width: 1320, height: 880, frameless: false };
  }
}

function saveWindowPrefs(patch) {
  try {
    fs.mkdirSync(store.getStoreDir(), { recursive: true });
    const next = { ...loadWindowPrefs(), ...patch };
    fs.writeFileSync(getWindowPrefsPath(), JSON.stringify(next), 'utf-8');
  } catch {
    // Best-effort — the app just falls back to the last-known/default size next launch.
  }
}

// `frame` (and, in practice, `fullscreen`) can only be set when a
// BrowserWindow is created — Electron has no "hide the OS chrome" call on an
// existing window on Windows/Linux — so switching frameless mode on or off
// (see window:setFrameless below) recreates the window rather than mutating
// it. The frameless flag is passed through as a query string on the loaded
// URL/file so the renderer (which needs to know whether to draw its own
// close button, since there's no OS one to fall back to) can read it back
// without a race against an IPC round trip on startup.
//
// `options.frameless` left undefined (the initial app.whenReady() launch,
// or macOS's `activate` with no windows left) means "use whatever was saved
// last" — an explicit true/false (the Settings toggle, via
// window:setFrameless) is a deliberate choice, which is saved right away
// instead of waiting for a resize event that a fullscreen window may never
// produce.
function createWindow(options = {}) {
  const prefs = loadWindowPrefs();
  const frameless = options.frameless ?? prefs.frameless;
  if (options.frameless !== undefined) saveWindowPrefs({ frameless: options.frameless });

  const win = new BrowserWindow({
    width: prefs.width,
    height: prefs.height,
    frame: !frameless,
    fullscreen: frameless,
    // The packaged Windows exe/installer gets its icon from build.win.icon
    // (electron-builder embeds it) — this is what sets the taskbar/title-bar
    // icon for an unpackaged dev run, which otherwise falls back to
    // Electron's own default icon.
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Debounced so dragging a resize handle doesn't hit disk on every pixel —
  // only frameless's own fullscreen isn't saved as a "size" (it's just
  // whatever the monitor happens to be, not a size worth restoring into a
  // future framed launch).
  let resizeTimer = null;
  win.on('resize', () => {
    if (frameless) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const [width, height] = win.getSize();
      saveWindowPrefs({ width, height });
    }, 400);
  });

  const query = frameless ? '?frameless=1' : '';
  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), frameless ? { search: 'frameless=1' } : {});
  } else {
    // Must match vite.config.ts's server.port exactly.
    win.loadURL(`http://localhost:${process.env.DAGGERHEART_DEV_PORT || 5183}${query}`);
  }
  return win;
}

const LIST = {
  gameSets: store.listGameSets,
  domains: store.listDomains,
  heroClasses: store.listHeroClasses,
  subclasses: store.listSubclasses,
  cards: store.listCards,
  adversaries: store.listAdversaries,
  environments: store.listEnvironments,
  weapons: store.listWeapons,
  armors: store.listArmors,
  loot: store.listLoot,
  consumables: store.listConsumables,
  communities: store.listCommunities,
  ancestries: store.listAncestries,
  transformations: store.listTransformations,
  campaigns: store.listCampaigns,
  partyMembers: store.listPartyMembers,
  lootTables: store.listLootTables,
  consumableTables: store.listConsumableTables,
  sessions: store.listSessions,
  sessionAdversaries: store.listSessionAdversaries,
  sessionEnvironments: store.listSessionEnvironments,
  combats: store.listCombats,
  musicRegions: store.listMusicRegions,
  musicTracks: store.listMusicTracks,
  journalEntries: store.listJournalEntries,
};
const CREATE = {
  gameSets: store.createGameSet,
  domains: store.createDomain,
  heroClasses: store.createHeroClass,
  subclasses: store.createSubclass,
  cards: store.createCard,
  adversaries: store.createAdversary,
  environments: store.createEnvironment,
  weapons: store.createWeapon,
  armors: store.createArmor,
  loot: store.createLoot,
  consumables: store.createConsumable,
  communities: store.createCommunity,
  ancestries: store.createAncestry,
  transformations: store.createTransformation,
  campaigns: store.createCampaign,
  partyMembers: store.createPartyMember,
  lootTables: store.createLootTable,
  consumableTables: store.createConsumableTable,
  sessions: store.createSession,
  sessionAdversaries: store.createSessionAdversary,
  sessionEnvironments: store.createSessionEnvironment,
  combats: store.createCombat,
  // musicTracks is deliberately absent: a track is only ever created by the
  // audio import flow below, which has to copy the file in first.
  musicRegions: store.createMusicRegion,
  journalEntries: store.createJournalEntry,
};
const UPDATE = {
  gameSets: store.updateGameSet,
  domains: store.updateDomain,
  heroClasses: store.updateHeroClass,
  subclasses: store.updateSubclass,
  cards: store.updateCard,
  adversaries: store.updateAdversary,
  environments: store.updateEnvironment,
  weapons: store.updateWeapon,
  armors: store.updateArmor,
  loot: store.updateLoot,
  consumables: store.updateConsumable,
  communities: store.updateCommunity,
  ancestries: store.updateAncestry,
  transformations: store.updateTransformation,
  campaigns: store.updateCampaign,
  partyMembers: store.updatePartyMember,
  lootTables: store.updateLootTable,
  consumableTables: store.updateConsumableTable,
  sessions: store.updateSession,
  sessionAdversaries: store.updateSessionAdversary,
  sessionEnvironments: store.updateSessionEnvironment,
  combats: store.updateCombat,
  musicRegions: store.updateMusicRegion,
  musicTracks: store.updateMusicTrack,
  journalEntries: store.updateJournalEntry,
};
// No GameSet/HeroClass/Subclass here — deleting those has real referential-
// integrity questions (a Class with existing Subclasses, a GameSet with
// everything referencing it) that haven't been designed yet. The other ten
// content types have no incoming references except Domain (handled, see
// removeDomain's comment in store.js) or none at all.
const REMOVE = {
  domains: store.removeDomain,
  cards: store.removeCard,
  adversaries: store.removeAdversary,
  environments: store.removeEnvironment,
  weapons: store.removeWeapon,
  armors: store.removeArmor,
  loot: store.removeLoot,
  consumables: store.removeConsumable,
  communities: store.removeCommunity,
  ancestries: store.removeAncestry,
  transformations: store.removeTransformation,
  // Campaign delete cascades to PartyMembers (and, once Sessions exist, to
  // Sessions/SessionAdversaries/SessionEnvironments) inside store.js itself
  // — unlike Domain/Card, a Campaign's children have no other reachable
  // gallery, so leaving them orphaned would strand them with no UI path.
  campaigns: store.removeCampaign,
  partyMembers: store.removePartyMember,
  lootTables: store.removeLootTable,
  consumableTables: store.removeConsumableTable,
  // Session delete cascades to its own SessionAdversaries/SessionEnvironments
  // inside store.js, same reasoning as Campaign -> PartyMembers.
  sessions: store.removeSession,
  sessionAdversaries: store.removeSessionAdversary,
  sessionEnvironments: store.removeSessionEnvironment,
  // Combat delete cascades to its own SessionAdversaries/SessionEnvironments
  // inside store.js, same reasoning as Session -> SessionAdversaries.
  combats: store.removeCombat,
  musicRegions: store.removeMusicRegion,
  // Removing a track also deletes the audio file copied in for it.
  musicTracks: async (id) => {
    const removed = await store.removeMusicTrack(id);
    fs.rmSync(path.join(musicDir(), removed.fileName), { force: true });
  },
  journalEntries: store.removeJournalEntry,
};

function lookup(map, collection) {
  const fn = map[collection];
  if (!fn) throw new Error(`Unknown collection "${collection}"`);
  return fn;
}

ipcMain.handle('store:list', (_event, collection) => lookup(LIST, collection)());
ipcMain.handle('store:listSubclassesByParentClass', (_event, parentClassId) =>
  store.listSubclassesByParentClass(parentClassId)
);
ipcMain.handle('store:listCardsByDomain', (_event, domainId) => store.listCardsByDomain(domainId));
ipcMain.handle('store:listPartyMembersByCampaign', (_event, campaignId) =>
  store.listPartyMembersByCampaign(campaignId)
);
ipcMain.handle('store:listPartyMembersBySession', (_event, sessionId) => store.listPartyMembersBySession(sessionId));
ipcMain.handle('store:listSessionsByCampaign', (_event, campaignId) => store.listSessionsByCampaign(campaignId));
ipcMain.handle('store:listJournalEntriesByCampaign', (_event, campaignId) =>
  store.listJournalEntriesByCampaign(campaignId)
);
ipcMain.handle('store:addSessionLoot', (_event, sessionId, entry) => store.addSessionLoot(sessionId, entry));
ipcMain.handle('store:removeSessionLoot', (_event, sessionId, entryId) => store.removeSessionLoot(sessionId, entryId));
ipcMain.handle('store:cloneSession', (_event, sourceId, options) => store.cloneSession(sourceId, options));
ipcMain.handle('store:listSessionAdversariesBySession', (_event, sessionId) =>
  store.listSessionAdversariesBySession(sessionId)
);
ipcMain.handle('store:listCombatsBySession', (_event, sessionId) => store.listCombatsBySession(sessionId));
ipcMain.handle('store:listSessionEnvironmentsBySession', (_event, sessionId) =>
  store.listSessionEnvironmentsBySession(sessionId)
);
ipcMain.handle('store:create', (_event, collection, data) => lookup(CREATE, collection)(data));
// `ctx` ({ sessionId }) says which Session an edit or delete is made in - only
// the carried-forward collections (Party members, pulled-in Adversaries/
// Environments) look at it; everything else ignores the extra argument.
ipcMain.handle('store:update', (_event, collection, id, patch, ctx) => lookup(UPDATE, collection)(id, patch, ctx));
ipcMain.handle('store:remove', (_event, collection, id, ctx) => lookup(REMOVE, collection)(id, ctx));

ipcMain.handle('window:getSize', (event) => BrowserWindow.fromWebContents(event.sender).getSize());

// Toggles the frameless-fullscreen mode from Settings. See createWindow's
// comment for why this recreates the window instead of mutating it. The new
// window is created before the old one closes so window-all-closed never
// sees a zero-window gap and quits the app out from under this.
ipcMain.handle('window:setFrameless', (event, enabled) => {
  const oldWin = BrowserWindow.fromWebContents(event.sender);
  createWindow({ frameless: enabled });
  // Deferred so this handler's (empty) reply reaches the calling renderer
  // before its window is torn down — closing synchronously here can race
  // Electron's own IPC-reply delivery to a webContents mid-destruction.
  setImmediate(() => oldWin.close());
});

ipcMain.handle('app:quit', () => app.quit());

ipcMain.handle('window:setSize', (event, { width, height }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  // Clamp to the current display's work area — a "Large" preset picked on a
  // laptop screen smaller than 1600x1000 would otherwise push the window
  // partly off-screen instead of just filling what's available.
  const { width: maxW, height: maxH } = screen.getDisplayMatching(win.getBounds()).workAreaSize;
  win.setSize(Math.min(width, maxW), Math.min(height, maxH));
  win.center();
  return win.getSize();
});

ipcMain.handle('store:export', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Export Daggerheart Brewery data',
    defaultPath: 'daggerheart-brewery-export.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { canceled: true };
  fs.writeFileSync(filePath, JSON.stringify(store.exportSnapshot(), null, 2), 'utf-8');
  return { canceled: false, filePath };
});

ipcMain.handle('store:import', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Import Daggerheart Brewery data',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (canceled || filePaths.length === 0) return { canceled: true };
  const incoming = JSON.parse(fs.readFileSync(filePaths[0], 'utf-8'));
  const { importedCount } = await store.importSnapshot(incoming);
  return { canceled: false, filePath: filePaths[0], importedCount };
});

// ---- Updates ----
// The renderer asks (check), the user opts in (download), and only then does
// anything install — see updater.js for the flow. Where the app can replace
// itself this drives electron-updater against the project's GitHub Releases;
// elsewhere it falls back to the notify-only check in updateCheck.js.
//
// DAGGERHEART_UPDATE_URL points that fallback check at a local fake server and
// DAGGERHEART_FAKE_AUTOUPDATER swaps in a scripted updater; both exist only so
// the end-to-end tests can exercise the flow without a real release. Real
// usage sets neither.
function pickAutoUpdater() {
  if (process.env.DAGGERHEART_FAKE_AUTOUPDATER) {
    const { createFakeAutoUpdater } = require('./fakeAutoUpdater.js');
    return createFakeAutoUpdater(process.env.DAGGERHEART_FAKE_AUTOUPDATER, process.env.DAGGERHEART_FAKE_AUTOUPDATER_FAIL);
  }
  if (!app.isPackaged) return null; // a dev build has no installer to replace
  if (process.platform === 'darwin') return null; // unsigned macOS apps can't update themselves
  if (process.platform === 'linux' && !process.env.APPIMAGE) return null; // only an AppImage can
  try {
    return require('electron-updater').autoUpdater;
  } catch {
    return null;
  }
}

let updateManager = null;
function getUpdateManager() {
  if (!updateManager) {
    const currentVersion = app.getVersion();
    updateManager = createUpdateManager({
      currentVersion,
      autoUpdater: pickAutoUpdater(),
      fallbackCheck: () =>
        updateCheck.checkForUpdate({ currentVersion, url: process.env.DAGGERHEART_UPDATE_URL || updateCheck.DEFAULT_URL }),
      openReleasePage: async (url) => {
        if (!updateCheck.isSafeReleaseUrl(url)) throw new Error('Refusing to open a non-release URL.');
        await shell.openExternal(url);
      },
      onState: (state) => {
        for (const win of BrowserWindow.getAllWindows()) win.webContents.send('update:state', state);
      },
    });
  }
  return updateManager;
}

ipcMain.handle('update:getState', () => getUpdateManager().getState());
ipcMain.handle('update:check', () => getUpdateManager().check());
ipcMain.handle('update:download', () => getUpdateManager().download());
ipcMain.handle('update:install', () => getUpdateManager().install());

ipcMain.handle('app:getVersion', () => app.getVersion());

ipcMain.handle('file:saveImage', async (event, dataUrl, defaultName) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Export as Image',
    defaultPath: defaultName || 'export.png',
    filters: [{ name: 'PNG Image', extensions: ['png'] }],
  });
  if (canceled || !filePath) return { canceled: true };
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  return { canceled: false, filePath };
});

// ---- Music library files ----
// Audio is copied into <store dir>/music under a generated name (never the
// user's filename — keeps paths safe and collisions impossible) and played
// back through the dhmedia:// scheme below. Only metadata lives in data.json.
const AUDIO_TYPES = {
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.webm': 'audio/webm',
};

function musicDir() {
  return path.join(store.getStoreDir(), 'music');
}

// The renderer's page origin (http://localhost in dev, file:// packaged)
// can't load local files directly, so audio is served over a tiny custom
// scheme. It must be registered before the app is ready.
protocol.registerSchemesAsPrivileged([
  { scheme: 'dhmedia', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true } },
]);

// dhmedia://track/<generated file name>. Serves byte ranges (206) by hand —
// an <audio loop> needs to seek back to the start, which fails on a source
// that can't answer Range requests.
function serveMedia(request) {
  const fileName = decodeURIComponent(new URL(request.url).pathname.slice(1));
  if (!/^[A-Za-z0-9-]+\.[a-z0-9]+$/.test(fileName)) return new Response('Bad request', { status: 400 });
  const type = AUDIO_TYPES[path.extname(fileName).toLowerCase()];
  const filePath = path.join(musicDir(), fileName);
  if (!type || !fs.existsSync(filePath)) return new Response('Not found', { status: 404 });

  const size = fs.statSync(filePath).size;
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
  let start = 0;
  let end = size - 1;
  if (range) {
    if (range[1] !== '') {
      start = Number(range[1]);
      if (range[2] !== '') end = Math.min(Number(range[2]), size - 1);
    } else if (range[2] !== '') {
      start = Math.max(0, size - Number(range[2])); // suffix range: the last N bytes
    }
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
  }
  const body = Readable.toWeb(fs.createReadStream(filePath, { start, end }));
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': String(end - start + 1) };
  if (range) headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
  return new Response(body, { status: range ? 206 : 200, headers });
}

// Shared by the dialog-based picker (below) and the drag-and-drop IPC
// channel — both end up with a plain list of source file paths, the only
// difference is how that list was gathered.
async function importFilePaths(filePaths, regionId) {
  fs.mkdirSync(musicDir(), { recursive: true });
  const tracks = [];
  for (const source of filePaths) {
    const ext = path.extname(source).toLowerCase();
    if (!AUDIO_TYPES[ext]) continue;
    const fileName = `${randomUUID()}${ext}`;
    const dest = path.join(musicDir(), fileName);
    fs.copyFileSync(source, dest);
    try {
      tracks.push(
        await store.createMusicTrack({
          name: path.basename(source, path.extname(source)),
          regionId,
          fileName,
          sizeBytes: fs.statSync(dest).size,
        })
      );
    } catch (err) {
      fs.rmSync(dest, { force: true }); // don't leave an orphaned copy if the record was rejected
      throw err;
    }
  }
  return tracks;
}

ipcMain.handle('music:importFiles', async (event, regionId) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Add music',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Audio', extensions: Object.keys(AUDIO_TYPES).map((ext) => ext.slice(1)) }],
  });
  if (canceled || filePaths.length === 0) return { canceled: true, tracks: [] };
  return { canceled: false, tracks: await importFilePaths(filePaths, regionId) };
});

// Files dragged from the OS straight onto a region's track list — the
// renderer reads each dropped File's `.path` (an Electron-only extension of
// the web File API for files that came from a real OS drag) and hands us
// just the paths; nothing about file contents crosses the IPC boundary,
// same trust boundary as the dialog-based path above.
ipcMain.handle('music:importDroppedPaths', async (_event, regionId, filePaths) => {
  return { tracks: await importFilePaths(filePaths, regionId) };
});

// Drag a track from one region onto another: a COPY, not a move (moving is
// already the existing "file in region" select) — a new file on disk under
// a fresh generated name, and a new track record, so the original is left
// completely untouched in its own region.
ipcMain.handle('music:copyTrackToRegion', async (_event, trackId, targetRegionId) => {
  const source = store.listMusicTracks().find((t) => t.id === trackId);
  if (!source) throw new Error(`No music track with id ${trackId}`);
  const ext = path.extname(source.fileName);
  const fileName = `${randomUUID()}${ext}`;
  fs.mkdirSync(musicDir(), { recursive: true });
  const srcPath = path.join(musicDir(), source.fileName);
  const destPath = path.join(musicDir(), fileName);
  fs.copyFileSync(srcPath, destPath);
  try {
    return await store.createMusicTrack({
      name: source.name,
      regionId: targetRegionId,
      fileName,
      sizeBytes: source.sizeBytes,
      volume: source.volume,
    });
  } catch (err) {
    fs.rmSync(destPath, { force: true });
    throw err;
  }
});

app.whenReady().then(() => {
  protocol.handle('dhmedia', serveMedia);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Store writes are debounced (see store.js's scheduleWrite) so a rapid burst
// of edits doesn't hit disk on every one — this flushes any still-pending
// write synchronously before the app actually exits, so the last edit
// before quitting is never lost.
app.on('before-quit', () => store.flushPendingWrite());
