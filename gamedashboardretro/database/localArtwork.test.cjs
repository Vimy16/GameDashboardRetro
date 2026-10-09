const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { after, test } = require('node:test')
const { createLocalArtworkLookup } = require('./localArtwork.cjs')

const testFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'gdr-artwork-test-'))

after(() => {
  fs.rmSync(testFolder, { recursive: true, force: true })
})

test('matches local Libretro box art by platform and ROM filename', () => {
  const imagePath = path.join(
    testFolder,
    'Nintendo - Super Nintendo Entertainment System',
    'Named_Boxarts',
    'Super Mario World (USA).png',
  )
  fs.mkdirSync(path.dirname(imagePath), { recursive: true })
  fs.writeFileSync(imagePath, '')

  const lookup = createLocalArtworkLookup(testFolder)
  assert.equal(
    lookup.findArtwork('Super_Mario_World (USA).sfc', 'SNES', 'Super Mario World'),
    imagePath,
  )
  assert.equal(
    lookup.findArtwork('Super_Mario_World (USA).sfc', 'Game Boy', 'Super Mario World'),
    null,
  )
})

test('does not confuse Game Boy Color box art with Game Boy', () => {
  const imagePath = path.join(
    testFolder,
    'Nintendo - Game Boy Color',
    'Named_Boxarts',
    'Pokemon Crystal (USA).png',
  )
  fs.mkdirSync(path.dirname(imagePath), { recursive: true })
  fs.writeFileSync(imagePath, '')

  const lookup = createLocalArtworkLookup(testFolder)
  assert.equal(lookup.findArtwork('Pokemon Crystal (USA).gbc', 'GBC', 'Pokémon Crystal'), imagePath)
  assert.equal(lookup.findArtwork('Pokemon Crystal (USA).gbc', 'Game Boy', 'Pokémon Crystal'), null)
})

test('finds GameCube box art in the requested Libretro folder layout', () => {
  const imagePath = path.join(
    testFolder,
    'Libretro-Thumbnails',
    'Nintendo_-_GameCube',
    'Named_Boxarts',
    'Mario Kart - Double Dash!! (USA).png',
  )
  fs.mkdirSync(path.dirname(imagePath), { recursive: true })
  fs.writeFileSync(imagePath, '')

  const lookup = createLocalArtworkLookup(testFolder)
  assert.equal(
    lookup.findArtwork('Mario Kart - Double Dash!! (USA).nkit.iso', 'GameCube', 'Mario Kart: Double Dash!!'),
    imagePath,
  )
})

test('uses the matching Named_Titles image filename as the display title', () => {
  const imagePath = path.join(
    testFolder,
    'Libretro-Thumbnails',
    'Nintendo_-_GameCube',
    'Named_Titles',
    'Mario Kart_ Double Dash!! (USA).png',
  )
  fs.mkdirSync(path.dirname(imagePath), { recursive: true })
  fs.writeFileSync(imagePath, '')

  const lookup = createLocalArtworkLookup(testFolder)
  assert.equal(
    lookup.findTitle('Mario Kart - Double Dash!! (USA).nkit.iso', 'GameCube'),
    'Mario Kart_ Double Dash!! (USA)',
  )
  assert.equal(
    lookup.findTitle('Unknown Game.iso', 'GameCube'),
    null,
  )
})
