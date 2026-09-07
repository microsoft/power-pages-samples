import type { PowerPagesPortalUser } from '../types/user'

/**
 * Power Pages authentication is entirely server-side — the session lives in an
 * HTTP-only cookie issued by the portal. Nothing here manages tokens. Every
 * function below either posts a form to a server endpoint, or fetches a
 * server-rendered page and scrapes the bits the SPA needs (anti-forgery token,
 * ViewState, validation errors) so the user never leaves the SPA.
 */

const isDevelopment =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// Mock user for local development — auth only works on deployed Power Pages sites
const MOCK_USER: PowerPagesPortalUser = {
  userName: 'dev@zavacity.gov',
  firstName: 'Dev',
  lastName: 'User',
  email: 'dev@zavacity.gov',
  contactId: '00000000-0000-0000-0000-000000000001',
  userRoles: ['Authenticated Users'],
}

// Lets the dev-mode mock user "sign out" so anonymous states can be tested locally.
const DEV_SIGNEDOUT_KEY = '__zava_dev_signedout__'

// --- Provider configuration -------------------------------------------------

export type AuthProviderType = 'local' | 'entra-id' | 'oidc' | 'saml2' | 'ws-federation' | 'social'

export interface AuthProviderConfig {
  /** Stable key — used for React keys and submit-in-flight tracking. */
  id: string
  type: AuthProviderType
  displayName: string
  /**
   * Value POSTed as `provider` to /Account/Login/ExternalLogin. Must match the
   * Authentication/{Type}/{Name}/AuthenticationType site setting exactly.
   * Omitted for 'entra-id' — resolveProviderIdentifier() derives it at runtime
   * from the site's parent tenant so the code stays portable across tenants.
   */
  providerIdentifier?: string
  /** Local auth only: true sends the `Email` field, false sends `Username`. */
  loginByEmail?: boolean
}

/**
 * Mirrors the providers configured in .powerpages-site/site-settings.
 * Array shape (not a single constant) so adding a provider later is an append.
 */
export const AUTH_PROVIDERS: AuthProviderConfig[] = [
  {
    id: 'entra-id',
    type: 'entra-id',
    displayName: 'Microsoft Entra ID',
  },
  {
    id: 'local',
    type: 'local',
    displayName: 'Email and password',
    loginByEmail: true,
  },
]

export const LOCAL_PROVIDER = AUTH_PROVIDERS.find(p => p.type === 'local')
export const EXTERNAL_PROVIDERS = AUTH_PROVIDERS.filter(p => p.type !== 'local')

// --- Current user -----------------------------------------------------------

/**
 * Returns the currently logged-in portal user object, or undefined if not authenticated.
 */
export function getCurrentUser(): PowerPagesPortalUser | undefined {
  if (typeof window === 'undefined') return undefined
  if (isDevelopment) {
    if (sessionStorage.getItem(DEV_SIGNEDOUT_KEY)) return undefined
    return MOCK_USER
  }
  return window.Microsoft?.Dynamic365?.Portal?.User
}

/**
 * Returns true if a user is currently logged in.
 */
export function isAuthenticated(): boolean {
  const user = getCurrentUser()
  return !!(user?.userName || user?.contactId || user?.email)
}

/**
 * Returns the Entra ID tenant ID from the portal configuration.
 */
export function getTenantId(): string | undefined {
  if (isDevelopment) return '00000000-0000-0000-0000-000000000000'
  return (window.Microsoft?.Dynamic365?.Portal as Record<string, unknown> | undefined)?.tenant as
    | string
    | undefined
}

/**
 * Returns the user's display name (full name if available, otherwise email/userName).
 *
 * Email is preferred over userName because for external providers the userName is
 * the raw OIDC subject identifier — an opaque string that is meaningless in a navbar.
 */
export function getUserDisplayName(): string {
  const user = getCurrentUser()
  if (!user) return ''
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')
  return fullName || user.email || user.userName || 'User'
}

/**
 * Returns the user's initials for avatar display.
 */
export function getUserInitials(): string {
  const user = getCurrentUser()
  if (!user) return ''
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  }
  return (user.email?.[0] || user.userName?.[0] || 'U').toUpperCase()
}

// --- Anti-forgery token -----------------------------------------------------

/**
 * Fetches the anti-forgery token required for every authenticated form POST.
 *
 * /_layout/tokenhtml returns a bare HTML fragment, roughly:
 *   <input name="__RequestVerificationToken" type="hidden" value="AbCd...123" />
 * so the first value="..." in the response is the token.
 */
