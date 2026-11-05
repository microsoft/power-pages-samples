// Regression checks for the Practical UI review fixes (docs/ux-review): encoding, reflow at 390px, one primary
// action per view, inline field errors linked from the error summary, no all-caps text, readable dates, and
// declining a distributed opportunity keeping its description.
import { assert, expectFieldMessage, expectH1, expectText, ROLES, STORAGE_KEYS, VIEWPORTS } from './lib.mjs'
import { MATRIX } from './smoke.mjs'
import AxeBuilder from '@axe-core/playwright'

async function expectAccessible(page) {
  await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"]')].every(el =>
    getComputedStyle(el).opacity === '1' && el.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running')))
  const result = await new AxeBuilder({ page }).exclude('[data-tabster-dummy]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  assert.deepEqual(result.violations.map(v => `${v.id}: ${v.description}\n${v.nodes.map(n => n.failureSummary).join('\n')}`), [])
}

const OPP = '/opportunities/managed-opportunities'
const OPP_DETAILS = `${OPP}/opportunity-details/?id=opp-2404`
const OPP_DETAILS_H1 = 'Cloud migration – phase 1'

const h1For = (route, role) => (typeof route.h1 === 'object' ? route.h1[role] : route.h1)
const okRoutes = role => MATRIX.filter(r => r.access[ROLES.indexOf(role)] === 'ok').map(r => ({ path: r.path, h1: h1For(r, role) }))

// (a) No mojibake ---------------------------------------------------------------------------------

// UTF-8 decoded as Windows-1252: "â€" (start of ’ “ — …), "Â" (before nbsp/©), plus the replacement character.
const MOJIBAKE = ['\u00E2\u20AC', '\u00C2', '\uFFFD']
const ENCODING_ROUTES = [
  { path: '/', h1: { anonymous: 'Grow together with the Zava partner network', 'partner-admin': 'Welcome back, Avery' } },
  { path: '/partner-program/', h1: 'Grow your business with Zava.' },
  { path: '/sitemap/', h1: 'Sitemap' },
]

const encodingTests = ['anonymous', 'partner-admin'].flatMap(role =>
  ENCODING_ROUTES.map(route => ({
    name: `encoding ${role.padEnd(15)} ${route.path} has no mojibake`,
    role,
    async run({ page, goto }) {
      await goto(route.path)
      await expectH1(page, h1For(route, role))
      const text = await page.evaluate(() => document.body.innerText)
      const found = MOJIBAKE.filter(m => text.includes(m)).map(m => {
        const i = text.indexOf(m)
        return `"${m}" near …${text.slice(Math.max(0, i - 30), i + 30).replace(/\s+/g, ' ')}…`
      })
      assert.deepEqual(found, [], `mojibake in body text:\n${found.join('\n')}`)
    },
  })),
)

// (b) No horizontal overflow at 390px ---------------------------------------------------------------

const reflowTests = ['partner-admin', 'partner-technician', 'anonymous'].flatMap(role =>
  okRoutes(role).map(route => ({
    name: `reflow   ${role.padEnd(15)}  390px ${route.path} has no horizontal overflow`,
    role,
    viewport: VIEWPORTS.mobile,
    contextOptions: { hasTouch: true, isMobile: true },
    async run({ page, goto }) {
      await goto(route.path)
      await expectH1(page, route.h1)
      await page.waitForTimeout(300)
      const r = await page.evaluate(() => {
        const vw = window.innerWidth
        const offenders = [...document.body.querySelectorAll('*')]
          .filter(el => {
            const b = el.getBoundingClientRect()
            return b.width > 0 && b.right > vw + 1 && getComputedStyle(el).position !== 'fixed'
          })
          .slice(0, 5)
          .map(el => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}.${[...el.classList].slice(0, 3).join('.')} right=${Math.round(el.getBoundingClientRect().right)}`)
        return { scrollWidth: document.documentElement.scrollWidth, vw, offenders }
      })
      assert.ok(r.scrollWidth <= r.vw + 1, `page is ${r.scrollWidth}px wide in a ${r.vw}px viewport; widest elements:\n${r.offenders.join('\n')}`)
    },
  })),
)

// (c) At most one filled primary button per view ----------------------------------------------------

/** Visible buttons/links in <main> whose background is the brand fill (Fluent appearance="primary"). */
function primaryButtons(page) {
  return page.evaluate(() => {
    const provider = document.querySelector('.fui-FluentProvider') ?? document.body
    const probe = document.createElement('div')
    probe.style.backgroundColor = 'var(--colorBrandBackground)'
    provider.appendChild(probe)
    const brand = getComputedStyle(probe).backgroundColor
    probe.remove()
    const main = document.querySelector('main')
    if (!main) return { brand, labels: [] }
    const labels = [...main.querySelectorAll('button, a, [role="button"]')]
      .filter(el => {
        const b = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.backgroundColor === brand
      })
      .map(el => (el.getAttribute('aria-label') || el.textContent || '').trim())
    return { brand, labels }
  })
}

// `primary` is the one expected filled button (null = none), so the check can't pass vacuously.
const PRIMARY_VIEWS = [
  { name: 'dashboard', path: '/', h1: 'Welcome back, Avery', primary: 'Create opportunity' },
  { name: 'managed list', path: `${OPP}/`, h1: 'Managed opportunities', primary: 'Create opportunity' },
  { name: 'opportunity details', path: OPP_DETAILS, h1: OPP_DETAILS_H1, primary: null },
  { name: 'opportunity details (partner created)', path: `${OPP}/opportunity-details/?id=opp-2406`, h1: 'Analytics dashboards', primary: 'Register deal' },
  { name: 'create opportunity', path: `${OPP}/create-opportunity/`, h1: 'Create opportunity', primary: 'Create opportunity' },
  { name: 'customer accounts', path: '/customers/customer-accounts/', h1: 'Customer accounts', primary: 'Create account' },
  { name: 'edit account', path: '/customers/customer-accounts/edit-customer-account/?id=acc-adventure', h1: 'Adventure Works Cycles', primary: 'Save account' },
]

const primaryTests = PRIMARY_VIEWS.map(view => ({
  name: `primary  partner-admin   ${view.name} (${view.path}) has at most one filled primary button`,
  role: 'partner-admin',
  async run({ page, goto }) {
    await goto(view.path)
    await expectH1(page, view.h1)
    await page.mouse.move(0, 0)
    await page.waitForTimeout(300)
    const { brand, labels } = await primaryButtons(page)
    assert.ok(brand && brand !== 'rgba(0, 0, 0, 0)', 'could not resolve the brand background colour')
    assert.ok(labels.length <= 1, `expected at most 1 primary button in <main>, found ${labels.length}: ${labels.map(l => `"${l}"`).join(', ')}`)
    assert.deepEqual(labels, view.primary ? [view.primary] : [], 'unexpected primary action')
  },
}))

// (d) Inline field errors + summary links that focus the field -----------------------------------------

const FORM_CASES = [
  {
    name: 'create opportunity',
    path: `${OPP}/create-opportunity/`,
    h1: 'Create opportunity',
    submit: 'Create opportunity',
    fields: ['opp-topic', 'opp-customer', 'opp-close'],
  },
  {
    name: 'create customer account',
    path: '/customers/customer-accounts/create-customer-account/',
    h1: 'Create customer account',
    submit: 'Create account',
    fields: ['acc-name'],
  },
  {
    name: 'create customer contact',
    path: '/customers/customer-contacts/create-customer-contact-form/',
    h1: 'Create customer contact',
    submit: 'Create contact',
    fields: ['ct-first', 'ct-last', 'ct-company'],
  },
  {
    name: 'profile',
    path: '/profile/',
    h1: 'Profile',
    submit: 'Save profile',
    clear: ['pf-last'],
    fields: ['pf-last'],
  },
]

const formTests = FORM_CASES.map(c => ({
  name: `errors   partner-admin   ${c.name}: inline message per required field, summary links focus the field`,
  role: 'partner-admin',
  async run({ page, goto }) {
    await goto(c.path)
    await expectH1(page, c.h1)
    for (const id of c.clear ?? []) await page.locator(`[id="${id}"]`).fill('')
    await page.locator('form').getByRole('button', { name: c.submit, exact: true }).click()
    const summary = page.locator('.fui-MessageBar').filter({ hasText: "There's a problem" })
    await summary.waitFor({ state: 'visible' }).catch(() => assert.fail(`expected a "There's a problem" error summary on ${c.path}`))
    for (const id of c.fields) {
      await expectFieldMessage(page, id)
      const message = (await page.locator(`.fui-Field:has([id="${id}"]) .fui-Field__validationMessage`).first().textContent())?.trim()
      assert.ok(message, `empty inline message for #${id}`)
      const link = summary.getByRole('link', { name: message, exact: true })
      assert.equal(await link.count(), 1, `summary should link "${message}" to its field`)
      await link.click()
      await page
        .waitForFunction(id => document.activeElement?.id === id, id, { timeout: 3_000 })
        .catch(async () => assert.fail(`clicking "${message}" should focus #${id}, focused #${await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName)}`))
    }
  },
}))

// (e) No uppercase text-transform ---------------------------------------------------------------------

const CASE_VIEWS = [
  { role: 'partner-admin', path: '/', h1: 'Welcome back, Avery' },
  { role: 'anonymous', path: '/partner-program/partner-program-details/', h1: 'Program details' },
  { role: 'partner-admin', path: OPP_DETAILS, h1: OPP_DETAILS_H1 },
]

const caseTests = CASE_VIEWS.map(v => ({
  name: `case     ${v.role.padEnd(15)} ${v.path} has no all-caps (text-transform: uppercase) text`,
  role: v.role,
  async run({ page, goto }) {
    await goto(v.path)
    await expectH1(page, v.h1)
    const upper = await page.evaluate(() =>
      [...document.querySelectorAll('main *')]
        .filter(el => {
          if (getComputedStyle(el).textTransform !== 'uppercase') return false
          const ownText = [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim())
          const b = el.getBoundingClientRect()
          return ownText && b.width > 1 && b.height > 1
        })
        .slice(0, 5)
        .map(el => `<${el.tagName.toLowerCase()}> "${el.textContent.trim().slice(0, 40)}"`),
    )
    assert.deepEqual(upper, [], `uppercase text in <main>:\n${upper.join('\n')}`)
  },
}))

// (f) Readable dates ----------------------------------------------------------------------------------

const MEDIUM_DATE = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}, \d{4}\b/
const NUMERIC_DATE = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/

const dateTests = [
  {
    name: 'dates    partner-admin   opportunity details shows "Mon D, YYYY" dates',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto(OPP_DETAILS)
      await expectH1(page, OPP_DETAILS_H1)
      const text = await page.getByRole('main').innerText()
      assert.match(text, MEDIUM_DATE, 'expected at least one "Mon D, YYYY" date on the details page')
      assert.doesNotMatch(text, NUMERIC_DATE, 'no MM/DD/YYYY dates expected on the details page')
    },
  },
  {
    name: 'dates    partner-admin   managed list has no MM/DD/YYYY dates (Open and All filters)',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto(`${OPP}/`)
      await expectH1(page, 'Managed opportunities')
      const main = page.getByRole('main')
      for (const filter of ['Open', 'All']) {
        if (filter !== 'Open') {
          await main.getByRole('button', { name: new RegExp(`^${filter} \\(\\d+\\)$`) }).click()
          await page.waitForURL(u => new URL(u).searchParams.get('status') === filter.toLowerCase())
        }
        const text = await main.innerText()
        assert.match(text, MEDIUM_DATE, `expected "Mon D, YYYY" close dates with the ${filter} filter`)
        const numeric = text.match(NUMERIC_DATE)
        assert.equal(numeric, null, `numeric date "${numeric?.[0]}" shown with the ${filter} filter`)
      }
    },
  },
]

