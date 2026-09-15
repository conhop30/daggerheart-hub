const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('daggerheart', {
  list: (collection) => ipcRenderer.invoke('store:list', collection),
  listSubclassesByParentClass: (parentClassId) =>
    ipcRenderer.invoke('store:listSubclassesByParentClass', parentClassId),
  create: (collection, data) => ipcRenderer.invoke('store:create', collection, data),
  update: (collection, id, patch) => ipcRenderer.invoke('store:update', collection, id, patch),
  exportData: () => ipcRenderer.invoke('store:export'),
  importData: () => ipcRenderer.invoke('store:import'),
});
