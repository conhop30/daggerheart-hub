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

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 880,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    // Must match vite.config.ts's server.port exactly.
    win.loadURL(`http://localhost:${process.env.DAGGERHEART_DEV_PORT || 5183}`);
  }
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
  musicRegions: store.listMusicRegions,
  musicTracks: store.listMusicTracks,
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
  // musicTracks is deliberately absent: a track is only ever created by the
  // audio import flow below, which has to copy the file in first.
  musicRegions: store.createMusicRegion,
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
  musicRegions: store.updateMusicRegion,
  musicTracks: store.updateMusicTrack,
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
  musicRegions: store.removeMusicRegion,
  // Removing a track also deletes the audio file copied in for it.
  musicTracks: async (id) => {
    const removed = await store.removeMusicTrack(id);
    fs.rmSync(path.join(musicDir(), removed.fileName), { force: true });
  },
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
ipcMain.handle('store:addSessionLoot', (_event, sessionId, entry) => store.addSessionLoot(sessionId, entry));
ipcMain.handle('store:removeSessionLoot', (_event, sessionId, entryId) => store.removeSessionLoot(sessionId, entryId));
ipcMain.handle('store:cloneSession', (_event, sourceId, options) => store.cloneSession(sourceId, options));
ipcMain.handle('store:listSessionAdversariesBySession', (_event, sessionId) =>
  store.listSessionAdversariesBySession(sessionId)
);
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
    title: 'Export Daggerheart Hub data',
    defaultPath: 'daggerheart-hub-export.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { canceled: true };
  fs.writeFileSync(filePath, JSON.stringify(store.exportSnapshot(), null, 2), 'utf-8');
  return { canceled: false, filePath };
});

ipcMain.handle('store:import', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Import Daggerheart Hub data',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (canceled || filePaths.length === 0) return { canceled: true };
  const incoming = JSON.parse(fs.readFileSync(filePaths[0], 'utf-8'));
  const { importedCount } = await store.importSnapshot(incoming);
  return { canceled: false, filePath: filePaths[0], importedCount };
});

// Notify-only update check against GitHub Releases (see updateCheck.js).
// DAGGERHEART_UPDATE_URL exists so tests can point it at a local fake
// server; real usage never sets it.
ipcMain.handle('app:checkForUpdate', () =>
  updateCheck.checkForUpdate({
    currentVersion: app.getVersion(),
    url: process.env.DAGGERHEART_UPDATE_URL || updateCheck.DEFAULT_URL,
  })
);

ipcMain.handle('app:getVersion', () => app.getVersion());

ipcMain.handle('app:openReleasePage', async (_event, url) => {
  if (!updateCheck.isSafeReleaseUrl(url)) throw new Error('Refusing to open a non-release URL.');
  await shell.openExternal(url);
});

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

ipcMain.handle('music:importFiles', async (event, regionId) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Add music',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Audio', extensions: Object.keys(AUDIO_TYPES).map((ext) => ext.slice(1)) }],
  });
  if (canceled || filePaths.length === 0) return { canceled: true, tracks: [] };

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
  return { canceled: false, tracks };
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
