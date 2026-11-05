// Skeleton loading states: route Suspense fallbacks, chart placeholders, remote images, and no spinners/stale busy states.
import AxeBuilder from '@axe-core/playwright'
import { assert, expectH1, ROLES } from './lib.mjs'
import { MATRIX } from './smoke.mjs'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const BUSY_STATUS = '[role="status"][aria-busy="true"]'
const UNSPLASH = /^https:\/\/images\.unsplash\.com\//
const UNSPLASH_IMG = 'img[src*="images.unsplash.com"]'
// 1x1 PNG served instead of the real photo so the delayed-image check does not depend on the internet.
const PIXEL_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

const sleep = ms => new Promise(r => setTimeout(r, ms))

const devServerCache = new Map()
/** True when the target is the Vite dev server (index.html injects /@vite/client), false for a production preview. */
async function isDevServer(baseUrl) {
  if (!devServerCache.has(baseUrl)) {
    devServerCache.set(
      baseUrl,
      fetch(baseUrl)
        .then(r => r.text())
        .then(html => html.includes('/@vite/client'))
        .catch(() => true),
    )
  }
  return devServerCache.get(baseUrl)
}

/** Delay only the tested lazy pages, never the vendor chunks needed to render the skeleton itself. */
async function lazyPagePredicate(baseUrl) {
  const dev = await isDevServer(baseUrl)
  return url => {
    const { pathname } = new URL(url)
    return dev ? /\/src\/pages\//.test(pathname) : /\/assets\/(?:Home|OpportunitiesHome|CustomersHome|CustomerAccounts|CreateOpportunity|OpportunityDetails|OpportunitySummary|ProgramHome|BecomePartner|Profile|SignIn)-[^/]+\.js$/.test(pathname)
  }
}

/** Delays every lazy page module by `ms`, or until `gate` resolves when given. */
async function delayPageModules(page, baseUrl, { ms = 1500, gate } = {}) {
  const isPageModule = await lazyPagePredicate(baseUrl)
  await page.route(isPageModule, async route => {
    await (gate ?? sleep(ms))
    await route.continue().catch(() => {})
  })
}

async function spinnerCount(page) {
  return page.locator('.fui-Spinner').count()
}

/** Waits for a visible busy status whose (screen-reader) text contains `label`. */
async function expectBusyStatus(page, label, timeout = 10_000) {
  await page
    .waitForFunction(
      ({ selector, label }) =>
        [...document.querySelectorAll(selector)].some(el => {
          const r = el.getBoundingClientRect()
          return (el.textContent ?? '').includes(label) && r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
        }),
      { selector: BUSY_STATUS, label },
      { timeout },
    )
    .catch(() => assert.fail(`expected a visible ${BUSY_STATUS} containing "${label}" at ${page.url()}`))
}

/** Polls until no element is aria-busy and no Fluent Spinner exists; fails listing what lingers. */
async function expectSettled(page, timeout = 6_000) {
  const deadline = Date.now() + timeout
  let state
  do {
    state = await page.evaluate(() => ({
      spinners: document.querySelectorAll('.fui-Spinner').length,
      busy: [...document.querySelectorAll('[aria-busy="true"]')].map(el => el.outerHTML.slice(0, 160)),
    }))
    if (!state.spinners && !state.busy.length) return
    await page.waitForTimeout(200)
  } while (Date.now() < deadline)
  assert.fail(
    `page did not settle at ${page.url()}: ${state.spinners} .fui-Spinner, ${state.busy.length} [aria-busy="true"]` +
      (state.busy.length ? `\n${state.busy.map(h => `  ${h}`).join('\n')}` : ''),
  )
}

async function scan(page, label) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).exclude('[data-tabster-dummy]').analyze()
  if (violations.length) {
    const lines = violations.flatMap(v => [`${v.id} (${v.impact}): ${v.help}`, ...v.nodes.slice(0, 5).map(n => `    target: ${n.target.join(' ')}`)])
    assert.fail(`${violations.length} axe violation(s) on ${label}:\n${lines.join('\n')}`)
  }
}

// 1. Route skeletons ------------------------------------------------------------------------------

