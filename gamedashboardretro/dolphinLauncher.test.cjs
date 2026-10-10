const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { after, test } = require('node:test')
const {
  configureDolphinUser,
  findDolphinExecutable,
  launchGameCubeGame,
  seedDolphinUserDefaults,
} = require('./dolphinLauncher.cjs')

const testFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'gdr-dolphin-test-'))
const defaultsFolder = path.join(testFolder, 'dolphin-defaults', 'Config')
const userDirectory = path.join(testFolder, 'dolphin-user')
const executablePath = path.join(testFolder, 'installed-dolphin', 'Dolphin.exe')
const gamePath = path.join(testFolder, 'Wind Waker.rvz')

fs.mkdirSync(path.dirname(executablePath), { recursive: true })
fs.writeFileSync(executablePath, '')
fs.writeFileSync(gamePath, '')
fs.mkdirSync(path.join(defaultsFolder, 'Profiles', 'GCPad'), { recursive: true })
fs.writeFileSync(path.join(defaultsFolder, 'Dolphin.ini'), '[Interface]\nConfirmStop = False\n')
fs.writeFileSync(path.join(defaultsFolder, 'GFX.ini'), '[Settings]\nVSync = True\n')
fs.writeFileSync(
  path.join(defaultsFolder, 'Profiles', 'GCPad', '8BitDo Ultimate 2 Wireless.ini'),
  '[Profile]\nButtons/A = `Button A`\n',
)
fs.writeFileSync(
  path.join(defaultsFolder, 'Profiles', 'GCPad', 'Keyboard Mouse.ini'),
  '[Profile]\nButtons/A = `X`\n',
)

after(() => {
  fs.rmSync(testFolder, { recursive: true, force: true })
})

test('uses a configured executable and does not discover Dolphin bundled with GDR', () => {
  const bundledPath = path.join(testFolder, 'Dolphin-x64', 'Dolphin.exe')
  fs.mkdirSync(path.dirname(bundledPath), { recursive: true })
  fs.writeFileSync(bundledPath, '')

  assert.equal(findDolphinExecutable({}, 'win32', executablePath), executablePath)
  assert.equal(findDolphinExecutable({}, 'win32'), null)
})

test('finds Dolphin from the system path on non-Windows platforms', () => {
  const linuxExecutable = path.join(testFolder, 'bin', 'dolphin-emu')
  fs.mkdirSync(path.dirname(linuxExecutable), { recursive: true })
  fs.writeFileSync(linuxExecutable, '')

  assert.equal(
    findDolphinExecutable({ PATH: path.dirname(linuxExecutable) }, 'linux'),
    linuxExecutable,
  )
})

test('detects common Dolphin installations outside the GDR project folder', () => {
  const programFiles = path.join(testFolder, 'Program Files')
  const installedExecutable = path.join(programFiles, 'Dolphin-x64', 'Dolphin.exe')
  fs.mkdirSync(path.dirname(installedExecutable), { recursive: true })
  fs.writeFileSync(installedExecutable, '')

  assert.equal(
    findDolphinExecutable({ ProgramFiles: programFiles }, 'win32'),
    installedExecutable,
  )
})

