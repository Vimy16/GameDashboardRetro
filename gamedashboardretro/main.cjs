const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const { DatabaseSync } = require('node:sqlite')
const fs = require('node:fs')
const path = require('node:path')
const { createGameStore } = require('./database/gameStore.cjs')
const { migrateDatabaseIfNeeded } = require('./database/migrateDatabase.cjs')

app.setName('GDR')

const acceptedExtensions = [
  'nes', 'sfc', 'smc', 'gb', 'gbc', 'gba', 'n64', 'z64',
  'md', 'gen', 'iso', 'cue', 'bin', 'zip', '7z',
]

let mainWindow
let databaseFolder
let database
let gameStore

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 720,
    minHeight: 560,
    fullscreen: true,
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

function registerHandlers() {
  ipcMain.handle('games:list', () => gameStore.list())

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
  fs.mkdirSync(databaseFolder, { recursive: true })
  const databasePath = path.join(databaseFolder, 'gdr.sqlite')
  await migrateDatabaseIfNeeded(previousGdrDatabasePath, databasePath)
  await migrateDatabaseIfNeeded(legacyDatabasePath, databasePath)
  database = new DatabaseSync(databasePath)
  gameStore = createGameStore(database)
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
})