// (g) Decline keeps the description -----------------------------------------------------------------------

const declineTests = [
  {
    name: 'decline  partner-admin   declining opp-2402 requires a reason and keeps its description',
    role: 'partner-admin',
    async run({ page, goto }) {
      const topic = 'Retail POS modernization'
      const description = 'Replace legacy point-of-sale in 38 stores with a cloud POS integrated with inventory.'
      const reason = 'No capacity right now'
      const note = 'Try us again next quarter.'
      await goto('/opportunities/distributed-opportunities/')
      await expectH1(page, 'Distributed opportunities')
      await page.getByRole('button', { name: `Decline ${topic}` }).click()
      const dialog = page.getByRole('dialog', { name: 'Decline opportunity' })
      await dialog.waitFor()
      await dialog.getByRole('button', { name: 'Decline opportunity' }).click()
      await expectText(dialog, 'Select a reason for declining')
      await dialog.getByRole('radio', { name: reason }).check()
      await dialog.getByLabel('Note').fill(note)
      await dialog.getByRole('button', { name: 'Decline opportunity' }).click()
      await dialog.waitFor({ state: 'hidden' })
      await expectText(page, `"${topic}" declined and returned to Zava.`)
      await page.getByRole('button', { name: `Decline ${topic}` }).waitFor({ state: 'detached' })

      const stored = await page
        .waitForFunction(
          key => {
            const opp = JSON.parse(localStorage.getItem(key) ?? 'null')?.opportunities?.find(o => o.id === 'opp-2402')
            return opp?.status === 'Declined' ? opp : null
          },
          STORAGE_KEYS.db,
          { timeout: 5_000 },
        )
        .then(h => h.jsonValue())
        .catch(() => assert.fail('opp-2402 should be stored as Declined'))
      assert.equal(stored.description, description, 'decline must not overwrite the description')
      assert.equal(stored.declineReason, `${reason}: ${note}`, 'decline reason (and note) stored separately')
      assert.match(stored.declinedOn ?? '', /^\d{4}-\d{2}-\d{2}/, 'declinedOn should be set')
    },
  },
]

