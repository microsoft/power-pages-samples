import AxeBuilder from '@axe-core/playwright'
import { assert, expectH1, expectFieldMessage, expectText, STORAGE_KEYS } from './lib.mjs'

const OPP = '/opportunities/managed-opportunities'
const DETAILS = `${OPP}/opportunity-details/?id=opp-2406`
const ACCOUNT = '/customers/customer-accounts/edit-customer-account/?id=acc-adventure'
const click = name => page => page.getByRole('button', { name, exact: true }).first().click()
const closeAs = outcome => async page => {
  await click('Close opportunity')(page)
  await page.getByRole('menuitem', { name: `Close as ${outcome}`, exact: true }).click()
}
const cases = [
  { title: 'Create customer account', path: `${OPP}/create-opportunity/`, open: click('Create customer account') },
  { title: 'Address', path: ACCOUNT, open: click('Edit address') },
  { title: 'Add product', path: DETAILS, open: click('Add product') },
  { title: 'Register deal', path: DETAILS, open: click('Register deal') },
  { title: 'Extend deal registration', path: `${OPP}/opportunity-details/?id=opp-2408`, open: click('Extend registration') },
  { title: 'Close opportunity as won', path: DETAILS, open: closeAs('won') },
  { title: 'Close opportunity as lost', path: DETAILS, open: closeAs('lost') },
  { title: 'Return opportunity to Zava', path: `${OPP}/opportunity-details/?id=opp-2404`, open: async page => {
    await click('More actions')(page)
    await page.getByRole('menuitem', { name: 'Return to Zava', exact: true }).click()
  } },
  { title: 'Decline opportunity', path: '/opportunities/distributed-opportunities/', open: click('Decline Retail POS modernization') },
  { title: 'Create partner contact', path: '/profile/manage-access/', open: click('Create partner contact') },
  { title: 'Change role', path: '/profile/manage-access/', open: async page => {
    await click('More actions for Riley Okafor')(page)
    await page.getByRole('menuitem', { name: 'Change role', exact: true }).click()
  } },
]

async function settle(panel) {
  await panel.waitFor()
  await panel.evaluate(async el => {
    await Promise.all(el.getAnimations({ subtree: true }).map(animation => animation.finished))
  })
}

