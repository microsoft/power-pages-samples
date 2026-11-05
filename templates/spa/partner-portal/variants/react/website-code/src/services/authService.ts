/**
 * Power Pages authentication for the code site.
 *
 * Power Pages authentication is server-side (session cookie). This service posts to the platform's
 * account endpoints (`/SignIn`, `/Account/Login/*`) and reads the signed-in user that the platform
 * injects as `window.Microsoft.Dynamic365.Portal.User`. Requests use `fetch()` where possible so
 * server validation errors are shown inside the SPA instead of on server-rendered pages.
 *
 * These calls only work when the site is served by Power Pages (`DATA_MODE === 'live'`). On the local
 * dev server and in the e2e suites (`mock` mode) the auth pages use the prototype's persona store instead.
 * No secrets live here: provider identifiers are public values, secrets stay in the admin center.
 */
import type { PowerPagesUser } from '../types/powerPages'
import { DATA_MODE, portalTenant } from './config'

/* -------------------------------- Providers ------------------------------- */

export type AuthProviderType = 'local' | 'oidc' | 'entra-id' | 'saml2' | 'ws-federation' | 'social'

export interface AuthProviderConfig {
  /** Stable id for React keys and lookups. */
  id: string
  type: AuthProviderType
  /** Provider name shown on its sign-in button ("Sign in with …"). */
  displayName: string
  /**
   * Value posted as `provider` to /Account/Login/ExternalLogin; must match the provider's
   * `AuthenticationType` site setting. Omitted for `entra-id` (resolved at runtime from the portal tenant).
   */
  providerIdentifier?: string
  /** Local only: users sign in with their email (true) or a username (false). */
  loginByEmail?: boolean
}

/** Every configured provider, in the order shown on the sign-in and registration pages. */
export const AUTH_PROVIDERS: AuthProviderConfig[] = [
  // Workforce Entra ID of the site's parent tenant (site settings Authentication/OpenIdConnect/AzureAD/*).
  { id: 'entra-id', type: 'entra-id', displayName: 'Microsoft Entra ID' },
  // Local accounts (Authentication/Registration/LocalLoginEnabled + LocalLoginByEmail).
  { id: 'local', type: 'local', displayName: 'Email and password', loginByEmail: true },
]

export const LOCAL_PROVIDER = AUTH_PROVIDERS.find(p => p.type === 'local')
export const EXTERNAL_PROVIDERS = AUTH_PROVIDERS.filter(p => p.type !== 'local')

/** Mock mode: no Power Pages server; the auth pages use the prototype persona store. */
export const AUTH_MOCK = DATA_MODE === 'mock'

/** @deprecated Read AUTH_PROVIDERS directly. */
export function getAuthProvider(): AuthProviderConfig {
  return LOCAL_PROVIDER ?? AUTH_PROVIDERS[0]
}

/* ---------------------------------- User ---------------------------------- */

export function getCurrentUser(): PowerPagesUser | undefined {
  const user = typeof window === 'undefined' ? undefined : window.Microsoft?.Dynamic365?.Portal?.User
  return user && user.userName ? user : undefined
}

export function isAuthenticated(): boolean {
  return !!getCurrentUser()
}

export function getTenantId(): string | undefined {
  return portalTenant()
}

/** Full name, then first/last name, then email, then the (often opaque) user name. */
export function getUserDisplayName(user: PowerPagesUser | undefined = getCurrentUser()): string {
  if (!user) return ''
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ')
  return full || user.email || user.userName || 'User'
}

