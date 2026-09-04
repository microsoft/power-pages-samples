import { createContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { en } from './translations/en'
import { fr } from './translations/fr'

export type Language = 'en' | 'fr'

const STORAGE_KEY = 'zava-lang'

const translations: Record<Language, Record<string, string>> = { en, fr }

export interface I18nContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  /**
   * Looks up a translation, optionally substituting `{name}` placeholders.
   * e.g. t('signIn.invitationBanner', { code: 'ABC123' })
   */
  t: (key: string, vars?: Record<string, string | number>) => string
}

export const I18nContext = createContext<I18nContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
})

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'fr') return 'fr'
  } catch {}
  return 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage)

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    try { localStorage.setItem(STORAGE_KEY, lang) } catch {}
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const template = translations[language][key] ?? translations.en[key] ?? key
      if (!vars) return template
      // Unmatched placeholders are left as-is so a missing variable is visible
      // during development rather than silently rendering an empty gap.
      return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match
      )
    },
    [language],
  )

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}
