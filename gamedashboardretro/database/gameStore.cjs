const demoGames = [
  { title: 'The Legend of Zelda', subtitle: 'A Link to the Past', platform: 'SNES', genre: 'Adventure', year: '1991', cover: 'zelda', symbol: '✦', favorite: true, recent: true },
  { title: 'Sonic the Hedgehog 2', subtitle: 'Miles “Tails” Prower', platform: 'Genesis', genre: 'Platformer', year: '1992', cover: 'sonic', symbol: '✹', favorite: false, recent: true },
  { title: 'Super Metroid', subtitle: 'Planet Zebes', platform: 'SNES', genre: 'Action', year: '1994', cover: 'metroid', symbol: '◉', favorite: true, recent: false },
  { title: 'Chrono Trigger', subtitle: 'The time-bending RPG', platform: 'SNES', genre: 'RPG', year: '1995', cover: 'chrono', symbol: '⌛', favorite: false, recent: false },
  { title: 'Castlevania: SOTN', subtitle: 'Nocturne in the Moonlight', platform: 'PlayStation', genre: 'Action', year: '1997', cover: 'castlevania', symbol: '☾', favorite: false, recent: true },
  { title: 'Pokémon Emerald', subtitle: 'Hoenn region', platform: 'GBA', genre: 'RPG', year: '2004', cover: 'pokemon', symbol: '◈', favorite: true, recent: false },
  { title: 'Donkey Kong Country', subtitle: 'Kong Island', platform: 'SNES', genre: 'Platformer', year: '1994', cover: 'kong', symbol: '⬟', favorite: false, recent: false },
  { title: 'Final Fantasy VI', subtitle: 'The world of balance', platform: 'SNES', genre: 'RPG', year: '1994', cover: 'fantasy', symbol: '✧', favorite: false, recent: false },
]

const path = require('node:path')

const platformByExtension = {
  nes: 'NES',
  sfc: 'SNES',
  smc: 'SNES',
  gb: 'Game Boy',
  gbc: 'GBC',
  gba: 'GBA',
  n64: 'Nintendo 64',
  z64: 'Nintendo 64',
  gcm: 'GameCube',
  gcz: 'GameCube',
  rvz: 'GameCube',
  iso: 'GameCube',
  md: 'Genesis',
  gen: 'Genesis',
  cue: 'PlayStation',
  bin: 'PlayStation',
  zip: 'Other',
  '7z': 'Other',
}

const insertGameSql = `
  INSERT INTO games (
    title, subtitle, platform, genre, year, cover, symbol,
    favorite, recent, file_path, added_at, developer, publisher, cover_url, artwork_path
  ) VALUES (
    @title, @subtitle, @platform, @genre, @year, @cover, @symbol,
    @favorite, @recent, @filePath, @addedAt, @developer, @publisher, @coverUrl, @artworkPath
  )
`

function toGame(row) {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    platform: row.platform,
    genre: row.genre,
    year: row.year,
    cover: row.cover,
    symbol: row.symbol,
    favorite: Boolean(row.favorite),
    recent: Boolean(row.recent),
    filePath: row.file_path,
    developer: row.developer,
    publisher: row.publisher,
    coverUrl: row.cover_url,
    artworkPath: row.artwork_path,
  }
}

function createImportedGame(filePath, platformOverride, metadataLookup, artworkLookup) {
  const extension = path.extname(filePath).slice(1).toLowerCase()
  const title = path.parse(filePath).name.replace(/\.nkit$/i, '').replace(/[_-]/g, ' ')
  const platform = platformOverride ?? platformByExtension[extension] ?? 'Other'
  const metadata = metadataLookup(filePath, platform)
  const displayTitle = artworkLookup.findTitle(filePath, platform, metadata?.title) ?? title
  const artworkPath = artworkLookup.findArtwork(filePath, platform, metadata?.title ?? title)
  return {
    title: displayTitle,
    subtitle: 'Recently added to your library',
    platform,
    genre: metadata?.genre ?? 'Game',
    year: metadata?.year ?? '—',
    cover: 'new-game',
    symbol: '✦',
    favorite: 0,
    recent: 0,
    filePath,
    addedAt: new Date().toISOString(),
    developer: metadata?.developer ?? null,
    publisher: metadata?.publisher ?? null,
    coverUrl: metadata?.coverUrl ?? null,
    artworkPath,
    hasMetadata: Boolean(metadata),
  }
}

