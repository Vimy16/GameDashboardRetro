const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('pixelVault', {
  listGames: () => ipcRenderer.invoke('games:list'),
  getGamesFolder: () => ipcRenderer.invoke('games:get-folder'),
  scanGames: () => ipcRenderer.invoke('games:scan'),
  selectGamesFolder: () => ipcRenderer.invoke('games:select-folder'),
  addGames: () => ipcRenderer.invoke('games:add'),
  launchGame: (id) => ipcRenderer.invoke('games:launch', id),
  toggleFavorite: (id) => ipcRenderer.invoke('games:toggle-favorite', id),
  removeGame: (id) => ipcRenderer.invoke('games:remove', id),
  openDataFolder: () => ipcRenderer.invoke('database:open-folder'),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
})
