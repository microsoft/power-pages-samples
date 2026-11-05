import AxeBuilder from '@axe-core/playwright'
import { assert, expectText, STORAGE_KEYS } from './lib.mjs'

const ACCOUNT = '/customers/customer-accounts/edit-customer-account/?id=acc-adventure'
const OPP = '/opportunities/managed-opportunities'
const contact = id => `/profile/manage-access/edit-partner-contact/?id=${id}`
const openButton = name => page => page.getByRole('button', { name, exact: true }).click()
const cases = [
  { name: 'accept from list', path: '/opportunities/distributed-opportunities/', title: 'Accept opportunity', open: openButton('Accept Fleet telematics rollout'), primary: 'Accept opportunity', secondary: 'Cancel', identifies: 'Fleet telematics rollout' },
  { name: 'accept from summary', path: '/opportunities/distributed-opportunities/opportunity-summary/?id=opp-2401', title: 'Accept opportunity', open: openButton('Accept opportunity'), primary: 'Accept opportunity', secondary: 'Cancel', identifies: 'Fleet telematics rollout' },
  { name: 'reopen', path: `${OPP}/opportunity-details/?id=opp-2409`, title: 'Reopen opportunity', open: openButton('Reopen opportunity'), primary: 'Reopen opportunity', secondary: 'Keep closed', identifies: 'Field service mobile app' },
  { name: 'deactivate account', path: ACCOUNT, title: 'Deactivate account?', open: openButton('Deactivate account'), primary: 'Deactivate account', secondary: 'Keep active', identifies: 'Adventure Works Cycles' },
  { name: 'deactivate contact', path: contact('c-sam'), title: 'Deactivate contact?', open: openButton('Deactivate contact'), primary: 'Deactivate contact', secondary: 'Keep active', identifies: 'Sam Rivera' },
  { name: 'activate contact', path: contact('c-drew'), title: 'Activate contact?', open: openButton('Activate contact'), primary: 'Activate contact', secondary: 'Keep inactive', identifies: 'Partner Seller' },
  { name: 'discard page edits', path: ACCOUNT, title: 'Discard unsaved changes?', primary: 'Keep editing', secondary: 'Discard changes', identifies: 'Customer account: Adventure Works Cycles', open: async page => {
    await page.locator('#acc-name').fill('Unsaved account')
    await page.getByRole('navigation', { name: 'Footer', exact: true }).getByRole('link', { name: 'Sitemap', exact: true }).click()
  } },
]

const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number)
const luminance = value => rgb(value).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  .reduce((total, v, index) => total + v * [0.2126, 0.7152, 0.0722][index], 0)
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05)

async function settle(dialog) {
  await dialog.waitFor()
  await dialog.evaluate(async el => {
    // A transition cancelled mid-flight (e.g. a hover fade when focus moves) rejects `finished`; that still counts as settled.
    await Promise.all(el.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => undefined)))
  })
}

async function geometry(dialog, width, height) {
  const r = await dialog.evaluate(el => ({
    box: el.getBoundingClientRect().toJSON(),
    body: el.querySelector('[data-modal-body]').getBoundingClientRect().toJSON(),
    footer: el.querySelector('[data-modal-footer]').getBoundingClientRect().toJSON(),
    buttons: [...el.querySelectorAll('button')].map(button => button.getBoundingClientRect().toJSON()),
  }))
  assert.ok(r.box.x >= 15 && r.box.right <= width - 15, `side gutters missing: ${JSON.stringify(r.box)}`)
  assert.ok(r.box.y >= 15 && r.box.bottom <= height - 15, `dialog exceeds viewport: ${JSON.stringify(r.box)}`)
  assert.ok(r.body.bottom <= r.footer.top + 1, 'message must not overlap footer')
  assert.ok(r.footer.bottom <= r.box.bottom, 'footer must stay inside dialog')
  for (const button of r.buttons) {
    assert.ok(button.height >= 48 && button.width >= 48, 'confirmation controls need 48px targets')
    assert.ok(button.bottom <= height - 15 && button.x >= 15 && button.right <= width - 15, 'action is clipped')
  }
}

async function buttonStyle(button) {
  return button.evaluate(el => {
    const style = getComputedStyle(el)
    const range = document.createRange()
    range.selectNodeContents(el)
    return { bg: style.backgroundColor, color: style.color, border: style.borderTopColor, lines: range.getClientRects().length }
  })
}

