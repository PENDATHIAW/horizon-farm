import { createContext, useContext, useState } from 'react'
import { translations } from '../i18n/translations'

const LocaleContext = createContext()

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    if (typeof window === 'undefined') return 'fr'
    return localStorage.getItem('hf-locale') || 'fr'
  })

  const switchLocale = (lang) => {
    setLocale(lang)
    localStorage.setItem('hf-locale', lang)
    document.documentElement.lang = lang
  }

  const t = translations[locale]

  return (
    <LocaleContext.Provider value={{ locale, switchLocale, t }}>{children}</LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
