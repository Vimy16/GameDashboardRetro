import {
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
} from '@mui/material'
import {
  CheckRounded,
  CloseRounded,
  DeleteOutlineRounded,
  FavoriteBorderRounded,
  FavoriteRounded,
} from '@mui/icons-material'
import { useIntl } from 'react-intl'

function GameOptionsMenu({
  anchorEl,
  onClose,
  onRemove,
  onToggleFavorite,
  onToastClose,
  selectedGame,
  toast,
}) {
  const intl = useIntl()

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={onClose}
        className="game-menu"
        slotProps={{ paper: { className: 'game-menu-paper' } }}
      >
        <MenuItem onClick={onToggleFavorite}>
          {selectedGame?.favorite ? <FavoriteRounded /> : <FavoriteBorderRounded />}
          {intl.formatMessage({ id: selectedGame?.favorite ? 'menu.removeFavorite' : 'menu.addFavorite' })}
        </MenuItem>
        <MenuItem onClick={onRemove} className="remove-menu-item"><DeleteOutlineRounded />{intl.formatMessage({ id: 'menu.removeGame' })}</MenuItem>
      </Menu>
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={onToastClose}
        message={<span className="toast-message"><CheckRounded />{toast}</span>}
        action={<IconButton size="small" aria-label={intl.formatMessage({ id: 'toast.close' })} onClick={onToastClose}><CloseRounded /></IconButton>}
      />
    </>
  )
}

export default GameOptionsMenu