const guardCases = [
  { name: 'create opportunity', path: `${OPP}/create-opportunity/`, field: 'opp-topic' },
  { name: 'opportunity details', path: OPP_DETAILS, field: 'od-topic' },
  { name: 'create account', path: '/customers/customer-accounts/create-customer-account/', field: 'acc-name' },
  { name: 'edit account', path: '/customers/customer-accounts/edit-customer-account/?id=acc-adventure', field: 'acc-name' },
  { name: 'create contact', path: '/customers/customer-contacts/create-customer-contact-form/', field: 'ct-first' },
  { name: 'profile', path: '/profile/', field: 'pf-first' },
  { name: 'parent account', path: '/profile/parent-account/', field: 'pa-name' },
  { name: 'partner contact', path: '/profile/manage-access/edit-partner-contact/?id=c-sam', field: 'epc-first' },
  { name: 'application', path: '/profile/register-to-be-a-partner/', field: 'app-org', role: 'non-partner' },
]
const guardTests = guardCases.map(c => ({
  name: `draft ${c.name}: Keep editing preserves input; Discard permits navigation`,
  role: c.role ?? 'partner-admin',
  async run({ page, goto }) {
    await goto(c.path)
    const input = page.locator(`#${c.field}`)
    await input.fill('Review draft')
    const home = page.getByRole('navigation', { name: 'Primary', exact: true }).getByRole('link', { name: 'Home', exact: true })
    await home.click()
    const dialog = page.getByRole('dialog', { name: 'Discard unsaved changes?' })
    await dialog.waitFor()
    if (c.name === 'create account') await expectAccessible(page)
    await dialog.getByRole('button', { name: 'Keep editing' }).click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal(await input.inputValue(), 'Review draft')
    await home.click()
    await dialog.getByRole('button', { name: 'Discard changes' }).click()
    await page.waitForURL(u => u.pathname === '/')
    await expectH1(page, c.role === 'non-partner' ? 'Apply to become a Zava partner' : 'Welcome back, Avery')
    await page.goBack()
    await input.waitFor()
    assert.notEqual(await input.inputValue(), 'Review draft', 'discard must not persist the draft')
  },
}))

