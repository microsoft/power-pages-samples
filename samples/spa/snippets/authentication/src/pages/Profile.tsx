import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  LOCAL_PROVIDER,
  logout as authLogout,
  patchOwnContact,
  fetchOwnContact,
  type ContactProfile,
} from '../services/authService'
import { site } from '../data/site'

type FormState = ContactProfile

const EMPTY_FORM: FormState = {
  firstname: '',
  lastname: '',
  emailaddress1: '',
  mobilephone: '',
  address1_line1: '',
  address1_line2: '',
  address1_city: '',
  address1_stateorprovince: '',
  address1_postalcode: '',
  address1_country: '',
}

const EDITABLE_FIELDS: Array<keyof FormState> = [
  'firstname',
  'lastname',
  'mobilephone',
  'address1_line1',
  'address1_line2',
  'address1_city',
  'address1_stateorprovince',
  'address1_postalcode',
  'address1_country',
]

export default function Profile() {
  const { user, isLoading, refresh } = useAuth()

  const [profile, setProfile] = useState<FormState>(EMPTY_FORM)
  const [original, setOriginal] = useState<FormState>(EMPTY_FORM)
  const [loadError, setLoadError] = useState<string | undefined>()
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [serverError, setServerError] = useState<string | undefined>()
  const [successMessage, setSuccessMessage] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    document.title = `Profile — ${site.name}`
  }, [])

  useEffect(() => {
    if (!user) return
    setIsLoadingProfile(true)
    setLoadError(undefined)
    fetchOwnContact()
      .then(data => {
        setProfile(data)
        setOriginal(data)
      })
      .catch(err => {
        setLoadError(err instanceof Error ? err.message : 'Could not load profile.')
      })
      .finally(() => {
        setIsLoadingProfile(false)
      })
  }, [user])

  if (isLoading) {
    return (
      <>
        <style>{profileCSS}</style>
        <div className="profile-page">
          <div className="profile-card surface" aria-busy="true">
            <p>Loading profile…</p>
          </div>
        </div>
      </>
    )
  }

  if (!user) {
    return (
      <>
        <style>{profileCSS}</style>
        <div className="profile-page">
          <div className="profile-card surface">
            <h1 className="profile-title">Profile</h1>
            <p className="profile-lede">You need to sign in to view your profile.</p>
            <Link to="/login" className="btn btn-primary">Sign in</Link>
          </div>
        </div>
      </>
    )
  }

  const initials = (
    profile.firstname[0] ||
    profile.lastname[0] ||
    profile.emailaddress1[0] ||
    user.email?.[0] ||
    user.userName?.[0] ||
    '?'
  ).toUpperCase()

  const fullName =
    [profile.firstname, profile.lastname].filter(Boolean).join(' ') ||
    user.userName ||
    'User'

  const hasChanges = EDITABLE_FIELDS.some(
    f => (profile[f] || '').trim() !== (original[f] || '').trim(),
  )

  function handleChange(field: keyof FormState, value: string) {
    setProfile(prev => ({ ...prev, [field]: value }))
    if (serverError) setServerError(undefined)
    if (successMessage) setSuccessMessage(undefined)
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!hasChanges) return
    const updates: Record<string, string> = {}
    for (const f of EDITABLE_FIELDS) {
      const current = (profile[f] || '').trim()
      const previous = (original[f] || '').trim()
      if (current !== previous) updates[f] = current
    }

    setIsSaving(true)
    setServerError(undefined)
    setSuccessMessage(undefined)
    patchOwnContact(updates)
      .then(() => {
        setSuccessMessage('Profile updated.')
        setOriginal(profile)
        refresh()
        setIsSaving(false)
      })
      .catch(err => {
        setServerError(err instanceof Error ? err.message : 'Could not save profile.')
        setIsSaving(false)
      })
  }

  const roles = user.userRoles || []
  const displayEmail = profile.emailaddress1 || user.email || user.userName

  return (
    <>
      <style>{profileCSS}</style>
      <div className="profile-page">
        <div className="profile-card surface">
          <header className="profile-head">
            <span className="profile-avatar" aria-hidden="true">{initials}</span>
            <div className="profile-head-text">
              <h1 className="profile-title">{fullName}</h1>
              <p className="profile-email">{displayEmail}</p>
            </div>
          </header>

          <section className="profile-section">
            <h2 className="profile-section-title">Account details</h2>
            <dl className="profile-info">
              <dt>Email</dt>
              <dd>{displayEmail || <span className="profile-muted">Not set</span>}</dd>
              <dt>Sign-in identifier</dt>
              <dd className="profile-mono">{user.userName}</dd>
              <dt>Contact ID</dt>
              <dd className="profile-mono">{user.contactId}</dd>
              <dt>Roles</dt>
              <dd>
                {roles.length > 0 ? (
                  <ul className="profile-roles">
                    {roles.map(r => (
                      <li key={r}><span className="profile-role-chip">{r}</span></li>
                    ))}
                  </ul>
                ) : (
                  <span className="profile-muted">No roles assigned</span>
                )}
              </dd>
            </dl>
          </section>

          <section className="profile-section">
            <h2 className="profile-section-title">Edit profile</h2>

            {loadError && (
              <div className="profile-banner profile-banner-error" role="alert">{loadError}</div>
            )}
            {serverError && (
              <div className="profile-banner profile-banner-error" role="alert">{serverError}</div>
            )}
            {successMessage && (
              <div className="profile-banner profile-banner-success" role="status">{successMessage}</div>
            )}

            {isLoadingProfile ? (
              <p className="profile-muted">Loading current values…</p>
            ) : (
              <form className="profile-form" noValidate onSubmit={handleSubmit}>
                <div className="profile-grid">
                  <div className="profile-field">
                    <label className="profile-label" htmlFor="p-firstname">First name</label>
                    <input
                      id="p-firstname"
                      type="text"
                      autoComplete="given-name"
                      className="profile-input"
                      value={profile.firstname}
                      disabled={isSaving}
                      onChange={e => handleChange('firstname', e.target.value)}
                    />
                  </div>
                  <div className="profile-field">
                    <label className="profile-label" htmlFor="p-lastname">Last name</label>
                    <input
                      id="p-lastname"
                      type="text"
                      autoComplete="family-name"
                      className="profile-input"
                      value={profile.lastname}
                      disabled={isSaving}
                      onChange={e => handleChange('lastname', e.target.value)}
                    />
                  </div>
                  <div className="profile-field profile-field-full">
                    <label className="profile-label" htmlFor="p-mobile">Mobile phone</label>
                    <input
                      id="p-mobile"
                      type="tel"
                      autoComplete="tel"
                      className="profile-input"
                      value={profile.mobilephone}
                      disabled={isSaving}
                      onChange={e => handleChange('mobilephone', e.target.value)}
                    />
                  </div>
                </div>

                <h3 className="profile-subsection-title">Address</h3>
                <div className="profile-grid">
                  <div className="profile-field profile-field-full">
                    <label className="profile-label" htmlFor="p-line1">Street address</label>
                    <input
                      id="p-line1"
                      type="text"
                      autoComplete="address-line1"
                      className="profile-input"
                      value={profile.address1_line1}
                      disabled={isSaving}
                      onChange={e => handleChange('address1_line1', e.target.value)}
                    />
                  </div>
                  <div className="profile-field profile-field-full">
                    <label className="profile-label" htmlFor="p-line2">Apartment, suite, etc. (optional)</label>
                    <input
                      id="p-line2"
                      type="text"
                      autoComplete="address-line2"
                      className="profile-input"
                      value={profile.address1_line2}
                      disabled={isSaving}
                      onChange={e => handleChange('address1_line2', e.target.value)}
                    />
                  </div>
                  <div className="profile-field">
                    <label className="profile-label" htmlFor="p-city">City</label>
                    <input
                      id="p-city"
                      type="text"
                      autoComplete="address-level2"
                      className="profile-input"
                      value={profile.address1_city}
                      disabled={isSaving}
                      onChange={e => handleChange('address1_city', e.target.value)}
                    />
                  </div>
                  <div className="profile-field">
                    <label className="profile-label" htmlFor="p-state">State / Province</label>
                    <input
                      id="p-state"
                      type="text"
                      autoComplete="address-level1"
                      className="profile-input"
                      value={profile.address1_stateorprovince}
                      disabled={isSaving}
                      onChange={e => handleChange('address1_stateorprovince', e.target.value)}
                    />
                  </div>
                  <div className="profile-field">
                    <label className="profile-label" htmlFor="p-postal">Postal code</label>
                    <input
                      id="p-postal"
                      type="text"
                      autoComplete="postal-code"
                      className="profile-input"
                      value={profile.address1_postalcode}
                      disabled={isSaving}
                      onChange={e => handleChange('address1_postalcode', e.target.value)}
                    />
                  </div>
                  <div className="profile-field">
                    <label className="profile-label" htmlFor="p-country">Country</label>
                    <input
                      id="p-country"
                      type="text"
                      autoComplete="country-name"
                      className="profile-input"
                      value={profile.address1_country}
                      disabled={isSaving}
                      onChange={e => handleChange('address1_country', e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!hasChanges || isSaving || !!loadError}
                >
                  {isSaving ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            )}
          </section>

          {LOCAL_PROVIDER && (
            <section className="profile-section">
              <h2 className="profile-section-title">Password</h2>
              <p className="profile-lede">
                To change your password, request a reset link via email.
              </p>
              <Link to="/forgot-password" className="btn btn-ghost">Send password reset link</Link>
            </section>
          )}

          <section className="profile-section profile-actions">
            <button type="button" className="btn btn-ghost" onClick={() => authLogout('/')}>
              Sign out
            </button>
          </section>
        </div>
      </div>
    </>
  )
}

const profileCSS = `
.profile-page {
  min-height: calc(100vh - 80px);
  display: flex;
  justify-content: center;
  padding: clamp(80px, 12vw, 160px) clamp(20px, 4vw, 48px) clamp(48px, 8vw, 96px);
}

.profile-card {
  width: 100%;
  max-width: 720px;
  padding: clamp(28px, 4vw, 48px);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  box-shadow: var(--shadow-card);
}

.profile-head {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.profile-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #1A1207;
  font-size: 26px;
  font-weight: 700;
  flex-shrink: 0;
}

.profile-head-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.profile-title {
  font-size: clamp(24px, 3.4vw, 32px);
  margin: 0;
  word-break: break-word;
}
.profile-email {
  color: var(--color-text-muted);
  font-size: 14px;
  word-break: break-all;
}
.profile-lede {
  color: var(--color-text-muted);
  font-size: 14px;
}

.profile-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}
.profile-section:first-of-type {
  padding-top: 0;
  border-top: none;
}

.profile-section-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin: 0;
}
.profile-subsection-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-text-subtle);
  margin: var(--space-3) 0 0;
}

.profile-info {
  display: grid;
  grid-template-columns: minmax(120px, max-content) 1fr;
  gap: 8px 20px;
  margin: 0;
}
.profile-info dt {
  font-size: 13px;
  color: var(--color-text-subtle);
  letter-spacing: 0.04em;
}
.profile-info dd {
  margin: 0;
  font-size: 14px;
  color: var(--color-text);
  word-break: break-word;
}
.profile-muted { color: var(--color-text-subtle); }
.profile-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  color: var(--color-text-muted);
}

.profile-roles {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.profile-role-chip {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(232, 184, 108, 0.12);
  border: 1px solid rgba(232, 184, 108, 0.35);
  color: var(--color-secondary);
  font-size: 12px;
  letter-spacing: 0.04em;
}

.profile-form { display: flex; flex-direction: column; gap: var(--space-3); }
.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}
.profile-field-full { grid-column: 1 / -1; }
.profile-field { display: flex; flex-direction: column; gap: 6px; }
.profile-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.profile-input {
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: rgba(20, 16, 14, 0.5);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 15px;
}
.profile-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: rgba(20, 16, 14, 0.7);
}
.profile-input:disabled { opacity: 0.6; }

.profile-banner {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
  border: 1px solid;
}
.profile-banner-error {
  background: rgba(168, 52, 28, 0.12);
  border-color: rgba(168, 52, 28, 0.45);
  color: #f3c2b6;
}
.profile-banner-success {
  background: rgba(46, 125, 50, 0.16);
  border-color: rgba(46, 125, 50, 0.45);
  color: #b9e9b9;
}

.profile-actions { align-items: flex-start; }

@media (max-width: 600px) {
  .profile-grid { grid-template-columns: 1fr; }
}
`
