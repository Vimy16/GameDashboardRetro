const fs = require('node:fs')
const path = require('node:path')

const systemFolderByPlatform = {
  NES: ['nintendonintendoentertainmentsystem', 'nintendoentertainmentsystem', 'nes'],
  SNES: ['nintendosupernintendoentertainmentsystem', 'supernintendoentertainmentsystem', 'snes'],
  'Game Boy': ['nintendogameboy', 'gameboy'],
  GBC: ['nintendogameboycolor', 'gameboycolor', 'gbc'],
  GBA: ['nintendogameboyadvance', 'gameboyadvance', 'gba'],
  'Nintendo 64': ['nintendonintendo64', 'nintendo64', 'n64'],
  GameCube: ['nintendogamecube', 'gamecube', 'ngc'],
  Genesis: ['segamegadrivegenesis', 'segagenesis', 'megadrive', 'genesis'],
  PlayStation: ['sonyplaystation', 'playstation', 'psx'],
}

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp'])

function normalizeName(value, stripGroups = false) {
  const withoutExtension = path.basename(value).replace(/\.[^.]+$/, '')
  const withoutNkit = withoutExtension.replace(/\.nkit$/i, '')
  const withoutGroups = stripGroups ? withoutNkit.replace(/\([^)]*\)/g, ' ') : withoutNkit
  return withoutGroups.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function createLocalArtworkLookup(rootFolder) {
  const artworkIndex = new Map()
  const titleIndex = new Map()

  function addAsset(index, platform, filePath) {
    const key = `${platform}:${normalizeName(filePath)}`
    if (!index.has(key)) index.set(key, filePath)

    const grouplessKey = `${platform}:${normalizeName(filePath, true)}`
    if (!index.has(grouplessKey)) index.set(grouplessKey, filePath)
  }

  function scan(folder, relativeSegments = []) {
    if (!fs.existsSync(folder)) return

    const entries = fs.readdirSync(folder, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))
    const assetFolder = relativeSegments.at(-1)?.toLowerCase()
    const index = assetFolder === 'named_boxarts'
      ? artworkIndex
      : assetFolder === 'named_titles'
        ? titleIndex
        : null

    for (const entry of entries) {
      if (!entry.isFile() && !entry.isDirectory()) continue
      const entryPath = path.join(folder, entry.name)

      if (entry.isDirectory()) {
        scan(entryPath, [...relativeSegments, entry.name])
        continue
      }
      if (!index || !imageExtensions.has(path.extname(entry.name).toLowerCase())) continue

      const normalizedSegments = relativeSegments.slice(0, -1)
        .map((segment) => segment.normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '').toLowerCase())
      for (const [platform, aliases] of Object.entries(systemFolderByPlatform)) {
        if (aliases.some((alias) => normalizedSegments.includes(alias))) {
          addAsset(index, platform, entryPath)
          break
        }
      }
    }
  }

  scan(rootFolder)

  function findAsset(index, filePath, platform, metadataTitle) {
    const candidates = [
      path.basename(filePath).replace(/\.nkit(?=\.|$)/i, ''),
      metadataTitle,
    ].filter(Boolean)

    for (const candidate of candidates) {
      const exact = index.get(`${platform}:${normalizeName(candidate)}`)
      if (exact) return exact
    }
    for (const candidate of candidates) {
      const groupless = index.get(`${platform}:${normalizeName(candidate, true)}`)
      if (groupless) return groupless
    }
    return null
  }

  return {
    findArtwork(filePath, platform, metadataTitle) {
      return findAsset(artworkIndex, filePath, platform, metadataTitle)
    },
    findTitle(filePath, platform, metadataTitle) {
      const titleImagePath = findAsset(titleIndex, filePath, platform, metadataTitle)
      return titleImagePath ? path.parse(titleImagePath).name : null
    },
  }
}

module.exports = { createLocalArtworkLookup }