const journeyTests = [
  {
    name: 'draft browser Back/Forward is blocked, cancellation retains history, saved changes persist',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto(`${OPP}/`)
      await page.getByRole('link', { name: OPP_DETAILS_H1, exact: true }).click()
      const input = page.locator('#od-topic')
      await input.fill('Saved review deal')
      await page.getByRole('button', { name: 'Save changes', exact: true }).waitFor()
      await page.goBack()
      const dialog = page.getByRole('dialog', { name: 'Discard unsaved changes?' })
      await dialog.waitFor()
      await dialog.getByRole('button', { name: 'Keep editing' }).click()
      await dialog.waitFor({ state: 'hidden' })
      assert.equal(await input.inputValue(), 'Saved review deal')
      await page.getByRole('button', { name: 'Save changes', exact: true }).click()
      await expectText(page, 'Your changes have been saved.')
      await page.goBack()
      await expectH1(page, 'Managed opportunities')
      await expectText(page.getByRole('main'), 'Saved review deal')
      await page.goForward()
      await input.waitFor()
      assert.equal(await input.inputValue(), 'Saved review deal')
      await page.reload()
      await input.waitFor()
      assert.equal(await input.inputValue(), 'Saved review deal', 'saved change persists after reload')
    },
  },
  ...[
    { path: `${OPP}/create-opportunity/`, field: 'opp-topic', picker: 'opp-customer', submit: 'Create opportunity' },
    { path: '/customers/customer-contacts/create-customer-contact-form/', field: 'ct-first', picker: 'ct-company', submit: 'Create contact' },
  ].map(c => ({
    name: `prerequisite ${c.submit}: create/select account preserves draft and saves relationship`,
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto(c.path)
      await page.locator(`#${c.field}`).fill('Retained draft')
      await page.getByRole('button', { name: 'Create customer account', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: 'Create customer account' })
      await dialog.getByRole('button', { name: 'Create and select account' }).click()
      await expectFieldMessage(dialog, `${c.picker}-new-name`, 'Enter an account name')
      if (c.picker === 'opp-customer') await expectAccessible(page)
      await dialog.getByRole('textbox', { name: 'Account name' }).fill('Review customer')
      await dialog.getByRole('button', { name: 'Create and select account' }).click()
      await dialog.waitFor({ state: 'hidden' })
      const accountId = await page.locator(`#${c.picker}`).inputValue()
      assert.ok(accountId)
      assert.equal(await page.locator(`#${c.field}`).inputValue(), 'Retained draft')
      if (c.picker === 'opp-customer') await page.locator('#opp-close').fill('2027-04-30')
      else await page.locator('#ct-last').fill('Contact')
      await page.locator('form').getByRole('button', { name: c.submit, exact: true }).click()
      await page.waitForURL(u => !!u.searchParams.get('id'))
      const db = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEYS.db)
      const record = c.picker === 'opp-customer'
        ? db.opportunities.find(o => o.topic === 'Retained draft')
        : db.contacts.find(o => o.firstName === 'Retained draft')
      assert.equal(record?.customerId ?? record?.parentAccountId, accountId)
      assert.equal(db.accounts.find(a => a.id === accountId)?.name, 'Review customer')
    },
  })),
  {
    name: 'navigation focuses destination heading; customer filters survive detail and Back',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto('/customers/customer-accounts/')
      await page.getByRole('searchbox').fill('Adventure')
      await page.locator('#accounts-status').selectOption('all')
      await page.getByRole('link', { name: 'Adventure Works Cycles', exact: true }).click()
      await expectH1(page, 'Adventure Works Cycles')
      await page.waitForFunction(() => document.activeElement?.tagName === 'H1')
      await page.goBack()
      await page.getByRole('searchbox').waitFor()
      assert.equal(await page.getByRole('searchbox').inputValue(), 'Adventure')
      assert.equal(await page.locator('#accounts-status').inputValue(), 'all')
      await page.reload()
      await page.getByRole('searchbox').waitFor()
      assert.equal(await page.getByRole('searchbox').inputValue(), 'Adventure')
    },
  },
  {
    name: 'managed filters preserve query, viewport position and search focus',
    role: 'partner-admin',
    viewport: VIEWPORTS.mobile,
    async run({ page, goto }) {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await goto(`${OPP}/?q=Cloud`)
      const search = page.getByRole('searchbox')
      assert.equal(await search.inputValue(), 'Cloud')
      await page.getByRole('button', { name: /^All \(\d+\)$/ }).click()
      assert.equal(new URL(page.url()).searchParams.get('q'), 'Cloud')
      await search.focus()
      await page.evaluate(() => window.scrollTo(0, 180))
      const before = await page.evaluate(() => scrollY)
      await search.press('End')
      await search.press('s')
      await page.waitForTimeout(350)
      assert.equal(await search.inputValue(), 'Clouds')
      assert.equal(await search.evaluate(el => el === document.activeElement), true)
      assert.ok(Math.abs(await page.evaluate(() => scrollY) - before) < 20, 'query update should not jump to top')
    },
  },
  {
    name: 'paging resets for filtered membership and announces zero results',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto('/customers/customer-accounts/')
      await page.evaluate(key => {
        const db = JSON.parse(localStorage.getItem(key))
        const template = db.accounts.find(a => a.id === 'acc-adventure')
        for (let i = 0; i < 30; i++) db.accounts.push({ ...template, id: `review-${i}`, name: `${i < 20 ? 'Review' : 'Other'} ${i}` })
        localStorage.setItem(key, JSON.stringify(db))
      }, STORAGE_KEYS.db)
      await page.reload()
      await page.getByRole('button', { name: 'Next', exact: true }).click()
      await page.getByRole('searchbox').fill('Review')
      await expectText(page.getByRole('status'), '1–10 of 20 records')
      await page.getByRole('searchbox').fill('NoMatchingCustomer')
      await expectText(page.getByRole('status'), '0 records')
    },
  },
]

