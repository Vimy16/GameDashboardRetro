const { spawn } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

function findDolphinExecutable(appDirectory = __dirname, environment = process.env, platform = process.platform) {
  const configuredPath = environment.DOLPHIN_PATH
  if (configuredPath) {
    if (!fs.existsSync(configuredPath)) {
      throw new Error(`DOLPHIN_PATH does not point to an existing file: ${configuredPath}`)
    }
    return configuredPath
  }

  const executableName = platform === 'win32' ? 'Dolphin.exe' : 'dolphin-emu'
  const bundledCandidates = [
    path.join(appDirectory, 'Dolphin-x64', executableName),
    path.join(appDirectory, 'dolphin', executableName),
    path.join(appDirectory, 'dolphin', 'Dolphin-x64', executableName),
  ]
  const bundledExecutable = bundledCandidates.find((candidate) => fs.existsSync(candidate))
  if (bundledExecutable) return bundledExecutable

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

  const installedExecutable = candidates.find((candidate) => fs.existsSync(candidate))
  if (installedExecutable) return installedExecutable

  return process.platform === 'win32' ? 'Dolphin.exe' : 'dolphin-emu'
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

function configurePortableDolphin(executablePath) {
  const configFolder = path.join(path.dirname(executablePath), 'User', 'Config')
  const configPath = path.join(configFolder, 'Dolphin.ini')
  fs.mkdirSync(configFolder, { recursive: true })

  const config = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : ''
  const lines = config.split(/\r?\n/)
  setIniSetting(lines, 'Display', 'Fullscreen', 'True')
  setIniSetting(lines, 'Interface', 'SkipNKitWarning', 'True')
  setIniSetting(lines, 'Analytics', 'Enabled', 'False')
  setIniSetting(lines, 'Analytics', 'PermissionAsked', 'True')

  fs.writeFileSync(configPath, `${lines.join('\n').replace(/\n*$/, '')}\n`)

  const graphicsConfigPath = path.join(configFolder, 'GFX.ini')
  const graphicsConfig = fs.existsSync(graphicsConfigPath)
    ? fs.readFileSync(graphicsConfigPath, 'utf8')
    : ''
  const graphicsLines = graphicsConfig.split(/\r?\n/)
  setIniSetting(graphicsLines, 'Settings', 'InternalResolution', '6')
  fs.writeFileSync(graphicsConfigPath, `${graphicsLines.join('\n').replace(/\n*$/, '')}\n`)
}

function launchGameCubeGame(gamePath, {
  appDirectory = __dirname,
  environment = process.env,
  platform = process.platform,
  spawnProcess = spawn,
} = {}) {
  if (!fs.existsSync(gamePath)) {
    throw new Error(`The GameCube game file could not be found: ${gamePath}`)
  }

  const executable = findDolphinExecutable(appDirectory, environment, platform)
  if (path.isAbsolute(executable)) configurePortableDolphin(executable)
  const processHandle = spawnProcess(executable, [
    '-e', gamePath,
    '-C', 'Main.Display.Fullscreen=True',
  ], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  })

  return new Promise((resolve, reject) => {
    processHandle.once('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('Dolphin was not found. Install Dolphin or set the DOLPHIN_PATH environment variable to its executable.'))
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

module.exports = { configurePortableDolphin, findDolphinExecutable, launchGameCubeGame }
