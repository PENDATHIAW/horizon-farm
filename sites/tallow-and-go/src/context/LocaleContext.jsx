import { createContext, useContext, useState } from 'react'
import { translations } from '../i18n/translations'

const LocaleContext = createContext()

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(() => localStorage.getItem('tg-locale') || 'fr')
  const switchLocale = (lang) => {
    setLocale(lang)
    localStorage.setItem('tg-locale', lang)
    document.documentElement.lang = lang
  }
  return (
    <LocaleContext.Provider value={{ locale, switchLocale, t: translations[locale] }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