const touchTests = [320, 390].flatMap(width => [
  { path: '/customers/customer-accounts/', control: '#accounts-search' },
  { path: `${OPP}/create-opportunity/`, control: '#opp-topic' },
  { path: `${OPP}/opportunity-details/?id=opp-2406`, control: '#od-topic' },
  { path: '/profile/', control: '#pf-first' },
].map(c => ({
  name: `touch ${width}px ${c.path}: 48px controls, no overflow`,
  role: 'partner-admin',
  viewport: { width, height: 844 },
  contextOptions: { hasTouch: true, isMobile: true },
  async run({ page, goto }) {
    await goto(c.path)
    await page.locator(c.control).waitFor()
    for (const locator of [page.locator(c.control), page.getByRole('button', { name: 'Open navigation menu' })]) {
      const box = await locator.boundingBox()
      assert.ok(box.height >= 48, `target is only ${box.height}px`)
    }
    const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }))
    assert.ok(size.scroll <= size.width + 1, `overflow: ${JSON.stringify(size)}`)
    if (c.control === '#od-topic') {
      await page.getByRole('button', { name: 'Edit opportunity information' }).click()
      assert.equal(await page.locator(c.control).evaluate(el => el === document.activeElement), true)
      const y = await page.locator(c.control).evaluate(el => el.getBoundingClientRect().y)
      assert.ok(y > 56 && y < 700, `editing field should be clear of sticky header (${y})`)
    }
  },
})))

