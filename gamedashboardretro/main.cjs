const { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } = require('electron')
const { DatabaseSync } = require('node:sqlite')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { createGameStore } = require('./database/gameStore.cjs')
const { createLocalArtworkLookup } = require('./database/localArtwork.cjs')
const { migrateDatabaseIfNeeded } = require('./database/migrateDatabase.cjs')
const { createOpenVgdbLookup } = require('./database/openvgdb.cjs')
const { launchGameCubeGame } = require('./dolphinLauncher.cjs')
const { scanPlatformGames } = require('./platformGames.cjs')

protocol.registerSchemesAsPrivileged([{
  scheme: 'gdr-artwork',
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
}])

app.setName('GDR')
if (process.platform === 'win32') app.setAppUserModelId('com.gdr.desktop')

const acceptedExtensions = [
  'nes', 'sfc', 'smc', 'gb', 'gbc', 'gba', 'n64', 'z64', 'gcm', 'gcz', 'rvz',
  'md', 'gen', 'iso', 'cue', 'bin', 'zip', '7z',
]

let mainWindow
let databaseFolder
let gamesFolder
let gameAssetsFolder
let database
let openVgdbDatabase
let gameStore

function syncPlatformGames(folder = gamesFolder) {
  gameStore.setArtworkLookup(createLocalArtworkLookup(gameAssetsFolder))
  const { games, folder: resolvedFolder } = scanPlatformGames(folder)
  const previousFolder = gameStore.getGamesFolder()
  const managedFolders = [previousFolder, resolvedFolder].filter(Boolean)
  const result = gameStore.syncPlatformFiles(games, managedFolders, resolvedFolder)
  gamesFolder = resolvedFolder
  return { scannedCount: games.length, ...result }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 720,
    minHeight: 560,
    fullscreen: true,
    icon: path.join(
      __dirname,
      process.platform === 'win32' ? 'assets' : path.join('src', 'assets'),
      process.platform === 'win32' ? 'game-dash-retro.ico' : 'game-dash-retro-icon.png',
    ),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadURL('http://localhost:5173')
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function validateGameId(id) {
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new TypeError('A valid game ID is required.')
  }
}

function isInsideFolder(folder, filePath) {
  const relativePath = path.relative(folder, filePath)
  return relativePath !== ''
    && relativePath !== '..'
    && !relativePath.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relativePath)
}

function registerArtworkProtocol() {
  protocol.handle('gdr-artwork', (request) => {
    const filePath = new URL(request.url).searchParams.get('path')
    const isImageFile = filePath && ['.png', '.jpg', '.jpeg', '.webp']
      .includes(path.extname(filePath).toLowerCase())
    if (!isImageFile || !isInsideFolder(gameAssetsFolder, filePath) || !fs.existsSync(filePath)) {
      return new Response('Artwork not found.', { status: 404 })
    }
    return net.fetch(pathToFileURL(filePath).toString())
  })
}

function registerHandlers() {
  ipcMain.handle('games:list', () => gameStore.list())
  ipcMain.handle('games:get-folder', () => gamesFolder)
  ipcMain.handle('games:scan', () => syncPlatformGames())
  ipcMain.handle('games:select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose your games folder',
      properties: ['openDirectory'],
      defaultPath: gamesFolder,
    })
    if (result.canceled) return { canceled: true }
    return { canceled: false, folder: result.filePaths[0], ...syncPlatformGames(result.filePaths[0]) }
  })

  ipcMain.handle('games:add', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Add games to GDR',
      properties: ['openFile', 'multiSelections'],
      filters: [{
        name: 'Game ROMs and archives',
        extensions: acceptedExtensions,
      }],
    })

    if (result.canceled) return { canceled: true, addedCount: 0, games: gameStore.list() }
    const added = gameStore.addFiles(result.filePaths)
    return { canceled: false, ...added }
  })

  ipcMain.handle('games:toggle-favorite', (_event, id) => {
    validateGameId(id)
    return gameStore.toggleFavorite(id)
  })

  ipcMain.handle('games:remove', (_event, id) => {
    validateGameId(id)
    return gameStore.remove(id)
  })

  ipcMain.handle('games:launch', async (_event, id) => {
    validateGameId(id)
    const game = gameStore.list().find((candidate) => candidate.id === id)
    if (!game) throw new Error(`Game ${id} was not found.`)
    if (game.platform !== 'GameCube') throw new Error('Dolphin launching is only available for GameCube games.')
    if (!game.filePath) throw new Error('Add the GameCube ROM file to your library before launching it.')

    await launchGameCubeGame(game.filePath)
    return true
  })

  ipcMain.handle('database:open-folder', async () => {
    const error = await shell.openPath(databaseFolder)
    if (error) throw new Error(`Could not open the database folder: ${error}`)
    return true
  })

  ipcMain.handle('window:toggle-fullscreen', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) throw new Error('The GDR window is no longer available.')
    window.setFullScreen(!window.isFullScreen())
    return window.isFullScreen()
  })
}

app.whenReady().then(async () => {
  const appDataFolder = app.getPath('appData')
  const previousGdrDatabasePath = path.join(appDataFolder, 'GDR', 'database', 'gdr.sqlite')
  const legacyDatabasePath = path.join(appDataFolder, 'PixelVault', 'database', 'pixelvault.sqlite')
  databaseFolder = path.join(__dirname, 'database')
  gameAssetsFolder = path.join(__dirname, 'game-assets')
  fs.mkdirSync(databaseFolder, { recursive: true })
  const databasePath = path.join(databaseFolder, 'gdr.sqlite')
  await migrateDatabaseIfNeeded(previousGdrDatabasePath, databasePath)
  await migrateDatabaseIfNeeded(legacyDatabasePath, databasePath)
  database = new DatabaseSync(databasePath)
  const openVgdbPath = path.join(gameAssetsFolder, 'openvgdb.sqlite')
  if (fs.existsSync(openVgdbPath)) {
    openVgdbDatabase = new DatabaseSync(openVgdbPath, { readOnly: true })
  }
  gameStore = createGameStore(
    database,
    openVgdbDatabase ? createOpenVgdbLookup(openVgdbDatabase) : undefined,
  )
  registerArtworkProtocol()
  const savedGamesFolder = gameStore.getGamesFolder()
  gamesFolder = savedGamesFolder ?? path.join(__dirname, 'games')
  if (!savedGamesFolder) fs.mkdirSync(gamesFolder, { recursive: true })
  try {
    syncPlatformGames()
  } catch (error) {
    dialog.showErrorBox('Could not scan the games folder', error.message)
  }
  registerHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}).catch((error) => {
  dialog.showErrorBox('GDR could not start', error.message)
  app.quit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  database?.close()
  openVgdbDatabase?.close()
})
