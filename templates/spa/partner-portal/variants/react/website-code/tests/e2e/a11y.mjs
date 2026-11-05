// axe-core WCAG 2.2 AA scan of every in-scope route for the relevant roles at desktop and mobile widths.
import AxeBuilder from '@axe-core/playwright'
import { assert, expectH1, ROLES, VIEWPORTS } from './lib.mjs'
import { MATRIX } from './smoke.mjs'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function scan(page, label) {
  // Let route transitions and message enter animations settle (mid-animation colours can trip contrast checks).
  await page.waitForTimeout(1_000)
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).exclude('[data-tabster-dummy]').analyze()
  if (violations.length) {
    const lines = violations.flatMap(v => [
      `${v.id} (${v.impact}): ${v.help}`,
      ...v.nodes.slice(0, 5).map(n => `    target: ${n.target.join(' ')}`),
      ...(v.nodes.length > 5 ? [`    … ${v.nodes.length - 5} more`] : []),
    ])
    assert.fail(`${violations.length} axe violation(s) on ${label}:\n${lines.join('\n')}`)
  }
}

/** SPA auth pages: scanned for anonymous visitors only. */
const AUTH_PAGES = ['/login', '/registration', '/forgot-password', '/redeem-invitation', '/reset-password', '/external-login-confirmation']

const col = role => ROLES.indexOf(role)
const routesFor = (role, predicate) => MATRIX.filter(r => predicate(r.access[col(role)], r)).map(r => ({ path: r.path, h1: typeof r.h1 === 'object' ? r.h1[role] : r.h1 }))

// Which routes each role is scanned on (pages that render differently per role get extra coverage).
const PLAN = {
  anonymous: routesFor('anonymous', a => a === 'ok').concat([
    { path: '/access-denied/', h1: 'Access denied' },
    { path: '/this-page-does-not-exist/', h1: 'Page not found' },
  ]),
  'partner-admin': routesFor('partner-admin', a => a === 'ok').filter(r => !r.path.startsWith('/partner-program') && !AUTH_PAGES.some(a => r.path.startsWith(a))),
  'partner-manager': [
    { path: '/', h1: 'Welcome back, Jordan' },
    { path: '/opportunities/', h1: 'Opportunities' },
  ],
  'partner-seller': [
    { path: '/', h1: 'Welcome back, Sam' },
    { path: '/opportunities/managed-opportunities/', h1: 'Managed opportunities' },
    { path: '/opportunities/managed-opportunities/opportunity-details-shared/?id=opp-2501', h1: 'Crew scheduling optimisation' },
    { path: '/customers/customer-accounts/edit-customer-account/?id=acc-adventure', h1: 'Adventure Works Cycles' },
    { path: '/profile/manage-access/', h1: 'Access denied' },
  ],
  'non-partner': [
    { path: '/', h1: 'Apply to become a Zava partner' },
    { path: '/profile/', h1: 'Profile' },
    { path: '/profile/register-to-be-a-partner/', h1: 'Register to be a partner' },
  ],
}

const routeTests = Object.entries(PLAN).flatMap(([role, routes]) =>
  routes.flatMap(route =>
    Object.entries(VIEWPORTS).map(([vpName, viewport]) => ({
      name: `${role.padEnd(15)} ${String(viewport.width).padStart(4)}px ${route.path}`,
      role,
      viewport,
      async run({ page, goto }) {
        await goto(route.path)
        await expectH1(page, route.h1)
        await scan(page, `${route.path} (${role}, ${vpName})`)
      },
    })),
  ),
)

const stateTests = Object.entries(VIEWPORTS).flatMap(([vpName, viewport]) => [
  {
    name: `partner-admin   ${String(viewport.width).padStart(4)}px / with every "Show data table" toggled`,
    role: 'partner-admin',
    viewport,
    async run({ page, goto }) {
      await goto('/')
      await expectH1(page, 'Welcome back, Avery')
      const toggles = page.getByRole('button', { name: 'Show data table' })
      const count = await toggles.count()
      assert.ok(count > 0, 'expected at least one "Show data table" toggle on the dashboard')
      for (let i = 0; i < count; i++) {
        await toggles.nth(i).click()
        assert.equal(await toggles.nth(i).getAttribute('aria-pressed'), 'true', 'toggle should be pressed')
      }
      assert.ok((await page.locator('figure table').count()) >= count, 'each toggled chart should render a data table')
      // Clicking lower charts scrolls the page. Scan the settled view, not a target clipped by the sticky header.
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
      await scan(page, `/ data tables (${vpName})`)
    },
  },
  {
    name: `partner-admin   ${String(viewport.width).padStart(4)}px opportunity details with the "Add note" error shown`,
    role: 'partner-admin',
    viewport,
    async run({ page, goto }) {
      await goto('/opportunities/managed-opportunities/opportunity-details/?id=opp-2404')
      await expectH1(page, 'Cloud migration – phase 1')
      const composer = page.getByRole('group', { name: 'Add a note' })
      await composer.getByRole('button', { name: 'Add note' }).click()
      await composer.getByText('Enter a note before adding it.').waitFor()
      await scan(page, `Add note error state (${vpName})`)
    },
  },
  {
    name: `partner-admin   ${String(viewport.width).padStart(4)}px opportunity details with "Close opportunity as won" dialog errors`,
    role: 'partner-admin',
    viewport,
    async run({ page, goto }) {
      await goto('/opportunities/managed-opportunities/opportunity-details/?id=opp-2404')
      await expectH1(page, 'Cloud migration – phase 1')
      await page.getByRole('button', { name: 'Close opportunity' }).click()
      await page.getByRole('menuitem', { name: 'Close as won' }).click()
      const dialog = page.getByRole('dialog', { name: 'Close opportunity as won' })
      await dialog.waitFor()
      await dialog.getByLabel('Actual revenue').fill('')
      await dialog.getByRole('button', { name: 'Close as won' }).click()
      await dialog.getByText("There's a problem").waitFor()
      await scan(page, `Close as won dialog (${vpName})`)
    },
  },
])

export const tests = [...routeTests, ...stateTests]
