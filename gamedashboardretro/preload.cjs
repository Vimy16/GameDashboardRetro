const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('pixelVault', {
  listGames: () => ipcRenderer.invoke('games:list'),
  addGames: () => ipcRenderer.invoke('games:add'),
  toggleFavorite: (id) => ipcRenderer.invoke('games:toggle-favorite', id),
  removeGame: (id) => ipcRenderer.invoke('games:remove', id),
  openDataFolder: () => ipcRenderer.invoke('database:open-folder'),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
})
