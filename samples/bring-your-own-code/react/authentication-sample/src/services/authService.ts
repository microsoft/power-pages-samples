import type { PowerPagesUser } from '../types/powerPages'

export type AuthProviderType =
  | 'local'
  | 'oidc'
  | 'entra-id'
  | 'saml2'
  | 'ws-federation'
  | 'social'

export interface AuthProviderConfig {
  id: string
  type: AuthProviderType
  displayName: string
  providerIdentifier?: string
  loginByEmail?: boolean
}

export const AUTH_PROVIDERS: AuthProviderConfig[] = [
  {
    id: 'entra-external-id',
    type: 'oidc',
    displayName: 'Customer sign in',
    providerIdentifier:
      'https://<your-tenant-name>.ciamlogin.com/<your-tenant-id>',
  },
  {
    id: 'entra-id',
    type: 'entra-id',
    displayName: 'Staff sign in',
  },
  {
    id: 'local',
    type: 'local',
    displayName: 'Sign in with email',
    loginByEmail: true,
  },
]

if (AUTH_PROVIDERS.length === 0) {
  throw new Error(
    'AUTH_PROVIDERS array is empty. Configure at least one authentication provider.',
  )
}

export const LOCAL_PROVIDER = AUTH_PROVIDERS.find(p => p.type === 'local')
export const EXTERNAL_PROVIDERS = AUTH_PROVIDERS.filter(p => p.type !== 'local')

const isDevelopment =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')

const MOCK_USER: PowerPagesUser = {
  userName: 'dev@smokingburgers.example',
  firstName: 'Dev',
  lastName: 'User',
  email: 'dev@smokingburgers.example',
  contactId: '00000000-0000-0000-0000-000000000001',
  userRoles: ['Authenticated Users', 'Administrators'],
}

const DEV_SIGNEDOUT_KEY = '__pp_dev_signedout__'

export function getAuthProvider(): AuthProviderConfig {
  return LOCAL_PROVIDER ?? AUTH_PROVIDERS[0]
}

export function getCurrentUser(): PowerPagesUser | undefined {
  if (typeof window === 'undefined') return undefined
  if (isDevelopment) {
    if (sessionStorage.getItem(DEV_SIGNEDOUT_KEY)) return undefined
    return MOCK_USER
  }
  return window.Microsoft?.Dynamic365?.Portal?.User
}

export function isAuthenticated(): boolean {
  const user = getCurrentUser()
  return !!user?.userName
}

export function getTenantId(): string | undefined {
  if (isDevelopment) return '00000000-0000-0000-0000-000000000000'
  return window.Microsoft?.Dynamic365?.Portal?.tenant
}

export async function fetchAntiForgeryToken(): Promise<string> {
  const response = await fetch('/_layout/tokenhtml')
  if (!response.ok) {
    throw new Error(
      `Failed to fetch anti-forgery token: ${response.status} ${response.statusText}. ` +
        'Ensure the site is deployed and accessible.',
    )
  }
  const html = await response.text()
  const match = html.match(/value="([^"]+)"/)
  if (!match) {
    throw new Error('Failed to extract anti-forgery token from /_layout/tokenhtml')
  }
  return match[1]
}

export function resolveProviderIdentifier(provider: AuthProviderConfig): string {
  if (provider.type === 'local') {
    throw new Error(`resolveProviderIdentifier called for local provider ${provider.id}`)
  }
  if (provider.type === 'entra-id') {
    const tenantId = getTenantId()
    if (!tenantId) {
      throw new Error(
        'Cannot resolve Entra ID provider identifier — tenant ID not available. ' +
          'Ensure the site is properly deployed and window.Microsoft.Dynamic365.Portal.tenant is set.',
      )
    }
    return `https://login.windows.net/${tenantId}/`
  }
  if (!provider.providerIdentifier) {
    throw new Error(
      `Provider ${provider.id} (type ${provider.type}) is missing providerIdentifier.`,
    )
  }
  return provider.providerIdentifier
}