export async function fetchAntiForgeryToken(): Promise<string> {
  const response = await fetch('/_layout/tokenhtml', { credentials: 'same-origin' })
  if (!response.ok) {
    throw new Error(
      `Failed to fetch anti-forgery token: ${response.status} ${response.statusText}. ` +
        'Ensure the site is deployed and reachable.'
    )
  }
  const html = await response.text()
  const match = html.match(/value="([^"]+)"/)
  if (!match) {
    throw new Error('Failed to extract anti-forgery token from /_layout/tokenhtml')
  }
  return match[1]
}

// --- Server error parsing ---------------------------------------------------

/**
 * Scrapes validation errors out of a server-rendered HTML response.
 *
 * When a login/registration POST is rejected the server replies 200 with the full
 * page re-rendered, errors embedded in one of these shapes:
 *   MVC pages (login, forgot/reset password):
 *     <div class="validation-summary-errors"><ul><li>Invalid login attempt.</li></ul></div>
 *   Web Forms pages (registration):
 *     <div class="alert alert-danger"><ul><li>Passwords must have at least one digit.</li></ul></div>
 *   Per-field:
 *     <span class="field-validation-error">The Email field is required.</span>
 */
export function parseServerErrors(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const errors: string[] = []

  const push = (text: string | null | undefined) => {
    const trimmed = text?.trim()
    if (trimmed && !errors.includes(trimmed)) errors.push(trimmed)
  }

  doc.querySelectorAll('.validation-summary-errors li').forEach(li => push(li.textContent))
  doc.querySelectorAll('.alert-danger li').forEach(li => push(li.textContent))
  doc.querySelectorAll('.field-validation-error').forEach(el => push(el.textContent))

  // Some Web Forms validators render errors as bare text in the alert with no <li>.
  if (errors.length === 0) {
    doc.querySelectorAll('.alert-danger').forEach(el => push(el.textContent))
  }

  return errors
}

// --- Auth error / status messages from the URL ------------------------------

/**
 * Error codes the server appends as ?message= or ?error= when it bounces the
 * browser back after a failed authentication attempt.
 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Access was denied by the identity provider.',
  external_auth_failed: 'Sign-in with the external provider failed. Please try again.',
  missing_license: 'Your account does not have the required license.',
  invalid_login: 'Invalid login. Please try again.',
  invalid_username_or_password: 'Incorrect email or password.',
  user_locked:
    'Your account has been locked after too many failed attempts. Please try again later.',
  too_many_attempts: 'Too many failed sign-in attempts. Please try again later.',
  invalid_invitation: 'The invitation code is invalid or has expired.',
  duplicate_login: 'This identity is already linked to another account.',
  registration_blocked: 'Registration is not available for this provider.',
  signin_failed: 'Sign-in failed. Please try again.',
  email_required: 'An email address is required.',
  username_required: 'A username is required.',
  password_required: 'A password is required.',
  password_confirmation_failure: 'The passwords do not match.',
  duplicate_email: 'That email address is already registered.',
  duplicate_username: 'That username is already taken.',
  deny_minors: 'Registration is not available for users under the minimum age.',
}

/**
 * Success codes the SPA sets on itself when redirecting between auth pages.
 */
const AUTH_SUCCESS_MESSAGES: Record<string, string> = {
  password_reset_success: 'Your password has been reset. Sign in with your new password.',
  registration_success: 'Your account has been created. Sign in to continue.',
  email_confirmed: 'Your email address has been confirmed. Sign in to continue.',
}

/**
 * Returns a user-friendly error for the ?message= / ?error= param, if any.
 */
export function getAuthError(search?: string): string | undefined {
  if (typeof window === 'undefined') return undefined
  const params = new URLSearchParams(search ?? window.location.search)
  const code = params.get('message') || params.get('error')
  if (!code) return undefined
  if (AUTH_SUCCESS_MESSAGES[code]) return undefined
  return AUTH_ERROR_MESSAGES[code] || 'An authentication error occurred. Please try again.'
}

/**
 * Returns a success banner message for the ?message= param, if any.
 */
export function getAuthSuccess(search?: string): string | undefined {
  if (typeof window === 'undefined') return undefined
  const params = new URLSearchParams(search ?? window.location.search)
  const code = params.get('message')
  if (!code) return undefined
  return AUTH_SUCCESS_MESSAGES[code]
}

