import { getCsrfToken, SupportApiError } from './supportApi'

const environmentId: string = import.meta.env.VITE_BOT_ENVIRONMENT_ID ?? ''
const schemaName: string = import.meta.env.VITE_BOT_SCHEMA_NAME ?? ''
const apiVersion = '2022-03-01-preview'
type JsonRecord = Record<string, unknown>

function invalid(): never {
  throw new SupportApiError('The assistant returned an invalid response. Contact the site administrator.', 'BOT_INVALID_RESPONSE')
}
function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : invalid()
}
export function botEnvironmentBase() {
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(environmentId) || !schemaName.trim()) {
    throw new SupportApiError('The assistant configuration is incomplete. Set VITE_BOT_ENVIRONMENT_ID and VITE_BOT_SCHEMA_NAME before building the site.', 'BOT_CONFIGURATION')
  }
  const compact = environmentId.replace(/-/g, '').toLowerCase()
  return `https://${compact.slice(0, -2)}.${compact.slice(-2)}.environment.api.powerplatform.com`
}
async function checked(response: Response): Promise<Response> {
  if (response.ok && !response.redirected) return response
  const message = response.status === 404
    ? 'The assistant is unavailable. Ask the site administrator to publish the support agent and enable its web channel.'
    : response.status === 401 || response.status === 403 || response.redirected
      ? 'Your assistant session is unavailable. Sign in again or contact the site administrator.'
      : 'The assistant could not connect. Try again or contact support.'
  throw new SupportApiError(message, 'BOT_HTTP_ERROR', response.status)
}
async function request(url: string, options: RequestInit): Promise<Response> {
  try { return await checked(await fetch(url, options)) }
  catch (error) {
    if (error instanceof SupportApiError || options.signal?.aborted) throw error
    throw new SupportApiError('The assistant could not reach its service. Check your connection or contact support.', 'BOT_NETWORK')
  }
}
async function responseJson(response: Response): Promise<JsonRecord> {
  let data: unknown
  try { data = await response.json() } catch { return invalid() }
  return record(data)
}
export async function connectBot(signal: AbortSignal) {
  const base = botEnvironmentBase()
  const options = { signal, credentials: 'omit' as const, headers: { Accept: 'application/json' } }
  // Resolve both endpoints before minting a conversation; no hardcoded US Direct Line domain.
  const channels = await responseJson(await request(`${base}/powervirtualagents/regionalchannelsettings?api-version=${apiVersion}`, options))
  const rawDomain = record(channels.channelUrlsById).directline
  if (typeof rawDomain !== 'string') return invalid()
  let domain: URL
  try { domain = new URL(rawDomain) } catch { return invalid() }
  if (domain.protocol !== 'https:' || domain.username || domain.password ||
    !(domain.hostname === 'directline.botframework.com' || domain.hostname.endsWith('.directline.botframework.com'))) return invalid()
  const info = await responseJson(await request(`${base}/powervirtualagents/botsbyschema/${encodeURIComponent(schemaName)}/directline/token?api-version=${apiVersion}`, options))
  if (typeof info.token !== 'string' || !info.token || typeof info.conversationId !== 'string' || !info.conversationId) return invalid()
  return { token: info.token, conversationId: info.conversationId, domain: `${domain.origin}${domain.pathname.replace(/\/?$/, '/')}v3/directline` }
}
export function botAuthenticationUrl(value: unknown): string {
  if (typeof value !== 'string') return invalid()
  let url: URL
  try { url = new URL(value) } catch { return invalid() }
  // A portal identity token must never be posted to an arbitrary OAuth-card URL.
  const allowed = url.hostname === 'token.botframework.com' || url.hostname.endsWith('.token.botframework.com') ||
    url.origin === botEnvironmentBase() || url.hostname.endsWith('.api.powerva.microsoft.com')
  if (url.protocol !== 'https:' || url.username || url.password || !allowed) return invalid()
  return url.href
}
export async function authenticateBot(value: unknown, signal: AbortSignal) {
  const url = botAuthenticationUrl(value)
  const response = await request('/_services/auth/portalusertoken', {
    method: 'POST', credentials: 'same-origin', signal,
    headers: { Accept: 'application/jwt', __RequestVerificationToken: await getCsrfToken() },
  })
  const token = (await response.text()).trim()
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return invalid()
  await request(url, {
    method: 'POST', credentials: 'omit', redirect: 'error', signal,
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
  })
}
