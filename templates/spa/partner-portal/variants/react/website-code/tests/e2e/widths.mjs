import { assert, expectFieldMessage, expectH1, STORAGE_KEYS } from './lib.mjs'

const OPP = '/opportunities/managed-opportunities'
const DETAIL = `${OPP}/opportunity-details/?id=opp-2406`
const ACCOUNT = '/customers/customer-accounts/edit-customer-account/?id=acc-adventure'
const CONTROL = '.fui-Input, .fui-Select, .fui-Textarea'

async function alignedControls(scope, minimum, maxWidth) {
  await scope.locator(CONTROL).first().waitFor()
  const controls = await scope.evaluate((el, selector) => [...el.querySelectorAll(selector)].map(control => {
    const input = control.querySelector('input, select, textarea')
    const field = control.closest('.fui-Field')
    const box = control.getBoundingClientRect()
    const column = field?.getBoundingClientRect()
    return {
      id: input?.id, width: box.width, left: box.left, right: box.right,
      columnWidth: column?.width, columnLeft: column?.left, columnRight: column?.right,
    }
  }).filter(control => control.width > 0), CONTROL)
  assert.ok(controls.length >= minimum, `expected at least ${minimum} visible controls, got ${controls.length}`)
  for (const c of controls) {
    assert.ok(c.columnWidth > 0, `missing field column for ${c.id}`)
    assert.ok(Math.abs(c.left - c.columnLeft) <= 2 && Math.abs(c.right - c.columnRight) <= 2,
      `${c.id} does not fill its column: ${JSON.stringify(c)}`)
    assert.ok(c.width <= maxWidth + 2, `${c.id} exceeds the intended form column (${c.width}px)`)
  }
  return controls
}

async function noOverflow(page) {
  const size = await page.evaluate(() => ({ actual: document.documentElement.scrollWidth, viewport: innerWidth }))
  assert.ok(size.actual <= size.viewport + 1, JSON.stringify(size))
}

async function settlePanel(panel) {
  await panel.waitFor()
  await panel.evaluate(async el => {
    await Promise.all(el.getAnimations({ subtree: true }).map(animation => animation.finished))
  })
}

const pages = [
  { path: '/customers/customer-accounts/create-customer-account/', first: 'acc-name', minimum: 7 },
  { path: ACCOUNT, first: 'acc-name', minimum: 8 },
  { path: '/customers/customer-contacts/create-customer-contact-form/', first: 'ct-first', minimum: 8 },
  { path: '/customers/customer-contacts/edit-customer-contact/?id=c-adv-1', first: 'ct-first', minimum: 8 },
  { path: `${OPP}/create-opportunity/`, first: 'opp-topic', minimum: 9, exactColumn: true },
  { path: DETAIL, first: 'od-topic', minimum: 9, exactColumn: true },
  { path: '/profile/', first: 'pf-first', minimum: 5, bounded: true },
  { path: '/profile/parent-account/', first: 'pa-name', minimum: 6 },
  { path: '/profile/manage-access/edit-partner-contact/?id=c-sam', first: 'epc-first', minimum: 5 },
  { path: '/profile/register-to-be-a-partner/', first: 'app-org', minimum: 5, role: 'non-partner' },
  { path: '/login', first: 'signin-email', minimum: 2, role: 'anonymous', auth: true },
  { path: '/registration', first: 'reg-email', minimum: 3, role: 'anonymous', auth: true },
  { path: '/forgot-password', first: 'forgot-email', minimum: 1, role: 'anonymous', auth: true },
  { path: '/redeem-invitation', first: 'redeem-code', minimum: 1, role: 'anonymous', auth: true },
  { path: '/Account/Manage/ChangePassword', first: 'sec-current', minimum: 3, bounded: true },
  { path: '/Account/Manage/ChangeEmail', first: 'sec-email', minimum: 1, bounded: true },
  { path: '/Account/Manage/ChangePhoneNumber', first: 'sec-phone', minimum: 1, bounded: true },
]