/**
 * Returns a session-expired message when the SPA redirected here after a
 * keepalive ping failed (?sessionExpired=true).
 */
export function getSessionExpiredMessage(search?: string): string | undefined {
  if (typeof window === 'undefined') return undefined
  const params = new URLSearchParams(search ?? window.location.search)
  if (params.get('sessionExpired') !== 'true') return undefined
  return 'Your session has expired. Please sign in again.'
}

// --- Terms ------------------------------------------------------------------

/**
 * Thrown when the server redirects to its Terms and Conditions page mid-flow.
 * Terms are currently disabled on this site (TermsAgreementEnabled=false), but the
 * detection stays in place so enabling the setting later does not silently break
 * sign-in by dropping the user on a server-rendered page.
 */
export class TermsRequiredError extends Error {
  constructor() {
    super('You must accept the terms and conditions to continue.')
    this.name = 'TermsRequiredError'
  }
}

// --- Login ------------------------------------------------------------------

/**
 * Resolves the value to POST as `provider` to /Account/Login/ExternalLogin.
 *
 * For workforce Entra ID the identifier is derived at runtime from the site's
 * parent tenant rather than hardcoded, so the SPA keeps working if the site is
 * cloned into a different tenant.
 */
export function resolveProviderIdentifier(provider: AuthProviderConfig): string {
  if (provider.providerIdentifier) return provider.providerIdentifier

  if (provider.type === 'entra-id') {
    const tenantId = getTenantId()
    if (!tenantId) {
      throw new Error(
        'Tenant ID not found in the portal configuration. Ensure the site is deployed ' +
          'and window.Microsoft.Dynamic365.Portal.tenant is populated.'
      )
    }
    return `https://login.windows.net/${tenantId}/`
  }

  throw new Error(`providerIdentifier is required for provider type "${provider.type}".`)
}

/**
 * Starts an external sign-in by posting a form to the portal, which then 302s to
 * the identity provider.
 *
 * This deliberately uses form.submit() rather than fetch(): the browser has to
 * actually navigate to the IdP so the user can authenticate there.
 */
export async function loginExternal(
  providerIdentifier: string,
  returnUrl?: string,
  invitationCode?: string
): Promise<void> {
  if (isDevelopment) {
    sessionStorage.removeItem(DEV_SIGNEDOUT_KEY)
    window.location.reload()
    return
  }

  const token = await fetchAntiForgeryToken()

  const form = document.createElement('form')
  form.method = 'POST'
  // The invitation code rides on the query string — the server reads it from the
  // URL in ExternalLoginCallback, not from the posted body.
  form.action = invitationCode
    ? `/Account/Login/ExternalLogin?InvitationCode=${encodeURIComponent(invitationCode)}`
    : '/Account/Login/ExternalLogin'
  form.style.display = 'none'

  const fields: Record<string, string> = {
    __RequestVerificationToken: token,
    provider: providerIdentifier,
    returnUrl: returnUrl || '/',
  }

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  }

  document.body.appendChild(form)
  form.submit()
}

/**
 * Signs in with a local account.
 *
 * Uses fetch() rather than form.submit() so a rejected password re-renders inline
 * in the SPA instead of navigating the user to the server-rendered login page.
 *
 * Endpoint quirks worth knowing: the field is `PasswordValue` (not `Password` —
 * that name belongs to the reset-password endpoint), and the invitation code goes
 * on the query string rather than in the body.
 */
export async function loginLocal(
  credential: string,
  password: string,
  rememberMe = false,
  returnUrl?: string,
  invitationCode?: string
): Promise<void> {
  if (isDevelopment) {
    sessionStorage.removeItem(DEV_SIGNEDOUT_KEY)
    window.location.href = returnUrl || '/'
    return
  }

  const token = await fetchAntiForgeryToken()
  const target = returnUrl || '/'

  const body = new URLSearchParams()
  body.set('__RequestVerificationToken', token)
  body.set(LOCAL_PROVIDER?.loginByEmail ? 'Email' : 'Username', credential)
  body.set('PasswordValue', password)
  body.set('ReturnUrl', target)
  if (rememberMe) body.set('RememberMe', 'true')

  const signInUrl = invitationCode
    ? `/SignIn?InvitationCode=${encodeURIComponent(invitationCode)}`
    : '/SignIn'

  const response = await fetch(signInUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    credentials: 'same-origin',
    redirect: 'follow',
  })

  if (response.url.includes('TermsAndConditions')) {
    throw new TermsRequiredError()
  }

  // A followed redirect means the server accepted the credentials and sent us on
  // to ReturnUrl. Navigate through the browser so the new session cookie is applied
  // and window.Microsoft.Dynamic365.Portal.User is repopulated.
  if (response.redirected) {
    window.location.href = target
    return
  }

  const html = await response.text()
  const errors = parseServerErrors(html)
  if (errors.length > 0) {
    throw new Error(errors.join(' '))
  }

  throw new Error('Incorrect email or password. Please try again.')
}