export async function loginExternal(
  providerIdentifier: string,
  returnUrl?: string,
  invitationCode?: string,
): Promise<void> {
  if (isDevelopment) {
    sessionStorage.removeItem(DEV_SIGNEDOUT_KEY)
    window.location.reload()
    return
  }

  const token = await fetchAntiForgeryToken()

  const form = document.createElement('form')
  form.method = 'POST'
  form.action = invitationCode
    ? `/Account/Login/ExternalLogin?InvitationCode=${encodeURIComponent(invitationCode)}`
    : '/Account/Login/ExternalLogin'

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

export async function loginWithProvider(
  provider: AuthProviderConfig,
  options: {
    returnUrl?: string
    invitationCode?: string
    credentials?: { credential: string; password: string; rememberMe?: boolean }
  } = {},
): Promise<void> {
  if (provider.type === 'local') {
    if (!options.credentials) {
      throw new Error('Local sign-in requires email and password.')
    }
    return loginLocal(
      options.credentials.credential,
      options.credentials.password,
      options.credentials.rememberMe,
      options.returnUrl,
      options.invitationCode,
    )
  }
  const providerIdentifier = resolveProviderIdentifier(provider)
  return loginExternal(providerIdentifier, options.returnUrl, options.invitationCode)
}

export async function loginLocal(
  credential: string,
  password: string,
  rememberMe = false,
  returnUrl?: string,
  invitationCode?: string,
): Promise<void> {
  if (isDevelopment) {
    sessionStorage.removeItem(DEV_SIGNEDOUT_KEY)
    window.location.href = returnUrl || '/'
    return
  }

  const token = await fetchAntiForgeryToken()
  const credentialFieldName = LOCAL_PROVIDER?.loginByEmail === false ? 'Username' : 'Email'

  const body = new URLSearchParams()
  body.set('__RequestVerificationToken', token)
  body.set(credentialFieldName, credential)
  body.set('PasswordValue', password)
  body.set('ReturnUrl', returnUrl || '/')
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

  if (response.redirected || response.url.endsWith(returnUrl || '/')) {
    window.location.href = returnUrl || '/'
    return
  }

  const html = await response.text()
  const errors = parseServerErrors(html)
  if (errors.length > 0) {
    throw new Error(errors.join(' '))
  }
  throw new Error('Invalid email or password. Please try again.')
}

export async function register(
  fields: {
    email?: string
    username?: string
    password: string
    confirmPassword: string
  },
  returnUrl?: string,
  invitationCode?: string,
): Promise<void> {
  if (!fields.email && !fields.username) {
    throw new Error('Registration requires either an email or username.')
  }

  if (isDevelopment) {
    sessionStorage.removeItem(DEV_SIGNEDOUT_KEY)
    window.location.href = returnUrl || '/'
    return
  }

  const params = new URLSearchParams()
  if (returnUrl) params.set('returnUrl', returnUrl)
  if (invitationCode) params.set('invitationCode', invitationCode)
  const qs = params.toString()
  const regUrl = `/Account/Login/Register${qs ? `?${qs}` : ''}`

  const pageResponse = await fetch(regUrl, { credentials: 'same-origin' })
  if (!pageResponse.ok) {
    throw new Error(`Failed to load registration page (status ${pageResponse.status}).`)
  }

  const pageHtml = await pageResponse.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(pageHtml, 'text/html')

  const serverForm = doc.getElementById('Register') as HTMLFormElement | null
  if (!serverForm) {
    throw new Error('Registration form not found on the server page.')
  }

  const rawAction = serverForm.getAttribute('action') || ''
  let formAction: string
  if (rawAction.startsWith('http') || rawAction.startsWith('/')) {
    formAction = rawAction
  } else {
    const base = new URL('/Account/Login/', window.location.origin)
    const resolved = new URL(rawAction, base)
    formAction = resolved.pathname + resolved.search
  }

  const getValue = (id: string) =>
    (doc.getElementById(id) as HTMLInputElement | null)?.value || ''

  const viewState = getValue('__VIEWSTATE')
  const viewStateGenerator = getValue('__VIEWSTATEGENERATOR')
  const eventValidation =
    (doc.querySelector('input[name="__EVENTVALIDATION"]') as HTMLInputElement | null)?.value || ''
  const antiForgeryToken =
    (doc.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement | null)
      ?.value || ''

  const emailInput = doc.getElementById('EmailTextBox') as HTMLInputElement | null
  const usernameInput = doc.getElementById('UsernameTextBox') as HTMLInputElement | null
  const passwordInput = doc.getElementById('PasswordTextBox') as HTMLInputElement | null
  const confirmInput = doc.getElementById('ConfirmPasswordTextBox') as HTMLInputElement | null
  const submitBtn = doc.getElementById('SubmitButton') as HTMLInputElement | null

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
  if (submitBtn) body.set(submitBtn.name, submitBtn.value || 'Register')

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

  const responseHtml = await response.text()
  const errors = parseServerErrors(responseHtml)
  if (errors.length > 0) {
    throw new Error(errors.join(' '))
  }

  if (response.url !== window.location.href) {
    window.location.href = response.url
    return
  }

  throw new Error('Registration failed. Please try again.')
}

export async function forgotPassword(email: string): Promise<void> {
  if (isDevelopment) {
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

  const html = await response.text()
  const errors = parseServerErrors(html)
  if (errors.length > 0) {
    throw new Error(errors.join(' '))
  }
}

export async function resetPassword(
  userId: string,
  code: string,
  password: string,
  confirmPassword: string,
): Promise<void> {
  if (isDevelopment) {
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

  const html = await response.text()
  const errors = parseServerErrors(html)
  if (errors.length > 0) {
    throw new Error(errors.join(' '))
  }
  throw new Error('Failed to reset password. The link may have expired.')
}

export interface RedeemInvitationResult {
  nextStep: 'register' | 'login'
}

export async function redeemInvitation(
  invitationCode: string,
  redeemByLogin: boolean,
  returnUrl: string = '/',
): Promise<RedeemInvitationResult> {
  if (!invitationCode) {
    throw new Error('Invitation code is required.')
  }

  if (isDevelopment) {
    return { nextStep: redeemByLogin ? 'login' : 'register' }
  }

  const token = await fetchAntiForgeryToken()

  const body = new URLSearchParams()
  body.set('__RequestVerificationToken', token)
  body.set('InvitationCode', invitationCode)
  body.set('RedeemByLogin', redeemByLogin ? 'true' : 'false')
  body.set('returnUrl', returnUrl)

  const response = await fetch('/Account/Login/RedeemInvitation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    credentials: 'same-origin',
    redirect: 'manual',
  })

  if (response.type === 'opaqueredirect') {
    return { nextStep: 'register' }
  }

  if (response.ok) {
    const html = await response.text()

    const errors = parseServerErrors(html)
    if (errors.length > 0) {
      throw new Error(errors.join(' '))
    }

    if (html.includes('name="PasswordValue"') || html.includes('LoginLocal')) {
      return { nextStep: 'login' }
    }

    throw new Error('Unable to process invitation. Please try again.')
  }

  throw new Error(`Failed to redeem invitation (status ${response.status}).`)
}

export interface InvitationDetails {
  email: string
}

export async function fetchInvitationDetails(
  invitationCode: string,
): Promise<InvitationDetails> {
  if (!invitationCode) return { email: '' }

  if (isDevelopment) {
    return { email: 'invited.user@smokingburgers.example' }
  }

  const regUrl = `/Account/Login/Register?invitationCode=${encodeURIComponent(invitationCode)}`
  const response = await fetch(regUrl, { credentials: 'same-origin' })
  if (!response.ok) return { email: '' }

  const html = await response.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const emailInput = doc.getElementById('EmailTextBox') as HTMLInputElement | null
  const email = emailInput?.getAttribute('value') || ''

  return { email }
}

export function logout(returnUrl?: string): void {
  if (isDevelopment) {
    sessionStorage.setItem(DEV_SIGNEDOUT_KEY, '1')
    window.location.reload()
    return
  }
  const target = returnUrl || '/'
  window.location.href = `/Account/Login/LogOff?returnUrl=${encodeURIComponent(target)}`
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Access was denied by the identity provider.',
  missing_license: 'Your account does not have the required license.',
  invalid_login: 'Invalid login. Please try again.',
  invalid_username_or_password: 'Invalid username or password.',
  user_locked:
    'Your account has been locked due to too many failed attempts. Please try again later.',
  too_many_attempts: 'Too many failed login attempts. Please try again later.',
  invalid_invitation: 'The invitation code is invalid or has expired.',
  duplicate_login: 'This external identity is already linked to another account.',
  registration_blocked: 'Registration is not available for this provider.',
  signin_failed: 'Sign-in failed. Please try again.',
  external_auth_failed: 'Sign-in with the external provider failed. Please try again.',
}

export function getAuthError(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const params = new URLSearchParams(window.location.search)
  const message = params.get('message') || params.get('error')
  if (!message) return undefined
  return (
    AUTH_ERROR_MESSAGES[message] ||
    'An authentication error occurred. Please try again.'
  )
}

export function getSessionExpiredMessage(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const params = new URLSearchParams(window.location.search)
  if (params.get('sessionExpired') === 'true') {
    return 'Your session has expired. Please sign in again.'
  }
  return undefined
}

export function parseServerErrors(html: string): string[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const errors: string[] = []

  doc.querySelectorAll('.validation-summary-errors li').forEach(li => {
    const text = li.textContent?.trim()
    if (text) errors.push(text)
  })
  doc.querySelectorAll('.alert-danger li').forEach(li => {
    const text = li.textContent?.trim()
    if (text && !errors.includes(text)) errors.push(text)
  })
  doc.querySelectorAll('.field-validation-error').forEach(el => {
    const text = el.textContent?.trim()
    if (text && !errors.includes(text)) errors.push(text)
  })

  return errors
}

export class TermsRequiredError extends Error {
  constructor() {
    super('Terms and conditions acceptance required.')
    this.name = 'TermsRequiredError'
  }
}

export async function acceptTerms(returnUrl?: string): Promise<void> {
  if (isDevelopment) {
    window.location.href = returnUrl || '/'
    return
  }

  const params = new URLSearchParams(window.location.search)
  const useExternalSignInAsync = params.get('UseExternalSignInAsync') || 'False'
  const isFacebook = params.get('IsFacebook') || 'False'
  const isInternalAADUser = params.get('IsInternalAADUser') || 'False'
  const queryReturnUrl = params.get('ReturnUrl') || returnUrl || '/'

  const queryString = window.location.search
  const serverTermsUrl = `/Account/Login/TermsAndConditions${queryString}`

  const pageResponse = await fetch(serverTermsUrl, {
    credentials: 'same-origin',
    redirect: 'follow',
  })

  const finalTermsUrl =
    new URL(pageResponse.url).pathname + new URL(pageResponse.url).search

  const pageHtml = await pageResponse.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(pageHtml, 'text/html')

  const antiForgeryToken =
    (doc.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement | null)
      ?.value || ''

  const body = new URLSearchParams()
  body.set('__RequestVerificationToken', antiForgeryToken)
  body.set('InvitationCode', '')
  body.set('IsFacebook', isFacebook)
  body.set('UseExternalSignInAsync', useExternalSignInAsync)
  body.set('IsInternalAADUser', isInternalAADUser)
  body.set('IsTermsAndConditionsAccepted', 'true')

  const response = await fetch(finalTermsUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    credentials: 'same-origin',
    redirect: 'follow',
  })

  const finalReturn = returnUrl ?? queryReturnUrl

  if (response.redirected || response.ok) {
    window.location.href = finalReturn || '/'
    return
  }

  const responseHtml = await response.text()
  const errors = parseServerErrors(responseHtml)
  if (errors.length > 0) throw new Error(errors.join(' '))
  throw new Error('Failed to accept terms. Please try again.')
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

export class ExternalLoginCookieExpiredError extends Error {
  constructor() {
    super('External login session expired. Please sign in again.')
    this.name = 'ExternalLoginCookieExpiredError'
  }
}

export async function fetchExternalLoginDetails(): Promise<ExternalLoginDetails> {
  if (isDevelopment) {
    return {
      email: 'new.customer@smokingburgers.example',
      firstName: 'New',
      lastName: 'Customer',
      username: 'new.customer',
      invitationCode: '',
      returnUrl: '/',
      antiForgeryToken: '<development-only-anti-forgery-token>',
    }
  }

  const response = await fetch('/Account/Login/ExternalLoginCallback', {
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch external login details (status ${response.status}).`)
  }

  const html = await response.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  if (!doc.querySelector('input[name="Email"]')) {
    throw new ExternalLoginCookieExpiredError()
  }

  const getValue = (selector: string): string =>
    (doc.querySelector(selector) as HTMLInputElement | null)?.value || ''

  const formAction = doc.querySelector('form')?.getAttribute('action') || ''
  const actionParams = new URLSearchParams(formAction.split('?')[1] || '')

  return {
    email: getValue('input[name="Email"]'),
    firstName: getValue('input[name="FirstName"]'),
    lastName: getValue('input[name="LastName"]'),
    username: getValue('input[name="Username"]'),
    invitationCode:
      getValue('input[name="InvitationCode"]') ||
      actionParams.get('InvitationCode') ||
      '',
    returnUrl: actionParams.get('ReturnUrl') || '/',
    antiForgeryToken: getValue('input[name="__RequestVerificationToken"]'),
  }
}

export async function confirmExternalLogin(details: ExternalLoginDetails): Promise<void> {
  if (isDevelopment) {
    window.location.href = details.returnUrl || '/'
    return
  }

  const body = new URLSearchParams()
  body.set('__RequestVerificationToken', details.antiForgeryToken)
  body.set('Email', details.email)
  body.set('FirstName', details.firstName)
  body.set('LastName', details.lastName)
  body.set('Username', details.username)

  const params = new URLSearchParams()
  if (details.returnUrl) params.set('ReturnUrl', details.returnUrl)
  if (details.invitationCode) params.set('InvitationCode', details.invitationCode)
  const qs = params.toString()
  const postUrl = `/Account/Login/ExternalLoginConfirmation${qs ? `?${qs}` : ''}`

  const response = await fetch(postUrl, {
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
    const errors = parseServerErrors(html)
    if (errors.length > 0) throw new Error(errors.join(' '))
    if (
      html.includes('TermsAndConditions') ||
      html.includes('IsTermsAndConditionsAccepted')
    ) {
      throw new TermsRequiredError()
    }
    throw new Error('Unable to complete external login. Please try again.')
  }

  throw new Error(`Failed to confirm external login (status ${response.status}).`)
}

export interface ContactProfileUpdate {
  firstname?: string
  lastname?: string
  mobilephone?: string
  address1_line1?: string
  address1_line2?: string
  address1_city?: string
  address1_stateorprovince?: string
  address1_postalcode?: string
  address1_country?: string
}

export interface ContactProfile {
  firstname: string
  lastname: string
  emailaddress1: string
  mobilephone: string
  address1_line1: string
  address1_line2: string
  address1_city: string
  address1_stateorprovince: string
  address1_postalcode: string
  address1_country: string
}

const CONTACT_PROFILE_FIELDS = [
  'firstname',
  'lastname',
  'emailaddress1',
  'mobilephone',
  'address1_line1',
  'address1_line2',
  'address1_city',
  'address1_stateorprovince',
  'address1_postalcode',
  'address1_country',
] as const

export async function fetchOwnContact(): Promise<ContactProfile> {
  const user = getCurrentUser()
  if (!user?.contactId) {
    throw new Error('Cannot load profile — no signed-in contact.')
  }

  if (isDevelopment) {
    return {
      firstname: MOCK_USER.firstName,
      lastname: MOCK_USER.lastName,
      emailaddress1: MOCK_USER.email,
      mobilephone: '+1 (555) 123-4567',
      address1_line1: '14 Ember Lane',
      address1_line2: '',
      address1_city: 'Brooklyn',
      address1_stateorprovince: 'NY',
      address1_postalcode: '11211',
      address1_country: 'United States',
    }
  }

  const select = CONTACT_PROFILE_FIELDS.join(',')
  const response = await fetch(`/_api/contacts(${user.contactId})?$select=${select}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error(
      `Failed to load profile (status ${response.status}). Check that Web API is enabled for the contact table and that you have permission to read your own contact.`,
    )
  }

  const body = await response.json()
  return {
    firstname: body.firstname || '',
    lastname: body.lastname || '',
    emailaddress1: body.emailaddress1 || '',
    mobilephone: body.mobilephone || '',
    address1_line1: body.address1_line1 || '',
    address1_line2: body.address1_line2 || '',
    address1_city: body.address1_city || '',
    address1_stateorprovince: body.address1_stateorprovince || '',
    address1_postalcode: body.address1_postalcode || '',
    address1_country: body.address1_country || '',
  }
}

export async function patchOwnContact(updates: ContactProfileUpdate): Promise<void> {
  const user = getCurrentUser()
  if (!user?.contactId) {
    throw new Error('Cannot update profile — no signed-in contact.')
  }

  if (isDevelopment) {
    if (updates.firstname !== undefined) MOCK_USER.firstName = updates.firstname
    if (updates.lastname !== undefined) MOCK_USER.lastName = updates.lastname
    return
  }

  const token = await fetchAntiForgeryToken()

  const response = await fetch(`/_api/contacts(${user.contactId})`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      '__RequestVerificationToken': token,
    },
    body: JSON.stringify(updates),
    credentials: 'same-origin',
  })

  if (!response.ok) {
    let detail = ''
    try {
      const body = await response.json()
      detail = body?.error?.message || ''
    } catch {
      try {
        detail = await response.text()
      } catch {
        /* ignore */
      }
    }
    throw new Error(
      detail
        ? `Failed to update profile: ${detail}`
        : `Failed to update profile (status ${response.status}). Check that Web API is enabled for the contact table and that you have permission to update your own contact.`,
    )
  }
}

export function getUserDisplayName(): string {
  const user = getCurrentUser()
  if (!user) return ''
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')
  if (fullName) return fullName
  if (user.firstName) return user.firstName
  if (user.userName) return user.userName
  if (user.email) return user.email
  return 'User'
}

export function getUserInitials(): string {
  const user = getCurrentUser()
  if (!user) return ''
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  }
  if (user.firstName) return user.firstName[0].toUpperCase()
  const fallback = user.userName || user.email || ''
  return (fallback[0] || '').toUpperCase()
}
