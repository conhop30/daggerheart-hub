const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('daggerheart', {
  list: (collection) => ipcRenderer.invoke('store:list', collection),
  listSubclassesByParentClass: (parentClassId) =>
    ipcRenderer.invoke('store:listSubclassesByParentClass', parentClassId),
  listCardsByDomain: (domainId) => ipcRenderer.invoke('store:listCardsByDomain', domainId),
  create: (collection, data) => ipcRenderer.invoke('store:create', collection, data),
  update: (collection, id, patch) => ipcRenderer.invoke('store:update', collection, id, patch),
  remove: (collection, id) => ipcRenderer.invoke('store:remove', collection, id),
  exportData: () => ipcRenderer.invoke('store:export'),
  importData: () => ipcRenderer.invoke('store:import'),
});
