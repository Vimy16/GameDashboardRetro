import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  IconButton,
  InputBase,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material'
import { BackspaceRounded, HistoryRounded, SearchRounded } from '@mui/icons-material'
import { useIntl } from 'react-intl'
import { useLocale } from '../i18n/localeContext.js'

const keyboardRows = {
  en: ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'],
  fr: ['1234567890', 'azertyuiop', 'qsdfghjklm', 'wxcvbn'],
}

function Topbar({ activePage, gamepadConnected, onNotify, onSearchChange, search }) {
  const intl = useIntl()
  const { locale } = useLocale()
  const searchBoxRef = useRef(null)
  const searchInputRef = useRef(null)
  const firstKeyRef = useRef(null)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [keyboardAnchor, setKeyboardAnchor] = useState(null)

  useEffect(() => {
    if (!keyboardOpen || !gamepadConnected) return undefined
    const animationFrame = requestAnimationFrame(() => firstKeyRef.current?.focus())
    return () => cancelAnimationFrame(animationFrame)
  }, [gamepadConnected, keyboardOpen, locale])

  const openKeyboard = () => {
    searchInputRef.current?.focus()
    setKeyboardAnchor(searchBoxRef.current)
    setKeyboardOpen(true)
  }

  const closeKeyboard = () => {
    setKeyboardOpen(false)
    setKeyboardAnchor(null)
  }

  const appendSearchText = (text) => {
    onSearchChange(`${search}${text}`)
  }

  const handleSearchKey = (event, key) => {
    event.preventDefault()
    appendSearchText(key)
  }

  const handleSearchInputKeyDown = (event) => {
    if (event.key === 'Enter' && keyboardOpen) {
      event.preventDefault()
      closeKeyboard()
    }
  }

  const deleteSearchCharacter = () => {
    onSearchChange(Array.from(search).slice(0, -1).join(''))
  }

  return (
    <Box component="header" className="topbar">
      <Box className="breadcrumb">
        <Typography>{intl.formatMessage({ id: 'topbar.library' })}</Typography>
        <span>/</span>
        <Typography className="breadcrumb-current">{intl.formatMessage({ id: `nav.${activePage}` })}</Typography>
      </Box>
      <Box className="topbar-actions">
        <Box
          ref={searchBoxRef}
          className="search-box"
          onClick={openKeyboard}
          aria-haspopup="dialog"
          aria-expanded={keyboardOpen}
        >
          <SearchRounded className="search-icon" />
          <InputBase
            inputRef={searchInputRef}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={intl.formatMessage({ id: 'topbar.search' })}
            inputProps={{
              'aria-label': intl.formatMessage({ id: 'topbar.searchLabel' }),
              'aria-haspopup': 'dialog',
              'aria-expanded': keyboardOpen,
              onKeyDown: handleSearchInputKeyDown,
            }}
          />
          <kbd>⌘ K</kbd>
        </Box>
        <span className="topbar-divider" />
        <Tooltip title={intl.formatMessage({ id: 'topbar.notifications' })}>
          <IconButton className="notification-button" aria-label={intl.formatMessage({ id: 'topbar.notifications' })} onClick={onNotify}>
            <span className="notification-dot" />
            <HistoryRounded />
          </IconButton>
        </Tooltip>
        <Box className="avatar" aria-label={intl.formatMessage({ id: 'topbar.profile' })}>V</Box>
      </Box>
      <Popover
        open={keyboardOpen}
        anchorEl={keyboardAnchor}
        onClose={closeKeyboard}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { className: `virtual-keyboard-paper ${gamepadConnected ? 'virtual-keyboard-paper--controller' : ''}`, role: 'dialog', 'aria-label': intl.formatMessage({ id: 'keyboard.title' }) } }}
      >
        <Box className="virtual-keyboard">
          <Box className="virtual-keyboard-heading">
            <Typography>{intl.formatMessage({ id: 'keyboard.title' })}</Typography>
            <Typography>{intl.formatMessage({ id: locale === 'fr' ? 'locale.french' : 'locale.english' })}</Typography>
          </Box>
          <Typography className="virtual-keyboard-instructions">
            {intl.formatMessage({ id: 'keyboard.controllerInstructions' })}
          </Typography>
          {keyboardRows[locale].map((row, rowIndex) => (
            <Box className="virtual-keyboard-row" key={`${locale}-${rowIndex}`}>
              {Array.from(row, (key) => (
                <Button
                  className="virtual-key"
                  key={key}
                  ref={rowIndex === 0 && key === keyboardRows[locale][0][0] ? firstKeyRef : undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => handleSearchKey(event, key)}
                  aria-label={intl.formatMessage({ id: 'keyboard.typeKey' }, { key: key.toUpperCase() })}
                >
                  {key}
                </Button>
              ))}
              {rowIndex === 3 && (
                <Button
                  className="virtual-key virtual-key--backspace"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={deleteSearchCharacter}
                  aria-label={intl.formatMessage({ id: 'keyboard.backspace' })}
                >
                  <BackspaceRounded />
                </Button>
              )}
            </Box>
          ))}
          <Box className="virtual-keyboard-row virtual-keyboard-actions">
            <Button className="virtual-key virtual-key--utility" onMouseDown={(event) => event.preventDefault()} onClick={() => onSearchChange('')}>
              {intl.formatMessage({ id: 'keyboard.clear' })}
            </Button>
            <Button className="virtual-key virtual-key--space" onMouseDown={(event) => event.preventDefault()} onClick={(event) => handleSearchKey(event, ' ')}>
              {intl.formatMessage({ id: 'keyboard.space' })}
            </Button>
            <Button className="virtual-key virtual-key--enter" onMouseDown={(event) => event.preventDefault()} onClick={closeKeyboard}>
              {intl.formatMessage({ id: 'keyboard.enter' })}
            </Button>
          </Box>
        </Box>
      </Popover>
    </Box>
  )
}

export default Topbar
