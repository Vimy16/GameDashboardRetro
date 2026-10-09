import {
  Box,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material'
import { FavoriteRounded, MoreHorizRounded } from '@mui/icons-material'
import { useIntl } from 'react-intl'

function GameCard({ game, index, isSelected, onOpenOptions, onPlayGame, onSelect }) {
  const intl = useIntl()
  const artworkUrl = game.artworkPath
    ? `gdr-artwork://local/image?path=${encodeURIComponent(game.artworkPath)}`
    : null

  return (
    <Box
      component="article"
      className={`game-card ${isSelected ? 'game-card--selected' : ''}`}
      data-game-card={game.id}
      tabIndex={0}
      aria-label={game.title}
      onFocus={() => onSelect(game.id)}
      onClick={() => {
        onSelect(game.id)
        if (game.platform === 'GameCube') onPlayGame(game)
      }}
      style={{ '--card-index': index }}
    >
      <Box className={`game-art game-art--${game.cover}${artworkUrl ? ' game-art--with-cover' : ''}`}>
        {artworkUrl && (
          <Box
            component="img"
            className="game-art-image"
            src={artworkUrl}
            alt={`${game.title} cover`}
            onError={(event) => {
              event.currentTarget.remove()
              event.currentTarget.closest('.game-art')?.classList.remove('game-art--with-cover')
            }}
          />
        )}
        <Box className="art-noise" />
        <Typography className="art-platform">{game.platform}</Typography>
        <Box className="cover-illustration" aria-hidden="true">
          <span className="cover-sun" />
          <span className="cover-orbit" />
          <span className="cover-symbol">{game.symbol}</span>
          <span className="cover-horizon" />
        </Box>
        <Box className="cover-copy">
          <Typography className="cover-kicker">{game.subtitle}</Typography>
          <Typography className="cover-title">{game.title}</Typography>
        </Box>
        {game.favorite && <span className="cover-favorite"><FavoriteRounded /></span>}
        <Box className="cover-bottom-line"><span /> {game.year}</Box>
      </Box>
      <Box className="game-info">
        <Box className="game-details">
          <Typography className="game-title">{game.title}</Typography>
          <Typography className="game-meta">
            {intl.formatMessage(
              { id: 'library.platformGenre' },
              {
                platform: game.platform,
                genre: intl.formatMessage({ id: `genre.${game.genre.toLowerCase()}`, defaultMessage: game.genre }),
              },
            )}
          </Typography>
        </Box>
        <Tooltip title={intl.formatMessage({ id: 'library.gameOptions' }, { title: game.title })}>
          <IconButton
            className="game-menu-button"
            data-game-options
            aria-label={intl.formatMessage({ id: 'library.gameOptions' }, { title: game.title })}
            onClick={(event) => {
              event.stopPropagation()
              onOpenOptions(event, game)
            }}
          >
            <MoreHorizRounded />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

export default GameCard
