// Shared helpers for the end-to-end suites (no test framework: plain Playwright library + node:assert).
import assert from 'node:assert/strict'

export { assert }

export const ROLES = ['anonymous', 'non-partner', 'partner-admin', 'partner-manager', 'partner-seller', 'partner-technician']
/** Account Manager workspace (sales) roles. */
export const PARTNER = ['partner-admin', 'partner-manager', 'partner-seller']
/** Technician workspace role (Partner Technician web role): work orders only. */
export const TECHNICIAN = 'partner-technician'
export const SIGNED_IN = ['non-partner', ...PARTNER, TECHNICIAN]
export const ADMIN_MANAGER = ['partner-admin', 'partner-manager']

export const STORAGE_KEYS = {
  role: 'contoso-partner-portal:role:v1',
  db: 'contoso-partner-portal:db:v1',
  contact: 'contoso-partner-portal:contact:v1',
  /** Mock write latency in ms (src/services/config.ts MOCK_LATENCY_KEY). */
  mockLatency: 'contoso-partner-portal:mock-latency-ms',
}

/** Delays every mock write in this context, so pending states can be observed. */
export async function setMockLatency(context, ms) {
  await context.addInitScript(
    ({ key, ms }) => {
      try {
        localStorage.setItem(key, String(ms))
      } catch {
        /* opaque origins (about:blank) have no storage */
      }
    },
    { key: STORAGE_KEYS.mockLatency, ms },
  )
}

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
}

const TIMEOUT = 15_000

/** Known Fluent UI v9 + React StrictMode dev-only warning (tabster/keyborg). */
export function isKnownNoise(text) {
  return /Keyborg/i.test(text)
}

/** Errors that indicate the dev server was mid-rebuild (HMR / dep re-optimisation) rather than an app bug. */
export function isTransient(text) {
  return /500 \(Internal Server Error\)|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Outdated Optimize Dep/i.test(text)
}

/** Sets the role for a fresh context; seed data is reset only on the first navigation of the context. */
export async function prepareContext(context, role) {
  await context.addInitScript(
    ({ role, keys }) => {
      try {
        if (!sessionStorage.getItem('e2e:seeded')) {
          localStorage.removeItem(keys.db)
          localStorage.removeItem(keys.contact)
          localStorage.setItem(keys.role, JSON.stringify(role))
          sessionStorage.setItem('e2e:seeded', '1')
        }
      } catch {
        /* opaque origins (about:blank) have no storage */
      }
    },
    { role, keys: STORAGE_KEYS },
  )
}

/** Collects page errors and console errors (minus known noise) into `errors`. */
export function collectErrors(page, baseUrl) {
  const errors = []
  const origin = new URL(baseUrl).origin
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
  page.on('console', msg => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (isKnownNoise(text)) return
    // Third-party resources (e.g. remote images) failing offline are not app errors.
    const url = msg.location()?.url ?? ''
    if (/^Failed to load resource/.test(text) && url && !url.startsWith(origin)) return
    errors.push(`console: ${text}${url ? ` (${url})` : ''}`)
  })
  return errors
}

/**
 * Navigate and wait for the network to settle. Retries ONCE when the dev server looks mid-rebuild
 * (HTTP 5xx, empty #root, or a dynamic-import failure); a second failure is reported as-is.
 */
export function makeGoto(page, errors, notes) {
  return async function goto(path) {
    for (let attempt = 0; ; attempt++) {
      const mark = errors.length
      let response = null
      let navError = null
      try {
        response = await page.goto(path, { waitUntil: 'networkidle', timeout: 45_000 })
      } catch (e) {
        navError = e
      }
      const status = response?.status() ?? 0
      const rootEmpty = await page
        .waitForFunction(() => (document.querySelector('#root')?.children.length ?? 0) > 0, null, { timeout: 5_000 })
        .then(() => false)
        .catch(() => true)
      const transient = !!navError || status >= 500 || rootEmpty || errors.slice(mark).some(isTransient)
      if (!transient || attempt >= 1) {
        if (navError) throw navError
        return response
      }
      const reason = navError ? navError.message.split('\n')[0] : status >= 500 ? `HTTP ${status}` : rootEmpty ? 'empty #root' : 'dev-server rebuild'
      notes.push(`retried navigation to ${path} (${reason})`)
      errors.splice(mark)
      await page.waitForTimeout(2_000)
    }
  }
}

/** Polls the first <h1> until it matches `expected` (string = exact trimmed text, or RegExp). Returns the final text. */
export async function expectH1(page, expected, timeout = TIMEOUT) {
  const deadline = Date.now() + timeout
  let text = '(no h1)'
  while (Date.now() < deadline) {
    text = ((await page.locator('h1').first().textContent({ timeout: 500 }).catch(() => null)) ?? '(no h1)').trim()
    if (matches(text, expected)) return text
    await page.waitForTimeout(150)
  }
  assert.fail(`expected h1 ${fmt(expected)} but found "${text}" at ${page.url()}`)
}

/** Waits until visible text matching `text` appears (first match). */
export async function expectText(scope, text, timeout = TIMEOUT) {
  const loc = scope.getByText(text, { exact: typeof text === 'string' }).first()
  await loc.waitFor({ state: 'visible', timeout }).catch(() => assert.fail(`expected visible text ${fmt(text)}`))
  return loc
}

/** The inline Fluent Field validation message for the control with this id. */
export function fieldMessage(scope, id) {
  return scope.locator(`.fui-Field:has([id="${id}"]) .fui-Field__validationMessage`)
}

/** Waits for the inline validation message under the control with this id and checks its text. */
export async function expectFieldMessage(scope, id, message, timeout = TIMEOUT) {
  const loc = fieldMessage(scope, id).first()
  await loc.waitFor({ state: 'visible', timeout }).catch(() => assert.fail(`expected an inline validation message under #${id}`))
  if (message !== undefined) assert.equal((await loc.textContent())?.trim(), message, `inline message for #${id}`)
}

export async function waitForUrl(page, predicate, description, timeout = TIMEOUT) {
  await page.waitForURL(url => predicate(new URL(url)), { timeout }).catch(() => assert.fail(`expected URL ${description} but was ${page.url()}`))
}

export function matches(text, expected) {
  return expected instanceof RegExp ? expected.test(text) : text === expected
}

export function fmt(expected) {
  return expected instanceof RegExp ? String(expected) : `"${expected}"`
}