// `variant` is the PageSkeleton layout expected for the path (skeletonVariantForPath), exposed as data-skeleton.
const ROUTE_CASES = [
  { role: 'partner-admin', path: '/', h1: 'Welcome back, Avery', variant: 'dashboard', regions: ['glance', 'figures', 'work', 'trends'] },
  { role: 'anonymous', path: '/', h1: 'Grow together with the Zava partner network', variant: 'landing' },
  { role: 'partner-admin', path: '/opportunities/', h1: 'Opportunities', variant: 'hub', regions: ['figures', 'work'] },
  { role: 'partner-admin', path: '/customers/', h1: 'Customers', variant: 'hub', regions: ['figures', 'work'] },
  { role: 'partner-admin', path: '/customers/customer-accounts/', h1: 'Customer accounts', variant: 'list' },
  { role: 'partner-admin', path: '/opportunities/managed-opportunities/create-opportunity/', h1: 'Create opportunity', variant: 'form' },
  { role: 'partner-admin', path: '/opportunities/managed-opportunities/opportunity-details/?id=opp-2404', h1: 'Cloud migration – phase 1', variant: 'detail' },
  { role: 'partner-admin', path: '/opportunities/distributed-opportunities/opportunity-summary/?id=opp-2401', h1: 'Fleet telematics rollout', variant: 'summary' },
  { role: 'partner-admin', path: '/partner-program/', h1: 'Grow your business with Zava.', variant: 'program' },
  { role: 'anonymous', path: '/partner-program/become-a-partner/', h1: 'Become a partner', variant: 'article' },
  { role: 'partner-admin', path: '/profile/', h1: 'Profile', variant: 'settings' },
  { role: 'anonymous', path: '/login', h1: 'Sign in', variant: 'auth' },
  { role: 'partner-technician', path: '/', h1: 'Welcome back, Test', variant: 'hub', regions: ['figures', 'work'] },
  { role: 'partner-technician', path: '/work-orders/', h1: 'Work orders', variant: 'list' },
  { role: 'partner-technician', path: '/work-orders/work-order-details/?id=wo-204', h1: 'WO-00123 · High-temperature alarm on CU-204', variant: 'detail' },
]
const routeTests = ROUTE_CASES.map(c => ({
  name: `route    ${c.role.padEnd(15)} ${c.path} shows the ${c.variant} PageSkeleton (axe clean) while the page module loads`,
  role: c.role,
  async run({ page, baseUrl }) {
    let release
    const gate = new Promise(resolve => { release = resolve })
    await delayPageModules(page, baseUrl, { gate })
    try {
      await page.goto(c.path, { waitUntil: 'commit' })
      await expectBusyStatus(page, 'Loading...')
      assert.equal(await spinnerCount(page), 0, 'no .fui-Spinner expected while the route skeleton is shown')
      const shown = await page.locator(`${BUSY_STATUS}[data-skeleton]`).first().getAttribute('data-skeleton')
      assert.equal(shown, c.variant, `expected the '${c.variant}' skeleton at ${c.path}`)
      for (const region of c.regions ?? []) {
        assert.ok(await page.locator(`[data-skeleton-region="${region}"]`).count(), `expected skeleton region '${region}' at ${c.path}`)
      }
      await page.waitForTimeout(300)
      await scan(page, `${c.variant} route skeleton (${c.path})`)
    } finally {
      release()
    }
    await expectH1(page, c.h1)
    await expectSettled(page)
  },
}))

// 2. Chart skeletons -------------------------------------------------------------------------------

/** Partner dashboard chart cards: revenue by close month (SVG chart) and by territory (HTML bar list). */
const DASHBOARD_CHARTS = 2
const DASHBOARD_SVG_CHARTS = 1

const chartTests = [
  {
    name: 'chart    partner-admin   / shows ChartSkeleton while charts measure',
    role: 'partner-admin',
    async run({ page, context }) {
      // Simulate charts that are still measuring: ResizeObserver callbacks are delayed ~1.5s, and until an
      // element's first (delayed) callback the chart container (figure > div) reports zero size, so both
      // a synchronous initial measure and the observer see "not measured yet".
      await context.addInitScript(() => {
        const Native = window.ResizeObserver
        if (!Native) return
        const measured = new WeakSet()
        const nativeRect = Element.prototype.getBoundingClientRect
        Element.prototype.getBoundingClientRect = function () {
          if (!measured.has(this) && this.parentElement?.tagName === 'FIGURE') return new DOMRect(0, 0, 0, 0)
          return nativeRect.call(this)
        }
        window.ResizeObserver = class extends Native {
          constructor(callback) {
            super((entries, observer) =>
              setTimeout(() => {
                for (const e of entries) measured.add(e.target)
                callback(entries, observer)
              }, 1500),
            )
          }
        }
      })
      await page.goto('/', { waitUntil: 'commit' })
      await expectH1(page, 'Welcome back, Avery')
      const chartStatuses = page.locator(BUSY_STATUS).filter({ hasText: 'Loading chart...' })
      await page
        .waitForFunction(({ selector, n }) => [...document.querySelectorAll(selector)].filter(el => (el.textContent ?? '').includes('Loading chart...')).length === n, { selector: BUSY_STATUS, n: DASHBOARD_CHARTS }, {
          timeout: 5_000,
        })
        .catch(async () => assert.fail(`expected ${DASHBOARD_CHARTS} "Loading chart..." statuses, found ${await chartStatuses.count()}`))
      assert.equal(await spinnerCount(page), 0, 'no .fui-Spinner expected while charts measure')
      await page
        .waitForFunction(
          ({ selector, svg }) =>
            ![...document.querySelectorAll(selector)].some(el => (el.textContent ?? '').includes('Loading chart...')) &&
            [...document.querySelectorAll('figure')].filter(f => f.querySelector('svg')).length >= svg,
          { selector: BUSY_STATUS, svg: DASHBOARD_SVG_CHARTS },
          { timeout: 10_000 },
        )
        .catch(async () => assert.fail(`expected chart skeletons to resolve with ${DASHBOARD_SVG_CHARTS} chart <svg> inside a <figure>, found ${await page.locator('figure:has(svg)').count()}`))
      await expectSettled(page)
    },
  },
]

