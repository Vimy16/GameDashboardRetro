import { Box } from '@mui/material'
import { SportsEsportsRounded } from '@mui/icons-material'
import { useIntl } from 'react-intl'

function GamepadHelp({ isConnected, showInstructions }) {
  const intl = useIntl()
  if (!isConnected) return null

  return (
    <Box
      className={`gamepad-help ${showInstructions ? '' : 'gamepad-help--compact'}`}
      role="status"
      aria-label={intl.formatMessage({ id: 'controller.connected' })}
      aria-live="polite"
    >
      <SportsEsportsRounded />
      {showInstructions && (
        <>
          <span>{intl.formatMessage({ id: 'controller.connected' })}</span>
          <span className="gamepad-help-divider" />
          <span className="gamepad-help-controls">{intl.formatMessage({ id: 'controller.controls' })}</span>
        </>
      )}
    </Box>
  )
}

export default GamepadHelp
