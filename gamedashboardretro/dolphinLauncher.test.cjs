const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { after, test } = require('node:test')
const {
  configurePortableDolphin,
  findDolphinExecutable,
  launchGameCubeGame,
} = require('./dolphinLauncher.cjs')

const testFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'gdr-dolphin-test-'))
const bundledDolphinFolder = path.join(testFolder, 'Dolphin-x64')
const executablePath = path.join(bundledDolphinFolder, 'Dolphin.exe')
const gamePath = path.join(testFolder, 'Wind Waker.rvz')

fs.mkdirSync(bundledDolphinFolder)
fs.writeFileSync(executablePath, '')
fs.writeFileSync(gamePath, '')

after(() => {
  fs.rmSync(testFolder, { recursive: true, force: true })
})

test('prefers the bundled Dolphin executable in the project folder', () => {
  assert.equal(findDolphinExecutable(testFolder, {}, 'win32'), executablePath)
})

test('configures Dolphin preferences and 6x internal resolution without overwriting other settings', () => {
  const configFolder = path.join(bundledDolphinFolder, 'User', 'Config')
  const configPath = path.join(configFolder, 'Dolphin.ini')
  fs.mkdirSync(configFolder, { recursive: true })
  fs.writeFileSync(configPath, '[Analytics]\nID = test\nEnabled = True\n\n[Interface]\nConfirmStop = False\n')
  fs.writeFileSync(path.join(configFolder, 'GFX.ini'), '[Settings]\nVSync = True\n\n[Enhancements]\nPostProcessingShader = test\n')

  configurePortableDolphin(executablePath)
  configurePortableDolphin(executablePath)

  const config = fs.readFileSync(configPath, 'utf8')
  assert.match(config, /\[Analytics\]\nID = test\nEnabled = False\nPermissionAsked = True/)
  assert.match(config, /\[Interface\]\nConfirmStop = False\nSkipNKitWarning = True/)
  assert.match(config, /\[Display\]\nFullscreen = True/)
  assert.equal((config.match(/SkipNKitWarning = True/g) ?? []).length, 1)
  assert.equal((config.match(/PermissionAsked = True/g) ?? []).length, 1)

  const graphicsConfig = fs.readFileSync(path.join(configFolder, 'GFX.ini'), 'utf8')
  assert.match(graphicsConfig, /\[Settings\]\nVSync = True\nInternalResolution = 6/)
  assert.match(graphicsConfig, /\[Enhancements\]\nPostProcessingShader = test/)
})

test('also finds the Dolphin-x64 folder inside a dolphin directory', () => {
  const alternateAppDirectory = path.join(testFolder, 'alternate')
  const alternateFolder = path.join(alternateAppDirectory, 'dolphin', 'Dolphin-x64')
  const alternateExecutable = path.join(alternateFolder, 'Dolphin.exe')
  fs.mkdirSync(alternateFolder, { recursive: true })
  fs.writeFileSync(alternateExecutable, '')

  assert.equal(findDolphinExecutable(alternateAppDirectory, {}, 'win32'), alternateExecutable)
})

test('launches the selected ROM with bundled Dolphin using a separate executable argument', async () => {
  let launchArguments
  const processHandle = new EventEmitter()
  processHandle.unref = () => {}

  const launch = launchGameCubeGame(gamePath, {
    appDirectory: testFolder,
    environment: {},
    platform: 'win32',
    spawnProcess: (...args) => {
      launchArguments = args
      queueMicrotask(() => processHandle.emit('spawn'))
      return processHandle
    },
  })

  await launch
  assert.deepEqual(launchArguments, [
    executablePath,
    ['-e', gamePath, '-C', 'Main.Display.Fullscreen=True'],
    { detached: true, stdio: 'ignore', windowsHide: true },
  ])
})
