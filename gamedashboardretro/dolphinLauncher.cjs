const { spawn } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const internalResolutions = new Set(['1', '2', '3', '4', '6'])
const controllerProfiles = {
  eightBitDo: {
    fileName: '8BitDo Ultimate 2 Wireless.ini',
    device: 'XInput/0/Gamepad',
  },
  keyboardMouse: {
    fileName: 'Keyboard Mouse.ini',
    device: 'DInput/0/Keyboard Mouse',
  },
}

function isExecutableFile(filePath) {
  try {
    return Boolean(filePath) && fs.statSync(filePath).isFile()
  } catch {
    return false
  }
}

function findDolphinExecutable(environment = process.env, platform = process.platform, configuredPath = null) {
  if (configuredPath) {
    if (!isExecutableFile(configuredPath)) {
      throw new Error(`The configured Dolphin executable was not found: ${configuredPath}`)
    }
    return configuredPath
  }

  if (environment.DOLPHIN_PATH) {
    if (!isExecutableFile(environment.DOLPHIN_PATH)) {
      throw new Error(`DOLPHIN_PATH does not point to an existing file: ${environment.DOLPHIN_PATH}`)
    }
    return environment.DOLPHIN_PATH
  }

  if (platform === 'win32') {
    const programFiles = [
      environment.ProgramW6432,
      environment.ProgramFiles,
      environment['ProgramFiles(x86)'],
      environment.LOCALAPPDATA && path.join(environment.LOCALAPPDATA, 'Programs'),
    ].filter(Boolean)
    const candidates = programFiles.flatMap((folder) => [
      path.join(folder, 'Dolphin-x64', 'Dolphin.exe'),
      path.join(folder, 'Dolphin Emulator', 'Dolphin.exe'),
      path.join(folder, 'Dolphin', 'Dolphin.exe'),
    ])
    return candidates.find(isExecutableFile) ?? null
  }

  const executableName = platform === 'darwin' ? 'Dolphin.app/Contents/MacOS/Dolphin' : 'dolphin-emu'
  for (const folder of (environment.PATH ?? '').split(path.delimiter)) {
    if (!folder) continue
    const candidate = path.join(folder, executableName)
    if (isExecutableFile(candidate)) return candidate
  }
  return null
}

function setIniSetting(lines, section, key, value) {
  const sectionPattern = new RegExp(`^\\s*\\[${section}\\]\\s*$`, 'i')
  const sectionIndex = lines.findIndex((line) => sectionPattern.test(line))

  if (sectionIndex === -1) {
    if (lines.at(-1) === '') lines.pop()
    lines.push('', `[${section}]`, `${key} = ${value}`)
    return
  }

  const nextSectionIndex = lines.findIndex(
    (line, index) => index > sectionIndex && /^\s*\[[^\]]+\]\s*$/.test(line),
  )
  let sectionEnd = nextSectionIndex === -1 ? lines.length : nextSectionIndex
  while (sectionEnd > sectionIndex + 1 && lines[sectionEnd - 1].trim() === '') {
    sectionEnd -= 1
  }
  const settingPattern = new RegExp(`^\\s*${key}\\s*=`, 'i')
  const settingIndex = lines.findIndex(
    (line, index) => index > sectionIndex && index < sectionEnd && settingPattern.test(line),
  )

  if (settingIndex === -1) {
    lines.splice(sectionEnd, 0, `${key} = ${value}`)
  } else {
    lines[settingIndex] = `${key} = ${value}`
  }
}

function seedDolphinUserDefaults(defaultsConfigFolder, userDirectory) {
  const destinationConfigFolder = path.join(userDirectory, 'Config')

  function copyMissingDefaults(sourceFolder, destinationFolder) {
    if (!fs.existsSync(sourceFolder)) return
    for (const entry of fs.readdirSync(sourceFolder, { withFileTypes: true })) {
      const sourcePath = path.join(sourceFolder, entry.name)
      const destinationPath = path.join(destinationFolder, entry.name)
      if (entry.isDirectory()) {
        copyMissingDefaults(sourcePath, destinationPath)
      } else if (entry.isFile() && !fs.existsSync(destinationPath)) {
        fs.mkdirSync(destinationFolder, { recursive: true })
        fs.copyFileSync(sourcePath, destinationPath)
      }
    }
  }

  copyMissingDefaults(defaultsConfigFolder, destinationConfigFolder)
}

