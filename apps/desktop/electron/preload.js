const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('daggerheart', {
  list: (collection) => ipcRenderer.invoke('store:list', collection),
  listSubclassesByParentClass: (parentClassId) =>
    ipcRenderer.invoke('store:listSubclassesByParentClass', parentClassId),
  listCardsByDomain: (domainId) => ipcRenderer.invoke('store:listCardsByDomain', domainId),
  listPartyMembersByCampaign: (campaignId) =>
    ipcRenderer.invoke('store:listPartyMembersByCampaign', campaignId),
  listPartyMembersBySession: (sessionId) => ipcRenderer.invoke('store:listPartyMembersBySession', sessionId),
  listSessionsByCampaign: (campaignId) => ipcRenderer.invoke('store:listSessionsByCampaign', campaignId),
  addSessionLoot: (sessionId, entry) => ipcRenderer.invoke('store:addSessionLoot', sessionId, entry),
  removeSessionLoot: (sessionId, entryId) => ipcRenderer.invoke('store:removeSessionLoot', sessionId, entryId),
  listSessionAdversariesBySession: (sessionId) =>
    ipcRenderer.invoke('store:listSessionAdversariesBySession', sessionId),
  listSessionEnvironmentsBySession: (sessionId) =>
    ipcRenderer.invoke('store:listSessionEnvironmentsBySession', sessionId),
  cloneSession: (sourceId, options) => ipcRenderer.invoke('store:cloneSession', sourceId, options),
  importMusicFiles: (regionId) => ipcRenderer.invoke('music:importFiles', regionId),
  create: (collection, data) => ipcRenderer.invoke('store:create', collection, data),
  update: (collection, id, patch, ctx) => ipcRenderer.invoke('store:update', collection, id, patch, ctx),
  remove: (collection, id, ctx) => ipcRenderer.invoke('store:remove', collection, id, ctx),
  exportData: () => ipcRenderer.invoke('store:export'),
  importData: () => ipcRenderer.invoke('store:import'),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getUpdateState: () => ipcRenderer.invoke('update:getState'),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  // Returns an unsubscribe function.
  onUpdateState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('update:state', listener);
    return () => ipcRenderer.removeListener('update:state', listener);
  },
  saveImage: (dataUrl, defaultName) => ipcRenderer.invoke('file:saveImage', dataUrl, defaultName),
  getWindowSize: () => ipcRenderer.invoke('window:getSize'),
  setWindowSize: (width, height) => ipcRenderer.invoke('window:setSize', { width, height }),
});
