import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  AddRounded,
  FavoriteRounded,
  GridViewRounded,
  HistoryRounded,
  SearchRounded,
  TuneRounded,
} from '@mui/icons-material'
import { platformOptions } from '../data/games.js'
import { useIntl } from 'react-intl'
import GameCard from './GameCard.jsx'

function GameLibrary({
  activePage,
  activePlatform,
  games,
  error,
  isError,
  isLoading,
  onAddGames,
  onClearFilters,
  onOpenGameOptions,
  onPlayGame,
  onPlatformChange,
  selectedGameId,
  onSelectGame,
  search,
  visibleGames,
}) {
  const intl = useIntl()
  const favoriteCount = games.filter((game) => game.favorite).length
  const recentlyPlayedCount = games.filter((game) => game.recent).length

  const cyclePlatform = () => {
    const currentIndex = platformOptions.indexOf(activePlatform)
    onPlatformChange(platformOptions[(currentIndex + 1) % platformOptions.length])
  }

  return (
    <Box className="page-content">
      <Box className="welcome-row">
        <Box>
          <Typography className="eyebrow">{intl.formatMessage({ id: 'app.eyebrow' })}</Typography>
          <Typography component="h1" className="page-title">
            {activePage === 'allGames'
              ? <>{intl.formatMessage({ id: 'page.allGamesTitle' })} <span>{intl.formatMessage({ id: 'page.libraryTitle' })}</span></>
              : intl.formatMessage({ id: `nav.${activePage}` })}
          </Typography>
          <Typography className="page-description">
            {intl.formatMessage({
              id: activePage === 'favorites'
                ? 'page.favoritesDescription'
                : activePage === 'recentlyPlayed'
                  ? 'page.recentlyPlayedDescription'
                  : 'page.allGamesDescription',
            })}
          </Typography>
        </Box>
        <Button
          className="add-game-button"
          variant="contained"
          startIcon={<AddRounded />}
          onClick={onAddGames}
        >
          {intl.formatMessage({ id: 'library.addGames' })}
        </Button>
      </Box>

      <Box className="stats-row">
        <Box className="stat-card">
          <Box className="stat-icon stat-icon--purple"><GridViewRounded /></Box>
          <Box><Typography className="stat-label">{intl.formatMessage({ id: 'stats.library' })}</Typography><Typography className="stat-value">{games.length}<span> {intl.formatMessage({ id: 'stats.games' }, { count: games.length })}</span></Typography></Box>
        </Box>
        <span className="stats-divider" />
        <Box className="stat-card">
          <Box className="stat-icon stat-icon--pink"><FavoriteRounded /></Box>
          <Box><Typography className="stat-label">{intl.formatMessage({ id: 'stats.favorites' })}</Typography><Typography className="stat-value">{favoriteCount}<span> {intl.formatMessage({ id: 'stats.saved' })}</span></Typography></Box>
        </Box>
        <span className="stats-divider" />
        <Box className="stat-card">
          <Box className="stat-icon stat-icon--green"><HistoryRounded /></Box>
          <Box><Typography className="stat-label">{intl.formatMessage({ id: 'stats.readyToPlay' })}</Typography><Typography className="stat-value">{recentlyPlayedCount}<span> {intl.formatMessage({ id: 'stats.recentlyPlayed' })}</span></Typography></Box>
        </Box>
        <Box className="stats-note"><span className="pulse-dot" /> {intl.formatMessage({ id: 'stats.collectionLookingGood' })}</Box>
      </Box>

      <Box className="collection-toolbar">
        <Box className="collection-heading">
          <Typography component="h2">{intl.formatMessage({ id: `nav.${activePage}` })}</Typography>
          <span className="collection-count">{visibleGames.length}</span>
        </Box>
        <Box className="toolbar-controls">
          <Button
            className={`platform-filter ${activePlatform !== 'all' ? 'platform-filter--selected' : ''}`}
            endIcon={<TuneRounded />}
            onClick={cyclePlatform}
            aria-label={intl.formatMessage({ id: 'library.filterOptions' })}
          >
            {activePlatform === 'all' ? intl.formatMessage({ id: 'platform.all' }) : activePlatform}
          </Button>
          <Tooltip title={intl.formatMessage({ id: 'library.gridView' })}>
            <IconButton className="view-toggle" aria-label={intl.formatMessage({ id: 'library.gridView' })}><GridViewRounded /></IconButton>
          </Tooltip>
        </Box>
      </Box>

      {isLoading ? (
        <Box className="empty-state"><Typography>{intl.formatMessage({ id: 'library.loading' })}</Typography></Box>
      ) : isError ? (
        <Box className="empty-state">
          <Typography>{error?.message.includes('Launch GDR')
            ? intl.formatMessage({ id: 'error.desktopOnly' })
            : intl.formatMessage({ id: 'library.loadError' })}</Typography>
        </Box>
      ) : visibleGames.length ? (
        <Box className="game-grid">
          {visibleGames.map((game, index) => (
            <GameCard
              key={game.id}
              game={game}
              index={index}
              isSelected={selectedGameId === game.id}
              onOpenOptions={onOpenGameOptions}
              onPlayGame={onPlayGame}
              onSelect={onSelectGame}
            />
          ))}
        </Box>
      ) : (
        <Box className="empty-state">
          <Box className="empty-icon"><SearchRounded /></Box>
          <Typography className="empty-title">{intl.formatMessage({ id: 'library.noGames' })}</Typography>
          <Typography className="empty-description">
            {intl.formatMessage({ id: search ? 'library.searchEmpty' : 'library.empty' })}
          </Typography>
          {(search || activePlatform !== 'all') && (
            <Button className="clear-filters" onClick={onClearFilters}>
              {intl.formatMessage({ id: 'library.clearFilters' })}
            </Button>
          )}
        </Box>
      )}

      <Box className="page-footer">
        <span><span className="footer-status" /> {intl.formatMessage({ id: 'library.footerSystems' })}</span>
        <span>{intl.formatMessage({ id: 'library.footerMadeForGames' })} <span className="footer-star">✦</span></span>
      </Box>
    </Box>
  )
}

export default GameLibrary
