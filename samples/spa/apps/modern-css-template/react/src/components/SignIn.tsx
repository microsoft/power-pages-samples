import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { initialProfile } from '../data'
import { signInHref, signOutHref, useSupport } from '../SupportContext'
import Dialog from './Dialog'
import Icon from './Icon'

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || '?'
}

export function SignInLink({ to = '/', className, children, onClick }: { to?: string; className?: string; children: ReactNode; onClick?: () => void }) {
  const { isDemo, setDemoSignIn } = useSupport()
  return <a className={className} href={signInHref(to)} onClick={event => { onClick?.(); if (isDemo) { event.preventDefault(); setDemoSignIn(to) } }}>{children}</a>
}

export function SignOutLink({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  const { isDemo, demoSignOut } = useSupport()
  const navigate = useNavigate()
  return isDemo
    ? <button type="button" className={className} onClick={() => { onClick?.(); demoSignOut(); navigate('/') }}>{children}</button>
    : <a className={className} href={signOutHref} onClick={onClick}>{children}</a>
}

export function DemoSignInDialog() {
  const { isDemo, demoSignIn, setDemoSignIn, completeDemoSignIn } = useSupport()
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  if (!isDemo) return null
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!selected) { setError('Select a profile to continue.'); return }
    const destination = demoSignIn ?? '/'
    setSelected(''); setError('')
    completeDemoSignIn()
    navigate(destination)
  }
  return <Dialog id="signin-dialog" open={demoSignIn !== null} onClose={() => { setDemoSignIn(null); setError('') }} title="Sign in to continue" eyebrow="Customer access">
    <p>Sign in to report an issue, contact support, and access your cases and account information.</p>
    <form className="stack" onSubmit={submit} noValidate>
      <fieldset className="profile-options" aria-describedby={error ? 'signin-error' : undefined}>
        <legend>Select a profile</legend>
        <label className="profile-card">
          <input type="radio" name="signin-profile" value={initialProfile.email} checked={selected === initialProfile.email} onChange={event => { setSelected(event.target.value); setError('') }} />
          <span className="avatar" aria-hidden="true">{initials(initialProfile.name)}</span>
          <span className="profile-card-copy"><strong><bdi>{initialProfile.name}</bdi></strong><small><bdi>{initialProfile.email}</bdi></small></span>
          <span className="profile-card-check" aria-hidden="true"><Icon name="check" /></span>
        </label>
      </fieldset>
      {error && <p className="error" id="signin-error" role="alert">{error}</p>}
      <p className="muted small-print">Demo sign-in only. No credentials are collected or sent.</p>
      <div className="actions dialog-footer-actions">
        <button className="button secondary" type="button" onClick={() => setDemoSignIn(null)}>Cancel</button>
        <button className="button" type="submit">Sign in</button>
      </div>
    </form>
  </Dialog>
}