/**
 * Routes a sign-in attempt to the right handler for the given provider.
 */
export async function loginWithProvider(
  provider: AuthProviderConfig,
  options: {
    returnUrl?: string
    invitationCode?: string
    credentials?: { credential: string; password: string; rememberMe?: boolean }
  } = {}
): Promise<void> {
  const { returnUrl, invitationCode, credentials } = options

  if (provider.type === 'local') {
    if (!credentials) {
      throw new Error('Local sign-in requires a credential and password.')
    }
    return loginLocal(
      credentials.credential,
      credentials.password,
      credentials.rememberMe,
      returnUrl,
      invitationCode
    )
  }

  return loginExternal(resolveProviderIdentifier(provider), returnUrl, invitationCode)
}

/**
 * Logs the user out by redirecting to the Power Pages logout endpoint.
 *
 * Local logout only — the portal session cookie is cleared but the Entra session
 * stays warm, so the next sign-in is a silent SSO round-trip. Federated logout
 * would additionally need RPInitiatedLogout + PostLogoutRedirectUri site settings
 * and a front-channel logout URL registered on the app registration.
 */
export function logout(returnUrl?: string): void {
  if (isDevelopment) {
    sessionStorage.setItem(DEV_SIGNEDOUT_KEY, '1')
    window.location.reload()
    return
  }

  const target = returnUrl || '/'
  window.location.href = `/Account/Login/LogOff?returnUrl=${encodeURIComponent(target)}`
}

// --- Registration -----------------------------------------------------------

export interface RegisterFields {
  email?: string
  username?: string
  password: string
  confirmPassword: string
}

/**
 * Registers a new local account.
 *
 * /Account/Login/Register is an ASP.NET **Web Forms** page, not an MVC action —
 * unlike every other auth endpoint here. It will reject a POST that lacks a valid
 * __VIEWSTATE, and its inputs carry generated names like
 * `ctl00$ContentContainer$...$EmailTextBox` that differ between deployments.
 *
 * So this runs the same two-step a browser does: GET the page, read the ViewState
 * and the real control names off the parsed DOM, then POST them back. Posting to a
 * guessed field name silently no-ops.
 *
 * @see https://learn.microsoft.com/en-us/power-pages/security/authentication/set-authentication-identity
 */
