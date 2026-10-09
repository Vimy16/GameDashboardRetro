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
  md: 'Genesis',
  gen: 'Genesis',
  iso: 'PlayStation',
  cue: 'PlayStation',
  bin: 'PlayStation',
  zip: 'Other',
  '7z': 'Other',
}

const insertGameSql = `
  INSERT INTO games (
    title, subtitle, platform, genre, year, cover, symbol,
    favorite, recent, file_path, added_at
  ) VALUES (
    @title, @subtitle, @platform, @genre, @year, @cover, @symbol,
    @favorite, @recent, @filePath, @addedAt
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
  }
}

function createGameStore(database) {
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
      added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL
    );
  `)

  const insertGame = database.prepare(insertGameSql)
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

    addFiles(filePaths) {
      const insertFile = database.prepare(insertGameSql.replace('INSERT INTO games', 'INSERT OR IGNORE INTO games'))
      let addedCount = 0

      runTransaction(() => {
        for (const filePath of filePaths) {
          const extension = path.extname(filePath).slice(1).toLowerCase()
          const title = path.parse(filePath).name.replace(/[_-]/g, ' ')
          const result = insertFile.run({
            title,
            subtitle: 'Recently added to your library',
            platform: platformByExtension[extension] ?? 'Other',
            genre: 'Game',
            year: '—',
            cover: 'new-game',
            symbol: '✦',
            favorite: 0,
            recent: 0,
            filePath,
            addedAt: new Date().toISOString(),
          })
          addedCount += Number(result.changes)
        }
      })
      return { addedCount, games: this.list() }
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

module.exports = { createGameStore }