export function getUserInitials(user: PowerPagesUser | undefined = getCurrentUser()): string {
  if (!user) return ''
  if (user.firstName && user.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  return (user.firstName || user.lastName || user.email || user.userName || '?')[0].toUpperCase()
}

/* --------------------------------- Errors --------------------------------- */

/** Server-side validation errors, shown inline by the auth pages. */
export class AuthError extends Error {
  readonly messages: string[]
  constructor(messages: string[] | string) {
    const list = Array.isArray(messages) ? messages : [messages]
    super(list.join(' '))
    this.name = 'AuthError'
    this.messages = list
  }
}

/** The server deferred sign-in until Terms and Conditions are accepted (not enabled on this site). */
export class TermsRequiredError extends Error {
  constructor() {
    super('You need to accept the terms and conditions to continue.')
    this.name = 'TermsRequiredError'
  }
}

/** The 5-minute external sign-in cookie expired before the account was confirmed. */
export class ExternalLoginCookieExpiredError extends Error {
  constructor() {
    super('Your sign-in session expired. Sign in again to continue.')
    this.name = 'ExternalLoginCookieExpiredError'
  }
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Access was denied by the identity provider.',
  external_auth_failed: 'Sign-in with Microsoft Entra ID failed. Try again.',
  missing_license: 'Your account doesn’t have the required license.',
  invalid_login: 'Sign-in failed. Check your details and try again.',
  invalid_username_or_password: 'The email or password is incorrect.',
  user_locked: 'Your account is locked after too many failed attempts. Try again later.',
  too_many_attempts: 'Too many failed sign-in attempts. Try again later.',
  invalid_invitation: 'The invitation code is invalid or has expired.',
  duplicate_login: 'This external sign-in is already linked to another account.',
  registration_blocked: 'Registration isn’t available for this sign-in method.',
  signin_failed: 'Sign-in failed. Try again.',
  email_required: 'Enter an email address.',
  duplicate_email: 'This email address is already in use.',
  duplicate_username: 'This username is already taken.',
  deny_minors: 'Registration isn’t available for users under the minimum age.',
}

const SUCCESS_MESSAGES: Record<string, string> = {
  password_reset_success: 'Your password has been reset. Sign in with your new password.',
}

/** Error passed back by the server as `?message=` or `?error=`. */
export function getAuthError(search: string = window.location.search): string | undefined {
  const params = new URLSearchParams(search)
  const code = params.get('message') || params.get('error')
  if (!code || SUCCESS_MESSAGES[code]) return undefined
  return AUTH_ERROR_MESSAGES[code] ?? 'Something went wrong while signing in. Try again.'
}

/** Success notice passed as `?message=` (for example after a password reset). */
export function getAuthNotice(search: string = window.location.search): string | undefined {
  const code = new URLSearchParams(search).get('message')
  return code ? SUCCESS_MESSAGES[code] : undefined
}

export function getSessionExpiredMessage(search: string = window.location.search): string | undefined {
  return new URLSearchParams(search).get('sessionExpired') === 'true' ? 'Your session expired. Sign in again to continue.' : undefined
}

/** Validation messages from a server-rendered account page (MVC summary, Web Forms alert, field errors). */
export function parseServerErrors(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const errors: string[] = []
  doc.querySelectorAll('.validation-summary-errors li, .alert-danger li, .field-validation-error').forEach(el => {
    const text = el.textContent?.trim()
    if (text && !errors.includes(text)) errors.push(text)
  })
  return errors
}

/* ------------------------------- Server calls ------------------------------ */

const FORM_HEADERS = { 'Content-Type': 'application/x-www-form-urlencoded' }

function ensureHost() {
  if (AUTH_MOCK) throw new Error('Power Pages sign-in is only available on the deployed site.')
}

/** Anti-forgery token from /_layout/tokenhtml (also renews the sliding session). */
export async function fetchAntiForgeryToken(signal?: AbortSignal): Promise<string> {
  const response = await fetch('/_layout/tokenhtml', { credentials: 'same-origin', cache: 'no-store', signal })
  if (!response.ok) throw new Error(`Couldn’t reach the sign-in service (${response.status}).`)
  const match = (await response.text()).match(/value="([^"]+)"/)
  if (!match) throw new Error('Couldn’t read the sign-in security token.')
  return match[1]
}

const withQuery = (path: string, query: Record<string, string | undefined>) => {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) if (v) params.set(k, v)
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

/** `provider` value for /Account/Login/ExternalLogin. Entra ID derives it from the portal tenant. */
export function resolveProviderIdentifier(provider: AuthProviderConfig): string {
  if (provider.type === 'local') throw new Error(`Provider ${provider.id} is local.`)
  if (provider.type === 'entra-id') {
    const tenant = getTenantId()
    if (!tenant) throw new Error('Microsoft Entra ID sign-in isn’t available: the site tenant is unknown.')
    return `https://login.windows.net/${tenant}/`
  }
  if (!provider.providerIdentifier) throw new Error(`Provider ${provider.id} is missing its identifier.`)
  return provider.providerIdentifier
}