export async function register(
  fields: RegisterFields,
  returnUrl?: string,
  invitationCode?: string
): Promise<void> {
  if (!fields.email && !fields.username) {
    throw new Error('Registration requires either an email address or a username.')
  }

  if (isDevelopment) {
    sessionStorage.removeItem(DEV_SIGNEDOUT_KEY)
    await new Promise(resolve => setTimeout(resolve, 400))
    window.location.href = returnUrl || '/'
    return
  }

  // Step 1 — load the server page for its ViewState and control names.
  const params = new URLSearchParams()
  if (returnUrl) params.set('returnUrl', returnUrl)
  if (invitationCode) params.set('invitationCode', invitationCode)
  const qs = params.toString()
  const registerUrl = `/Account/Login/Register${qs ? `?${qs}` : ''}`

  const pageResponse = await fetch(registerUrl, { credentials: 'same-origin' })
  if (!pageResponse.ok) {
    throw new Error(
      pageResponse.status === 404
        ? 'Registration is not enabled for this site.'
        : `Could not load the registration form (status ${pageResponse.status}).`
    )
  }

  const doc = new DOMParser().parseFromString(await pageResponse.text(), 'text/html')

  const serverForm = doc.getElementById('Register') as HTMLFormElement | null
  if (!serverForm) {
    throw new Error('Registration is not available right now. Please try again later.')
  }

  // Step 2 — resolve the form action. The server renders it relative, e.g.
  // action="./Register?msCorrelationId=8f2c...". It must be resolved against
  // /Account/Login/ and NOT against the SPA's current URL, or the POST 404s.
  const rawAction = serverForm.getAttribute('action') || ''
  let formAction: string
  if (rawAction.startsWith('http') || rawAction.startsWith('/')) {
    formAction = rawAction
  } else {
    const resolved = new URL(rawAction, new URL('/Account/Login/', window.location.origin))
    formAction = resolved.pathname + resolved.search
  }

  // Step 3 — carry over the hidden Web Forms state.
  const hidden = (id: string) => (doc.getElementById(id) as HTMLInputElement | null)?.value || ''
  const viewState = hidden('__VIEWSTATE')
  const viewStateGenerator = hidden('__VIEWSTATEGENERATOR')
  const eventValidation =
    (doc.querySelector('input[name="__EVENTVALIDATION"]') as HTMLInputElement | null)?.value || ''
  const antiForgeryToken =
    (doc.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement | null)
      ?.value || ''

  // Step 4 — look up inputs by their stable client IDs to get the generated names.
  const emailInput = doc.getElementById('EmailTextBox') as HTMLInputElement | null
  const usernameInput = doc.getElementById('UsernameTextBox') as HTMLInputElement | null
  const passwordInput = doc.getElementById('PasswordTextBox') as HTMLInputElement | null
  const confirmInput = doc.getElementById('ConfirmPasswordTextBox') as HTMLInputElement | null
  const submitButton = doc.getElementById('SubmitButton') as HTMLInputElement | null

  const body = new URLSearchParams()
  body.set('__VIEWSTATE', viewState)
  body.set('__VIEWSTATEGENERATOR', viewStateGenerator)
  body.set('__EVENTTARGET', '')
  body.set('__EVENTARGUMENT', '')
  body.set('__VIEWSTATEENCRYPTED', '')
  if (eventValidation) body.set('__EVENTVALIDATION', eventValidation)
  if (antiForgeryToken) body.set('__RequestVerificationToken', antiForgeryToken)

  if (fields.email && emailInput) body.set(emailInput.name, fields.email)
  if (fields.username && usernameInput) body.set(usernameInput.name, fields.username)
  if (passwordInput) body.set(passwordInput.name, fields.password)
  if (confirmInput) body.set(confirmInput.name, fields.confirmPassword)
  // Web Forms only runs the button's server-side click handler when the button's
  // own name is present in the payload.
  if (submitButton) body.set(submitButton.name, submitButton.value || 'Register')

  // Step 5 — post it back.
  const response = await fetch(formAction, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    credentials: 'same-origin',
    redirect: 'follow',
  })

  if (response.url.includes('TermsAndConditions')) {
    throw new TermsRequiredError()
  }

  if (response.redirected) {
    window.location.href = response.url
    return
  }

  const html = await response.text()
  const errors = parseServerErrors(html)
  if (errors.length > 0) {
    throw new Error(errors.join(' '))
  }

  throw new Error('Registration failed. Please check your details and try again.')
}

// --- Forgot password --------------------------------------------------------

/**
 * Requests a password-reset email.
 *
 * The server always replies 200 regardless of whether the address exists — it
 * deliberately does not reveal account existence. So an empty error list means
 * "request accepted", not "account found".
 */
export async function forgotPassword(email: string): Promise<void> {
  if (isDevelopment) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return
  }

  const token = await fetchAntiForgeryToken()

  const body = new URLSearchParams()
  body.set('__RequestVerificationToken', token)
  body.set('Email', email)

  const response = await fetch('/Account/Login/ForgotPassword', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    credentials: 'same-origin',
    redirect: 'follow',
  })

  if (!response.ok && !response.redirected) {
    throw new Error(`Could not send the reset email (status ${response.status}).`)
  }

  if (response.redirected) return

  const errors = parseServerErrors(await response.text())
  if (errors.length > 0) {
    throw new Error(errors.join(' '))
  }
}

// --- Reset password ---------------------------------------------------------

/**
 * Completes a password reset.
 *
 * userId and code come from the query string on the link in the reset email. The
 * password field here is `Password` — note this differs from the sign-in endpoint,
 * which expects `PasswordValue`.
 */