function configureDolphinUser({
  userDirectory,
  defaultsConfigFolder,
  internalResolution = '6',
  controllerProfile = 'eightBitDo',
}) {
  if (!internalResolutions.has(String(internalResolution))) {
    throw new RangeError(`Unsupported Dolphin internal resolution: ${internalResolution}`)
  }

  const profile = controllerProfiles[controllerProfile]
  if (!profile) throw new TypeError(`Unsupported Dolphin controller profile: ${controllerProfile}`)

  seedDolphinUserDefaults(defaultsConfigFolder, userDirectory)
  const configFolder = path.join(userDirectory, 'Config')
  const dolphinConfigPath = path.join(configFolder, 'Dolphin.ini')
  const dolphinLines = fs.readFileSync(dolphinConfigPath, 'utf8').split(/\r?\n/)
  setIniSetting(dolphinLines, 'Display', 'Fullscreen', 'True')
  setIniSetting(dolphinLines, 'Interface', 'SkipNKitWarning', 'True')
  setIniSetting(dolphinLines, 'Analytics', 'Enabled', 'False')
  setIniSetting(dolphinLines, 'Analytics', 'PermissionAsked', 'True')
  fs.writeFileSync(dolphinConfigPath, `${dolphinLines.join('\n').replace(/\n*$/, '')}\n`)

  const graphicsConfigPath = path.join(configFolder, 'GFX.ini')
  const graphicsLines = fs.readFileSync(graphicsConfigPath, 'utf8').split(/\r?\n/)
  setIniSetting(graphicsLines, 'Settings', 'InternalResolution', String(internalResolution))
  fs.writeFileSync(graphicsConfigPath, `${graphicsLines.join('\n').replace(/\n*$/, '')}\n`)

  const profilePath = path.join(defaultsConfigFolder, 'Profiles', 'GCPad', profile.fileName)
  if (!isExecutableFile(profilePath)) {
    throw new Error(`The GDR controller profile template is missing: ${profilePath}`)
  }
  const profileContents = fs.readFileSync(profilePath, 'utf8')
    .replace(/^\s*\[Profile\]\s*/i, '')
    .trim()
  const gamepadConfigPath = path.join(configFolder, 'GCPadNew.ini')
  fs.writeFileSync(
    gamepadConfigPath,
    `[GCPad1]\nDevice = ${profile.device}\n${profileContents}\n`,
  )
}

function launchGameCubeGame(gamePath, {
  appDirectory = __dirname,
  environment = process.env,
  platform = process.platform,
  dolphinPath = null,
  userDirectory = path.join(appDirectory, 'dolphin-user'),
  defaultsConfigFolder = path.join(appDirectory, 'dolphin-defaults', 'Config'),
  internalResolution = '6',
  controllerProfile = 'eightBitDo',
  spawnProcess = spawn,
} = {}) {
  if (!fs.existsSync(gamePath)) {
    throw new Error(`The GameCube game file could not be found: ${gamePath}`)
  }

  const executable = findDolphinExecutable(environment, platform, dolphinPath)
  if (!executable) {
    throw new Error('Dolphin is not configured. Install Dolphin and select its executable in GDR Dolphin settings.')
  }

  configureDolphinUser({
    userDirectory,
    defaultsConfigFolder,
    internalResolution,
    controllerProfile,
  })
  const processHandle = spawnProcess(executable, [
    '-u', userDirectory,
    '-e', gamePath,
    '-C', 'Main.Display.Fullscreen=True',
    '-C', `Graphics.Settings.InternalResolution=${internalResolution}`,
  ], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  })

  return new Promise((resolve, reject) => {
    processHandle.once('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('Dolphin was not found. Install it and select its executable in GDR Dolphin settings.'))
        return
      }
      reject(new Error(`Could not launch Dolphin: ${error.message}`))
    })
    processHandle.once('spawn', () => {
      processHandle.unref()
      resolve(true)
    })
  })
}

module.exports = {
  configureDolphinUser,
  findDolphinExecutable,
  internalResolutions,
  launchGameCubeGame,
  seedDolphinUserDefaults,
}
