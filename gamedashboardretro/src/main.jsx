import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import LocaleProvider from './i18n/LocaleProvider.jsx'
import './index.css'

const queryClient = new QueryClient()

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#9d7bff' },
    background: { default: '#0b0b0f', paper: '#14141b' },
    text: { primary: '#f2f0f7', secondary: '#888694' },
  },
  typography: {
    fontFamily: '"DM Sans", "Segoe UI", sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <App />
        </LocaleProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