export async function resetPassword(
  userId: string,
  code: string,
  password: string,
  confirmPassword: string
): Promise<void> {
  if (isDevelopment) {
    await new Promise(resolve => setTimeout(resolve, 400))
    window.location.href = '/login?message=password_reset_success'
    return
  }

  const token = await fetchAntiForgeryToken()

  const body = new URLSearchParams()
  body.set('__RequestVerificationToken', token)
  body.set('UserId', userId)
  body.set('Code', code)
  body.set('Password', password)
  body.set('ConfirmPassword', confirmPassword)

  const response = await fetch('/Account/Login/ResetPassword', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    credentials: 'same-origin',
    redirect: 'follow',
  })

  if (response.redirected) {
    window.location.href = '/login?message=password_reset_success'
    return
  }

  const errors = parseServerErrors(await response.text())
  if (errors.length > 0) {
    throw new Error(errors.join(' '))
  }

  window.location.href = '/login?message=password_reset_success'
}

// --- Invitations ------------------------------------------------------------

export interface RedeemInvitationResult {
  nextStep: 'register' | 'login'
}

/**
 * Validates an invitation code and reports which flow the server expects next.
 *
 * redirect:'manual' is load-bearing here. The server answers a valid code with a
 * 302 to /Account/Login/Register; following it would drag the user onto the
 * server-rendered page. Not following it leaves an opaque response we can detect,
 * so the SPA can route to its own /registration page instead.
 *
 * Devtools will show the 302 target as an aborted (net::ERR_ABORTED) request.
 * That is the redirect we chose not to follow, not a failure.
 */
export async function redeemInvitation(
  invitationCode: string,
  redeemByLogin: boolean,
  returnUrl = '/'
): Promise<RedeemInvitationResult> {
  if (!invitationCode.trim()) {
    throw new Error('An invitation code is required.')
  }

  if (isDevelopment) {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { nextStep: redeemByLogin ? 'login' : 'register' }
  }

  const token = await fetchAntiForgeryToken()

  const body = new URLSearchParams()
  body.set('__RequestVerificationToken', token)
  body.set('InvitationCode', invitationCode.trim())
  body.set('RedeemByLogin', redeemByLogin ? 'true' : 'false')
  body.set('returnUrl', returnUrl)

  const response = await fetch('/Account/Login/RedeemInvitation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    credentials: 'same-origin',
    redirect: 'manual',
  })

  // Code is valid and the user is registering: the server tried to 302 us to the
  // Web Forms Register page.
  if (response.type === 'opaqueredirect') {
    return { nextStep: 'register' }
  }

  if (response.ok) {
    const html = await response.text()

    // Invalid, expired, and already-redeemed codes all come back as the same
    // re-rendered form with a validation summary.
    const errors = parseServerErrors(html)
    if (errors.length > 0) {
      throw new Error(errors.join(' '))
    }

    // The server rendered its Login view, meaning it expects the invitee to sign
    // in with an account they already have.
    if (html.includes('name="PasswordValue"') || html.includes('LoginLocal')) {
      return { nextStep: 'login' }
    }

    throw new Error('That invitation could not be processed. Please check the code and try again.')
  }

  throw new Error(`Failed to redeem the invitation (status ${response.status}).`)
}

export interface InvitationDetails {
  email: string
}

/**
 * Reads the invited contact's email off the server registration page so the SPA
 * form can pre-fill it, matching the server-rendered page's behaviour.
 *
 * Best-effort: any failure returns an empty email and the user types it manually.
 */
export async function fetchInvitationDetails(invitationCode: string): Promise<InvitationDetails> {
  if (!invitationCode) return { email: '' }

  if (isDevelopment) {
    return { email: 'invited.resident@zavacity.gov' }
  }

  const response = await fetch(
    `/Account/Login/Register?invitationCode=${encodeURIComponent(invitationCode)}`,
    { credentials: 'same-origin' }
  )
  if (!response.ok) return { email: '' }

  const doc = new DOMParser().parseFromString(await response.text(), 'text/html')
  const emailInput = doc.getElementById('EmailTextBox') as HTMLInputElement | null

  return { email: emailInput?.getAttribute('value') || '' }
}

// --- First-time external sign-in --------------------------------------------

/**
 * Thrown when the short-lived __External cookie that carries the IdP claims has
 * expired (5 minute TTL) or was never set.
 */
