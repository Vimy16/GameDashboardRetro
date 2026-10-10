import { Box, Typography } from '@mui/material'
import { useIntl } from 'react-intl'

function StartupScreen() {
  const intl = useIntl()

  return (
    <Box component="main" className="startup-screen" role="status" aria-live="polite">
      <Box className="startup-brand" aria-hidden="true">
        G<span>DR</span>
      </Box>
      <Box className="startup-copy">
        <Typography className="startup-title">GDR</Typography>
        <Typography className="startup-caption">
          {intl.formatMessage({ id: 'library.loading' })}
        </Typography>
      </Box>
      <Box
        className="startup-progress"
        role="progressbar"
        aria-label={intl.formatMessage({ id: 'library.loading' })}
      />
    </Box>
  )
}

export default StartupScreen
