const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { after, test } = require('node:test')
const { DatabaseSync } = require('node:sqlite')
const { createGameStore } = require('./database/gameStore.cjs')
const { scanPlatformGames } = require('./platformGames.cjs')

const testFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'gdr-platform-games-test-'))
const gamesDirectory = path.join(testFolder, 'Games')
const database = new DatabaseSync(':memory:')
const store = createGameStore(database)

after(() => {
  database.close()
  fs.rmSync(testFolder, { recursive: true, force: true })
})

test('recursively scans a single folder and classifies files by extension', () => {
  const gamePaths = [
    path.join(gamesDirectory, 'Wind_Waker.iso'),
    path.join(gamesDirectory, 'subfolder', 'Castlevania.cue'),
    path.join(gamesDirectory, 'random.zip'),
    path.join(gamesDirectory, 'manual.txt'),
  ]
  fs.mkdirSync(path.dirname(gamePaths[1]), { recursive: true })
  for (const gamePath of gamePaths) fs.writeFileSync(gamePath, '')

  const scan = scanPlatformGames(gamesDirectory)
  const detectedPlatforms = new Map(scan.games.map(({ filePath, platform }) => [filePath, platform]))
  assert.deepEqual(detectedPlatforms, new Map([
    [gamePaths[0], 'GameCube'],
    [gamePaths[1], 'PlayStation'],
    [gamePaths[2], 'Other'],
    [gamePaths[3], 'Other'],
  ]))
  assert.equal(scan.folder, path.resolve(gamesDirectory))

  const synced = store.syncPlatformFiles(scan.games, [scan.folder], scan.folder)
  assert.equal(synced.addedCount, 4)
  assert.equal(synced.removedCount, 0)
  assert.equal(store.getGamesFolder(), gamesDirectory)
  assert.equal(synced.games.find((game) => game.filePath === gamePaths[0]).platform, 'GameCube')
})

test('rescan removes missing games and changing folders prunes the previous folder only', () => {
  const oldScan = scanPlatformGames(gamesDirectory)
  const manualPath = path.join(testFolder, 'manual', 'Kirby.nes')
  store.addFiles([manualPath])
  fs.rmSync(path.join(gamesDirectory, 'random.zip'))

  const rescanned = scanPlatformGames(gamesDirectory)
  const removedMissingFile = store.syncPlatformFiles(
    rescanned.games,
    [rescanned.folder],
    rescanned.folder,
  )
  assert.equal(removedMissingFile.removedCount, 1)
  assert.equal(removedMissingFile.games.some((game) => game.filePath === manualPath), true)

  const newFolder = path.join(testFolder, 'External Games')
  const newGamePath = path.join(newFolder, 'Metroid.gcz')
  fs.mkdirSync(newFolder)
  fs.writeFileSync(newGamePath, '')
  const newFolderScan = scanPlatformGames(newFolder)
  const changedFolder = store.syncPlatformFiles(
    newFolderScan.games,
    [rescanned.folder, newFolderScan.folder],
    newFolderScan.folder,
  )

  assert.equal(changedFolder.removedCount, 3)
  assert.equal(changedFolder.games.some((game) => game.filePath === newGamePath && game.platform === 'GameCube'), true)
  assert.equal(changedFolder.games.some((game) => game.filePath === manualPath), true)
  assert.equal(store.getGamesFolder(), newFolder)
  assert.equal(oldScan.games.length, 4)
})

test('does not scan a path that is not a directory', () => {
  const filePath = path.join(testFolder, 'not-a-folder.txt')
  fs.writeFileSync(filePath, '')
  assert.throws(() => scanPlatformGames(filePath), /not a folder/)
})