const emptyHierarchyTests = ['accounts', 'contacts'].map(noun => ({
  name: `empty customer ${noun}: exactly one primary and a useful recovery action`,
  role: 'partner-admin',
  async run({ page, goto }) {
    await goto(`/customers/customer-${noun}/`)
    await page.evaluate(({ key, noun }) => {
      const db = JSON.parse(localStorage.getItem(key))
      if (noun === 'accounts') db.accounts = db.accounts.filter(a => a.classification !== 'Customer')
      else db.contacts = db.contacts.filter(c => !db.accounts.some(a => a.id === c.parentAccountId && a.classification === 'Customer'))
      localStorage.setItem(key, JSON.stringify(db))
    }, { key: STORAGE_KEYS.db, noun })
    await page.reload()
    await expectText(page, `No customer ${noun} yet`)
    const { labels } = await primaryButtons(page)
    assert.deepEqual(labels, [noun === 'accounts' ? 'Create account' : 'Create contact'])
    assert.equal(await page.getByRole('main').getByRole('link', { name: labels[0], exact: true }).count(), 2, 'retain a secondary empty-state recovery action')
  },
}))

const attentionTests = [{
  name: 'dashboard attention presents the nearest deadline first',
  role: 'partner-admin',
  async run({ page, goto }) {
    await page.clock.setFixedTime(new Date('2026-10-19T12:00:00Z'))
    await goto('/')
    const rows = page.getByRole('region', { name: /Needs your attention/ }).getByRole('listitem')
    await rows.first().waitFor()
    const items = await rows.allInnerTexts()
    const deadlines = items.map(text => text.match(MEDIUM_DATE)?.[0]).filter(Boolean).map(text => Date.parse(text))
    assert.ok(deadlines.length >= 2, 'requires multiple deadline-driven attention items')
    assert.deepEqual(deadlines, [...deadlines].sort((a, b) => a - b))
  },
}]

