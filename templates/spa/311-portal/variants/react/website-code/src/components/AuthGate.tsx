import { type ReactNode } from 'react'
import { LogIn } from 'lucide-react'
import { useAuth } from '../shared/hooks/useAuth'
import { useI18n } from '../i18n'
import LoadingState from './LoadingState'

interface AuthGateProps {
  children: ReactNode
  message?: string
}

export default function AuthGate({ children, message }: AuthGateProps) {
  const { isAuthenticated, isLoading, signIn } = useAuth()
  const { t } = useI18n()

  const displayMessage = message || t('auth.signInToContinue')

  if (isLoading) {
    return <LoadingState />
  }

  if (!isAuthenticated) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="card" style={{
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          padding: '48px 32px',
          marginTop: 24,
        }}>
          <LogIn
            size={40}
            color="var(--color-primary)"
            style={{ marginBottom: 16 }}
          />
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: 8,
          }}>
            {t('auth.signInRequired')}
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.9375rem',
            color: 'var(--color-text-muted)',
            marginBottom: 24,
            lineHeight: 1.5,
          }}>
            {displayMessage}
          </p>
          <button className="btn btn-primary" onClick={() => signIn()}>
            {t('common.signIn')}
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
