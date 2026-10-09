import { createContext, useContext } from 'react'

export const LocaleContext = createContext(null)

export function useLocale() {
  const localeContext = useContext(LocaleContext)
  if (!localeContext) {
    throw new Error('useLocale must be used within LocaleProvider.')
  }
  return localeContext
}