const layoutTests = [[1440, 900], [320, 844], [320, 380]].flatMap(([width, height]) => cases.map(c => ({
  name: `${width}x${height} ${c.name}: description, actions, focus and layout`,
  role: 'partner-admin',
  viewport: { width, height },
  contextOptions: { hasTouch: width < 640, isMobile: width < 640 },
  async run({ page, goto }) {
    await goto(c.path)
    await c.open(page)
    const dialog = page.getByRole('dialog', { name: c.title, exact: true })
    await settle(dialog)
    await geometry(dialog, width, height)
    const description = await dialog.evaluate(el => {
      const id = el.getAttribute('aria-describedby')
      const message = id && document.getElementById(id)
      return message && el.contains(message) ? message.textContent : ''
    })
    assert.ok(description.includes(c.identifies), `missing associated consequence/record text: ${description}`)
    const primary = await buttonStyle(dialog.getByRole('button', { name: c.primary, exact: true }))
    const secondary = await buttonStyle(dialog.getByRole('button', { name: c.secondary, exact: true }))
    assert.ok(contrast(primary.bg, 'rgb(255,255,255)') >= 3, 'primary must be visually prominent')
    assert.ok(contrast(primary.color, primary.bg) >= 4.5, 'primary text contrast')
    assert.ok(contrast(secondary.border, secondary.bg) >= 3, 'secondary outline contrast')
    assert.ok(contrast(secondary.color, secondary.bg) >= 4.5, 'secondary text contrast')
    assert.ok(contrast(secondary.bg, 'rgb(255,255,255)') < 1.5, 'secondary must not compete with the filled primary')
    if (width === 1440) assert.equal(primary.lines, 1, 'desktop primary label must not wrap')
    const safeChoice = c.name === 'discard page edits' ? c.primary : c.secondary
    assert.equal(await page.evaluate(() => document.activeElement?.textContent.trim()), safeChoice)
    if (width === 320 && height === 380) {
      const { violations } = await new AxeBuilder({ page }).exclude('[data-tabster-dummy]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
      assert.deepEqual(violations.map(v => `${v.id}: ${v.nodes.map(n => n.failureSummary).join('\n')}`), [])
    }
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
  },
})))

const behaviorTests = [
  {
    name: 'long account name stays in scrollable message; deactivate and Undo preserve related data',
    role: 'partner-admin',
    viewport: { width: 320, height: 380 },
    contextOptions: { hasTouch: true, isMobile: true },
    async run({ page, goto }) {
      await goto(ACCOUNT)
      const name = 'International Enterprise Technology and Customer Services '.repeat(3).slice(0, 160)
      await page.locator('#acc-name').fill(name)
      await page.getByRole('button', { name: 'Save account', exact: true }).click()
      await expectText(page, 'Account saved.')
      const before = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEYS.db)
      await openButton('Deactivate account')(page)
      const dialog = page.getByRole('dialog', { name: 'Deactivate account?', exact: true })
      await settle(dialog)
      await geometry(dialog, 320, 380)
      assert.equal(await dialog.getByRole('heading').textContent(), 'Deactivate account?')
      await expectText(dialog, name)
      const body = dialog.locator('[data-modal-body]')
      assert.ok(await body.evaluate(el => el.scrollHeight > el.clientHeight), 'long record context should scroll, not enlarge the title')
      await body.focus()
      await body.press('ArrowDown')
      await page.waitForFunction(() => document.querySelector('[data-modal-body]').scrollTop > 0)
      await body.evaluate(el => { el.scrollTop = el.scrollHeight })
      await geometry(dialog, 320, 380)
      await dialog.getByRole('button', { name: 'Deactivate account', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' })
      await page.getByRole('button', { name: 'Undo', exact: true }).click()
      const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEYS.db)
      assert.ok(after.accounts.find(a => a.id === 'acc-adventure').active)
      assert.deepEqual(after.contacts, before.contacts)
      assert.deepEqual(after.opportunities, before.opportunities)
    },
  },
  {
    name: 'reopen explains actual cleared values and leaves closed registrations closed',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto(`${OPP}/opportunity-details/?id=opp-2409`)
      await page.getByRole('button', { name: 'Reopen opportunity', exact: true }).waitFor()
      await page.evaluate(key => {
        const db = JSON.parse(localStorage.getItem(key))
        const opp = db.opportunities.find(o => o.id === 'opp-2409')
        opp.actualRevenue = 55000
        opp.actualCloseDate = '2026-09-30'
        db.dealRegistrations.push({ id: 'confirmation-test-reg', name: 'Closed registration', opportunityId: opp.id, partnerId: opp.partnerId, submissionDate: '2026-01-01', status: 'Closed' })
        localStorage.setItem(key, JSON.stringify(db))
      }, STORAGE_KEYS.db)
      await page.reload()
      await openButton('Reopen opportunity')(page)
      const dialog = page.getByRole('dialog', { name: 'Reopen opportunity', exact: true })
      await expectText(dialog, 'This clears its recorded actual revenue, actual close date.')
      await expectText(dialog, 'Closed deal registrations will stay closed.')
      await dialog.getByRole('button', { name: 'Keep closed', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' })
      let db = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEYS.db)
      assert.equal(db.opportunities.find(o => o.id === 'opp-2409').actualRevenue, 55000)
      await openButton('Reopen opportunity')(page)
      await dialog.getByRole('button', { name: 'Reopen opportunity', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' })
      db = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEYS.db)
      const opp = db.opportunities.find(o => o.id === 'opp-2409')
      assert.equal(opp.status, 'Accepted')
      assert.equal(opp.actualRevenue, undefined)
      assert.equal(opp.actualCloseDate, undefined)
      assert.equal(db.dealRegistrations.find(r => r.id === 'confirmation-test-reg').status, 'Closed')
    },
  },
  {
    name: 'activation identifies organization/role and handles no assigned partner role',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto(contact('c-drew'))
      await openButton('Activate contact')(page)
      const dialog = page.getByRole('dialog', { name: 'Activate contact?', exact: true })
      await expectText(dialog, 'Allow this contact to sign in again as Partner Seller for Northwind Partners.')
      await dialog.getByRole('button', { name: 'Keep inactive', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' })
      await page.getByRole('radio', { name: /^No partner role/ }).check()
      await page.getByRole('button', { name: 'Save contact', exact: true }).click()
      await expectText(page, "Drew Lindqvist's details have been saved.")
      await openButton('Activate contact')(page)
      await expectText(dialog, 'Allow this contact to sign in as a Non-Partner Portal User. No partner role is assigned, so they will not have access to partner features.')
      await dialog.getByRole('button', { name: 'Activate contact', exact: true }).click()
      await dialog.waitFor({ state: 'hidden' })
      const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).contacts.find(c => c.id === 'c-drew'), STORAGE_KEYS.db)
      assert.ok(saved.active)
      assert.equal(saved.partnerRole, undefined)
    },
  },
  {
    name: 'navigation warning names both dirty forms; in-panel discard favours keeping edits',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto('/customers/customer-accounts/')
      await page.getByRole('link', { name: 'Adventure Works Cycles', exact: true }).click()
      await page.locator('#acc-name').fill('Parent draft')
      await openButton('Edit address')(page)
      const panel = page.getByRole('dialog', { name: 'Address', exact: true })
      await panel.getByLabel('Street 1').fill('Draft street')
      await page.goBack()
      const warning = page.getByRole('dialog', { name: 'Discard unsaved changes?', exact: true })
      await expectText(warning, 'Customer account: Adventure Works Cycles')
      await expectText(warning, 'Address')
      await warning.getByRole('button', { name: 'Keep editing', exact: true }).click()
      await warning.waitFor({ state: 'hidden' })
      assert.equal(await panel.getByLabel('Street 1').inputValue(), 'Draft street')
      await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
      const keep = await buttonStyle(panel.getByRole('button', { name: 'Keep editing', exact: true }))
      const discard = await buttonStyle(panel.getByRole('button', { name: 'Discard changes', exact: true }))
      assert.ok(contrast(keep.bg, 'rgb(255,255,255)') >= 3)
      assert.ok(contrast(discard.border, discard.bg) >= 3)
      assert.ok(contrast(discard.bg, 'rgb(255,255,255)') < 1.5)
      await panel.getByRole('button', { name: 'Discard changes', exact: true }).click()
      await panel.waitFor({ state: 'hidden' })
      assert.equal(await page.locator('#acc-name').inputValue(), 'Parent draft')
    },
  },
  ...[false, true].map(fails => ({
    name: `invitation creation is truthful and copy ${fails ? 'failure offers manual recovery' : 'action copies the generated link'}`,
    role: 'partner-admin',
    async run({ page, context, goto }) {
      await context.addInitScript(fails => {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
          writeText: async value => {
            if (fails) throw new Error('Clipboard permission denied')
            window.__copiedInvitation = value
          },
        } })
      }, fails)
      await goto(contact('c-sam'))
      await openButton('Send invitation')(page)
      const dialog = page.getByRole('dialog', { name: 'Invitation created', exact: true })
      await settle(dialog)
      assert.match(await dialog.innerText(), /This prototype does not send emails/)
      assert.doesNotMatch(await dialog.innerText(), /We've emailed|email doesn't arrive/)
      const expected = await dialog.locator('#invite-url').inputValue()
      const copy = dialog.getByRole('button', { name: 'Copy invitation link', exact: true })
      const style = await buttonStyle(copy)
      assert.ok(contrast(style.bg, 'rgb(255,255,255)') >= 3)
      await copy.click()
      if (fails) {
        await expectText(page, 'Copy failed. Select the link and copy it manually.')
        assert.equal(await dialog.locator('#invite-url').inputValue(), expected)
      } else {
        await expectText(dialog, 'Link copied')
        assert.equal(await page.evaluate(() => window.__copiedInvitation), expected)
      }
      await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
      await dialog.waitFor({ state: 'hidden' })
    },
  })),
]

export const tests = [...layoutTests, ...behaviorTests]