const toolbarTests = [1440, 1024, 768, 390, 320].map(width => ({
  name: `managed toolbar ${width}px: controls align independently of search hint`,
  role: 'partner-admin',
  viewport: { width, height: 900 },
  contextOptions: { hasTouch: width < 640, isMobile: width < 640 },
  async run({ page, goto }) {
    await goto(`${OPP}/`)
    await expectH1(page, 'Managed opportunities')
    const measure = () => page.evaluate(() => {
      const search = document.querySelector('#opp-search')
      const field = search.closest('.fui-Field')
      const status = document.querySelector('[aria-labelledby="opp-status-label"]')
      const exportButton = [...document.querySelectorAll('main button')].find(el => el.textContent.trim() === 'Export to CSV')
      return {
        input: search.closest('.fui-SearchBox').getBoundingClientRect().toJSON(),
        searchLabel: field.querySelector('label').getBoundingClientRect().toJSON(),
        hint: field.querySelector('.fui-Field__hint').getBoundingClientRect().toJSON(),
        statusLabel: document.querySelector('#opp-status-label').getBoundingClientRect().toJSON(),
        filters: [...status.querySelectorAll('button')].map(el => el.getBoundingClientRect().toJSON()),
        status: status.getBoundingClientRect().toJSON(),
        exportButton: exportButton.getBoundingClientRect().toJSON(),
        viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      }
    })
    const assertGeometry = r => {
      assert.ok(r.scrollWidth <= r.viewport + 1, 'toolbar must not cause horizontal overflow')
      assert.ok(r.hint.top >= r.input.bottom, 'hint must remain below the search input')
      if (width >= 1024) {
        for (const box of [...r.filters, r.exportButton]) {
          assert.ok(Math.abs(box.top - r.input.top) <= 2, `control top differs from search: ${JSON.stringify(r)}`)
          assert.ok(Math.abs(box.bottom - r.input.bottom) <= 2, 'control bottoms must align')
        }
        assert.ok(Math.abs(r.searchLabel.top - r.statusLabel.top) <= 2, 'labels must align')
      } else {
        assert.ok(r.status.top >= r.hint.bottom, 'stack status after complete search field')
        assert.ok(r.exportButton.top >= r.status.bottom, 'stack export after filters without overlap')
      }
    }
    assertGeometry(await measure())
    // Helper text can wrap with zoom, translation or a narrower field; it must not move sibling controls.
    await page.locator('.fui-Field:has(#opp-search) .fui-Field__hint').evaluate(el => {
      el.style.maxWidth = '160px'
    })
    assertGeometry(await measure())
    await page.getByRole('searchbox', { name: 'Search by topic' }).fill('Cloud*')
    await page.getByRole('button', { name: /^All \(\d+\)$/ }).click()
    assert.equal(new URL(page.url()).searchParams.get('q'), 'Cloud*')
    assert.equal(new URL(page.url()).searchParams.get('status'), 'all')
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export to CSV', exact: true }).click()
    assert.equal((await download).suggestedFilename(), 'Managed opportunities.csv')
  },
}))

const homeAlignmentTests = ['partner-admin', 'partner-manager', 'partner-seller'].flatMap(role => [1440, 1024, 390, 320].map(width => ({
  name: `home alignment ${role} ${width}px: glance card, work row and chart headers`,
  role,
  viewport: { width, height: 900 },
  contextOptions: { hasTouch: width < 640, isMobile: width < 640 },
  async run({ page, goto }) {
    await goto('/')
    await page.locator('figure svg').first().waitFor()
    const r = await page.evaluate(() => {
      const box = el => el?.getBoundingClientRect().toJSON()
      const glance = [...document.querySelectorAll('main section')].find(el => el.querySelector('h2')?.textContent === 'Pipeline at a glance')
      const attention = document.querySelector('[aria-labelledby="attention-heading"] .fui-Card')
      const work = document.querySelector('[aria-label="Opportunity work lists"] .fui-Card')
      return {
        viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        glance: box(glance), segments: [...glance.querySelectorAll('[role="img"] span')].map(el => ({ box: box(el), overflow: el.scrollWidth > el.clientWidth + 1 })),
        figures: [...glance.querySelectorAll('[aria-label="Pipeline summary"] li')].map(box),
        attention: box(attention), work: box(work),
        attentionLinks: [...attention.querySelectorAll('li a')].map(el => ({ link: box(el), row: box(el.closest('li')) })),
        crampedTables: work.querySelectorAll('[role="tabpanel"] table').length,
        charts: [...document.querySelectorAll('main figure')].map(el => {
          const card = el.closest('.fui-Card')
          const heading = card.querySelector('h2')
          const toggle = card.querySelector('button')
          const range = document.createRange()
          range.selectNodeContents(toggle)
          return { box: box(card), heading: box(heading), toggle: box(toggle), lines: range.getClientRects().length }
        }),
      }
    })
    assert.ok(r.scrollWidth <= r.viewport + 1, 'home must not overflow horizontally')
    assert.ok(r.segments.every(s => !s.overflow), 'in-bar values must fit their segment (no clipped labels)')
    for (const f of r.figures) assert.ok(f.right <= r.glance.right + 1, 'summary figures must stay inside the glance card')
    if (width >= 1024) {
      assert.ok(Math.abs(r.attention.top - r.work.top) <= 2, 'attention and work list cards must share a top edge')
      assert.ok(r.attention.right < r.work.left, 'attention sits beside the work list on wide screens')
      assert.ok(Math.abs(r.charts[0].box.bottom - r.charts[1].box.bottom) <= 2, 'paired chart cards must align')
    } else {
      assert.ok(r.work.top >= r.attention.bottom, 'work list stacks below attention on narrow screens')
    }
    if (width < 1280) assert.equal(r.crampedTables, 0, 'use stacked opportunities before the work-list table becomes cramped')
    for (const a of r.attentionLinks) assert.ok(a.link.right <= a.row.right && a.link.left >= a.row.left, 'attention actions must stay inside their row')
    for (const chart of r.charts) {
      if (width < 640) assert.ok(Math.abs(chart.heading.left - chart.toggle.left) <= 2 && chart.toggle.top >= chart.heading.bottom, 'mobile chart action should sit below its title, left-aligned')
      assert.ok(chart.toggle.right <= chart.box.right && chart.lines <= 2, 'chart action text must fit without a multiline label')
    }
    const toggle = page.getByRole('button', { name: 'Show data table', exact: true }).first()
    await toggle.click()
    assert.equal(await toggle.getAttribute('aria-pressed'), 'true')
    await page.getByRole('table', { name: 'Revenue by close month', exact: true }).waitFor()
    const primary = page.getByRole('main').getByRole('link', { name: 'Create opportunity', exact: true })
    await primary.click()
    await expectH1(page, 'Create opportunity')
  },
})))