/** External providers: form POST to the server, which redirects to the identity provider. */
export async function loginExternal(providerIdentifier: string, returnUrl = '/', invitationCode?: string): Promise<void> {
  ensureHost()
  const token = await fetchAntiForgeryToken()
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = withQuery('/Account/Login/ExternalLogin', { InvitationCode: invitationCode })
  for (const [name, value] of Object.entries({ __RequestVerificationToken: token, provider: providerIdentifier, returnUrl })) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  }
  document.body.appendChild(form)
  form.submit()
}

/** Local accounts: POST credentials to /SignIn and stay in the SPA on validation errors. */
export async function loginLocal(credential: string, password: string, rememberMe = false, returnUrl = '/', invitationCode?: string): Promise<void> {
  ensureHost()
  const token = await fetchAntiForgeryToken()
  const body = new URLSearchParams()
  body.set('__RequestVerificationToken', token)
  body.set(LOCAL_PROVIDER?.loginByEmail === false ? 'Username' : 'Email', credential)
  body.set('PasswordValue', password)
  body.set('RememberMe', rememberMe ? 'true' : 'false')
  const response = await fetch(withQuery('/SignIn', { ReturnUrl: returnUrl, InvitationCode: invitationCode }), {
    method: 'POST',
    headers: FORM_HEADERS,
    body: body.toString(),
    credentials: 'same-origin',
    redirect: 'follow',
  })
  if (response.url.includes('TermsAndConditions')) throw new TermsRequiredError()
  const html = await response.text()
  const errors = parseServerErrors(html)
  if (errors.length) throw new AuthError(errors)
  if (response.redirected && !new URL(response.url).pathname.toLowerCase().startsWith('/signin')) {
    // Full load so the platform injects the signed-in user.
    window.location.assign(returnUrl)
    return
  }
  throw new AuthError(AUTH_ERROR_MESSAGES.invalid_username_or_password)
}

/** The only sign-in entry point the UI calls: dispatches to local or external sign-in. */
export async function loginWithProvider(
  provider: AuthProviderConfig,
  options: { returnUrl?: string; invitationCode?: string; credentials?: { credential: string; password: string; rememberMe?: boolean } } = {},
): Promise<void> {
  if (provider.type === 'local') {
    if (!options.credentials) throw new Error('Local sign-in needs an email and password.')
    const { credential, password, rememberMe } = options.credentials
    return loginLocal(credential, password, rememberMe ?? false, options.returnUrl, options.invitationCode)
  }
  return loginExternal(resolveProviderIdentifier(provider), options.returnUrl, options.invitationCode)
}

/** Ends the Power Pages session (local logout: the identity provider session stays signed in). */
export function logout(returnUrl = '/'): void {
  window.location.assign(`/Account/Login/LogOff?returnUrl=${encodeURIComponent(returnUrl)}`)
}

/**
 * Local registration through the server's Web Forms page: fetch it for ViewState and control names,
 * then post the form back. Works for open self-registration and for invitation codes.
 */
