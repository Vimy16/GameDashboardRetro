import {
  Box,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  ChevronLeftRounded,
  FolderOpenRounded,
  GridViewRounded,
  RefreshRounded,
  SettingsRounded,
} from '@mui/icons-material'
import { useIntl } from 'react-intl'
import brandIcon from '../assets/game-dash-retro-icon.png'
import { navigation, platformOptions } from '../data/games.js'
import { useLocale } from '../i18n/localeContext.js'

function Sidebar({
  activePage,
  activePlatform,
  games,
  gamesFolder,
  isOpen,
  locale,
  isScanning,
  onOpenDataFolder,
  onOpenDolphinSettings,
  onPlatformSelect,
  onScanGames,
  onSelectGamesFolder,
  onSelectPage,
  onToggle,
}) {
  const intl = useIntl()
  const { changeLocale } = useLocale()

  return (
    <Box component="aside" className={`sidebar ${isOpen ? '' : 'sidebar--collapsed'}`}>
      <Box className="brand">
      <Box className="brand-mark">
        <img src={brandIcon} alt="" />
      </Box>
        {isOpen && (
          <Box className="brand-copy">
            <Typography className="brand-name">G<span>DR</span></Typography>
            <Typography className="brand-caption">{intl.formatMessage({ id: 'sidebar.brandCaption' })}</Typography>
          </Box>
        )}
        <Tooltip title={intl.formatMessage({ id: isOpen ? 'sidebar.collapse' : 'sidebar.expand' })} placement="right">
          <IconButton className="collapse-button" onClick={onToggle} aria-label={intl.formatMessage({ id: isOpen ? 'sidebar.collapse' : 'sidebar.expand' })}>
            {isOpen ? <ChevronLeftRounded /> : <GridViewRounded />}
          </IconButton>
        </Tooltip>
      </Box>

      <Box className="sidebar-content">
        {isOpen && <Typography className="nav-label">{intl.formatMessage({ id: 'nav.section' })}</Typography>}
        <Box className="nav-list">
          {navigation.map(({ id, icon: Icon }) => (
            <Tooltip key={id} title={isOpen ? '' : intl.formatMessage({ id: `nav.${id}` })} placement="right">
              <button
                type="button"
                className={`nav-item ${activePage === id ? 'nav-item--active' : ''}`}
                onClick={() => onSelectPage(id)}
              >
                <Icon className="nav-icon" />
                {isOpen && <span>{intl.formatMessage({ id: `nav.${id}` })}</span>}
                {isOpen && id === 'allGames' && <span className="nav-count">{games.length}</span>}
              </button>
            </Tooltip>
          ))}
        </Box>

        <Box className="sidebar-divider" />
        <Box className="platform-heading">
          {isOpen && <Typography className="nav-label">{intl.formatMessage({ id: 'platform.section' })}</Typography>}
        </Box>
        <Box className="platform-actions">
          <Tooltip title={isOpen ? '' : intl.formatMessage({ id: 'sidebar.chooseGamesFolder' })} placement="right">
            <button
              type="button"
              className="sidebar-platform-action"
              aria-label={intl.formatMessage({ id: 'sidebar.chooseGamesFolder' })}
              disabled={isScanning}
              onClick={onSelectGamesFolder}
            >
              <FolderOpenRounded />
              {isOpen && <span>{intl.formatMessage({ id: 'sidebar.chooseGamesFolder' })}</span>}
            </button>
          </Tooltip>
          <Tooltip title={isOpen ? '' : intl.formatMessage({ id: 'sidebar.scanGames' })} placement="right">
            <button
              type="button"
              className="sidebar-platform-action"
              aria-label={intl.formatMessage({ id: 'sidebar.scanGames' })}
              aria-busy={isScanning}
              disabled={isScanning}
              onClick={onScanGames}
            >
              <RefreshRounded className={isScanning ? 'scan-icon--loading' : ''} />
              {isOpen && <span>{intl.formatMessage({ id: 'sidebar.scanGames' })}</span>}
            </button>
          </Tooltip>
        </Box>
        {isOpen && gamesFolder && (
          <Tooltip title={gamesFolder} placement="right">
            <Typography className="platform-folder-path">{gamesFolder}</Typography>
          </Tooltip>
        )}
        <Box className="platform-list">
          {platformOptions.map((platform, index) => {
            const label = platform === 'all'
              ? intl.formatMessage({ id: 'platform.all' })
              : platform === 'Other'
                ? intl.formatMessage({ id: 'platform.other' })
                : platform
            const count = platform === 'all'
              ? games.length
              : games.filter((game) => game.platform === platform).length

            return (
              <Tooltip key={platform} title={isOpen ? '' : label} placement="right">
                <button
                  type="button"
                  className={`platform-item ${activePlatform === platform ? 'platform-item--active' : ''}`}
                  onClick={() => onPlatformSelect(platform)}
                  aria-label={label}
                >
                  <span className={`platform-dot ${platform === 'all' ? 'platform-dot--all' : `platform-dot--${index - 1}`}`} />
                  {isOpen && <span>{label}</span>}
                  {isOpen && <span className="platform-count">{count}</span>}
                </button>
              </Tooltip>
            )
          })}
        </Box>
      </Box>

      <Box className="sidebar-bottom">
        {isOpen && (
          <Box className="storage-card">
            <Box className="storage-icon"><FolderOpenRounded /></Box>
            <Box className="storage-copy">
              <Typography className="storage-title">{intl.formatMessage({ id: 'sidebar.collection' })}</Typography>
              <Typography className="storage-subtitle">{intl.formatMessage({ id: 'sidebar.gamesCount' }, { count: games.length })}</Typography>
            </Box>
            <Box className="storage-bar"><span /></Box>
          </Box>
        )}
        <Tooltip title={isOpen ? '' : intl.formatMessage({ id: 'sidebar.openDataFolder' })} placement="right">
          <button type="button" className="nav-item utility-item" aria-label={intl.formatMessage({ id: 'sidebar.openDataFolder' })} onClick={onOpenDataFolder}>
            <FolderOpenRounded className="nav-icon" />
            {isOpen && <span>{intl.formatMessage({ id: 'sidebar.openDataFolder' })}</span>}
          </button>
        </Tooltip>
        <Tooltip title={isOpen ? '' : intl.formatMessage({ id: 'sidebar.dolphinSettings' })} placement="right">
          <button
            type="button"
            className="nav-item utility-item"
            aria-label={intl.formatMessage({ id: 'sidebar.dolphinSettings' })}
            onClick={onOpenDolphinSettings}
          >
            <SettingsRounded className="nav-icon" />
            {isOpen && <span>{intl.formatMessage({ id: 'sidebar.dolphinSettings' })}</span>}
          </button>
        </Tooltip>
        <Box className="language-picker" role="group" aria-label={intl.formatMessage({ id: 'locale.label' })}>
          <button type="button" className={locale === 'en' ? 'language-option language-option--active' : 'language-option'} aria-label={intl.formatMessage({ id: 'locale.english' })} aria-pressed={locale === 'en'} onClick={() => changeLocale('en')}>EN</button>
          <button type="button" className={locale === 'fr' ? 'language-option language-option--active' : 'language-option'} aria-label={intl.formatMessage({ id: 'locale.french' })} aria-pressed={locale === 'fr'} onClick={() => changeLocale('fr')}>FR</button>
        </Box>
      </Box>
    </Box>
  )
}

export default Sidebar
