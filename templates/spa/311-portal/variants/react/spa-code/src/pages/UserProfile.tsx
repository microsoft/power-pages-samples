import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { UserCog, ShieldAlert } from 'lucide-react'
import { useAuth } from '../shared/hooks/useAuth'
import { useI18n } from '../i18n'
import {
  applyContactUpdateLocally,
  getMyProfile,
  updateMyProfile,
  type ProfileContact,
  type ProfileUpdate,
} from '../services/authService'
import { AuthAlert } from '../components/AuthFormControls'
import './UserProfile.css'

/** The contact columns this form edits, in display order. */
const FIELDS = [
  'firstname',
  'lastname',
  'mobilephone',
  'address1_line1',
  'address1_city',
  'address1_stateorprovince',
  'address1_postalcode',
  'address1_country',
] as const

type FieldName = (typeof FIELDS)[number]
type FormValues = Record<FieldName, string>

/** Browser autofill hints, so the form cooperates with saved addresses. */
const AUTOCOMPLETE: Record<FieldName, string> = {
  firstname: 'given-name',
  lastname: 'family-name',
  mobilephone: 'tel',
  address1_line1: 'address-line1',
  address1_city: 'address-level2',
  address1_stateorprovince: 'address-level1',
  address1_postalcode: 'postal-code',
  address1_country: 'country-name',
}

const EMPTY_FORM: FormValues = {
  firstname: '',
  lastname: '',
  mobilephone: '',
  address1_line1: '',
  address1_city: '',
  address1_stateorprovince: '',
  address1_postalcode: '',
  address1_country: '',
}

/** Every field is optional; only the phone has a format expectation. */
const validateField = (field: FieldName, value: string): string | undefined => {
  if (field === 'mobilephone' && value.trim() && value.trim().length < 6) {
    return 'Enter a valid phone number.'
  }
  return undefined
}

const toForm = (contact: ProfileContact): FormValues =>
  FIELDS.reduce((acc, field) => {
    acc[field] = contact[field] ?? ''
    return acc
  }, { ...EMPTY_FORM })

export default function UserProfile() {
  const { user, isAuthenticated, isLoading: isAuthLoading, refresh } = useAuth()
  const { t } = useI18n()

  const [profile, setProfile] = useState<ProfileContact | null>(null)
  const [values, setValues] = useState<FormValues>(EMPTY_FORM)
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const contactId = user?.id || ''

  useEffect(() => {
    document.title = `${t('userProfile.title')} — Zava City Portal`
  }, [t])

  useEffect(() => {
    if (!contactId) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    getMyProfile(contactId)
      .then(loaded => {
        if (cancelled) return
        setProfile(loaded)
        setValues(toForm(loaded))
      })
      .catch(err => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : t('userProfile.loadError'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [contactId, t])

  const setValue = (field: FieldName, value: string) => {
    setSaveError('')
    setSuccessMessage('')
    setValues(prev => ({ ...prev, [field]: value }))
    if (touched[field]) {
      setErrors(prev => ({ ...prev, [field]: validateField(field, value) }))
    }
  }

  const handleBlur = (field: FieldName) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    setErrors(prev => ({ ...prev, [field]: validateField(field, values[field]) }))
  }

  const showError = (field: FieldName) => (touched[field] ? errors[field] : undefined)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isSaving || !profile) return

    const allTouched: Partial<Record<FieldName, boolean>> = {}
    const nextErrors: Partial<Record<FieldName, string>> = {}
    for (const field of FIELDS) {
      allTouched[field] = true
      const error = validateField(field, values[field])
      if (error) nextErrors[field] = error
    }
    setTouched(allTouched)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    // Send only what actually changed. An emptied field goes as null so the user
    // can clear a value; an untouched field is omitted entirely so a partial save
    // never blanks a column it wasn't meant to touch.
    const payload: ProfileUpdate = {}
    for (const field of FIELDS) {
      const next = values[field].trim()
      const current = profile[field] ?? ''
      if (next !== current) payload[field] = next === '' ? null : next
    }

    if (Object.keys(payload).length === 0) {
      setSuccessMessage(t('userProfile.noChanges'))
      return
    }

    setIsSaving(true)
    setSaveError('')
    try {
      await updateMyProfile(profile.contactid, payload)

      setSuccessMessage(t('userProfile.saved'))
      setProfile({ ...profile, ...payload })
      // Mirror the new name into the portal snapshot, then push it into React
      // state — together these repaint the header without a page reload.
      applyContactUpdateLocally(payload)
      refresh()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('userProfile.saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isAuthLoading) {
    return (
      <div className="page">
        <div className="container profile-container">
          <div className="auth-loading">
            <span className="auth-spinner" />
            <span>{t('common.loading')}</span>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login?returnUrl=/user-profile" replace />
  }

  // A contact record is created on first sign-in. If the claims mapping is
  // misconfigured the user can be authenticated with no contact linked, and every
  // Web API call would 404 — so say what is actually wrong instead of failing.
  if (!contactId) {
    return (
      <div className="page">
        <div className="container profile-container">
          <div className="card profile-card">
            <div className="profile-empty">
              <ShieldAlert size={32} />
              <h1 className="profile-title">{t('userProfile.unavailableTitle')}</h1>
              <p>{t('userProfile.unavailableBody')}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const fullName = user?.displayName || '—'

  return (
    <div className="page">
      <div className="container profile-container">
        <div className="profile-header animate-in animate-in-1">
          <div className="profile-icon">
            <UserCog size={26} />
          </div>
          <div>
            <h1 className="profile-title">{t('userProfile.title')}</h1>
            <p className="profile-subtitle">{t('userProfile.subtitle')}</p>
          </div>
        </div>

        <section className="card profile-card animate-in animate-in-2">
          <h2 className="profile-section-title">{t('userProfile.accountDetails')}</h2>
          <dl className="profile-account">
            <div className="profile-account-row">
              <dt>{t('userProfile.fullName')}</dt>
              <dd>{fullName}</dd>
            </div>
            <div className="profile-account-row">
              <dt>{t('userProfile.email')}</dt>
              <dd>{user?.email || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="card profile-card animate-in animate-in-3">
          <h2 className="profile-section-title">{t('userProfile.yourDetails')}</h2>

          {loadError && <AuthAlert tone="error">{loadError}</AuthAlert>}
          {saveError && <AuthAlert tone="error">{saveError}</AuthAlert>}
          {successMessage && <AuthAlert tone="success">{successMessage}</AuthAlert>}

          {isLoading ? (
            <div className="auth-loading">
              <span className="auth-spinner" />
              <span>{t('userProfile.loading')}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="profile-grid">
                {FIELDS.map(field => (
                  <div className="form-group" key={field}>
                    <label className="form-label" htmlFor={`profile-${field}`}>
                      {t(`userProfile.field.${field}`)}
                    </label>
                    <input
                      id={`profile-${field}`}
                      type={field === 'mobilephone' ? 'tel' : 'text'}
                      className={`form-input ${showError(field) ? 'auth-input-invalid' : ''}`}
                      value={values[field]}
                      onChange={e => setValue(field, e.target.value)}
                      onBlur={() => handleBlur(field)}
                      disabled={isSaving || !!loadError}
                      autoComplete={AUTOCOMPLETE[field]}
                      aria-invalid={!!showError(field)}
                      aria-describedby={showError(field) ? `profile-${field}-error` : undefined}
                    />
                    {showError(field) && (
                      <span className="auth-field-error" id={`profile-${field}-error`}>
                        {showError(field)}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="profile-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving || !!loadError}
                >
                  {isSaving ? t('userProfile.saving') : t('userProfile.save')}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