function createGameStore(database, metadataLookup = () => null, artworkLookup = {
  findArtwork: () => null,
  findTitle: () => null,
}) {
  let currentArtworkLookup = artworkLookup

  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      platform TEXT NOT NULL DEFAULT 'Other',
      genre TEXT NOT NULL DEFAULT 'Game',
      year TEXT NOT NULL DEFAULT '—',
      cover TEXT NOT NULL DEFAULT 'new-game',
      symbol TEXT NOT NULL DEFAULT '✦',
      favorite INTEGER NOT NULL DEFAULT 0 CHECK (favorite IN (0, 1)),
      recent INTEGER NOT NULL DEFAULT 0 CHECK (recent IN (0, 1)),
      file_path TEXT UNIQUE,
      developer TEXT,
      publisher TEXT,
      cover_url TEXT,
      artwork_path TEXT,
      added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL
    );
  `)

  const gameColumns = new Set(database.prepare('PRAGMA table_info(games)').all().map(({ name }) => name))
  for (const [column, type] of [
    ['developer', 'TEXT'],
    ['publisher', 'TEXT'],
    ['cover_url', 'TEXT'],
    ['artwork_path', 'TEXT'],
  ]) {
    if (!gameColumns.has(column)) database.exec(`ALTER TABLE games ADD COLUMN ${column} ${type}`)
  }

  const insertGame = database.prepare(insertGameSql)
  const insertFile = database.prepare(insertGameSql.replace('INSERT INTO games', 'INSERT OR IGNORE INTO games'))
  const updateMetadata = database.prepare(`
    UPDATE games SET
      title = @title,
      genre = @genre,
      year = @year,
      developer = @developer,
      publisher = @publisher,
      cover_url = @coverUrl
    WHERE file_path = @filePath
  `)
  const updateArtwork = database.prepare('UPDATE games SET artwork_path = ? WHERE file_path = ?')
  const updateTitle = database.prepare('UPDATE games SET title = ? WHERE file_path = ?')
  const addImportedFile = (filePath, platformOverride) => {
    const importedGame = createImportedGame(filePath, platformOverride, metadataLookup, currentArtworkLookup)
    const { hasMetadata, ...game } = importedGame
    const result = insertFile.run(game)
    if (hasMetadata) {
      updateMetadata.run({
        title: game.title,
        genre: game.genre,
        year: game.year,
        developer: game.developer,
        publisher: game.publisher,
        coverUrl: game.coverUrl,
        filePath: game.filePath,
      })
    }
    updateArtwork.run(game.artworkPath, game.filePath)
    updateTitle.run(game.title, game.filePath)
    return Number(result.changes)
  }
  const runTransaction = (callback) => {
    database.exec('BEGIN IMMEDIATE')
    try {
      const result = callback()
      database.exec('COMMIT')
      return result
    } catch (error) {
      database.exec('ROLLBACK')
      throw error
    }
  }

  const seedVersion = database.prepare(
    "SELECT setting_value FROM app_settings WHERE setting_key = 'demo_games_seeded'",
  ).get()

  if (!seedVersion) {
    runTransaction(() => {
      for (const game of demoGames) {
        insertGame.run({
          ...game,
          favorite: Number(game.favorite),
          recent: Number(game.recent),
          filePath: null,
          addedAt: new Date(Date.UTC(2000, 0, 1) + (demoGames.length - demoGames.indexOf(game)) * 1000).toISOString(),
        })
      }
      database.prepare(`
        INSERT INTO app_settings (setting_key, setting_value)
        VALUES ('demo_games_seeded', '1')
      `).run()
    })
  }

  return {
    list() {
      return database.prepare('SELECT * FROM games ORDER BY added_at DESC, id DESC')
        .all()
        .map(toGame)
    },

    getGamesFolder() {
      return database.prepare(
        "SELECT setting_value FROM app_settings WHERE setting_key = 'games_folder'",
      ).get()?.setting_value ?? null
    },

    getSetting(key) {
      return database.prepare(
        'SELECT setting_value FROM app_settings WHERE setting_key = ?',
      ).get(key)?.setting_value ?? null
    },

    setSetting(key, value) {
      if (typeof key !== 'string' || !key.trim()) {
        throw new TypeError('A setting key is required.')
      }
      if (typeof value !== 'string' || !value) {
        throw new TypeError('A setting value is required.')
      }
      database.prepare(`
        INSERT INTO app_settings (setting_key, setting_value)
        VALUES (?, ?)
        ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
      `).run(key, value)
    },

    clearSetting(key) {
      if (typeof key !== 'string' || !key.trim()) {
        throw new TypeError('A setting key is required.')
      }
      database.prepare('DELETE FROM app_settings WHERE setting_key = ?').run(key)
    },

    setArtworkLookup(lookup) {
      if (typeof lookup?.findArtwork !== 'function' || typeof lookup?.findTitle !== 'function') {
        throw new TypeError('Artwork lookup must provide findArtwork and findTitle functions.')
      }
      currentArtworkLookup = lookup
    },

    addFiles(filePaths) {
      let addedCount = 0

      runTransaction(() => {
        for (const filePath of filePaths) {
          addedCount += addImportedFile(filePath)
        }
      })
      return { addedCount, games: this.list() }
    },

    syncPlatformFiles(scannedGames, managedFolders, gamesFolder) {
      let addedCount = 0
      let removedCount = 0
      const scannedPaths = new Set(scannedGames.map(({ filePath }) => path.resolve(filePath)))
      const resolvedManagedFolders = managedFolders.map((folder) => path.resolve(folder))
      const updatePlatform = database.prepare('UPDATE games SET platform = ? WHERE file_path = ?')
      const deleteGame = database.prepare('DELETE FROM games WHERE id = ?')

      runTransaction(() => {
        for (const { filePath, platform } of scannedGames) {
          addedCount += addImportedFile(filePath, platform)
          updatePlatform.run(platform, filePath)
        }

        const managedGames = database.prepare(
          'SELECT id, file_path FROM games WHERE file_path IS NOT NULL',
        ).all()
        for (const game of managedGames) {
          const resolvedPath = path.resolve(game.file_path)
          const isManaged = resolvedManagedFolders.some((folder) => {
            const relativePath = path.relative(folder, resolvedPath)
            return relativePath !== ''
              && !relativePath.startsWith(`..${path.sep}`)
              && relativePath !== '..'
              && !path.isAbsolute(relativePath)
          })
          if (isManaged && !scannedPaths.has(resolvedPath)) {
            removedCount += Number(deleteGame.run(game.id).changes)
          }
        }
        database.prepare(`
          INSERT INTO app_settings (setting_key, setting_value)
          VALUES ('games_folder', ?)
          ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
        `).run(path.resolve(gamesFolder))
      })

      return { addedCount, removedCount, games: this.list() }
    },

    toggleFavorite(id) {
      const result = database.prepare(`
        UPDATE games SET favorite = 1 - favorite WHERE id = ?
      `).run(id)
      if (result.changes !== 1) throw new Error(`Game ${id} was not found.`)
      return this.list()
    },

    remove(id) {
      const result = database.prepare('DELETE FROM games WHERE id = ?').run(id)
      if (result.changes !== 1) throw new Error(`Game ${id} was not found.`)
      return this.list()
    },
  }
}

module.exports = { createGameStore, platformByExtension }