test('configures isolated Dolphin defaults without overwriting existing preferences', () => {
  const configFolder = path.join(userDirectory, 'Config')
  fs.mkdirSync(configFolder, { recursive: true })
  fs.writeFileSync(
    path.join(configFolder, 'Dolphin.ini'),
    '[Interface]\nConfirmStop = True\n\n[Analytics]\nID = test\nEnabled = True\n',
  )
  fs.writeFileSync(
    path.join(configFolder, 'GFX.ini'),
    '[Settings]\nVSync = True\nInternalResolution = 2\n\n[Enhancements]\nPostProcessingShader = test\n',
  )

  configureDolphinUser({
    userDirectory,
    defaultsConfigFolder: defaultsFolder,
    internalResolution: '6',
    controllerProfile: 'eightBitDo',
  })

  const config = fs.readFileSync(path.join(configFolder, 'Dolphin.ini'), 'utf8')
  assert.match(config, /\[Interface\]\nConfirmStop = True\nSkipNKitWarning = True/)
  assert.match(config, /\[Analytics\]\nID = test\nEnabled = False\nPermissionAsked = True/)
  assert.match(config, /\[Display\]\nFullscreen = True/)

  const graphics = fs.readFileSync(path.join(configFolder, 'GFX.ini'), 'utf8')
  assert.match(graphics, /\[Settings\]\nVSync = True\nInternalResolution = 6/)
  assert.match(graphics, /\[Enhancements\]\nPostProcessingShader = test/)
  assert.equal(
    fs.readFileSync(path.join(configFolder, 'GCPadNew.ini'), 'utf8'),
    '[GCPad1]\nDevice = XInput/0/Gamepad\nButtons/A = `Button A`\n',
  )
})

test('updates the selected controller profile and resolution on later configuration', () => {
  configureDolphinUser({
    userDirectory,
    defaultsConfigFolder: defaultsFolder,
    internalResolution: '4',
    controllerProfile: 'keyboardMouse',
  })

  const graphics = fs.readFileSync(path.join(userDirectory, 'Config', 'GFX.ini'), 'utf8')
  assert.match(graphics, /InternalResolution = 4/)
  assert.match(
    fs.readFileSync(path.join(userDirectory, 'Config', 'GCPadNew.ini'), 'utf8'),
    /\[GCPad1\]\nDevice = DInput\/0\/Keyboard Mouse\nButtons\/A = `X`/,
  )
})

test('seeds missing defaults without overwriting the existing Dolphin user config', () => {
  const configFolder = path.join(testFolder, 'seed-user', 'Config')
  fs.mkdirSync(configFolder, { recursive: true })
  fs.writeFileSync(path.join(configFolder, 'GFX.ini'), '[Settings]\nInternalResolution = 3\n')

  seedDolphinUserDefaults(defaultsFolder, path.join(testFolder, 'seed-user'))

  assert.equal(
    fs.readFileSync(path.join(configFolder, 'GFX.ini'), 'utf8'),
    '[Settings]\nInternalResolution = 3\n',
  )
  assert.equal(
    fs.readFileSync(path.join(configFolder, 'Dolphin.ini'), 'utf8'),
    '[Interface]\nConfirmStop = False\n',
  )
  assert.equal(
    fs.readFileSync(
      path.join(configFolder, 'Profiles', 'GCPad', 'Keyboard Mouse.ini'),
      'utf8',
    ),
    '[Profile]\nButtons/A = `X`\n',
  )
})

test('launches a GameCube ROM with the selected Dolphin executable and isolated user folder', async () => {
  let launchArguments
  const processHandle = new EventEmitter()
  processHandle.unref = () => {}

  const launch = launchGameCubeGame(gamePath, {
    appDirectory: testFolder,
    environment: {},
    platform: 'win32',
    dolphinPath: executablePath,
    userDirectory,
    defaultsConfigFolder: defaultsFolder,
    internalResolution: '6',
    controllerProfile: 'eightBitDo',
    spawnProcess: (...args) => {
      launchArguments = args
      queueMicrotask(() => processHandle.emit('spawn'))
      return processHandle
    },
  })

  await launch
  assert.deepEqual(launchArguments, [
    executablePath,
    [
      '-u', userDirectory,
      '-e', gamePath,
      '-C', 'Main.Display.Fullscreen=True',
      '-C', 'Graphics.Settings.InternalResolution=6',
    ],
    { detached: true, stdio: 'ignore', windowsHide: true },
  ])
})

test('reports a clear error when no separately installed Dolphin is available', async () => {
  assert.throws(
    () => launchGameCubeGame(gamePath, {
      appDirectory: testFolder,
      environment: {},
      platform: 'win32',
      userDirectory,
      defaultsConfigFolder: defaultsFolder,
    }),
    /Install Dolphin and select its executable/,
  )
})
