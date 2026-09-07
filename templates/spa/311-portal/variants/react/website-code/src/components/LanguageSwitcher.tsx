import { useI18n, type Language } from '../i18n'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useI18n()

  const options: { value: Language; label: string }[] = [
    { value: 'en', label: 'EN' },
    { value: 'fr', label: 'FR' },
  ]

  return (
    <span className="lang-switcher">
      {options.map((opt, i) => (
        <span key={opt.value}>
          {i > 0 && <span className="lang-switcher-sep" aria-hidden="true">|</span>}
          <button
            type="button"
            lang={opt.value}
            className={`lang-switcher-btn ${language === opt.value ? 'active' : ''}`}
            onClick={() => setLanguage(opt.value)}
            aria-label={opt.value === 'en' ? 'English (EN)' : 'Fran\u00e7ais (FR)'}
            aria-current={language === opt.value ? 'true' : undefined}
          >
            {opt.label}
          </button>
        </span>
      ))}
    </span>
  )
}
