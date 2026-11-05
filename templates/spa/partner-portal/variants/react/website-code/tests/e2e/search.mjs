// Global search (top app bar) and Partner assistant: focus → suggestions, live inline actions/results, Enter → all results,
// role scoping, recent items, keyboard navigation, the full-screen assistant chat, mobile, and axe on each surface.
import AxeBuilder from '@axe-core/playwright'
import { assert, expectH1, VIEWPORTS, waitForUrl } from './lib.mjs'
import { CONTACT_ID, PARTNER_ID, opportunity, runSearch } from '../server/search-harness.mjs'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const box = page => page.locator('input[role="combobox"]')
const listbox = page => page.locator('#gs-listbox')
const options = page => listbox(page).getByRole('option')
const optionTitles = async page => (await options(page).allInnerTexts()).map(t => t.split('\n')[0].trim())
const groupLabels = page => listbox(page).locator('[id^="gs-g-"]').allInnerTexts()
const expanded = (page, value) =>
  page.waitForFunction(v => document.querySelector('input[role="combobox"]')?.getAttribute('aria-expanded') === v, String(value), { timeout: 5000 })

async function scan(page, label) {
  await page.waitForTimeout(250)
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).exclude('[data-tabster-dummy]').analyze()
  if (violations.length) {
    const lines = violations.flatMap(v => [`${v.id} (${v.impact}): ${v.help}`, ...v.nodes.slice(0, 5).map(n => `    target: ${n.target.join(' ')}`)])
    assert.fail(`${violations.length} axe violation(s) on ${label}:\n${lines.join('\n')}`)
  }
}

/** Waits for enter/exit motion (finite animations only; skeleton shimmer loops forever) before measuring geometry. */
async function settleMotion(page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter(a => Number.isFinite(a.effect?.getComputedTiming().endTime))
        .map(a => a.finished.catch(() => undefined)),
    ),
  )
}

async function typeAndSettle(page, text) {
  await box(page).fill(text)
  await page.waitForFunction(() => !document.querySelector('#gs-listbox[aria-busy="true"]'), null, { timeout: 5000 })
}

async function home(page, goto) {
  await goto('/')
  await page.locator('main h1').first().waitFor()
}

async function liveSearch(page, goto, handleSearch) {
  await page.addInitScript(
    ({ contactId }) => {
      window.Microsoft = { Dynamic365: { Portal: { User: { contactId, userName: 'search-test', userRoles: ['Partner Admin'] } } } }
      window.searchAborts = []
      const originalFetch = window.fetch
      window.fetch = (input, init) => {
        if (String(input).includes('/_api/serverlogics/global-search') && init?.signal)
          init.signal.addEventListener('abort', () => window.searchAborts.push(String(input)), { once: true })
        return originalFetch(input, init)
      }
    },
    { contactId: CONTACT_ID },
  )
  await page.route('**/_api/serverlogics/contact-directory?*', route =>
    route.fulfill({
      json: {
        Success: true,
        Data: JSON.stringify({
          status: 'success',
          me: { contactid: CONTACT_ID, firstname: 'Search', lastname: 'Tester', _parentcustomerid_value: PARTNER_ID },
          account: { accountid: PARTNER_ID, name: 'Test partner', accountclassificationcode: 100000000 },
        }),
      },
    }),
  )
  await page.route('**/_api/serverlogics/global-search?*', handleSearch)
  await page.route('**/_api/serverlogics/partner-dashboard?*', route => searchResponse(route, { status: 'success', opportunities: [], registrations: [] }))
  await goto('/partner-program/')
  if (page.viewportSize().width < 768) await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByRole('combobox', { name: 'Search records, actions and pages' }).waitFor()
}

const searchResponse = (route, result, lowercase = false) =>
  route.fulfill({
    json: lowercase ? { success: true, data: JSON.stringify(result) } : { Success: true, Data: JSON.stringify(result) },
  })

