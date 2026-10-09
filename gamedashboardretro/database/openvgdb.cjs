const path = require('node:path')

const systemCodeByPlatform = {
  NES: 'NES',
  SNES: 'SNES',
  'Game Boy': 'GB',
  GBC: 'GBC',
  GBA: 'GBA',
  'Nintendo 64': 'N64',
  GameCube: 'NGC',
  Genesis: 'MD',
  PlayStation: 'PSX',
}

function createOpenVgdbLookup(database) {
  const findRelease = database.prepare(`
    SELECT
      RELEASES.releaseTitleName AS title,
      RELEASES.releaseGenre AS genre,
      RELEASES.releaseDate AS releaseDate,
      RELEASES.releaseDeveloper AS developer,
      RELEASES.releasePublisher AS publisher,
      RELEASES.releaseCoverFront AS coverUrl
    FROM ROMs
    JOIN RELEASES USING (romID)
    JOIN SYSTEMS USING (systemID)
    WHERE SYSTEMS.systemShortName = ?
      AND ROMs.romFileName = ? COLLATE NOCASE
    ORDER BY RELEASES.releaseID
    LIMIT 1
  `)

  return (filePath, platform) => {
    const systemCode = systemCodeByPlatform[platform]
    if (!systemCode) return null

    const romFileName = path.basename(filePath).replace(/\.nkit(?=\.|$)/i, '')
    const match = findRelease.get(systemCode, romFileName)
    if (!match) return null

    const year = match.releaseDate?.match(/\b(?:19|20)\d{2}\b/)?.[0]
    return {
      title: match.title,
      genre: match.genre || undefined,
      year: year || undefined,
      developer: match.developer || undefined,
      publisher: match.publisher || undefined,
      coverUrl: match.coverUrl || undefined,
    }
  }
}

module.exports = { createOpenVgdbLookup }