async function scan(page) {
  const { violations } = await new AxeBuilder({ page }).exclude('[data-tabster-dummy]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  assert.deepEqual(violations.map(v => `${v.id}: ${v.nodes.map(n => n.failureSummary).join('\n')}`), [])
}

async function geometry(page, panel, mobile) {
  const actual = await panel.evaluate(el => {
    const rect = el.getBoundingClientRect()
    const content = el.querySelector('[data-modal-body]')
    const footer = el.querySelector('[data-modal-footer]').getBoundingClientRect()
    const heading = el.querySelector('.fui-DialogTitle').getBoundingClientRect()
    const close = el.querySelector('button[aria-label="Close"]').getBoundingClientRect()
    return {
      x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom,
      viewportWidth: document.documentElement.getBoundingClientRect().width, viewportHeight: visualViewport?.height ?? innerHeight,
      footerBottom: footer.bottom, footerTop: footer.top, headingBottom: heading.bottom, closeBottom: close.bottom,
      contentBottom: content.getBoundingClientRect().bottom, contentTop: content.getBoundingClientRect().top,
      contentWidth: content.clientWidth, contentScrollWidth: content.scrollWidth,
    }
  })
  assert.ok(Math.abs(actual.width - (mobile ? actual.viewportWidth : 560)) <= 2, JSON.stringify(actual))
  assert.ok(Math.abs(actual.right - actual.viewportWidth) <= 2, JSON.stringify(actual))
  assert.ok(Math.abs(actual.y) <= 2 && Math.abs(actual.height - actual.viewportHeight) <= 2, JSON.stringify(actual))
  assert.ok(actual.footerBottom <= actual.bottom + 1 && actual.footerBottom >= actual.bottom - 2, 'footer must anchor to panel bottom')
  assert.ok(actual.contentBottom <= actual.footerTop + 1 && actual.contentTop >= actual.headingBottom - 1, 'body must not overlap header/footer')
  assert.ok(actual.closeBottom <= actual.headingBottom + 1, 'close action belongs in header, not a separate body row')
  assert.ok(actual.contentScrollWidth <= actual.contentWidth + 1, 'no horizontal scrolling inside form')
  assert.equal(await panel.getAttribute('data-form-panel'), '')
}

const presentationTests = [1440, 390].flatMap(width => cases.map(c => ({
  name: `${width}px ${c.title}: panel geometry, actions and accessible form`,
  role: 'partner-admin',
  viewport: { width, height: 844 },
  contextOptions: { hasTouch: width < 640, isMobile: width < 640 },
  async run({ page, goto }) {
    await goto(c.path)
    await c.open(page)
    const panel = page.getByRole('dialog', { name: c.title, exact: true })
    await settle(panel)
    await geometry(page, panel, width < 640)
    await panel.locator('[data-modal-body]').evaluate(el => { el.scrollTop = el.scrollHeight })
    await geometry(page, panel, width < 640)
    assert.equal(await panel.locator('form').count(), 1, 'one form per contextual surface')
    await scan(page)
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await panel.waitFor({ state: 'hidden' })
    await page.waitForFunction(() => document.activeElement !== document.body)
  },
})))

const interactionTests = [
  {
    name: 'dirty product: Escape, close, Cancel and backdrop preserve input until explicit discard',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto(DETAILS)
      const opener = page.getByRole('button', { name: 'Add product', exact: true }).first()
      await opener.click()
      const panel = page.getByRole('dialog', { name: 'Add product' })
      await settle(panel)
      await panel.getByRole('radio', { name: 'Write-in product' }).check()
      await panel.getByLabel('Product name').fill('Draft service')
      for (const dismiss of [
        () => panel.getByLabel('Product name').press('Escape'),
        () => panel.getByRole('button', { name: 'Close', exact: true }).click(),
        () => panel.getByRole('button', { name: 'Cancel', exact: true }).click(),
        () => page.mouse.click(15, 300),
      ]) {
        await dismiss()
        await expectText(panel, 'Discard changes?')
        assert.equal(await page.getByRole('dialog').count(), 1, 'dismissal recovery stays in the same panel')
        await panel.getByRole('button', { name: 'Keep editing' }).click()
        assert.equal(await panel.getByLabel('Product name').inputValue(), 'Draft service')
      }
      await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
      await panel.getByRole('button', { name: 'Discard changes', exact: true }).click()
      await panel.waitFor({ state: 'hidden' })
      await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Add product')
      await opener.click()
      await panel.getByRole('radio', { name: 'From catalog' }).waitFor()
      assert.ok(await panel.getByRole('radio', { name: 'From catalog' }).isChecked())
      assert.equal(await panel.locator('#prod-qty').inputValue(), '1')
    },
  },
  {
    name: 'address Apply preserves parent draft and does not submit or save the parent form',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto(ACCOUNT)
      await page.locator('#acc-name').fill('Parent draft name')
      await click('Edit address')(page)
      const panel = page.getByRole('dialog', { name: 'Address', exact: true })
      await panel.getByLabel('Street 1').fill('42 Panel Avenue')
      await panel.getByRole('button', { name: 'Apply address' }).click()
      await panel.waitFor({ state: 'hidden' })
      assert.equal(await page.locator('#acc-name').inputValue(), 'Parent draft name')
      let saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).accounts.find(a => a.id === 'acc-adventure'), STORAGE_KEYS.db)
      assert.notEqual(saved.name, 'Parent draft name')
      assert.notEqual(saved.address.line1, '42 Panel Avenue')
      await page.getByRole('button', { name: 'Save account', exact: true }).click()
      await expectText(page, 'Account saved.')
      saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).accounts.find(a => a.id === 'acc-adventure'), STORAGE_KEYS.db)
      assert.equal(saved.address.line1, '42 Panel Avenue')
      assert.equal(saved.name, 'Parent draft name')
    },
  },
  {
    name: 'quick-create Enter saves only the account, returns selection and retains deal draft',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto(`${OPP}/create-opportunity/`)
      await page.locator('#opp-topic').fill('Unfinished deal')
      await click('Create customer account')(page)
      const panel = page.getByRole('dialog', { name: 'Create customer account', exact: true })
      await panel.getByRole('textbox', { name: 'Account name' }).fill('Panel account')
      await panel.getByRole('textbox', { name: 'Account name' }).press('Enter')
      await panel.waitFor({ state: 'hidden' })
      assert.equal(await page.locator('#opp-topic').inputValue(), 'Unfinished deal')
      assert.ok(await page.locator('#opp-customer').inputValue())
      assert.equal(await page.locator('#opp-close').getAttribute('aria-invalid'), 'false')
      const db = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEYS.db)
      assert.ok(db.accounts.some(a => a.name === 'Panel account'))
      assert.ok(!db.opportunities.some(o => o.topic === 'Unfinished deal'))
    },
  },
  {
    name: 'dirty page plus address panel use one browser navigation guard',
    role: 'partner-admin',
    async run({ page, goto }) {
      const warnings = []
      page.on('console', msg => { if (/only supports one blocker/i.test(msg.text())) warnings.push(msg.text()) })
      await goto('/customers/customer-accounts/')
      await page.getByRole('link', { name: 'Adventure Works Cycles', exact: true }).click()
      await page.locator('#acc-name').fill('Unsaved organization')
      await click('Edit address')(page)
      const panel = page.getByRole('dialog', { name: 'Address', exact: true })
      await panel.getByLabel('Street 1').fill('Unsaved street')
      await page.goBack()
      const confirmation = page.getByRole('dialog', { name: 'Discard unsaved changes?', exact: true })
      await confirmation.waitFor()
      await confirmation.getByRole('button', { name: 'Keep editing' }).click()
      await confirmation.waitFor({ state: 'hidden' })
      assert.equal(await panel.getByLabel('Street 1').inputValue(), 'Unsaved street')
      assert.equal(await page.locator('#acc-name').inputValue(), 'Unsaved organization')
      await page.goBack()
      await confirmation.getByRole('button', { name: 'Discard changes', exact: true }).click()
      await expectH1(page, 'Customer accounts')
      assert.deepEqual(warnings, [])
    },
  },
  {
    name: 'lifecycle panels require saved opportunity information',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto(DETAILS)
      await page.locator('#od-topic').fill('Updated deal')
      await page.getByRole('button', { name: 'Save changes', exact: true }).waitFor()
      await click('Register deal')(page)
      await expectText(page, 'Save your changes first')
      assert.equal(await page.locator('[data-form-panel]').count(), 0)
      await closeAs('won')(page)
      assert.equal(await page.locator('[data-form-panel]').count(), 0)
      await page.getByRole('button', { name: 'Save changes', exact: true }).click()
      await expectText(page, 'Your changes have been saved.')
      await click('Register deal')(page)
      const panel = page.getByRole('dialog', { name: 'Register deal', exact: true })
      await expectText(panel, 'Updated deal')
    },
  },
  {
    name: 'return and decline submissions navigate successfully without another discard prompt',
    role: 'partner-admin',
    async run({ page, goto }) {
      const c = cases.find(c => c.title === 'Return opportunity to Zava')
      await goto(c.path)
      await c.open(page)
      let panel = page.getByRole('dialog', { name: c.title, exact: true })
      await panel.getByRole('radio').first().check()
      await panel.getByRole('button', { name: 'Return to Zava', exact: true }).click()
      await expectH1(page, 'Managed opportunities')
      assert.equal(await page.getByRole('dialog').count(), 0)
      await goto('/opportunities/distributed-opportunities/opportunity-summary/?id=opp-2402')
      await page.getByRole('button', { name: 'Decline', exact: true }).click()
      panel = page.getByRole('dialog', { name: 'Decline opportunity', exact: true })
      await panel.getByRole('radio').first().check()
      await panel.getByRole('button', { name: 'Decline opportunity', exact: true }).click()
      await expectH1(page, 'Distributed opportunities')
      assert.equal(await page.getByRole('dialog').count(), 0)
    },
  },
  {
    name: 'product validation and submit save once with calculated amount',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto(DETAILS)
      await click('Add product')(page)
      const panel = page.getByRole('dialog', { name: 'Add product', exact: true })
      await panel.getByRole('button', { name: 'Add product', exact: true }).click()
      await expectFieldMessage(panel, 'prod-existing', 'Select a product')
      await panel.locator('#prod-existing').selectOption('Cloud Migration Services')
      await panel.locator('#prod-qty').fill('2')
      await panel.locator('#prod-qty').press('Enter')
      await panel.waitFor({ state: 'hidden' })
      const products = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).opportunities.find(o => o.id === 'opp-2406').products, STORAGE_KEYS.db)
      assert.equal(products.length, 1)
      assert.equal(products[0].quantity * products[0].pricePerUnit, 300)
    },
  },
  {
    name: '320px short viewport: footer reachable, one body scroll area, focus remains inside panel',
    role: 'partner-admin',
    viewport: { width: 320, height: 844 },
    contextOptions: { hasTouch: true, isMobile: true },
    async run({ page, goto }) {
      await goto('/profile/manage-access/')
      await click('Create partner contact')(page)
      const panel = page.getByRole('dialog', { name: 'Create partner contact', exact: true })
      await settle(panel)
      await page.setViewportSize({ width: 320, height: 380 })
      await page.waitForFunction(() => Math.abs(document.querySelector('[data-form-panel]').getBoundingClientRect().height - visualViewport.height) < 2)
      await geometry(page, panel, true)
      const body = panel.locator('[data-modal-body]')
      assert.ok(await body.evaluate(el => el.scrollHeight > el.clientHeight))
      await panel.getByRole('button', { name: 'Create contact', exact: true }).focus()
      await page.keyboard.press('Tab')
      assert.ok(await panel.evaluate(el => el.contains(document.activeElement)), 'focus must not move behind the modal panel')
      await page.keyboard.press('Shift+Tab')
      assert.ok(await panel.evaluate(el => el.contains(document.activeElement)))
      await scan(page)
    },
  },
]

export const tests = [...presentationTests, ...interactionTests]