export const tests = [
  {
    name: 'search   partner-admin   four-word literal titles stay in text search on Enter',
    role: 'partner-admin',
    async run({ page, goto }) {
      await home(page, goto)
      await typeAndSettle(page, 'Dynamics 365 Sales rollout')
      assert.ok((await optionTitles(page)).includes('Dynamics 365 Sales rollout'))
      await box(page).press('Enter')
      await page.getByRole('heading', { name: 'Showing 1 result for “Dynamics 365 Sales rollout”', exact: true }).waitFor()
      assert.equal(await page.getByRole('dialog', { name: 'Partner assistant' }).count(), 0)
    },
  },
  {
    name: 'search   live   failures preserve local matches, survive Enter, and recover through keyboard Retry',
    role: 'partner-admin',
    async run({ page, goto }) {
      let failing = true
      await liveSearch(page, goto, route =>
        searchResponse(route, failing ? { status: 'error', message: 'Simulated backend failure' } : { status: 'success', hits: [] }),
      )
      await typeAndSettle(page, 'partner')
      const notice = page.getByText('Record search is unavailable. Pages and help are still searchable. Try again.', { exact: true })
      await notice.waitFor()
      assert.ok((await groupLabels(page)).includes('Pages & help'))
      await box(page).press('Enter')
      await page.getByRole('heading', { name: 'Partial results for “partner”', exact: true }).waitFor()
      assert.ok(await notice.isVisible())
      await scan(page, 'partial search results')
      failing = false
      // ArrowUp from the unselected input reaches the final option (Retry).
      await box(page).press('ArrowUp')
      assert.match(await page.locator(`#${await box(page).getAttribute('aria-activedescendant')}`).innerText(), /Retry search/)
      await box(page).press('Enter')
      await notice.waitFor({ state: 'hidden' })
      await page.getByRole('heading', { name: /^Showing \d+ results for “partner”/ }).waitFor()
      failing = true
      await typeAndSettle(page, 'zzunfindable')
      await box(page).press('Enter')
      await page.getByRole('heading', { name: 'Search unavailable for “zzunfindable”', exact: true }).waitFor()
      await scan(page, 'failed search results')
      failing = false
      await options(page).filter({ hasText: 'Retry search' }).click()
      await page.getByRole('heading', { name: 'Showing 0 results for “zzunfindable”', exact: true }).waitFor()
    },
  },
  {
    name: 'search   live   actual server contract preserves description-tail and cross-field matches with partial enrichment',
    role: 'partner-admin',
    async run({ page, goto }) {
      let failRegistration = true
      await liveSearch(page, goto, route => {
        const q = new URL(route.request().url()).searchParams.get('q')
        return searchResponse(
          route,
          runSearch({
            q,
            types: 'opp',
            fail: failRegistration ? { set: 'adx_dealregistrationrequests', status: 403 } : undefined,
          }).result,
          true,
        )
      })
      await typeAndSettle(page, 'needle')
      assert.ok((await optionTitles(page)).includes(opportunity.name))
      await page.getByText('Registration details are unavailable; some opportunity matches may be missing. Try again.', { exact: true }).waitFor()
      await box(page).press('Enter')
      await page.getByRole('heading', { name: 'Partial results for “needle”', exact: true }).waitFor()
      failRegistration = false
      await options(page).filter({ hasText: 'Retry search' }).click()
      await page.getByRole('heading', { name: 'Showing 1 result for “needle”', exact: true }).waitFor()
      for (const q of ['rollout Sales', 'rollout Woodgrove', 'Avery Chen']) {
        await typeAndSettle(page, q)
        assert.ok((await optionTitles(page)).includes(opportunity.name), q)
      }
    },
  },
  {
    name: 'search   live   superseded and closed searches abort without stale results or errors',
    role: 'partner-admin',
    async run({ page, goto }) {
      const held = []
      await liveSearch(page, goto, async route => {
        const q = new URL(route.request().url()).searchParams.get('q')
        if (q === 'stale' || q === 'closing') await new Promise(resolve => held.push(resolve))
        return searchResponse(route, runSearch({ q, types: 'opp' }).result)
      })
      const staleRequest = page.waitForRequest('**/global-search?q=stale&*')
      await box(page).fill('stale')
      await staleRequest
      await typeAndSettle(page, 'needle')
      await page.waitForFunction(() => window.searchAborts.some(url => url.includes('q=stale')))
      held.shift()()
      assert.ok((await optionTitles(page)).includes(opportunity.name))
      const closingRequest = page.waitForRequest('**/global-search?q=closing&*')
      await box(page).fill('closing')
      await closingRequest
      await box(page).press('Escape')
      await page.waitForFunction(() => window.searchAborts.some(url => url.includes('q=closing')))
      held.shift()()
      await page.keyboard.press('Control+k')
      assert.deepEqual(await groupLabels(page), ['Partner assistant', 'Popular pages', 'Quick actions'])
    },
  },
  {
    name: 'search   live   malformed responses remain errors; previous endpoint items are supported',
    role: 'partner-admin',
    async run({ page, goto }) {
      let result = { status: 'success' }
      await liveSearch(page, goto, route => searchResponse(route, result))
      await typeAndSettle(page, 'needle')
      await box(page).press('Enter')
      await page.getByRole('heading', { name: 'Search unavailable for “needle”', exact: true }).waitFor()
      result = { status: 'success', hits: [{ item: { type: 'unknown', id: 'bad', title: 'Bad record', fields: {} }, score: 50 }] }
      await options(page).filter({ hasText: 'Retry search' }).click()
      await page.getByRole('heading', { name: 'Search unavailable for “needle”', exact: true }).waitFor()
      result = { status: 'success', items: [{ type: 'opp', id: 'old', title: 'Needle legacy endpoint', fields: {} }] }
      await options(page).filter({ hasText: 'Retry search' }).click()
      await page.getByRole('heading', { name: 'Showing 1 result for “needle”', exact: true }).waitFor()
      assert.ok((await optionTitles(page)).includes('Needle legacy endpoint'))
    },
  },
  {
    name: 'search   live   incomplete-coverage notice and Retry fit narrow LTR and RTL surfaces',
    role: 'partner-admin',
    viewport: { width: 320, height: 640 },
    async run({ page, goto }) {
      const message = 'Search coverage is limited to the first 500 accessible records per category. More records may be available on the list pages. '.repeat(2)
      await liveSearch(page, goto, route => searchResponse(route, { status: 'partial', hits: [], message }))
      for (const dir of ['ltr', 'rtl']) {
        await page.evaluate(dir => {
          document.documentElement.dir = dir
        }, dir)
        await typeAndSettle(page, dir === 'ltr' ? 'needle' : 'rollout')
        await box(page).press('Enter')
        const notice = page.locator('section[aria-label="Search"]').getByText(message.trim(), { exact: true })
        await notice.waitFor()
        const bounds = await notice.boundingBox()
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 321, `${dir} notice fits the viewport`)
        await box(page).press('ArrowUp')
        const retry = page.locator(`#${await box(page).getAttribute('aria-activedescendant')}`)
        await retry.scrollIntoViewIfNeeded()
        const retryBounds = await retry.boundingBox()
        assert.ok(retryBounds.y >= 0 && retryBounds.y + retryBounds.height <= 641, `${dir} Retry remains reachable`)
        await scan(page, `${dir} narrow partial results`)
      }
    },
  },
  {
    name: 'search   partner-admin   switching persona clears the assistant draft and conversation',
    role: 'partner-admin',
    async run({ page, goto }) {
      await home(page, goto)
      await page.getByRole('button', { name: 'Open Partner assistant', exact: true }).click()
      const composer = page.getByRole('textbox', { name: 'Message Partner assistant' })
      await composer.fill('A draft belonging to the current contact')
      await page.getByRole('button', { name: 'Close assistant', exact: true }).click()
      await page.getByLabel('Viewing as').selectOption('partner-seller')
      await page.getByRole('button', { name: 'Open Partner assistant', exact: true }).click()
      assert.equal(await composer.inputValue(), '')
      assert.equal(await page.getByRole('log', { name: 'Conversation' }).count(), 0)
    },
  },
  {
    name: 'search   partner-admin   focus expands the bar into the search surface with prompts, recent/popular and quick actions',
    role: 'partner-admin',
    async run({ page, goto }) {
      await home(page, goto)
      await box(page).click()
      assert.equal(await box(page).getAttribute('aria-expanded'), 'true')
      assert.equal(await page.getByRole('navigation', { name: 'Primary' }).isVisible(), false, 'primary nav steps aside while searching')
      assert.deepEqual(await groupLabels(page), ['Partner assistant', 'Popular pages', 'Quick actions'])
      const titles = await optionTitles(page)
      for (const t of ['Which deals need my attention this week?', 'Create opportunity', 'Review distributed opportunities', 'Invite partner contact'])
        assert.ok(titles.includes(t), `expected "${t}" in ${titles}`)
      await scan(page, 'focused search')
      await page.keyboard.press('Escape')
      await expanded(page, false)
      assert.ok(await page.getByRole('navigation', { name: 'Primary' }).isVisible(), 'nav returns after Esc')
    },
  },
  {
    name: 'search   partner-admin   typing shows skeleton then Ask, Actions and grouped records inline; Enter shows all results',
    role: 'partner-admin',
    async run({ page, goto }) {
      await home(page, goto)
      await box(page).click()
      await box(page).pressSequentially('wood')
      assert.ok(await page.locator('#gs-listbox[aria-busy="true"]').count(), 'loading state while the debounced search runs')
      await page.waitForFunction(() => !document.querySelector('#gs-listbox[aria-busy="true"]'))
      const titles = await optionTitles(page)
      assert.equal(titles[0], 'Ask Partner assistant: “wood”')
      for (const t of ['Create opportunity for Woodgrove Bank', 'Extend registration · Contact center AI', 'Woodgrove Bank', 'Contact center AI'])
        assert.ok(titles.includes(t), `expected "${t}" in ${titles}`)
      assert.deepEqual(await groupLabels(page), ['Actions', 'Customer accounts', 'Opportunities', 'Customer contacts'])
      await scan(page, 'inline results')
      await page.keyboard.press('Enter')
      await page.getByRole('heading', { level: 2, name: /^Showing 3 results for “wood”/ }).waitFor()
      await page.getByRole('button', { name: /^Opportunities/ }).click()
      assert.deepEqual(await groupLabels(page), ['Opportunities'])
      await scan(page, 'results view')
    },
  },
  {
    name: 'search   partner-admin   arrow keys pick a record; Enter opens it, records a recent item and closes search',
    role: 'partner-admin',
    async run({ page, goto }) {
      await home(page, goto)
      await box(page).click()
      await typeAndSettle(page, 'litware')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      const active = await box(page).getAttribute('aria-activedescendant')
      assert.ok(active, 'aria-activedescendant follows the highlighted option')
      assert.match(await page.locator(`#${active}`).innerText(), /Create opportunity for Litware/)
      for (let i = 0; i < 8 && !/^Litware Inc\./.test(await page.locator(`#${await box(page).getAttribute('aria-activedescendant')}`).innerText()); i++)
        await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')
      await waitForUrl(page, u => u.pathname.includes('/customers/customer-accounts/edit-customer-account/'), 'account page')
      await expectH1(page, 'Litware Inc.')
      assert.equal(await box(page).getAttribute('aria-expanded'), 'false')
      await box(page).click()
      assert.deepEqual(await groupLabels(page), ['Partner assistant', 'Recent', 'Quick actions'])
      assert.ok((await optionTitles(page)).includes('Litware Inc.'))
    },
  },
  {
    name: 'search   partner-admin   "Create opportunity for <account>" prefills the customer',
    role: 'partner-admin',
    async run({ page, goto }) {
      await home(page, goto)
      await box(page).click()
      await typeAndSettle(page, 'litware')
      await options(page).filter({ hasText: 'Create opportunity for Litware Inc.' }).click()
      await expectH1(page, 'Create opportunity')
      const select = page.getByLabel(/Potential customer/).first()
      assert.equal(await select.inputValue(), 'acc-litware')
      assert.match(await select.locator('option:checked').innerText(), /Litware/)
    },
  },
  {
    name: 'search   partner-seller  results stay within Seller access (no distributed leads, no partner contacts)',
    role: 'partner-seller',
    async run({ page, goto }) {
      await home(page, goto)
      await box(page).click()
      await typeAndSettle(page, 'retail')
      assert.ok(!(await optionTitles(page)).includes('Retail POS modernization'), 'distributed opportunity hidden from Sellers')
      await typeAndSettle(page, 'jordan')
      assert.ok(!(await groupLabels(page)).includes('Partner contacts'), 'partner contacts are Admin-only')
      await typeAndSettle(page, 'create')
      const titles = await optionTitles(page)
      assert.ok(titles.includes('Create opportunity'))
      assert.ok(!titles.includes('Create customer account'), 'Sellers cannot create customer accounts')
    },
  },
  {
    name: 'search   anonymous       visitors search program pages and FAQs only',
    role: 'anonymous',
    async run({ page, goto }) {
      await home(page, goto)
      await box(page).click()
      assert.deepEqual(await groupLabels(page), ['Partner assistant', 'Popular pages', 'Quick actions'])
      assert.ok((await optionTitles(page)).includes('Sign in'))
      await typeAndSettle(page, 'tier')
      const labels = await groupLabels(page)
      assert.deepEqual(labels, ['Pages & help'])
      assert.ok((await optionTitles(page)).includes('How are tiers determined?'))
    },
  },
  {
    name: 'search   partner-admin   question + Enter opens the full-screen assistant with a cited answer; Esc returns to search',
    role: 'partner-admin',
    async run({ page, goto }) {
      await home(page, goto)
      await box(page).click()
      await box(page).fill('which deals need my attention?')
      await page.keyboard.press('Enter')
      const dialog = page.getByRole('dialog', { name: 'Partner assistant' })
      await dialog.getByRole('log').getByText('4 items need your attention').waitFor()
      await page.waitForTimeout(500) // Fluent dialog open animation
      const box2 = await dialog.boundingBox()
      const vp = page.viewportSize()
      assert.ok(box2 && box2.width >= vp.width - 1 && box2.height >= vp.height - 1, 'chat fills the screen')
      await dialog.getByRole('log').getByText('4 items need your attention').waitFor()
      const composer = await dialog.getByLabel('Message Partner assistant').boundingBox()
      assert.ok(composer && composer.y > vp.height - 160, 'composer is pinned to the bottom')
      assert.equal(await dialog.getByRole('group', { name: 'Sources' }).getByRole('button').count(), 4)
      await scan(page, 'assistant answer')
      await dialog.getByLabel('Message Partner assistant').fill('Summarize Woodgrove Bank')
      await page.keyboard.press('Enter')
      await dialog.getByText(/is a customer account in Toronto/).waitFor()
      await page.keyboard.press('Escape')
      await dialog.waitFor({ state: 'hidden' })
      assert.equal(await box(page).getAttribute('aria-expanded'), 'true', 'Esc in the chat steps back to search')
      assert.equal(await box(page).inputValue(), 'which deals need my attention?')
    },
  },
  {
    name: 'search   partner-admin   assistant ✦ button opens a greeting; a source opens its record and docks the chat into the floating window',
    role: 'partner-admin',
    async run({ page, goto }) {
      await home(page, goto)
      await page.getByRole('button', { name: 'Ask Partner assistant' }).click()
      const dialog = page.getByRole('dialog', { name: 'Partner assistant' })
      await dialog.getByText('Hi Avery, how can I help?').waitFor()
      await scan(page, 'assistant greeting')
      await dialog.getByRole('button', { name: /Show my open pipeline by customer/ }).click()
      await dialog.getByText(/Your open pipeline is/).waitFor()
      await dialog.getByRole('group', { name: 'Sources' }).getByRole('button').first().click()
      await page.locator('main h1').first().waitFor()
      assert.match(new URL(page.url()).pathname, /opportunity-details/)
      const panel = page.locator('section[role="dialog"][aria-modal="false"]')
      await panel.waitFor()
      assert.ok(await panel.getByText(/Your open pipeline is/).isVisible(), 'conversation kept in the floating window')
      const vp = page.viewportSize()
      const pb = await panel.boundingBox()
      assert.ok(pb.width < vp.width / 2 && pb.x + pb.width > vp.width - 60, 'floating window is docked bottom-end')
      await page.locator('main h1').first().click()
      assert.ok(await panel.isVisible(), 'the page stays usable without closing the window')
      await scan(page, 'floating chat window')
    },
  },
  {
    name: 'search   anonymous       assistant answers program questions from the FAQs',
    role: 'anonymous',
    async run({ page, goto }) {
      await home(page, goto)
      await page.getByRole('button', { name: 'Ask Partner assistant' }).click()
      const dialog = page.getByRole('dialog', { name: 'Partner assistant' })
      await dialog.getByRole('button', { name: /How do I become a partner\?/ }).click()
      await dialog.getByText(/complete Register to be a partner/).waitFor()
      assert.equal(await dialog.getByRole('group', { name: 'Sources' }).getByRole('button').count(), 1)
    },
  },
  {
    name: 'search   partner-admin   Ctrl+K and / open search; mobile uses a search icon and a full-width surface',
    role: 'partner-admin',
    viewport: VIEWPORTS.mobile,
    async run({ page, goto }) {
      await home(page, goto)
      assert.equal(await box(page).isVisible(), false, 'mobile shows an icon, not the bar')
      await page.getByRole('button', { name: 'Search', exact: true }).click()
      await box(page).waitFor({ state: 'visible' })
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('role')), 'combobox')
      await typeAndSettle(page, 'wood')
      const width = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      assert.ok(width <= 0, 'no horizontal overflow')
      await scan(page, 'mobile search')
      await page.keyboard.press('Escape')
      await expanded(page, false)
      await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Search', null, { timeout: 5000 })
      await page.keyboard.press('Control+k')
      await expanded(page, true)
      await page.keyboard.press('Escape')
      await expanded(page, false)
      await page.locator('main h1').first().click()
      await page.keyboard.press('/')
      await expanded(page, true)
    },
  },
  {
    name: 'search   partner-admin   full screen → chat window → floating button → window → full screen keeps the conversation',
    role: 'partner-admin',
    async run({ page, goto }) {
      await home(page, goto)
      await box(page).click()
      await box(page).fill('which deals need my attention?')
      await page.keyboard.press('Enter')
      const full = page.getByRole('dialog', { name: 'Partner assistant' })
      await full.getByText('4 items need your attention').waitFor()
      await page.getByRole('button', { name: 'Restore to chat window' }).click()
      const panel = page.locator('section[role="dialog"][aria-modal="false"]')
      await panel.waitFor()
      assert.ok(await panel.getByText('4 items need your attention').isVisible())
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'assistant-input', 'focus moves to the composer')
      await panel.getByLabel('Message Partner assistant').fill('Which opportunities close next?')
      await page.keyboard.press('Enter')
      await panel.getByText(/Your next 3 open opportunities/).waitFor()
      await page.getByRole('button', { name: 'Close assistant' }).click()
      await panel.waitFor({ state: 'hidden' })
      const fab = page.getByRole('button', { name: /^Open Partner assistant/ })
      await fab.waitFor()
      assert.ok(await fab.evaluate(el => el === document.activeElement), 'focus moves to the floating button')
      await scan(page, 'floating chat button')
      await fab.click()
      await panel.getByText(/Your next 3 open opportunities/).waitFor()
      await page.keyboard.press('Escape')
      await fab.waitFor()
      await fab.click()
      await page.getByRole('button', { name: 'Expand to full screen' }).click()
      await full.getByText('4 items need your attention').waitFor()
      await page.getByRole('button', { name: 'Close assistant' }).click()
      await fab.waitFor()
      assert.equal(await page.locator('section[role="dialog"][aria-modal="false"]').count(), 0)
    },
  },
  {
    name: 'search   partner-admin   minimized chat keeps answering and flags a new answer; it survives navigation',
    role: 'partner-admin',
    async run({ page, goto }) {
      await home(page, goto)
      await page.getByRole('button', { name: 'Ask Partner assistant' }).click()
      const full = page.getByRole('dialog', { name: 'Partner assistant' })
      await settleMotion(page)
      await full.getByLabel('Message Partner assistant').fill('Show my open pipeline by customer')
      await page.clock.install()
      await page.clock.pauseAt(new Date())
      await page.keyboard.press('Enter')
      await page.getByRole('button', { name: 'Close assistant' }).click()
      // Deliver the mock response only after minimizing, independent of machine speed.
      await page.clock.runFor(1000)
      await page.clock.resume()
      await page.getByRole('button', { name: 'Open Partner assistant, new answer' }).waitFor()
      // In-app (client-side) navigation, as a user clicking a link.
      await page.evaluate(() => {
        window.history.pushState({}, '', '/customers/')
        window.dispatchEvent(new PopStateEvent('popstate'))
      })
      await expectH1(page, 'Customers')
      await page.getByRole('button', { name: /^Open Partner assistant/ }).click()
      const panel = page.locator('section[role="dialog"][aria-modal="false"]')
      await panel.getByText(/Your open pipeline is/).waitFor()
      await page.getByRole('button', { name: 'Close assistant' }).click()
      assert.equal(await page.getByRole('button', { name: 'Open Partner assistant' }).count(), 1, 'unread flag clears once read')
    },
  },
  {
    name: 'search   partner-admin   mobile: chat window fits the screen and the floating button stays reachable',
    role: 'partner-admin',
    viewport: VIEWPORTS.mobile,
    async run({ page, goto }) {
      await home(page, goto)
      await page.getByRole('button', { name: 'Search', exact: true }).click()
      await box(page).fill('which deals need my attention?')
      await page.keyboard.press('Enter')
      await page.getByRole('dialog', { name: 'Partner assistant' }).getByText('4 items need your attention').waitFor()
      await page.getByRole('button', { name: 'Restore to chat window' }).click()
      const panel = page.locator('section[role="dialog"][aria-modal="false"]')
      await panel.waitFor()
      await settleMotion(page)
      const vp = page.viewportSize()
      const pb = await panel.boundingBox()
      assert.ok(pb.x >= 0 && pb.x + pb.width <= vp.width && pb.y >= 0 && pb.y + pb.height <= vp.height, 'window inside the viewport')
      await scan(page, 'mobile chat window')
      await page.getByRole('button', { name: 'Close assistant' }).click()
      await page.getByRole('button', { name: /^Open Partner assistant/ }).waitFor()
      await settleMotion(page)
      const fab = await page.getByRole('button', { name: /^Open Partner assistant/ }).boundingBox()
      assert.ok(fab.width >= 44 && fab.height >= 44 && fab.x + fab.width <= vp.width, 'floating button is a 44px+ target on screen')
    },
  },
  ...['anonymous', 'partner-seller'].map(role => ({
    name: `search   ${role.padEnd(15)} the circular Material 3 assistant FAB is always visible at the bottom-end and opens the chat window`,
    role,
    async run({ page, goto }) {
      await home(page, goto)
      const fab = page.locator('[data-assistant-fab]')
      await fab.waitFor()
      const vp = page.viewportSize()
      const box = await fab.boundingBox()
      const style = await fab.evaluate(el => ({ radius: getComputedStyle(el).borderTopLeftRadius, shadow: getComputedStyle(el).boxShadow }))
      assert.equal(Math.round(box.height), 56, 'FAB is 56px tall')
      assert.equal(Math.round(box.width), 56, 'FAB is 56px wide')
      assert.ok(parseFloat(style.radius) >= 28, 'FAB is circular')
      assert.ok(style.shadow !== 'none', 'FAB is elevated')
      assert.equal(Math.round(vp.width - (box.x + box.width)), 24, '24px end margin')
      assert.equal(Math.round(vp.height - (box.y + box.height)), 24, '24px bottom margin')
      assert.equal((await fab.innerText()).trim(), '', 'icon only, no visible label')
      assert.equal(await fab.getAttribute('aria-label'), 'Open Partner assistant', 'full accessible name')
      await scan(page, 'assistant FAB')
      await page.mouse.wheel(0, 900)
      await page.waitForTimeout(200)
      assert.ok(await fab.isVisible(), 'stays visible while scrolling')
      await page.locator('[data-assistant-fab]').click()
      const panel = page.locator('section[role="dialog"][aria-modal="false"]')
      await panel.getByText(/how can I help\?/).waitFor()
      assert.equal(await page.locator('[data-assistant-fab]').count(), 0, 'the window replaces the FAB')
      await page.getByRole('button', { name: 'Close assistant' }).click()
      await page.locator('[data-assistant-fab]').waitFor()
      assert.ok(await page.locator('[data-assistant-fab]').evaluate(el => el === document.activeElement), 'focus returns to the FAB')
    },
  })),
  {
    name: 'search   partner-admin   compact window keeps the 56px circular FAB with a 16px margin',
    role: 'partner-admin',
    viewport: VIEWPORTS.mobile,
    async run({ page, goto }) {
      await home(page, goto)
      const fab = page.locator('[data-assistant-fab]')
      await fab.waitFor()
      const vp = page.viewportSize()
      const box = await fab.boundingBox()
      assert.equal(Math.round(box.width), 56)
      assert.equal(Math.round(box.height), 56)
      assert.equal(Math.round(vp.width - (box.x + box.width)), 16)
      assert.equal(Math.round(vp.height - (box.y + box.height)), 16)
      assert.equal(await fab.getAttribute('aria-label'), 'Open Partner assistant')
    },
  },
  {
    name: 'search   partner-admin   the FAB sits above the fixed save bar and steps aside for page dialogs',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto('/opportunities/managed-opportunities/opportunity-details/?id=opp-2404')
      await page.locator('#od-topic').fill('Cloud migration – phase 1 (edited)')
      await page.getByRole('button', { name: 'Save changes', exact: true }).waitFor()
      await page.waitForTimeout(300)
      const fab = page.locator('[data-assistant-fab]')
      await fab.waitFor()
      const bar = await page.locator('[data-fab-avoid]').boundingBox()
      const fb = await fab.boundingBox()
      assert.ok(fb.y + fb.height <= bar.y - 16, `FAB (bottom ${fb.y + fb.height}) clears the save bar (top ${bar.y})`)
      await page.getByRole('button', { name: 'Save changes', exact: true }).click({ trial: true })
      await page.getByRole('button', { name: 'Save changes', exact: true }).click()
      await page.getByRole('button', { name: 'Save changes', exact: true }).waitFor({ state: 'hidden' })
      await goto('/opportunities/distributed-opportunities/opportunity-summary/?id=opp-2401')
      await page.locator('[data-assistant-fab]').waitFor()
      await page.getByRole('button', { name: 'Accept opportunity', exact: true }).click()
      await page.getByRole('dialog').waitFor()
      await page.waitForFunction(() => !document.querySelector('[data-assistant-fab]'))
      await page.keyboard.press('Escape')
      await page.locator('[data-assistant-fab]').waitFor()
    },
  },
  {
    name: 'search   partner-admin   chat panel size follows the viewport (width 360–440px, height 480–720px within the available space)',
    role: 'partner-admin',
    async run({ page, goto }) {
      await home(page, goto)
      const sizes = []
      for (const [w, h, expect] of [
        [1280, 720, { w: 360, h: 540 }],
        [1440, 900, { w: 403, h: 675 }],
        [1920, 1080, { w: 440, h: 720 }],
        [1366, 560, { w: 382, h: 456 }],
      ]) {
        await page.setViewportSize({ width: w, height: h })
        if (!(await page.locator('section[role="dialog"][aria-modal="false"]').count())) await page.locator('[data-assistant-fab]').click()
        await settleMotion(page)
        const box = await page.locator('section[role="dialog"][aria-modal="false"]').boundingBox()
        sizes.push(`${w}x${h} → ${Math.round(box.width)}x${Math.round(box.height)}`)
        assert.ok(Math.abs(box.width - expect.w) <= 2, `width at ${w}x${h}: ${box.width} ≈ ${expect.w}`)
        assert.ok(Math.abs(box.height - expect.h) <= 2, `height at ${w}x${h}: ${box.height} ≈ ${expect.h}`)
        assert.ok(box.y >= 56, 'panel stays below the app bar')
      }
      console.log('    panel sizes:', sizes.join(', '))
    },
  },
  {
    name: 'search   partner-admin   chat modes are consistent: Close/Esc collapse one level, full screen returns to its origin, the draft survives',
    role: 'partner-admin',
    async run({ page, goto }) {
      await home(page, goto)
      const panel = page.locator('section[role="dialog"][aria-modal="false"]')
      const full = page.getByRole('dialog', { name: 'Partner assistant' }).and(page.locator('[data-assistant-surface]'))
      const fab = page.locator('[data-assistant-fab]')
      await fab.click()
      await panel.waitFor()
      const input = page.locator('#assistant-input')
      await input.fill('line one')
      await input.press('Shift+Enter')
      await input.type('line two')
      await settleMotion(page)
      const panelHeight = (await input.boundingBox()).height
      assert.ok(panelHeight > 30, 'multi-line draft grows the composer')
      // Expanded from the window: no Back to search, Esc returns to the window, draft and height kept.
      await page.getByRole('button', { name: 'Expand to full screen' }).click()
      await full.waitFor()
      assert.equal(await page.getByRole('button', { name: 'Back to search' }).count(), 0, 'no Back to search when expanded from the window')
      assert.equal(await input.inputValue(), 'line one\nline two')
      await page.waitForTimeout(500) // Fluent dialog open animation
      const fullHeight = (await input.boundingBox()).height
      assert.ok(Math.abs(fullHeight - panelHeight) <= 2, `composer keeps its height after expanding (${panelHeight} → ${fullHeight})`)
      await page.keyboard.press('Escape')
      await panel.waitFor()
      assert.equal(await box(page).getAttribute('aria-expanded'), 'false', 'Esc did not jump to search')
      // Same Close action in both modes, and Esc in the window collapses to the FAB.
      assert.equal(await panel.getByRole('button', { name: 'Close assistant' }).count(), 1)
      await page.keyboard.press('Escape')
      await fab.waitFor()
      await fab.click()
      assert.equal(await input.inputValue(), 'line one\nline two', 'Close keeps the draft')
      await page.getByRole('button', { name: 'Expand to full screen' }).click()
      await page.getByRole('button', { name: 'Close assistant' }).click()
      await fab.waitFor()
      assert.equal(await panel.count(), 0)
    },
  },
]
