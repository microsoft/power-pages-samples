import { useState, useEffect, useRef } from 'react'
import { useProfileStats } from '../data/invoiceProvider'
import { User, Building2, Mail, Phone, MapPin, Bell, Shield } from 'lucide-react'
import Toast from '../components/Toast'
import usePageTitle from '../hooks/usePageTitle'
import { useAuth } from '../hooks/useAuth'

const initialNotifications = {
  invoiceUpdates: true,
  paymentConfirmations: true,
  weeklyDigest: false,
}

export default function Profile() {
  usePageTitle('My Profile')
  const { user, displayName, initials } = useAuth()

  const initialForm = useRef({
    name: displayName || '',
    email: user?.email || '',
    phone: '+1 (555) 012-3456',
    jobTitle: 'Accounts Payable Manager',
  })

  const [showToast, setShowToast] = useState(false)
  const [form, setForm] = useState(initialForm.current)
  const [notifications, setNotifications] = useState(initialNotifications)
  const savedFormRef = useRef(initialForm.current)
  const savedNotificationsRef = useRef(initialNotifications)

  const isDirty =
    JSON.stringify(form) !== JSON.stringify(savedFormRef.current) ||
    JSON.stringify(notifications) !== JSON.stringify(savedNotificationsRef.current)

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

  const { stats: profileStats } = useProfileStats()
  const totalInvoices = profileStats.total
  const totalPaid = profileStats.paid
  const totalPending = profileStats.pending
  const totalNeedsRevision = profileStats.needsRevision

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    savedFormRef.current = form
    savedNotificationsRef.current = notifications
    setShowToast(true)
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
    <div style={{ maxWidth: 800 }}>
      {showToast && (
        <Toast message="Profile updated successfully" onClose={() => setShowToast(false)} />
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
          Manage your account settings and preferences.
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
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 600 }}>
              {displayName}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
              {form.jobTitle}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              {user?.email}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 24,
              flexWrap: 'wrap',
            }}
          >
            {[
              { label: 'Total Invoices', value: totalInvoices },
              { label: 'Needs Revision', value: totalNeedsRevision },
              { label: 'Paid', value: totalPaid },
              { label: 'Pending', value: totalPending },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 600 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <form onSubmit={handleSave}>
        <div className="animate-in animate-in-2" style={cardStyle}>
          <h2 style={sectionTitle}>
            <User size={18} color="var(--color-primary)" aria-hidden="true" />
            Personal Information
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 18,
            }}
          >
            <div>
              <label htmlFor="profile-name" style={labelStyle}>Full Name</label>
              <input
                id="profile-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="profile-email" style={labelStyle}>Email Address</label>
              <input
                id="profile-email"
                type="email"
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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 20,
            }}
          >
            {[
              { icon: Building2, label: 'Company', value: 'Contoso Supplies Ltd' },
              { icon: MapPin, label: 'Address', value: '123 Commerce Drive, Seattle, WA 98101' },
              { icon: Mail, label: 'Billing Email', value: 'billing@contoso.com' },
              { icon: Phone, label: 'Phone', value: '+1 (555) 900-1234' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius)',
                    background: 'var(--color-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <item.icon size={16} color="var(--color-text-muted)" aria-hidden="true" />
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.925rem', fontWeight: 500 }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="animate-in animate-in-4" style={cardStyle}>
          <h2 style={sectionTitle}>
            <Bell size={18} color="var(--color-primary)" aria-hidden="true" />
            Notification Preferences
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              {
                key: 'invoiceUpdates' as const,
                label: 'Invoice Status Updates',
                desc: 'Get notified when your invoice status changes',
              },
              {
                key: 'paymentConfirmations' as const,
                label: 'Payment Confirmations',
                desc: 'Receive confirmation when payments are processed',
              },
              {
                key: 'weeklyDigest' as const,
                label: 'Weekly Digest',
                desc: 'Summary of your invoice activity every Monday',
              },
            ].map((pref) => (
              <label
                key={pref.key}
                htmlFor={`pref-${pref.key}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{pref.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {pref.desc}
                  </div>
                </div>
                <input
                  id={`pref-${pref.key}`}
                  type="checkbox"
                  checked={notifications[pref.key]}
                  onChange={(e) =>
                    setNotifications(prev => ({ ...prev, [pref.key]: e.target.checked }))
                  }
                  style={{
                    width: 18,
                    height: 18,
                    accentColor: 'var(--color-primary)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="animate-in animate-in-5" style={cardStyle}>
          <h2 style={sectionTitle}>
            <Shield size={18} color="var(--color-primary)" aria-hidden="true" />
            Security
          </h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'var(--color-bg)',
              borderRadius: 'var(--radius)',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>Password</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                Last changed 30 days ago
              </div>
            </div>
            <button type="button" className="btn-change-pw">
              Change Password
            </button>
          </div>
        </div>

        {/* Save */}
        <div className="animate-in animate-in-6" style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn-primary">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}
