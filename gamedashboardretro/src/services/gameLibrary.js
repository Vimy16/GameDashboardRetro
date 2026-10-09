function getDesktopApi() {
  if (!window.pixelVault) {
    throw new Error('Launch GDR with npm run electron to use the desktop library.')
  }

  return window.pixelVault
}

export const loadGames = () => getDesktopApi().listGames()

export const addGames = () => getDesktopApi().addGames()

export const toggleFavorite = (gameId) => getDesktopApi().toggleFavorite(gameId)

export const removeGame = (gameId) => getDesktopApi().removeGame(gameId)

export const openDataFolder = () => getDesktopApi().openDataFolder()

export const toggleFullscreen = () => getDesktopApi().toggleFullscreen()
