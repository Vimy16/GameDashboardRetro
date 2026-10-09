const fs = require('node:fs')
const path = require('node:path')
const { platformByExtension } = require('./database/gameStore.cjs')

function collectGames(directory, games) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      collectGames(entryPath, games)
    } else if (entry.isFile()) {
      const extension = path.extname(entry.name).slice(1).toLowerCase()
      games.push({
        filePath: entryPath,
        platform: platformByExtension[extension] ?? 'Other',
      })
    }
  }
}

function scanPlatformGames(gamesDirectory) {
  const folder = path.resolve(gamesDirectory)
  const stats = fs.statSync(folder)
  if (!stats.isDirectory()) throw new Error(`The selected games path is not a folder: ${folder}`)

  const games = []
  collectGames(folder, games)
  return { games, folder }
}

module.exports = { scanPlatformGames }
