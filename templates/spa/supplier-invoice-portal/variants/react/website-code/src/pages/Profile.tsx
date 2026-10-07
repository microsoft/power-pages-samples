import { useState, useEffect, useRef } from 'react'
import { useProfileStats } from '../data/invoiceProvider'
import { User, Building2, Shield } from 'lucide-react'
import Toast from '../components/Toast'
import usePageTitle from '../hooks/usePageTitle'
import { useAuth } from '../hooks/useAuth'
import { isLocalDevelopment } from '../services/authService'
import { getProfile, updateProfile, type ProfileFields } from '../services/profileService'
import { hasAnyRole } from '../utils/authorization'

const emptyForm: ProfileFields = { firstName: '', lastName: '', email: '', phone: '', jobTitle: '' }

function profileFields(profile: ProfileFields): ProfileFields {
  return {
    firstName: profile.firstName, lastName: profile.lastName,
    email: profile.email, phone: profile.phone, jobTitle: profile.jobTitle,
  }
}

function ProfileInvoiceStats() {
  const { stats } = useProfileStats()
  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      {[
        { label: 'Total Invoices', value: stats.total },
        { label: 'Rejected', value: stats.rejected },
        { label: 'Paid', value: stats.paid },
        { label: 'Pending', value: stats.pending },
      ].map(stat => (
        <div key={stat.label} style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 600 }}>
            {stat.value}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

export default function Profile() {
  usePageTitle('My Profile')
  const { user, displayName, initials } = useAuth()

  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [savedForm, setSavedForm] = useState(emptyForm)
  const [companyName, setCompanyName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loadVersion, setLoadVersion] = useState(0)
  const saveController = useRef<AbortController | null>(null)
  const isDirty = !isLoading && !loadError && JSON.stringify(form) !== JSON.stringify(savedForm)

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setLoadError(null)
    getProfile(controller.signal).then(profile => {
      if (controller.signal.aborted) return
      const fields = profileFields(profile)
      setForm(fields)
      setSavedForm(fields)
      setCompanyName(profile.companyName)
    }).catch(error => {
      if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : String(error))
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false)
    })
    return () => controller.abort()
  }, [loadVersion, user?.contactId])

  useEffect(() => () => { saveController.current?.abort() }, [])

  // Warn before closing tab with unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const hasBusinessRole = hasAnyRole(['Supplier', 'Reviewer'])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (saveController.current || isLoading || loadError || !isDirty) return
    // The ref closes the same-turn double-submit gap before React disables UI.
    const controller = new AbortController()
    saveController.current = controller
    setIsSaving(true)
    setSaveError(null)
    setToast(null)
    try {
      const profile = await updateProfile(form, controller.signal)
      if (controller.signal.aborted) return
      const fields = profileFields(profile)
      setForm(fields)
      setSavedForm(fields)
      setCompanyName(profile.companyName)
      setToast({
        message: isLocalDevelopment ? 'Demo profile saved in this browser only' : 'Profile updated successfully',
        variant: 'success',
      })
    } catch (error) {
      if (controller.signal.aborted) return
      const message = error instanceof Error ? error.message : String(error)
      setSaveError(message)
      setToast({ message, variant: 'error' })
    } finally {
      saveController.current = null
      if (!controller.signal.aborted) setIsSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--color-border)',
    fontSize: '0.938rem',
    fontFamily: 'var(--font-body)',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 500,
    marginBottom: 6,
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    padding: 28,
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--color-border)',
    marginBottom: 24,
  }

  const sectionTitle: React.CSSProperties = {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.05rem',
    fontWeight: 600,
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  }

  return (
    <div style={{ maxWidth: 800, overflowWrap: 'anywhere' }}>
      {toast && (
        <Toast key={toast.message} message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}

      <div className="animate-in" style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          My Profile
        </h1>
        <p style={{ fontSize: '0.925rem', color: 'var(--color-text-muted)' }}>
          Update your Contact details. Sign-in credentials and company details are managed separately.
        </p>
      </div>

      {/* Profile Header Card */}
      <div className="animate-in animate-in-1" style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '1.5rem',
              fontWeight: 600,
              fontFamily: 'var(--font-heading)',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 600 }}>
              {displayName}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
              {savedForm.jobTitle}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              {user?.email}
            </div>
          </div>
          {hasBusinessRole && <ProfileInvoiceStats />}
        </div>
      </div>

      {/* Personal Information */}
      {isLoading && <p role="status" style={{ marginBottom: 16 }}>Loading Contact profile...</p>}
      {loadError && (
        <div role="alert" style={{ marginBottom: 16, color: 'var(--color-error)' }}>
          <p>{loadError}</p>
          <button type="button" className="btn-secondary" onClick={() => setLoadVersion(value => value + 1)}>
            Retry profile load
          </button>
        </div>
      )}
      {saveError && <p role="alert" style={{ marginBottom: 16, color: 'var(--color-error)' }}>{saveError}</p>}
      {isLocalDevelopment && <p style={{ marginBottom: 16 }}>Demo mode: changes stay in this browser and do not update Dataverse.</p>}
      <form onSubmit={handleSave} aria-busy={isLoading || isSaving}>
        <fieldset disabled={isLoading || isSaving || !!loadError} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div className="animate-in animate-in-2" style={cardStyle}>
          <h2 style={sectionTitle}>
            <User size={18} color="var(--color-primary)" aria-hidden="true" />
            Personal Information
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
              gap: 18,
            }}
          >
            <div>
              <label htmlFor="profile-first-name" style={labelStyle}>First Name</label>
              <input
                id="profile-first-name"
                type="text"
                maxLength={50}
                autoComplete="given-name"
                value={form.firstName}
                onChange={(e) => setForm(prev => ({ ...prev, firstName: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="profile-last-name" style={labelStyle}>Last Name</label>
              <input
                id="profile-last-name"
                type="text"
                required
                maxLength={50}
                autoComplete="family-name"
                value={form.lastName}
                onChange={(e) => setForm(prev => ({ ...prev, lastName: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="profile-email" style={labelStyle}>Email Address</label>
              <input
                id="profile-email"
                type="email"
                maxLength={100}
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="profile-phone" style={labelStyle}>Phone Number</label>
              <input
                id="profile-phone"
                type="tel"
                maxLength={50}
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="profile-title" style={labelStyle}>Job Title</label>
              <input
                id="profile-title"
                type="text"
                maxLength={100}
                autoComplete="organization-title"
                value={form.jobTitle}
                onChange={(e) => setForm(prev => ({ ...prev, jobTitle: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="animate-in animate-in-3" style={{ ...cardStyle, background: 'var(--color-bg)' }}>
          <h2 style={sectionTitle}>
            <Building2 size={18} color="var(--color-primary)" aria-hidden="true" />
            Company Information
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>Managed by your organization</p>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>Company</div>
          <div style={{ fontSize: '0.925rem', fontWeight: 500 }}>
            {isLoading ? 'Loading...' : loadError ? 'Unavailable' : companyName || 'No company assigned'}
          </div>
        </div>

        {/* Security */}
        <div className="animate-in animate-in-4" style={cardStyle}>
          <h2 style={sectionTitle}>
            <Shield size={18} color="var(--color-primary)" aria-hidden="true" />
            Security
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            Use your sign-in provider to manage your password. This form changes business Contact details only.
          </p>
        </div>

        {/* Save */}
        <div className="animate-in animate-in-5" style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn-primary" disabled={!isDirty || isLoading || isSaving || !!loadError}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
        </fieldset>
      </form>
    </div>
  )
}
