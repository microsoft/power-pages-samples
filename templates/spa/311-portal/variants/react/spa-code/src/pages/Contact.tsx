import { Link } from 'react-router-dom'
import { AlertTriangle, ExternalLink, Info } from 'lucide-react'
import { useI18n } from '../i18n'

export default function Contact() {
  const { t } = useI18n()

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 900 }}>
        <div className="page-header" style={{ textAlign: 'center' }}>
          <h1 className="page-title animate-in animate-in-1">{t('contact.title')}</h1>
          <p className="page-subtitle animate-in animate-in-2">
            {t('contact.subtitle')}
          </p>
        </div>

        {/* Urgent issues alert */}
        <div className="animate-in animate-in-3" style={{
          background: 'var(--color-warning-bg)',
          border: '1px solid rgba(198, 119, 0, 0.2)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          marginBottom: 32,
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
        }}>
          <span style={{ flexShrink: 0 }}><AlertTriangle size={24} color="var(--color-warning)" /></span>
          <div>
            <h2 style={{ fontSize: '1rem', color: 'var(--color-warning)', marginBottom: 8 }}>
              {t('contact.urgentTitle')}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', lineHeight: 1.6, marginBottom: 8 }}>
              For <strong>emergencies</strong> (fire, medical, crime in progress), always call <strong>911</strong>.
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', lineHeight: 1.6 }}>
              For <strong>urgent but non-emergency</strong> issues (water main breaks, downed power lines, hazardous road conditions), call <strong>(555) 012-0311</strong> directly.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 40 }}>
          {/* Phone */}
          <div className="card animate-in animate-in-3" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'rgba(27, 73, 101, 0.1)', color: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <h2 style={{ fontSize: '1.125rem', marginBottom: 8 }}>{t('contact.callUs')}</h2>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>
              (555) 012-0311
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              {t('contact.hotlineDesc')}
            </p>
          </div>

          {/* Email */}
          <div className="card animate-in animate-in-4" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'rgba(61, 139, 122, 0.1)', color: 'var(--color-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h2 style={{ fontSize: '1.125rem', marginBottom: 8 }}>{t('contact.emailUs')}</h2>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: 'var(--color-secondary)', marginBottom: 4 }}>
              services@zavacity.gov
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              {t('contact.emailResponseTime')}
            </p>
          </div>

          {/* In person */}
          <div className="card animate-in animate-in-5" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'rgba(212, 133, 58, 0.1)', color: 'var(--color-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <h2 style={{ fontSize: '1.125rem', marginBottom: 8 }}>{t('contact.visitTitle')}</h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-text)', marginBottom: 4 }}>
              {t('contact.visitAddress')}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              {t('contact.visitDetails')}
            </p>
          </div>
        </div>

        {/* Hours & Social */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="card animate-in animate-in-5" style={{ padding: 32 }}>
            <h2 style={{ fontSize: '1.125rem', marginBottom: 16 }}>{t('contact.hoursTitle')}</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  [t('contact.mondayFriday'), t('contact.hoursMF')],
                  [t('contact.saturday'), t('contact.hoursSat')],
                  [t('contact.sunday'), t('contact.closed')],
                  [t('contact.holidays'), t('contact.closedUrgent')],
                ].map(([day, hours]) => (
                  <tr key={day} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                    <td style={{ padding: '10px 0', fontSize: '0.875rem', fontWeight: 500 }}>{day}</td>
                    <td style={{ padding: '10px 0', fontSize: '0.875rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>{hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-light)', marginTop: 12 }}>
              {t('contact.afterHoursNote')}
            </p>
          </div>

          <div className="card animate-in animate-in-6" style={{ padding: 32 }}>
            <h2 style={{ fontSize: '1.125rem', marginBottom: 16 }}>{t('contact.stayConnected')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'X (Twitter)', handle: '@ZavaCity' },
                { label: 'Facebook', handle: '/ZavaCityGov' },
                { label: 'Instagram', handle: '@zavacity' },
              ].map(social => (
                <div key={social.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: 'var(--color-primary)' }}><ExternalLink size={18} /></span>
                  <div>
                    <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{social.label}</span>
                    <span style={{ color: 'var(--color-primary)', fontSize: '0.875rem', marginLeft: 8 }}>{social.handle}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, padding: 16, background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ fontSize: '0.875rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info size={18} /> {t('contact.accessibilityTitle')}
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                {t('contact.accessibilityDesc')}
              </p>
            </div>
          </div>
        </div>

        <div className="animate-in animate-in-6" style={{ textAlign: 'center', marginTop: 40 }}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>
            {t('contact.cantFind')}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/services" className="btn btn-primary">{t('common.browseServices')}</Link>
            <Link to="/knowledge" className="btn btn-secondary">{t('common.knowledgeBase')}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
