import { useEffect, useState } from 'react'
import { IntlProvider } from 'react-intl'
import { LocaleContext } from './localeContext.js'
import DocumentMetadata from './DocumentMetadata.jsx'
import englishMessages from './messages/en.json'
import frenchMessages from './messages/fr.json'

const messagesByLocale = {
  en: englishMessages,
  fr: frenchMessages,
}

function getSavedLocale() {
  try {
    const savedLocale = window.localStorage.getItem('gdr.locale')
      ?? window.localStorage.getItem('pixelvault.locale')
    return savedLocale === 'fr' ? 'fr' : 'en'
  } catch (error) {
    console.error('Could not read the saved language; using English.', error)
    return 'en'
  }
}

function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(getSavedLocale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const changeLocale = (nextLocale) => {
    if (!messagesByLocale[nextLocale]) {
      throw new Error(`Unsupported locale: ${nextLocale}`)
    }
    try {
      window.localStorage.setItem('gdr.locale', nextLocale)
    } catch (error) {
      console.error('Could not save the selected language.', error)
    }
    setLocale(nextLocale)
  }

  return (
    <LocaleContext.Provider value={{ locale, changeLocale }}>
      <IntlProvider
        locale={locale}
        defaultLocale="en"
        messages={messagesByLocale[locale]}
      >
        <DocumentMetadata />
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  )
}

export default LocaleProvider
