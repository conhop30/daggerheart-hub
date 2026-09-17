const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('daggerheart', {
  list: (collection) => ipcRenderer.invoke('store:list', collection),
  listSubclassesByParentClass: (parentClassId) =>
    ipcRenderer.invoke('store:listSubclassesByParentClass', parentClassId),
  listCardsByDomain: (domainId) => ipcRenderer.invoke('store:listCardsByDomain', domainId),
  listPartyMembersByCampaign: (campaignId) =>
    ipcRenderer.invoke('store:listPartyMembersByCampaign', campaignId),
  listSessionsByCampaign: (campaignId) => ipcRenderer.invoke('store:listSessionsByCampaign', campaignId),
  listSessionAdversariesBySession: (sessionId) =>
    ipcRenderer.invoke('store:listSessionAdversariesBySession', sessionId),
  listSessionEnvironmentsBySession: (sessionId) =>
    ipcRenderer.invoke('store:listSessionEnvironmentsBySession', sessionId),
  create: (collection, data) => ipcRenderer.invoke('store:create', collection, data),
  update: (collection, id, patch) => ipcRenderer.invoke('store:update', collection, id, patch),
  remove: (collection, id) => ipcRenderer.invoke('store:remove', collection, id),
  exportData: () => ipcRenderer.invoke('store:export'),
  importData: () => ipcRenderer.invoke('store:import'),
  getWindowSize: () => ipcRenderer.invoke('window:getSize'),
  setWindowSize: (width, height) => ipcRenderer.invoke('window:setSize', { width, height }),
});