export async function register(
  fields: { email?: string; username?: string; password: string; confirmPassword: string },
  returnUrl = '/',
  invitationCode?: string,
): Promise<void> {
  ensureHost()
  const pageResponse = await fetch(withQuery('/Account/Login/Register', { returnUrl, invitationCode }), { credentials: 'same-origin' })
  if (!pageResponse.ok) throw new Error(`Couldn’t load registration (${pageResponse.status}).`)
  const doc = new DOMParser().parseFromString(await pageResponse.text(), 'text/html')
  const serverForm = doc.getElementById('Register') as HTMLFormElement | null
  if (!serverForm) {
    const errors = parseServerErrors(doc.documentElement.outerHTML)
    throw new AuthError(errors.length ? errors : 'Registration isn’t available right now.')
  }
  const rawAction = serverForm.getAttribute('action') || ''
  const action = /^(https?:)?\//.test(rawAction)
    ? rawAction
    : (() => {
        const url = new URL(rawAction, new URL('/Account/Login/', window.location.origin))
        return url.pathname + url.search
      })()
  const value = (selector: string) => (doc.querySelector(selector) as HTMLInputElement | null)?.value ?? ''
  const control = (id: string) => doc.getElementById(id) as HTMLInputElement | null

  const body = new URLSearchParams()
  body.set('__VIEWSTATE', value('#__VIEWSTATE'))
  body.set('__VIEWSTATEGENERATOR', value('#__VIEWSTATEGENERATOR'))
  body.set('__EVENTTARGET', '')
  body.set('__EVENTARGUMENT', '')
  body.set('__VIEWSTATEENCRYPTED', '')
  const eventValidation = value('input[name="__EVENTVALIDATION"]')
  if (eventValidation) body.set('__EVENTVALIDATION', eventValidation)
  const antiForgery = value('input[name="__RequestVerificationToken"]')
  if (antiForgery) body.set('__RequestVerificationToken', antiForgery)
  const set = (id: string, v: string | undefined) => {
    const el = control(id)
    if (el && v !== undefined) body.set(el.name, v)
  }
  set('EmailTextBox', fields.email)
  set('UsernameTextBox', fields.username)
  set('PasswordTextBox', fields.password)
  set('ConfirmPasswordTextBox', fields.confirmPassword)
  const submit = control('SubmitButton')
  if (submit) body.set(submit.name, submit.value || 'Register')

  const response = await fetch(action, { method: 'POST', headers: FORM_HEADERS, body: body.toString(), credentials: 'same-origin', redirect: 'follow' })
  if (response.url.includes('TermsAndConditions')) throw new TermsRequiredError()
  const errors = parseServerErrors(await response.text())
  if (errors.length) throw new AuthError(errors)
  if (response.redirected) {
    window.location.assign(new URL(response.url).pathname.toLowerCase().startsWith('/account/login') ? returnUrl : response.url)
    return
  }
  throw new AuthError('Registration failed. Check your details and try again.')
}

/** Sends a password reset email. The server never reveals whether the account exists. */
export async function forgotPassword(email: string): Promise<void> {
  ensureHost()
  const body = new URLSearchParams()
  body.set('__RequestVerificationToken', await fetchAntiForgeryToken())
  body.set('Email', email)
  const response = await fetch('/Account/Login/ForgotPassword', {
    method: 'POST',
    headers: FORM_HEADERS,
    body: body.toString(),
    credentials: 'same-origin',
    redirect: 'follow',
  })
  const errors = parseServerErrors(await response.text())
  if (errors.length) throw new AuthError(errors)
}

/** Completes a reset from the emailed link (UserId and Code come from its query string). */
export async function resetPassword(userId: string, code: string, password: string, confirmPassword: string): Promise<void> {
  ensureHost()
  const body = new URLSearchParams()
  body.set('__RequestVerificationToken', await fetchAntiForgeryToken())
  body.set('UserId', userId)
  body.set('Code', code)
  body.set('Password', password)
  body.set('ConfirmPassword', confirmPassword)
  const response = await fetch('/Account/Login/ResetPassword', {
    method: 'POST',
    headers: FORM_HEADERS,
    body: body.toString(),
    credentials: 'same-origin',
    redirect: 'follow',
  })
  const errors = parseServerErrors(await response.text())
  if (errors.length) throw new AuthError(errors)
}

export interface RedeemInvitationResult {
  /** `register`: new account for the invitation; `login`: sign in to an existing account to link it. */
  nextStep: 'register' | 'login'
}

