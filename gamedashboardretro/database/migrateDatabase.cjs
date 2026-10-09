const fs = require('node:fs')
const path = require('node:path')
const { backup, DatabaseSync } = require('node:sqlite')

async function migrateDatabaseIfNeeded(sourcePath, destinationPath) {
  if (!fs.existsSync(sourcePath) || fs.existsSync(destinationPath)) return false

  fs.mkdirSync(path.dirname(destinationPath), { recursive: true })
  const sourceDatabase = new DatabaseSync(sourcePath)
  try {
    await backup(sourceDatabase, destinationPath)
  } catch (error) {
    fs.rmSync(destinationPath, { force: true })
    throw error
  } finally {
    sourceDatabase.close()
  }

  return true
}

module.exports = { migrateDatabaseIfNeeded }