const pageTests = [1440, 390, 320].flatMap(width => pages.map(c => ({
  name: `${width}px ${c.path}: ordinary fields fill bounded columns`,
  role: c.role ?? 'partner-admin',
  viewport: { width, height: 900 },
  contextOptions: { hasTouch: width < 640, isMobile: width < 640 },
  async run({ page, goto }) {
    await goto(c.path)
    const first = page.locator(`#${c.first}`)
    await first.waitFor()
    // Opportunity notes/contact-add remain separate forms; measure the information form itself.
    const form = first.locator('xpath=ancestor::form[1]')
    const controls = await alignedControls(form, c.minimum, c.auth ? 440 : 640)
    if (c.exactColumn) {
      const expected = width === 1440 ? 640 : width - 88
      for (const c of controls) assert.ok(Math.abs(c.width - expected) <= 2, `${c.id}: expected ${expected}px, got ${c.width}px`)
    }
    if (c.auth) {
      const expected = width === 1440 ? 440 : width - 48
      assert.ok(Math.abs(controls[0].width - expected) <= 2, 'preserve existing authentication column')
    }
    if (c.bounded) {
      const cardWidth = await first.evaluate(el => el.closest('.fui-Card')?.getBoundingClientRect().width)
      assert.ok(cardWidth > 0 && cardWidth <= 768, `settings card must be capped at 48rem, got ${cardWidth}`)
    }
    await noOverflow(page)
  },
})))

const panels = [
  { name: 'colleague', path: '/profile/manage-access/', opener: 'Create partner contact', title: 'Create partner contact', minimum: 5 },
  { name: 'quick customer', path: `${OPP}/create-opportunity/`, opener: 'Create customer account', title: 'Create customer account', minimum: 1 },
  { name: 'address', path: ACCOUNT, opener: 'Edit address', title: 'Address', minimum: 7 },
  { name: 'registration', path: DETAIL, opener: 'Register deal', title: 'Register deal', minimum: 1 },
  { name: 'product', path: DETAIL, opener: 'Add product', title: 'Add product', minimum: 4 },
  { name: 'close won', path: DETAIL, opener: 'Close opportunity', title: 'Close opportunity as won', minimum: 2, menu: 'Close as won' },
]

const panelTests = [1440, 390, 320].flatMap(width => panels.map(c => ({
  name: `${width}px ${c.name} panel: fields fill available cells`,
  role: 'partner-admin',
  viewport: { width, height: 900 },
  contextOptions: { hasTouch: width < 640, isMobile: width < 640 },
  async run({ page, goto }) {
    await goto(c.path)
    await page.getByRole('button', { name: c.opener, exact: true }).first().click()
    if (c.menu) await page.getByRole('menuitem', { name: c.menu, exact: true }).click()
    const panel = page.getByRole('dialog', { name: c.title, exact: true })
    await settlePanel(panel)
    const controls = await alignedControls(panel, c.minimum, 510)
    const expected = width === 1440 ? 510 : width - 50
    for (const field of controls) {
      const targetWidth = c.name === 'product' && width === 1440 && field.id !== 'prod-existing' ? (expected - 16) / 2 : expected
      assert.ok(Math.abs(field.width - targetWidth) <= 2, `${field.id}: expected ${targetWidth}px, got ${field.width}px`)
    }
    if (c.name === 'product' && width === 1440) {
      const offset = async () => panel.evaluate(el => {
        const label = [...el.querySelectorAll('p')].find(p => p.textContent === 'Extended amount')
        return label.getBoundingClientRect().top - el.querySelector('#prod-price').closest('.fui-Field').getBoundingClientRect().top
      })
      const before = await offset()
      await panel.getByRole('button', { name: 'Add product', exact: true }).click()
      await expectFieldMessage(panel, 'prod-price', 'Enter a price per unit')
      assert.ok(Math.abs(await offset() - before) <= 2, 'calculated total must not jump relative to the price row when errors appear')
    }
    await noOverflow(page)
  },
})))

