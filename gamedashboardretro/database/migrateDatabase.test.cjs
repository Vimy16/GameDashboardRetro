const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { after, test } = require('node:test')
const { DatabaseSync } = require('node:sqlite')
const { createGameStore } = require('./gameStore.cjs')
const { migrateDatabaseIfNeeded } = require('./migrateDatabase.cjs')

const testFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'gdr-migration-test-'))
const sourcePath = path.join(testFolder, 'PixelVault', 'database', 'pixelvault.sqlite')
const destinationPath = path.join(testFolder, 'GDR', 'database', 'gdr.sqlite')

after(() => {
  fs.rmSync(testFolder, { recursive: true, force: true })
})

test('migrates the previous database without modifying or overwriting it', async () => {
  fs.mkdirSync(path.dirname(sourcePath), { recursive: true })
  const sourceDatabase = new DatabaseSync(sourcePath)
  const sourceStore = createGameStore(sourceDatabase)
  sourceStore.addFiles([path.join(testFolder, 'My_Retro_Game.sfc')])
  sourceDatabase.close()

  assert.equal(await migrateDatabaseIfNeeded(sourcePath, destinationPath), true)
  assert.equal(fs.existsSync(sourcePath), true)

  const migratedDatabase = new DatabaseSync(destinationPath)
  const migratedStore = createGameStore(migratedDatabase)
  assert.equal(migratedStore.list().length, 9)
  assert.equal(migratedStore.list().some((game) => game.title === 'My Retro Game'), true)
  migratedStore.remove(migratedStore.list().find((game) => game.title === 'My Retro Game').id)
  migratedDatabase.close()

  assert.equal(await migrateDatabaseIfNeeded(sourcePath, destinationPath), false)
  const reopenedDatabase = new DatabaseSync(destinationPath)
  const reopenedStore = createGameStore(reopenedDatabase)
  assert.equal(reopenedStore.list().length, 8)
  reopenedDatabase.close()
})

test('does not create a destination when the legacy database is absent', async () => {
  const missingSource = path.join(testFolder, 'missing.sqlite')
  const unusedDestination = path.join(testFolder, 'unused', 'gdr.sqlite')
  assert.equal(await migrateDatabaseIfNeeded(missingSource, unusedDestination), false)
  assert.equal(fs.existsSync(unusedDestination), false)
})

test('migrates the existing GDR application-data database into the project folder', async () => {
  const appDataDatabasePath = path.join(testFolder, 'AppData', 'GDR', 'database', 'gdr.sqlite')
  const projectDatabasePath = path.join(testFolder, 'ExternalSSD', 'GDR', 'database', 'gdr.sqlite')
  fs.mkdirSync(path.dirname(appDataDatabasePath), { recursive: true })

  const appDataDatabase = new DatabaseSync(appDataDatabasePath)
  const appDataStore = createGameStore(appDataDatabase)
  appDataStore.addFiles([path.join(testFolder, 'SSD_Game.gba')])
  appDataDatabase.close()

  assert.equal(await migrateDatabaseIfNeeded(appDataDatabasePath, projectDatabasePath), true)
  assert.equal(fs.existsSync(appDataDatabasePath), true)

  const projectDatabase = new DatabaseSync(projectDatabasePath)
  const projectStore = createGameStore(projectDatabase)
  assert.equal(projectStore.list().some((game) => game.title === 'SSD Game'), true)
  projectDatabase.close()
})
