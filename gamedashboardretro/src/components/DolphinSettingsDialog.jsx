import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material'
import { useIntl } from 'react-intl'

const defaultSettings = {
  path: null,
  detected: false,
  configured: false,
  internalResolution: '6',
  controllerProfile: 'eightBitDo',
}

function DolphinSettingsDialog({
  open,
  settings,
  onClose,
  onChooseExecutable,
  onClearExecutable,
  onSave,
}) {
  const intl = useIntl()
  const [draft, setDraft] = useState(() => ({ ...defaultSettings, ...settings }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleChooseExecutable = async () => {
    setBusy(true)
    setError('')
    try {
      const updatedSettings = await onChooseExecutable()
      if (updatedSettings) {
        setDraft((current) => ({
          ...current,
          path: updatedSettings.path,
          detected: updatedSettings.detected,
          configured: updatedSettings.configured,
          detectionError: updatedSettings.detectionError,
        }))
      }
    } catch (chooseError) {
      setError(chooseError.message)
    } finally {
      setBusy(false)
    }
  }

  const handleClearExecutable = async () => {
    setBusy(true)
    setError('')
    try {
      const updatedSettings = await onClearExecutable()
      setDraft((current) => ({
        ...current,
        path: updatedSettings.path,
        detected: updatedSettings.detected,
        configured: updatedSettings.configured,
        detectionError: updatedSettings.detectionError,
      }))
    } catch (clearError) {
      setError(clearError.message)
    } finally {
      setBusy(false)
    }
  }

  const handleSave = async () => {
    setBusy(true)
    setError('')
    try {
      const updatedSettings = await onSave({
        internalResolution: draft.internalResolution,
        controllerProfile: draft.controllerProfile,
      })
      setDraft({ ...defaultSettings, ...updatedSettings })
      onClose()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="dolphin-settings-title"
      slotProps={{ paper: { className: 'dolphin-settings-dialog' } }}
    >
      <DialogTitle id="dolphin-settings-title">
        {intl.formatMessage({ id: 'dolphin.title' })}
      </DialogTitle>
      <DialogContent className="dolphin-settings-content">
        <Typography className="dolphin-settings-description">
          {intl.formatMessage({ id: 'dolphin.description' })}
        </Typography>

        <Box className="dolphin-detection">
          <Alert severity={draft.detected ? 'success' : 'warning'}>
            {intl.formatMessage({
              id: draft.detected ? 'dolphin.detected' : 'dolphin.notDetected',
            })}
          </Alert>
          {draft.path && (
            <Typography className="dolphin-path" title={draft.path}>
              {draft.path}
            </Typography>
          )}
          {draft.detectionError && (
            <Typography className="dolphin-path-error">{draft.detectionError}</Typography>
          )}
          <Box className="dolphin-path-actions">
            <Button onClick={handleChooseExecutable} disabled={busy}>
              {intl.formatMessage({ id: 'dolphin.chooseExecutable' })}
            </Button>
            {draft.configured && (
              <Button color="inherit" onClick={handleClearExecutable} disabled={busy}>
                {intl.formatMessage({ id: 'dolphin.useAutoDetect' })}
              </Button>
            )}
          </Box>
        </Box>

        <FormControl fullWidth size="small">
          <InputLabel id="dolphin-resolution-label">
            {intl.formatMessage({ id: 'dolphin.resolution' })}
          </InputLabel>
          <Select
            labelId="dolphin-resolution-label"
            value={draft.internalResolution}
            label={intl.formatMessage({ id: 'dolphin.resolution' })}
            onChange={(event) => setDraft((current) => ({
              ...current,
              internalResolution: event.target.value,
            }))}
          >
            {['1', '2', '3', '4', '6'].map((scale) => (
              <MenuItem value={scale} key={scale}>
                {intl.formatMessage({ id: `dolphin.resolution${scale}` })}
              </MenuItem>
            ))}
          </Select>
          <Typography className="dolphin-setting-hint">
            {intl.formatMessage({ id: 'dolphin.resolutionHint' })}
          </Typography>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel id="dolphin-controller-label">
            {intl.formatMessage({ id: 'dolphin.controllerProfile' })}
          </InputLabel>
          <Select
            labelId="dolphin-controller-label"
            value={draft.controllerProfile}
            label={intl.formatMessage({ id: 'dolphin.controllerProfile' })}
            onChange={(event) => setDraft((current) => ({
              ...current,
              controllerProfile: event.target.value,
            }))}
          >
            <MenuItem value="eightBitDo">
              {intl.formatMessage({ id: 'dolphin.profile8BitDo' })}
            </MenuItem>
            <MenuItem value="keyboardMouse">
              {intl.formatMessage({ id: 'dolphin.profileKeyboard' })}
            </MenuItem>
          </Select>
          <Typography className="dolphin-setting-hint">
            {intl.formatMessage({ id: 'dolphin.controllerHint' })}
          </Typography>
        </FormControl>

        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {intl.formatMessage({ id: 'dolphin.cancel' })}
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={busy}>
          {intl.formatMessage({ id: 'dolphin.save' })}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DolphinSettingsDialog