const compoundTests = [1440, 320].map(width => ({
  name: `${width}px invitation link/copy and address/edit preserve their compound layout`,
  role: 'partner-admin',
  viewport: { width, height: 900 },
  contextOptions: { hasTouch: width < 640, isMobile: width < 640 },
  async run({ page, goto }) {
    await goto(ACCOUNT)
    await page.getByRole('button', { name: 'Edit address', exact: true }).waitFor()
    const address = await page.locator('#acc-address').evaluate(el => {
      const row = el.parentElement.getBoundingClientRect()
      const field = el.closest('.fui-Field').getBoundingClientRect()
      return { row: row.width, field: field.width }
    })
    assert.ok(Math.abs(address.row - address.field) <= 2)
    await goto('/profile/manage-access/edit-partner-contact/?id=c-sam')
    await page.getByRole('button', { name: /^(Send|Resend) invitation$/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Invitation created', exact: true })
    await settlePanel(dialog)
    const layout = await dialog.locator('#invite-url').evaluate(input => {
      const box = input.closest('.fui-Input')
      const group = box.parentElement
      const button = group.querySelector('button')
      return { input: box.getBoundingClientRect().toJSON(), button: button.getBoundingClientRect().toJSON(), group: group.getBoundingClientRect().toJSON() }
    })
    if (width === 1440) {
      assert.ok(Math.abs(layout.input.y - layout.button.y) <= 2, 'desktop copy action should stay beside the link')
      assert.ok(layout.input.right <= layout.button.x, 'link and button must not overlap')
    }
    assert.ok(layout.input.right <= layout.group.right + 1 && layout.button.right <= layout.group.right + 1)
    await noOverflow(page)
  },
}))

const detailTests = [
  {
    name: 'partner-contact form and invitation sidebar remain adjacent within a bounded grid',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto('/profile/manage-access/edit-partner-contact/?id=c-sam')
      await expectH1(page, 'Sam Rivera')
      const widths = await page.locator('#epc-first').evaluate(el => {
        const form = el.closest('form')
        const grid = form.parentElement
        const sidebar = form.nextElementSibling
        return { form: form.getBoundingClientRect().toJSON(), sidebar: sidebar.getBoundingClientRect().toJSON(), grid: grid.getBoundingClientRect().width }
      })
      assert.ok(widths.grid <= 1112)
      assert.ok(widths.form.width <= 768)
      assert.ok(Math.abs(widths.sidebar.x - widths.form.right - 24) <= 2, 'do not create a large gap beside a capped form')
      const noteCard = await page.getByRole('heading', { name: 'Notes', exact: true }).evaluate(el => el.closest('.fui-Card').getBoundingClientRect().toJSON())
      assert.ok(Math.abs(noteCard.left - widths.form.left) <= 2 && Math.abs(noteCard.right - widths.sidebar.right) <= 2,
        'Notes card must align with the bounded form/sidebar grid')
    },
  },
  {
    name: 'representative long customer name fits the desktop picker without truncating its selected text',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto(`${OPP}/create-opportunity/`)
      await page.locator('#opp-topic').waitFor()
      const name = 'Northern Regional Technology and Customer Services Group Ltd.'
      assert.ok(name.length >= 60)
      await page.evaluate(({ key, name }) => {
        const db = JSON.parse(localStorage.getItem(key))
        db.accounts.find(a => a.id === 'acc-adventure').name = name
        localStorage.setItem(key, JSON.stringify(db))
      }, { key: STORAGE_KEYS.db, name })
      await page.reload()
      await page.locator('#opp-customer').selectOption('acc-adventure')
      const fits = await page.locator('#opp-customer').evaluate(el => {
        const style = getComputedStyle(el)
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        context.font = style.font
        const available = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
        return context.measureText(el.selectedOptions[0].textContent).width <= available
      })
      assert.ok(fits, 'representative customer name should fit the desktop field')
    },
  },
]

export const tests = [...pageTests, ...panelTests, ...compoundTests, ...detailTests]
