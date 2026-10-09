const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { after, test } = require('node:test')
const { DatabaseSync } = require('node:sqlite')
const { createGameStore } = require('./gameStore.cjs')
const { createLocalArtworkLookup } = require('./localArtwork.cjs')
const { createOpenVgdbLookup } = require('./openvgdb.cjs')

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
  const gameCubePath = path.join(testFolder, 'Wind_Waker.rvz')
  const gameCubeIsoPath = path.join(testFolder, 'Metroid_Prime.iso')
  const added = store.addFiles([romPath, nesPath, gameCubePath, gameCubeIsoPath, romPath])
  assert.equal(added.addedCount, 4)

  const superMetroid = added.games.find((game) => game.filePath === romPath)
  assert.equal(superMetroid.title, 'Super Metroid')
  assert.equal(superMetroid.platform, 'SNES')
  assert.equal(added.games.find((game) => game.filePath === nesPath).platform, 'NES')
  assert.equal(added.games.find((game) => game.filePath === gameCubePath).platform, 'GameCube')
  assert.equal(added.games.find((game) => game.filePath === gameCubeIsoPath).platform, 'GameCube')

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
  assert.equal(store.list().length, 11)
  for (const game of store.list()) store.remove(game.id)
  database.close()

  database = new DatabaseSync(databasePath)
  store = createGameStore(database)
  assert.equal(store.list().length, 0)
  database.close()
})

test('enriches imported ROM metadata from a matching OpenVGDB filename', () => {
  const metadataDatabase = new DatabaseSync(':memory:')
  metadataDatabase.exec(`
    CREATE TABLE SYSTEMS (systemID INTEGER PRIMARY KEY, systemShortName TEXT);
    CREATE TABLE ROMs (romID INTEGER PRIMARY KEY, systemID INTEGER, romFileName TEXT);
    CREATE TABLE RELEASES (
      releaseID INTEGER PRIMARY KEY,
      romID INTEGER,
      releaseTitleName TEXT,
      releaseGenre TEXT,
      releaseDate TEXT,
      releaseDeveloper TEXT,
      releasePublisher TEXT,
      releaseCoverFront TEXT
    );
    INSERT INTO SYSTEMS VALUES (1, 'NGC');
    INSERT INTO ROMs VALUES (1, 1, 'Mario Kart - Double Dash!! (USA).iso');
    INSERT INTO RELEASES VALUES (
      1, 1, 'Mario Kart: Double Dash!!', 'action,racing', '2003/11/17',
      'Nintendo', 'Nintendo', 'https://example.invalid/cover.png'
    );
  `)

  const libraryDatabase = new DatabaseSync(':memory:')
  const lookup = createOpenVgdbLookup(metadataDatabase)
  const titleImagePath = path.join(
    testFolder,
    'Libretro-Thumbnails',
    'Nintendo_-_GameCube',
    'Named_Titles',
    'Mario Kart_ Double Dash!! (USA).png',
  )
  fs.mkdirSync(path.dirname(titleImagePath), { recursive: true })
  fs.writeFileSync(titleImagePath, '')
  const artworkLookup = createLocalArtworkLookup(testFolder)
  const coverPath = path.join(testFolder, 'covers', 'double-dash.png')
  const store = createGameStore(libraryDatabase, lookup, {
    ...artworkLookup,
    findArtwork: () => coverPath,
  })
  const romPath = path.join(testFolder, 'Mario Kart - Double Dash!! (USA).nkit.iso')
  const game = store.addFiles([romPath]).games.find((item) => item.filePath === romPath)

  assert.equal(game.title, 'Mario Kart_ Double Dash!! (USA)')
  assert.equal(game.platform, 'GameCube')
  assert.equal(game.genre, 'action,racing')
  assert.equal(game.year, '2003')
  assert.equal(game.developer, 'Nintendo')
  assert.equal(game.publisher, 'Nintendo')
  assert.equal(game.coverUrl, 'https://example.invalid/cover.png')
  assert.equal(game.artworkPath, coverPath)

  libraryDatabase.close()
  metadataDatabase.close()
})

test('refreshes existing game titles and artwork on scan, clearing missing artwork', () => {
  const database = new DatabaseSync(':memory:')
  const store = createGameStore(database)
  const romPath = path.join(testFolder, 'Mario Kart - Double Dash!! (USA).nkit.iso')
  const initialGame = store.addFiles([romPath]).games.find((game) => game.filePath === romPath)
  assert.equal(initialGame.title, 'Mario Kart   Double Dash!! (USA)')
  assert.equal(initialGame.artworkPath, null)

  const systemFolder = path.join(testFolder, 'Libretro-Thumbnails', 'Nintendo_-_GameCube')
  const titleFolder = path.join(systemFolder, 'Named_Titles')
  const boxArtFolder = path.join(systemFolder, 'Named_Boxarts')
  const titleImagePath = path.join(titleFolder, 'Mario Kart_ Double Dash!! (USA).png')
  const boxArtPath = path.join(boxArtFolder, 'Mario Kart - Double Dash!! (USA).png')
  fs.mkdirSync(titleFolder, { recursive: true })
  fs.mkdirSync(boxArtFolder, { recursive: true })
  fs.writeFileSync(titleImagePath, '')
  fs.writeFileSync(boxArtPath, '')

  store.setArtworkLookup(createLocalArtworkLookup(testFolder))
  const scanned = store.syncPlatformFiles([{ filePath: romPath, platform: 'GameCube' }], [], testFolder)
  const matchedGame = scanned.games.find((game) => game.id === initialGame.id)
  assert.equal(matchedGame.title, 'Mario Kart_ Double Dash!! (USA)')
  assert.equal(matchedGame.artworkPath, boxArtPath)

  fs.rmSync(titleImagePath)
  fs.rmSync(boxArtPath)
  store.setArtworkLookup(createLocalArtworkLookup(testFolder))
  const rescanned = store.syncPlatformFiles([{ filePath: romPath, platform: 'GameCube' }], [], testFolder)
  const fallbackGame = rescanned.games.find((game) => game.id === initialGame.id)
  assert.equal(fallbackGame.title, 'Mario Kart   Double Dash!! (USA)')
  assert.equal(fallbackGame.artworkPath, null)
  database.close()
})

test('upgrades existing game databases with OpenVGDB metadata fields', () => {
  const database = new DatabaseSync(':memory:')
  database.exec(`
    CREATE TABLE games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      platform TEXT NOT NULL DEFAULT 'Other',
      genre TEXT NOT NULL DEFAULT 'Game',
      year TEXT NOT NULL DEFAULT '—',
      cover TEXT NOT NULL DEFAULT 'new-game',
      symbol TEXT NOT NULL DEFAULT '✦',
      favorite INTEGER NOT NULL DEFAULT 0,
      recent INTEGER NOT NULL DEFAULT 0,
      file_path TEXT UNIQUE,
      added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE app_settings (setting_key TEXT PRIMARY KEY, setting_value TEXT NOT NULL);
  `)

  createGameStore(database)
  const columns = database.prepare('PRAGMA table_info(games)').all().map(({ name }) => name)
  assert.ok(columns.includes('developer'))
  assert.ok(columns.includes('publisher'))
  assert.ok(columns.includes('cover_url'))
  assert.ok(columns.includes('artwork_path'))
  database.close()
})
