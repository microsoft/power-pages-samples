import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { useI18n } from '../i18n'
import '../pages/Auth.css'

/**
 * Presentational building blocks shared by the sign-in, registration,
 * forgot/reset password, invitation and external-confirmation pages.
 *
 * They reuse the existing `signin-*` class names so every auth screen keeps the
 * same card, spacing and input treatment as the original sign-in page.
 */

export function AuthCard({
  icon,
  title,
  subtitle,
  children,
  footer,
  after,
  tone = 'default',
}: {
  icon: ReactNode
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  /**
   * Rendered below the card, outside its border. Defaults to a "Back to Home"
   * link so every auth page offers a way out; pass your own to add more (the
   * sign-in page also shows a trust badge here).
   */
  after?: ReactNode
  /** Tints the header icon for outcome states (sent, expired, invalid). */
  tone?: 'default' | 'success' | 'danger'
}) {
  const { t } = useI18n()

  return (
    <div className="page signin-page">
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="signin-card card animate-in animate-in-1">
          <div className="signin-header">
            <div className={`signin-icon tone-${tone}`}>{icon}</div>
            <h1 className="signin-title">{title}</h1>
            {subtitle && <p className="signin-subtitle">{subtitle}</p>}
          </div>
          {children}
          {footer && <div className="signin-footer">{footer}</div>}
        </div>
        {after ?? (
          <div className="signin-back animate-in animate-in-2">
            <Link to="/">{t('common.backToHome')}</Link>
          </div>
        )}
      </div>
    </div>
  )
}

export function AuthAlert({
  tone,
  children,
}: {
  tone: 'error' | 'success' | 'info'
  children: ReactNode
}) {
  const Icon = tone === 'error' ? AlertCircle : tone === 'success' ? CheckCircle2 : Info
  return (
    <div className={`auth-alert auth-alert-${tone} animate-in`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={16} className="auth-alert-icon" />
      <span>{children}</span>
    </div>
  )
}

interface AuthFieldProps {
  id: string
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  error?: string
  icon?: ReactNode
  placeholder?: string
  autoComplete?: string
  autoFocus?: boolean
  disabled?: boolean
  hint?: string
}

export function AuthField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  icon,
  placeholder,
  autoComplete,
  autoFocus,
  disabled,
  hint,
}: AuthFieldProps) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <div className="signin-input-wrapper">
        {icon && <span className="signin-input-icon">{icon}</span>}
        <input
          id={id}
          type={type}
          className={`form-input ${icon ? 'signin-input-with-icon' : ''} ${
            error ? 'auth-input-invalid' : ''
          }`}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
      </div>
      {error ? (
        <span className="auth-field-error" id={`${id}-error`}>
          {error}
        </span>
      ) : hint ? (
        <span className="auth-field-hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  )
}

export function AuthPasswordField(props: Omit<AuthFieldProps, 'type'> & { showLabel: string; hideLabel: string }) {
  const { showLabel, hideLabel, icon, ...field } = props
  const [visible, setVisible] = useState(false)

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={field.id}>
        {field.label}
      </label>
      <div className="signin-input-wrapper">
        {icon && <span className="signin-input-icon">{icon}</span>}
        <input
          id={field.id}
          type={visible ? 'text' : 'password'}
          className={`form-input ${icon ? 'signin-input-with-icon' : ''} auth-input-with-toggle ${
            field.error ? 'auth-input-invalid' : ''
          }`}
          placeholder={field.placeholder}
          value={field.value}
          onChange={e => field.onChange(e.target.value)}
          onBlur={field.onBlur}
          autoComplete={field.autoComplete}
          autoFocus={field.autoFocus}
          disabled={field.disabled}
          aria-invalid={!!field.error}
          aria-describedby={
            field.error ? `${field.id}-error` : field.hint ? `${field.id}-hint` : undefined
          }
        />
        <button
          type="button"
          className="signin-toggle-password"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? hideLabel : showLabel}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {field.error ? (
        <span className="auth-field-error" id={`${field.id}-error`}>
          {field.error}
        </span>
      ) : field.hint ? (
        <span className="auth-field-hint" id={`${field.id}-hint`}>
          {field.hint}
        </span>
      ) : null}
    </div>
  )
}

export function PasswordStrengthMeter({ score, label }: { score: number; label: string }) {
  if (!label) return null
  return (
    <div className="auth-strength" aria-live="polite">
      <div className="auth-strength-track">
        {[0, 1, 2, 3].map(i => (
          <span key={i} className={`auth-strength-seg ${i < score ? `is-on level-${score}` : ''}`} />
        ))}
      </div>
      <span className={`auth-strength-label level-${score}`}>{label}</span>
    </div>
  )
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="signin-divider">
      <span>{label}</span>
    </div>
  )
}
