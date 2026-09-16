// CommonJS on purpose, like preload.cjs — see electron/package.json.
// Electron's main process can run ESM in principle, but `import ... from
// 'electron'` crashes at load time ("Cannot read properties of undefined
// (reading 'exports')") because the `electron` module's CJS shape isn't a
// real file Node's ESM/CJS interop can statically preparse. CJS sidesteps
// the problem entirely.
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const store = require('./store.js');

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
    win.loadURL('http://localhost:5183');
  }
}

const LIST = {
  gameSets: store.listGameSets,
  domains: store.listDomains,
  heroClasses: store.listHeroClasses,
  subclasses: store.listSubclasses,
  adversaries: store.listAdversaries,
  environments: store.listEnvironments,
  weapons: store.listWeapons,
  armors: store.listArmors,
  loot: store.listLoot,
  consumables: store.listConsumables,
  communities: store.listCommunities,
  ancestries: store.listAncestries,
  transformations: store.listTransformations,
};
const CREATE = {
  gameSets: store.createGameSet,
  domains: store.createDomain,
  heroClasses: store.createHeroClass,
  subclasses: store.createSubclass,
  adversaries: store.createAdversary,
  environments: store.createEnvironment,
  weapons: store.createWeapon,
  armors: store.createArmor,
  loot: store.createLoot,
  consumables: store.createConsumable,
  communities: store.createCommunity,
  ancestries: store.createAncestry,
  transformations: store.createTransformation,
};
const UPDATE = {
  gameSets: store.updateGameSet,
  domains: store.updateDomain,
  heroClasses: store.updateHeroClass,
  subclasses: store.updateSubclass,
  adversaries: store.updateAdversary,
  environments: store.updateEnvironment,
  weapons: store.updateWeapon,
  armors: store.updateArmor,
  loot: store.updateLoot,
  consumables: store.updateConsumable,
  communities: store.updateCommunity,
  ancestries: store.updateAncestry,
  transformations: store.updateTransformation,
};
// No GameSet/HeroClass/Subclass here — deleting those has real referential-
// integrity questions (a Class with existing Subclasses, a GameSet with
// everything referencing it) that haven't been designed yet. The other ten
// content types have no incoming references except Domain (handled, see
// removeDomain's comment in store.js) or none at all.
const REMOVE = {
  domains: store.removeDomain,
  adversaries: store.removeAdversary,
  environments: store.removeEnvironment,
  weapons: store.removeWeapon,
  armors: store.removeArmor,
  loot: store.removeLoot,
  consumables: store.removeConsumable,
  communities: store.removeCommunity,
  ancestries: store.removeAncestry,
  transformations: store.removeTransformation,
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
ipcMain.handle('store:create', (_event, collection, data) => lookup(CREATE, collection)(data));
ipcMain.handle('store:update', (_event, collection, id, patch) => lookup(UPDATE, collection)(id, patch));
ipcMain.handle('store:remove', (_event, collection, id) => lookup(REMOVE, collection)(id));

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

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