const glanceTests = [{
  name: 'dashboard glance: close-date filter, revenue/count toggle and status links',
  role: 'partner-admin',
  async run({ page, goto }) {
    await page.clock.setFixedTime(new Date('2026-10-19T12:00:00Z'))
    await goto('/')
    const glance = page.getByRole('region', { name: 'Pipeline at a glance' })
    const bar = glance.getByRole('img', { name: /^Opportunities by/ })
    await bar.waitFor()
    assert.match(await bar.getAttribute('aria-label'), /^Opportunities by estimated revenue\. Open \$[\d.]+K: .*\. Closed \$/)
    const legend = glance.getByRole('table', { name: 'Opportunities by status' })
    const total = Number((await legend.getByRole('row').last().allInnerTexts())[0].split(/\s+/).at(-2))

    const count = glance.getByRole('button', { name: 'Count', exact: true })
    await count.click()
    assert.equal(await count.getAttribute('aria-pressed'), 'true')
    assert.match(await bar.getAttribute('aria-label'), /^Opportunities by count\./)
    await glance.getByText(`${total} opportunities`, { exact: true }).first().waitFor()

    // Next 90 days leaves only open opportunities (closed ones closed in the past), so the Closed group disappears.
    await glance.getByLabel('Close date').selectOption({ label: 'Next 90 days' })
    await glance.getByText('Opportunities closing in the next 90 days', { exact: true }).waitFor()
    assert.doesNotMatch(await bar.getAttribute('aria-label'), /Closed/)
    assert.equal(await legend.getByRole('cell', { name: 'Closed', exact: true }).count(), 0)
    await page.getByText('Opportunities closing in the next 90 days', { exact: true }).nth(1).waitFor()

    await legend.getByRole('link', { name: 'Accepted', exact: true }).click()
    await expectH1(page, 'Managed opportunities')
  },
}]

const landingAlignmentTests = [1440, 768, 390, 320].map(width => ({
  name: `public home ${width}px: metric values align when labels wrap`,
  role: 'anonymous',
  viewport: { width, height: 900 },
  contextOptions: { hasTouch: width < 640, isMobile: width < 640 },
  async run({ page, goto }) {
    await goto('/')
    await expectH1(page, 'Grow together with the Zava partner network')
    const metrics = await page.locator('main dl').first().locator('dd').evaluateAll(els => els.map(el => el.getBoundingClientRect().toJSON()))
    assert.equal(metrics.length, 4)
    const count = width >= 768 ? 4 : 2
    for (let i = 0; i < metrics.length; i += count) {
      for (const metric of metrics.slice(i, i + count)) assert.ok(Math.abs(metric.top - metrics[i].top) <= 2, 'metric values must share a row baseline independent of label height')
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    await page.getByRole('main').getByRole('link', { name: 'Partner sign in', exact: true }).first().click()
    await expectH1(page, 'Sign in')
  },
}))

export const tests = [...encodingTests, ...reflowTests, ...primaryTests, ...formTests, ...caseTests, ...dateTests, ...declineTests, ...guardTests, ...journeyTests, ...touchTests, ...emptyHierarchyTests, ...attentionTests, ...glanceTests, ...toolbarTests, ...homeAlignmentTests, ...landingAlignmentTests]