export class ExternalLoginCookieExpiredError extends Error {
  constructor() {
    super('Your sign-in session expired. Please sign in again.')
    this.name = 'ExternalLoginCookieExpiredError'
  }
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

/**
 * Loads the claims the server captured during the IdP round-trip.
 *
 * After the callback the server holds the claims in a passive __External cookie
 * and renders its ExternalLoginConfirmation view at the callback URL. Fetching
 * that URL same-origin resends the cookie and yields the same markup, so the SPA
 * can scrape the pre-fill values and render its own form.
 */
export async function fetchExternalLoginDetails(): Promise<ExternalLoginDetails> {
  if (isDevelopment) {
    return {
      email: 'new.resident@zavacity.gov',
      firstName: 'New',
      lastName: 'Resident',
      username: 'new.resident@zavacity.gov',
      invitationCode: '',
      returnUrl: '/',
      antiForgeryToken: 'dev-token',
    }
  }

  const response = await fetch('/Account/Login/ExternalLoginCallback', {
    credentials: 'same-origin',
    redirect: 'follow',
  })
  if (!response.ok) {
    throw new ExternalLoginCookieExpiredError()
  }

  const doc = new DOMParser().parseFromString(await response.text(), 'text/html')

  const antiForgeryToken =
    (doc.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement | null)
      ?.value || ''
  const emailInput = doc.getElementById('Email') as HTMLInputElement | null

  // No confirmation form means the cookie is gone, or the server already signed
  // the user in and served a different page.
  if (!antiForgeryToken || !emailInput) {
    throw new ExternalLoginCookieExpiredError()
  }

  const value = (id: string) =>
    (doc.getElementById(id) as HTMLInputElement | null)?.getAttribute('value') || ''

  // ReturnUrl only appears on the form's action query string, e.g.
  // action="/Account/Login/ExternalLoginConfirmation?ReturnUrl=%2Ftrack"
  const form = emailInput.closest('form')
  const action = form?.getAttribute('action') || ''
  const actionParams = new URLSearchParams(action.split('?')[1] || '')

  return {
    email: emailInput.getAttribute('value') || '',
    firstName: value('FirstName'),
    lastName: value('LastName'),
    username: value('Username'),
    invitationCode: value('InvitationCode') || actionParams.get('InvitationCode') || '',
    returnUrl: actionParams.get('ReturnUrl') || '/',
    antiForgeryToken,
  }
}

/**
 * Completes first-time external sign-in, creating the Dataverse contact.
 *
 * redirect:'manual' again: the server sets the session cookie *before* returning
 * its 302, so an opaque redirect means the user is already signed in and we can
 * navigate to returnUrl ourselves.
 */
export async function confirmExternalLogin(details: ExternalLoginDetails): Promise<void> {
  if (isDevelopment) {
    sessionStorage.removeItem(DEV_SIGNEDOUT_KEY)
    await new Promise(resolve => setTimeout(resolve, 400))
    window.location.href = details.returnUrl || '/'
    return
  }

  const body = new URLSearchParams()
  body.set('__RequestVerificationToken', details.antiForgeryToken)
  body.set('Email', details.email)
  body.set('FirstName', details.firstName)
  body.set('LastName', details.lastName)
  body.set('Username', details.username)
  if (details.invitationCode) body.set('InvitationCode', details.invitationCode)

  const url = `/Account/Login/ExternalLoginConfirmation?ReturnUrl=${encodeURIComponent(
    details.returnUrl || '/'
  )}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    credentials: 'same-origin',
    redirect: 'manual',
  })

  if (response.type === 'opaqueredirect') {
    window.location.href = details.returnUrl || '/'
    return
  }

  if (response.ok) {
    const html = await response.text()

    if (html.includes('TermsAndConditions')) {
      throw new TermsRequiredError()
    }

    const errors = parseServerErrors(html)
    if (errors.length > 0) {
      throw new Error(errors.join(' '))
    }

    // No form left in the response means the server completed the sign-in and
    // rendered something else, so treat it as success.
    if (!html.includes('name="__RequestVerificationToken"')) {
      window.location.href = details.returnUrl || '/'
      return
    }

    throw new ExternalLoginCookieExpiredError()
  }

  throw new Error(`Could not complete sign-in (status ${response.status}).`)
}

// --- User profile -----------------------------------------------------------

/**
 * The subset of the Dataverse contact record the profile page reads and writes.
 *
 * Every column here must also appear in the `Webapi/contact/fields` site setting,
 * lowercased — the Web API matches names case-sensitively and returns 403 for a
 * column that isn't listed, even though the column exists on the table.
 *
 * emailaddress1 is deliberately absent: the profile page shows the email read-only
 * from the portal user snapshot, and the identity provider stays its source of truth.
 */
export interface ProfileContact {
  contactid: string
  firstname: string | null
  lastname: string | null
  mobilephone: string | null
  address1_line1: string | null
  address1_city: string | null
  address1_stateorprovince: string | null
  address1_postalcode: string | null
  address1_country: string | null
}

export type ProfileUpdate = Partial<Omit<ProfileContact, 'contactid'>>

const PROFILE_SELECT = [
  'contactid',
  'firstname',
  'lastname',
  'mobilephone',
  'address1_line1',
  'address1_city',
  'address1_stateorprovince',
  'address1_postalcode',
  'address1_country',
].join(',')

const DEV_PROFILE: ProfileContact = {
  contactid: '00000000-0000-0000-0000-000000000001',
  firstname: 'Dev',
  lastname: 'User',
  mobilephone: '555-0100',
  address1_line1: '1 Civic Plaza',
  address1_city: 'Zava City',
  address1_stateorprovince: 'ZV',
  address1_postalcode: 'A1A 1A1',
  address1_country: 'Canada',
}

/**
 * Pulls a readable message out of a Dataverse Web API error body.
 *
 * Errors come back as:
 *   { "error": { "code": "0x80040220", "message": "Principal user ... is missing prvWriteContact" } }
 * but a permission failure at the portal layer can also return bare HTML, so fall
 * back to the status text rather than surfacing a JSON parse error to the user.
 */
async function readWebApiError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json()
    const message = body?.error?.message
    if (typeof message === 'string' && message.trim()) return message
  } catch {
    // Not JSON — fall through.
  }
  return fallback
}

/**
 * Loads the signed-in user's own contact record.
 *
 * Row-level access is enforced server-side by the Self-scope table permission, so
 * passing a different contactId here returns 403 rather than someone else's data.
 */
export async function getMyProfile(contactId: string): Promise<ProfileContact> {
  if (isDevelopment) {
    await new Promise(resolve => setTimeout(resolve, 250))
    return { ...DEV_PROFILE, contactid: contactId || DEV_PROFILE.contactid }
  }

  const response = await fetch(`/_api/contacts(${contactId})?$select=${PROFILE_SELECT}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(
      await readWebApiError(
        response,
        response.status === 403
          ? 'You do not have permission to view this profile.'
          : `Could not load your profile (status ${response.status}).`
      )
    )
  }

