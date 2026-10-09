const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { after, test } = require('node:test')
const { DatabaseSync } = require('node:sqlite')
const { createGameStore } = require('./gameStore.cjs')

const testFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'gdr-database-test-'))
const databasePath = path.join(testFolder, 'library.sqlite')

after(() => {
  fs.rmSync(testFolder, { recursive: true, force: true })
})

test('seeds the sample library and persists ROMs and game actions in SQLite', () => {
  let database = new DatabaseSync(databasePath)
  let store = createGameStore(database)

  assert.equal(store.list().length, 8)

  const romPath = path.join(testFolder, 'Super_Metroid.sfc')
  const nesPath = path.join(testFolder, 'Kirby.nes')
  const added = store.addFiles([romPath, nesPath, romPath])
  assert.equal(added.addedCount, 2)

  const superMetroid = added.games.find((game) => game.filePath === romPath)
  assert.equal(superMetroid.title, 'Super Metroid')
  assert.equal(superMetroid.platform, 'SNES')
  assert.equal(added.games.find((game) => game.filePath === nesPath).platform, 'NES')

  const updatedGames = store.toggleFavorite(superMetroid.id)
  assert.equal(updatedGames.find((game) => game.id === superMetroid.id).favorite, true)
  database.close()

  database = new DatabaseSync(databasePath)
  store = createGameStore(database)
  const persistedGame = store.list().find((game) => game.filePath === romPath)
  assert.equal(persistedGame.favorite, true)

  const remainingGames = store.remove(persistedGame.id)
  assert.equal(remainingGames.some((game) => game.id === persistedGame.id), false)
  database.close()

  database = new DatabaseSync(databasePath)
  store = createGameStore(database)
  assert.equal(store.list().some((game) => game.filePath === romPath), false)
  assert.equal(store.list().length, 9)
  for (const game of store.list()) store.remove(game.id)
  database.close()

  database = new DatabaseSync(databasePath)
  store = createGameStore(database)
  assert.equal(store.list().length, 0)
  database.close()
})