// 3. Image skeletons -------------------------------------------------------------------------------

const IMAGE_CASES = [
  // The anonymous home hero is an illustration now; the program home and sign-in pages keep the remote photo.
  { path: '/partner-program/', h1: 'Grow your business with Zava.' },
  { path: '/login', h1: 'Sign in' },
]

/** Visible <img> elements that finished loading without pixels (a broken image icon). */
function brokenImages(page) {
  return page.evaluate(() =>
    [...document.images]
      .filter(img => {
        const r = img.getBoundingClientRect()
        return img.complete && img.naturalWidth === 0 && r.width > 0 && r.height > 0 && getComputedStyle(img).visibility !== 'hidden' && Number(getComputedStyle(img).opacity) > 0
      })
      .map(img => img.currentSrc || img.src),
  )
}

const imageTests = IMAGE_CASES.flatMap(c => [
  {
    name: `image    anonymous       ${c.path} shows a skeleton until the Unsplash photo loads`,
    role: 'anonymous',
    async run({ page }) {
      await page.route(UNSPLASH, async route => {
        await sleep(2000)
        await route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG }).catch(() => {})
      })
      await page.goto(c.path, { waitUntil: 'commit' })
      await expectH1(page, c.h1)
      const wrapper = page.locator(`[aria-busy="true"]:has(${UNSPLASH_IMG})`).first()
      await wrapper.waitFor({ state: 'attached', timeout: 5_000 }).catch(() => assert.fail('expected an aria-busy wrapper around the Unsplash image while it loads'))
      await wrapper.scrollIntoViewIfNeeded()
      const box = await wrapper.boundingBox()
      assert.ok(box && box.width > 0 && box.height > 0, 'image skeleton wrapper should reserve space')
      assert.ok((await wrapper.locator('.fui-Skeleton, .fui-SkeletonItem').count()) > 0, 'expected a Fluent Skeleton inside the image wrapper')
      const img = page.locator(UNSPLASH_IMG).first()
      await page
        .waitForFunction(el => el.complete && el.naturalWidth > 0 && getComputedStyle(el).opacity === '1', await img.elementHandle(), { timeout: 10_000 })
        .catch(() => assert.fail('expected the Unsplash <img> to load and fade in to opacity 1'))
      assert.equal(await page.locator(`[aria-busy="true"]:has(${UNSPLASH_IMG})`).count(), 0, 'image wrapper should no longer be aria-busy')
    },
  },
  {
    name: `image    anonymous       ${c.path} shows a fallback (no broken image) when Unsplash fails`,
    role: 'anonymous',
    async run({ page, goto }) {
      await page.route(UNSPLASH, route => route.abort())
      await goto(c.path)
      await expectH1(page, c.h1)
      // Bring lazy images into view so they attempt (and fail) to load.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      const fallback = page.locator('[role="img"][aria-label]:not(svg):not(img)').first()
      await fallback.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => assert.fail('expected a visible role="img" fallback for the failed Unsplash image'))
      assert.ok(((await fallback.getAttribute('aria-label')) ?? '').trim().length > 0, 'fallback should keep the alt text as its accessible name')
      const broken = await brokenImages(page)
      assert.deepEqual(broken, [], `broken <img> visible: ${broken.join(', ')}`)
      await expectSettled(page)
    },
  },
])

// 4. Global: no spinners / lingering busy states on every in-scope route ---------------------------

const ROLE_PREFERENCE = ['partner-admin', 'anonymous', 'non-partner', 'partner-manager', 'partner-seller', 'partner-technician']

const globalTests = MATRIX.map(route => {
  const role = ROLE_PREFERENCE.find(r => route.access[ROLES.indexOf(r)] === 'ok') ?? 'anonymous'
  const outcome = route.access[ROLES.indexOf(role)]
  const h1 = outcome === 'ok' ? (typeof route.h1 === 'object' ? route.h1[role] : route.h1) : outcome === 'notfound' ? 'Page not found' : 'Access denied'
  return {
    name: `settled  ${role.padEnd(15)} ${route.path} has no Spinner or lingering aria-busy`,
    role,
    async run({ page, goto }) {
      await goto(route.path)
      await expectH1(page, h1)
      // Scroll through the page so lazily loaded images get a chance to load before checking.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForLoadState('networkidle').catch(() => {})
      await page.evaluate(() => window.scrollTo(0, 0))
      await expectSettled(page, 8_000)
    },
  }
})

export const tests = [...routeTests, ...chartTests, ...imageTests, ...globalTests]