/** Validates an invitation code and tells the UI whether to register or sign in. */
export async function redeemInvitation(invitationCode: string, redeemByLogin: boolean, returnUrl = '/'): Promise<RedeemInvitationResult> {
  ensureHost()
  const body = new URLSearchParams()
  body.set('__RequestVerificationToken', await fetchAntiForgeryToken())
  body.set('InvitationCode', invitationCode)
  body.set('RedeemByLogin', redeemByLogin ? 'true' : 'false')
  body.set('returnUrl', returnUrl)
  const response = await fetch('/Account/Login/RedeemInvitation', {
    method: 'POST',
    headers: FORM_HEADERS,
    body: body.toString(),
    credentials: 'same-origin',
    redirect: 'manual',
  })
  // 302 to the server's Register page: the code is valid for a new account.
  if (response.type === 'opaqueredirect') return { nextStep: 'register' }
  if (!response.ok) throw new Error(`Couldn’t redeem the invitation (${response.status}).`)
  const html = await response.text()
  const errors = parseServerErrors(html)
  if (errors.length) throw new AuthError(errors)
  if (html.includes('name="PasswordValue"') || html.includes('LoginLocal')) return { nextStep: 'login' }
  throw new AuthError(AUTH_ERROR_MESSAGES.invalid_invitation)
}

/** Email the invitation was sent to, read from the server registration page (for pre-fill). */
export async function fetchInvitationDetails(invitationCode: string, signal?: AbortSignal): Promise<{ email: string }> {
  if (!invitationCode || AUTH_MOCK) return { email: '' }
  const response = await fetch(withQuery('/Account/Login/Register', { invitationCode }), { credentials: 'same-origin', signal })
  if (!response.ok) throw new Error(`Couldn’t load your invitation details (${response.status}).`)
  const doc = new DOMParser().parseFromString(await response.text(), 'text/html')
  return { email: doc.getElementById('EmailTextBox')?.getAttribute('value') ?? '' }
}

export interface ExternalLoginDetails {
  email: string
  firstName: string
  lastName: string
  username: string
  invitationCode: string
  returnUrl: string
  antiForgeryToken: string
}

/** First external sign-in without a contact: read the claims the server pre-filled for confirmation. */
export async function fetchExternalLoginDetails(signal?: AbortSignal): Promise<ExternalLoginDetails> {
  ensureHost()
  const response = await fetch('/Account/Login/ExternalLoginCallback', { credentials: 'same-origin', signal })
  if (!response.ok) throw new Error(`Couldn’t load your sign-in details (${response.status}).`)
  const doc = new DOMParser().parseFromString(await response.text(), 'text/html')
  if (!doc.querySelector('input[name="Email"]')) throw new ExternalLoginCookieExpiredError()
  const value = (name: string) => (doc.querySelector(`input[name="${name}"]`) as HTMLInputElement | null)?.value ?? ''
  const actionParams = new URLSearchParams((doc.querySelector('form')?.getAttribute('action') ?? '').split('?')[1] ?? '')
  return {
    email: value('Email'),
    firstName: value('FirstName'),
    lastName: value('LastName'),
    username: value('Username'),
    invitationCode: value('InvitationCode') || actionParams.get('InvitationCode') || '',
    returnUrl: actionParams.get('ReturnUrl') || '/',
    antiForgeryToken: value('__RequestVerificationToken'),
  }
}

/** Creates the contact for a first external sign-in; the server signs the user in before redirecting. */
export async function confirmExternalLogin(details: ExternalLoginDetails): Promise<void> {
  ensureHost()
  const body = new URLSearchParams()
  body.set('__RequestVerificationToken', details.antiForgeryToken)
  body.set('Email', details.email)
  body.set('FirstName', details.firstName)
  body.set('LastName', details.lastName)
  body.set('Username', details.username)
  const url = withQuery('/Account/Login/ExternalLoginConfirmation', { ReturnUrl: details.returnUrl, InvitationCode: details.invitationCode })
  const response = await fetch(url, { method: 'POST', headers: FORM_HEADERS, body: body.toString(), credentials: 'same-origin', redirect: 'manual' })
  if (response.type === 'opaqueredirect') {
    window.location.assign(details.returnUrl || '/')
    return
  }
  if (!response.ok) throw new Error(`Couldn’t create your account (${response.status}).`)
  const html = await response.text()
  const errors = parseServerErrors(html)
  if (errors.length) throw new AuthError(errors)
  if (html.includes('IsTermsAndConditionsAccepted')) throw new TermsRequiredError()
  if (!html.includes('name="Email"')) throw new ExternalLoginCookieExpiredError()
  throw new AuthError('Couldn’t create your account. Try again.')
}
