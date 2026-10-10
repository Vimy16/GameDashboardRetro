import { useCallback, useMemo, useState } from 'react'
import { Box } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useIntl } from 'react-intl'
import GameLibrary from './components/GameLibrary.jsx'
import GamepadHelp from './components/GamepadHelp.jsx'
import GameOptionsMenu from './components/GameOptionsMenu.jsx'
import DolphinSettingsDialog from './components/DolphinSettingsDialog.jsx'
import Sidebar from './components/Sidebar.jsx'
import StartupScreen from './components/StartupScreen.jsx'
import Topbar from './components/Topbar.jsx'
import { addGames, clearDolphinExecutable, launchGame, loadDolphinSettings, loadGames, loadGamesFolder, openDataFolder, removeGame, saveDolphinSettings, scanGames, selectDolphinExecutable, selectGamesFolder, toggleFavorite, toggleFullscreen } from './services/gameLibrary.js'
import { useLocale } from './i18n/localeContext.js'
import useGamepadNavigation from './hooks/useGamepadNavigation.js'
import './styles/base.css'
import './styles/sidebar.css'
import './styles/dashboard.css'
import './styles/game-cards.css'
import './styles/overlays.css'
import './styles/responsive.css'

function App() {
  const queryClient = useQueryClient()
  const intl = useIntl()
  const { locale } = useLocale()
  const { data: games = [], isLoading, isError, error } = useQuery({
    queryKey: ['games'],
    queryFn: loadGames,
  })
  const { data: gamesFolder } = useQuery({
    queryKey: ['gamesFolder'],
    queryFn: loadGamesFolder,
  })
  const { data: dolphinSettings } = useQuery({
    queryKey: ['dolphinSettings'],
    queryFn: loadDolphinSettings,
  })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activePage, setActivePage] = useState('allGames')
  const [activePlatform, setActivePlatform] = useState('all')
  const [search, setSearch] = useState('')
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [selectedGame, setSelectedGame] = useState(null)
  const [selectedGameId, setSelectedGameId] = useState(null)
  const [toast, setToast] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [dolphinSettingsOpen, setDolphinSettingsOpen] = useState(false)
  const handleToggleFullscreen = useCallback(async () => {
    try {
      await toggleFullscreen()
    } catch (error) {
      setToast(intl.formatMessage({ id: 'toast.error' }, { error: error.message }))
    }
  }, [intl])
  const { isConnected: isControllerConnected, showInstructions: showControllerInstructions } =
    useGamepadNavigation({ onToggleFullscreen: handleToggleFullscreen })

  const visibleGames = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return games.filter((game) => {
      const matchesPage = activePage === 'favorites'
        ? game.favorite
        : activePage === 'recentlyPlayed'
          ? game.recent
          : true
      const matchesPlatform = activePlatform === 'all' || game.platform === activePlatform
      const matchesSearch = !normalizedSearch
        || `${game.title} ${game.subtitle} ${game.platform} ${game.genre}`.toLowerCase().includes(normalizedSearch)
      return matchesPage && matchesPlatform && matchesSearch
    })
  }, [games, activePage, activePlatform, search])

  const handlePlatformSelect = (platform) => {
    setActivePlatform(activePlatform === platform ? 'all' : platform)
    setActivePage('allGames')
  }

  const handleOpenGameOptions = (event, game) => {
    event.stopPropagation()
    setSelectedGame(game)
    setMenuAnchor(event.currentTarget)
  }

  const handlePlayGame = async (game) => {
    try {
      await launchGame(game.id)
    } catch (error) {
      setToast(intl.formatMessage({ id: 'toast.error' }, { error: error.message }))
    }
  }

  const closeGameOptions = () => {
    setMenuAnchor(null)
    setSelectedGame(null)
  }

  const handleToggleFavorite = async () => {
    if (!selectedGame) return
    const wasFavorite = selectedGame.favorite
    try {
      const updatedGames = await toggleFavorite(selectedGame.id)
      queryClient.setQueryData(['games'], updatedGames)
      setToast(intl.formatMessage({ id: wasFavorite ? 'toast.favoriteRemoved' : 'toast.favoriteAdded' }))
    } catch (error) {
      setToast(intl.formatMessage({ id: 'toast.error' }, { error: error.message }))
    } finally {
      closeGameOptions()
    }
  }

  const handleRemoveGame = async () => {
    if (!selectedGame) return
    try {
      const updatedGames = await removeGame(selectedGame.id)
      queryClient.setQueryData(['games'], updatedGames)
      setToast(intl.formatMessage({ id: 'toast.gameRemoved' }, { title: selectedGame.title }))
    } catch (error) {
      setToast(intl.formatMessage({ id: 'toast.error' }, { error: error.message }))
    } finally {
      closeGameOptions()
    }
  }

  const handleAddGames = async () => {
    try {
      const result = await addGames()
      if (result.canceled) return
      queryClient.setQueryData(['games'], result.games)
      setActivePage('allGames')
      setActivePlatform('all')
      setToast(result.addedCount
        ? intl.formatMessage(
          { id: result.addedCount === 1 ? 'toast.gameAdded' : 'toast.gamesAdded' },
          { count: result.addedCount },
        )
        : intl.formatMessage({ id: 'toast.noNewGames' }))
    } catch (error) {
      setToast(intl.formatMessage({ id: 'toast.error' }, { error: error.message }))
    }
  }

  const handleScanGames = async () => {
    if (isScanning) return
    setIsScanning(true)
    try {
      const result = await scanGames()
      queryClient.setQueryData(['games'], result.games)
      setToast(intl.formatMessage(
        { id: 'toast.scanComplete' },
        {
          scanned: result.scannedCount,
          added: result.addedCount,
          removed: result.removedCount,
        },
      ))
    } catch (error) {
      setToast(intl.formatMessage({ id: 'toast.error' }, { error: error.message }))
    } finally {
      setIsScanning(false)
    }
  }

  const handleSelectGamesFolder = async () => {
    if (isScanning) return
    setIsScanning(true)
    try {
      const result = await selectGamesFolder()
      if (result.canceled) return
      queryClient.setQueryData(['games'], result.games)
      queryClient.setQueryData(['gamesFolder'], result.folder)
      setToast(intl.formatMessage(
        { id: 'toast.gamesFolderUpdated' },
        {
          scanned: result.scannedCount,
          added: result.addedCount,
          removed: result.removedCount,
        },
      ))
    } catch (error) {
      setToast(intl.formatMessage({ id: 'toast.error' }, { error: error.message }))
    } finally {
      setIsScanning(false)
    }
  }

  const handleOpenDataFolder = async () => {
    try {
      await openDataFolder()
      setToast(intl.formatMessage({ id: 'toast.dataFolderOpened' }))
    } catch (error) {
      setToast(intl.formatMessage({ id: 'toast.error' }, { error: error.message }))
    }
  }

  const handleChooseDolphin = async () => {
    const result = await selectDolphinExecutable()
    queryClient.setQueryData(['dolphinSettings'], result.settings)
    return result.canceled ? null : result.settings
  }

  const handleClearDolphin = async () => {
    const settings = await clearDolphinExecutable()
    queryClient.setQueryData(['dolphinSettings'], settings)
    return settings
  }

  const handleSaveDolphinSettings = async (settings) => {
    const updatedSettings = await saveDolphinSettings(settings)
    queryClient.setQueryData(['dolphinSettings'], updatedSettings)
    return updatedSettings
  }

  const handleOpenDolphinSettings = async () => {
    try {
      await queryClient.ensureQueryData({
        queryKey: ['dolphinSettings'],
        queryFn: loadDolphinSettings,
      })
      setDolphinSettingsOpen(true)
    } catch (settingsError) {
      setToast(intl.formatMessage({ id: 'toast.error' }, { error: settingsError.message }))
    }
  }

  if (isLoading) return <StartupScreen />

  return (
    <Box className={`app-shell ${isControllerConnected ? 'app-shell--controller' : ''}`}>
      <Sidebar
        activePage={activePage}
        activePlatform={activePlatform}
        games={games}
        gamesFolder={gamesFolder}
        isOpen={sidebarOpen}
        locale={locale}
        isScanning={isScanning}
        onOpenDataFolder={handleOpenDataFolder}
        onOpenDolphinSettings={handleOpenDolphinSettings}
        onPlatformSelect={handlePlatformSelect}
        onScanGames={handleScanGames}
        onSelectGamesFolder={handleSelectGamesFolder}
        onSelectPage={setActivePage}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <Box component="main" className="main-panel">
        <Topbar
          activePage={activePage}
          gamepadConnected={isControllerConnected}
          onNotify={() => setToast(intl.formatMessage({ id: 'topbar.allCaughtUp' }))}
          onSearchChange={setSearch}
          search={search}
        />
        <GameLibrary
          activePage={activePage}
          activePlatform={activePlatform}
          games={games}
          error={error}
          isError={isError}
          isLoading={isLoading}
          onAddGames={handleAddGames}
          onClearFilters={() => {
            setSearch('')
            setActivePlatform('all')
          }}
          onOpenGameOptions={handleOpenGameOptions}
          onPlayGame={handlePlayGame}
          onPlatformChange={setActivePlatform}
          selectedGameId={selectedGameId}
          onSelectGame={setSelectedGameId}
          search={search}
          visibleGames={visibleGames}
        />
      </Box>

      <GameOptionsMenu
        anchorEl={menuAnchor}
        onClose={closeGameOptions}
        onRemove={handleRemoveGame}
        onToggleFavorite={handleToggleFavorite}
        onToastClose={() => setToast('')}
        selectedGame={selectedGame}
        toast={toast}
      />
      {dolphinSettingsOpen && (
        <DolphinSettingsDialog
          open
          settings={dolphinSettings}
          onClose={() => setDolphinSettingsOpen(false)}
          onChooseExecutable={handleChooseDolphin}
          onClearExecutable={handleClearDolphin}
          onSave={handleSaveDolphinSettings}
        />
      )}
      <GamepadHelp isConnected={isControllerConnected} showInstructions={showControllerInstructions} />
    </Box>
  )
}

export default App