  return response.json()
}

/**
 * Saves changes to the signed-in user's own contact record.
 *
 * Only keys present on the payload are sent. `null` is meaningful — it clears a
 * column — whereas `undefined` keys are dropped so an unrelated column is never
 * blanked out by a partial save.
 */
export async function updateMyProfile(contactId: string, payload: ProfileUpdate): Promise<void> {
  if (isDevelopment) {
    await new Promise(resolve => setTimeout(resolve, 400))
    return
  }

  const body: Record<string, string | null> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) body[key] = value
  }

  if (Object.keys(body).length === 0) return

  const token = await fetchAntiForgeryToken()

  const response = await fetch(`/_api/contacts(${contactId})`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      // Required by Dataverse to confirm an unconditional update rather than an upsert.
      'If-Match': '*',
      __RequestVerificationToken: token,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(
      await readWebApiError(
        response,
        response.status === 403
          ? 'You do not have permission to update this profile.'
          : `Could not save your profile (status ${response.status}).`
      )
    )
  }
}

/**
 * Mirrors a saved name back into the portal user snapshot.
 *
 * window.Microsoft.Dynamic365.Portal.User is written once when the page loads and
 * is never refetched, so without this the header keeps showing the pre-save name
 * until the next full page load. Only the name fields matter — nothing else on the
 * snapshot is derived from the columns this page edits.
 */
export function applyContactUpdateLocally(payload: ProfileUpdate): void {
  if (typeof window === 'undefined') return

  const portalUser = window.Microsoft?.Dynamic365?.Portal?.User
  if (!portalUser) return

  // The snapshot uses camelCase; the Dataverse payload uses lowercase column names.
  if (payload.firstname !== undefined) portalUser.firstName = payload.firstname ?? ''
  if (payload.lastname !== undefined) portalUser.lastName = payload.lastname ?? ''

  if (payload.firstname !== undefined || payload.lastname !== undefined) {
    // fullName is what the header prefers, so it has to be rebuilt too.
    portalUser.fullName = [portalUser.firstName, portalUser.lastName].filter(Boolean).join(' ')
  }
}
