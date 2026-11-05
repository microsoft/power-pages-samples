// Key partner flows, driven through role/label-based locators.
import { assert, expectFieldMessage, expectH1, expectText, setMockLatency, STORAGE_KEYS, waitForUrl } from './lib.mjs'

const OPP = '/opportunities/managed-opportunities'
const details = id => `${OPP}/opportunity-details/?id=${id}`

/** Page-level notice: a Fluent MessageBar above the routed page (cards also use role="group", so match the bar). */
function notice(page, text) {
  return page.getByRole('main').locator('.fui-MessageBar').filter({ hasText: text })
}

async function expectNotice(page, text) {
  await notice(page, text).first().waitFor()
}

/** Inline feedback beside the control or section that caused it (a polite live region). */
async function expectInline(scope, text) {
  await scope.getByRole('status').filter({ hasText: text }).first().waitFor()
}

export const tests = [
  {
    name: 'partner-admin accepts a distributed opportunity -> details page, then in Managed list',
    role: 'partner-admin',
    async run({ page, goto }) {
      const topic = 'Fleet telematics rollout'
      await goto('/opportunities/distributed-opportunities/')
      await expectH1(page, 'Distributed opportunities')
      await page.getByRole('button', { name: `Accept ${topic}` }).click()
      const dialog = page.getByRole('dialog', { name: 'Accept opportunity' })
      await dialog.waitFor()
      await dialog.getByRole('button', { name: 'Accept opportunity', exact: true }).click()
      await waitForUrl(page, u => u.pathname.endsWith('/opportunity-details/') && !!u.searchParams.get('id'), 'opportunity details page')
      await expectH1(page, topic)
      await expectNotice(page, `"${topic}" accepted. Next, add products and customer contacts.`)
      await expectText(page.getByRole('main'), /^Accepted$/)

      await goto(`${OPP}/`)
      await expectH1(page, 'Managed opportunities')
      // Live search (no Search button) within the default "Open" status filter.
      await page.getByRole('searchbox', { name: 'Search by topic' }).fill(topic)
      const table = page.getByRole('table', { name: 'Managed opportunities, open' })
      await expectText(table, topic)
      await page.waitForFunction(() => document.querySelectorAll('main table tbody tr').length === 1, null, { timeout: 5_000 }).catch(() => assert.fail('search should narrow the list to one row'))
    },
  },
  {
    name: 'partner-admin creates an opportunity (error summary + inline errors, then success -> details page)',
    role: 'partner-admin',
    async run({ page, goto }) {
      const topic = `E2E opportunity ${Date.now()}`
      await goto(`${OPP}/create-opportunity/`)
      await expectH1(page, 'Create opportunity')
      const submit = page.locator('form').getByRole('button', { name: 'Create opportunity', exact: true })
      await submit.click()
      await expectText(page, "There's a problem")
      await expectFieldMessage(page, 'opp-topic', 'Enter a topic')
      await expectFieldMessage(page, 'opp-customer', 'Select a potential customer')
      await expectFieldMessage(page, 'opp-close', 'Enter an estimated close date')

      await page.getByLabel('Topic').fill(topic)
      await page.getByLabel('Potential customer').selectOption({ label: 'Adventure Works Cycles' })
      await page.getByLabel('Estimated close date').fill('2027-03-31')
      await submit.click()
      await waitForUrl(page, u => u.pathname.endsWith('/opportunity-details/') && !!u.searchParams.get('id'), 'opportunity details page')
      await expectH1(page, topic)
      await expectNotice(page, `Opportunity "${topic}" created. Next, add products and customer contacts.`)
      await expectText(page.getByRole('main'), /^In progress$/i)
      await expectText(page.getByRole('main'), 'Next steps')
    },
  },
  {
    name: 'partner-admin registers a deal and simulates vendor review -> Approved',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto(details('opp-2406'))
      await expectH1(page, 'Analytics dashboards')
      // One primary "Register deal" in the header (the Next steps checklist and empty registration panel repeat it).
      await page.getByRole('button', { name: 'Register deal', exact: true }).first().click()
      const dialog = page.getByRole('dialog', { name: 'Register deal' })
      await dialog.waitFor()
      await dialog.getByRole('button', { name: 'Submit registration' }).click()
      await expectText(dialog, "There's a problem")
      await expectFieldMessage(dialog, 'reg-reason', 'Enter a reason for registering this deal')
      await dialog.getByLabel('Reason for registering').fill('Sourced through our analytics workshop.')
      await dialog.getByRole('button', { name: 'Submit registration' }).click()
      await dialog.waitFor({ state: 'hidden' })
      await expectNotice(page, 'Your deal registration has been sent to Zava for review.')

      await page.getByRole('button', { name: 'Simulate vendor review (move to Under Review)' }).click()
      await expectInline(page, 'Simulated: registration moved to Under Review.')
      await page.getByRole('button', { name: 'Simulate vendor review (approve)' }).click()
      await expectInline(page, 'Simulated: registration approved for 180 days.')
      const registration = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Analytics dashboards – registration' }) })
      await expectText(registration, 'Approved')
      assert.equal(await page.getByRole('button', { name: /Simulate vendor review/ }).count(), 0, 'simulation button should disappear once Approved')
      assert.equal(await page.getByRole('button', { name: 'Register deal', exact: true }).count(), 0, 'Register deal should be gone once a registration is active')
    },
  },
  {
    name: 'partner-admin closes an opportunity as won (dialog captures actual revenue + date)',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto(details('opp-2404'))
      await expectH1(page, 'Cloud migration – phase 1')
      await page.getByRole('button', { name: 'Close opportunity' }).click()
      await page.getByRole('menuitem', { name: 'Close as won' }).click()
      const dialog = page.getByRole('dialog', { name: 'Close opportunity as won' })
      await dialog.waitFor()
      const revenue = dialog.getByLabel('Actual revenue')
      await revenue.fill('')
      await dialog.getByRole('button', { name: 'Close as won' }).click()
      await expectText(dialog, "There's a problem")
      await expectFieldMessage(dialog, 'close-revenue', 'Enter the actual revenue')
      await revenue.fill('123456')
      await dialog.getByLabel('Actual close date').fill('2026-10-15')
      await dialog.getByRole('button', { name: 'Close as won' }).click()
      await dialog.waitFor({ state: 'hidden' })
      await expectNotice(page, 'The opportunity has been closed as won.')
      await page.getByRole('button', { name: 'Reopen opportunity' }).waitFor()
      assert.equal(await page.getByRole('button', { name: 'Close opportunity' }).count(), 0, 'Close opportunity should be gone after closing')
      const main = page.getByRole('main')
      await expectText(main, 'Actual revenue')
      await expectText(main, /(?<!CA)\$123,456/)
      await expectText(main, 'Oct 15, 2026')
    },
  },
  {
    name: 'partner-manager creates a customer account (inline error, then success)',
    role: 'partner-manager',
    async run({ page, goto }) {
      const name = `E2E Customer ${Date.now()}`
      await goto('/customers/customer-accounts/create-customer-account/')
      await expectH1(page, 'Create customer account')
      const submit = page.getByRole('button', { name: 'Create account', exact: true })
      await submit.click()
      await expectText(page, "There's a problem")
      await expectFieldMessage(page, 'acc-name', 'Enter account name')
      await page.getByLabel('Account name').fill(name)
      await submit.click()
      await waitForUrl(page, u => u.pathname.includes('/edit-customer-account') && !!u.searchParams.get('id'), 'edit customer account page')
      await expectH1(page, name)
      await expectNotice(page, `${name} created.`)
      await page.getByRole('button', { name: 'Save account', exact: true }).waitFor()
    },
  },
  {
    name: 'partner-admin changes a partner contact role in Manage access (overflow menu -> Change role)',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto('/profile/manage-access/')
      await expectH1(page, 'Manage access')
      const row = page.getByRole('row').filter({ has: page.getByRole('link', { name: 'Riley Okafor' }) })
      await expectText(row, 'Partner Seller')
      await page.getByRole('button', { name: 'More actions for Riley Okafor' }).click()
      await page.getByRole('menuitem', { name: 'Change role' }).click()
      const dialog = page.getByRole('dialog', { name: 'Change role' })
      await dialog.waitFor()
      assert.ok(await dialog.getByRole('radio', { name: /^Partner Seller/ }).isChecked(), 'current role should be preselected')
      await dialog.getByRole('radio', { name: /^Partner Manager/ }).check()
      await dialog.getByRole('button', { name: 'Save role' }).click()
      await dialog.waitFor({ state: 'hidden' })
      await expectNotice(page, "Riley Okafor's role has been updated.")
      await expectText(row, 'Partner Manager')
    },
  },
  {
    name: 'partner-seller sees collaborative opp-2501 read-only (no Close opportunity, no inputs)',
    role: 'partner-seller',
    async run({ page, goto }) {
      await goto(`${OPP}/opportunity-details-shared/?id=opp-2501`)
      await expectH1(page, 'Crew scheduling optimisation')
      await expectText(page, 'Collaborative opportunity')
      const main = page.getByRole('main')
      assert.equal(await main.getByRole('button', { name: 'Close opportunity' }).count(), 0, 'seller must not see Close opportunity on a shared opportunity')
      assert.equal(await main.getByRole('button', { name: /Register deal|Extend registration|Reopen opportunity/ }).count(), 0, 'no opportunity actions on a shared opportunity')
      assert.equal(await main.getByRole('button', { name: 'More actions' }).count(), 0, 'no overflow (Return to Zava) menu on a shared opportunity')
      // Read-only users get a label/value list instead of disabled inputs.
      assert.equal(await main.getByRole('textbox', { name: 'Topic' }).count(), 0, 'Topic should not be an input')
      await expectText(main.locator('dt'), 'Topic')
      // Notes can still be added on a collaborative opportunity.
      await main.getByRole('button', { name: 'Add note' }).waitFor()
      // The editable route redirects collaborative opportunities to the shared view.
      await goto(details('opp-2501'))
      await waitForUrl(page, u => u.pathname.endsWith('/opportunity-details-shared/'), 'shared details redirect')
    },
  },
  {
    name: 'anonymous self-registration enforces the password policy, then starts the partner application',
    role: 'anonymous',
    async run({ page, goto }) {
      await goto('/registration')
      await expectH1(page, 'Create an account')
      await page.locator('#reg-email').fill('new.partner@example.com')
      await page.locator('#reg-password').fill('lowercaseonly')
      await page.locator('#reg-confirm').fill('lowercaseonly')
      const submit = page.locator('form').getByRole('button', { name: 'Create account', exact: true })
      await submit.click()
      await expectFieldMessage(page, 'reg-password', 'Password must include 3 of these: lowercase letters, uppercase letters, numbers and symbols')
      await page.locator('#reg-password').fill('Partner-2026')
      await page.locator('#reg-confirm').fill('Partner-2027')
      await submit.click()
      await expectFieldMessage(page, 'reg-confirm', 'Passwords don’t match. Enter the same password in both fields.')
      await page.locator('#reg-confirm').fill('Partner-2026')
      await submit.click()
      await expectH1(page, 'Register to be a partner')
    },
  },
  {
    name: 'anonymous redeems an invitation with an existing account -> sign-in carries the invitation code',
    role: 'anonymous',
    async run({ page, goto }) {
      await goto('/redeem-invitation?invitation=NWP-3T8H-6R1Z')
      await expectH1(page, 'Redeem invitation')
      assert.equal(await page.locator('#redeem-code').inputValue(), 'NWP-3T8H-6R1Z')
      await page.getByRole('checkbox', { name: 'Sign in with an existing account instead of registering' }).check()
      await page.locator('form').getByRole('button', { name: 'Redeem invitation', exact: true }).click()
      await waitForUrl(page, u => u.pathname === '/login' && u.searchParams.get('invitationCode') === 'NWP-3T8H-6R1Z', 'sign-in with invitation code')
      await expectH1(page, 'Sign in')
      await expectText(page, /Sign in to redeem invitation NWP-3T8H-6R1Z\./)
    },
  },
  {
    name: 'page notice follows the create redirect, can be dismissed, and expires on the next navigation',
    role: 'partner-admin',
    async run({ page, goto }) {
      const name = `E2E Notice ${Date.now()}`
      await goto('/customers/customer-accounts/create-customer-account/')
      await page.getByLabel('Account name').fill(name)
      await page.getByRole('button', { name: 'Create account', exact: true }).click()
      await waitForUrl(page, u => u.pathname.includes('/edit-customer-account'), 'edit customer account page')
      await expectNotice(page, `${name} created.`)
      await notice(page, `${name} created.`).getByRole('button', { name: 'Dismiss message' }).click()
      await notice(page, `${name} created.`).waitFor({ state: 'detached' })
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'main', 'focus returns to the page after dismissing')

      await goto('/profile/manage-access/')
      await page.getByRole('button', { name: 'More actions for Riley Okafor' }).click()
      await page.getByRole('menuitem', { name: 'Change role' }).click()
      const dialog = page.getByRole('dialog', { name: 'Change role' })
      await dialog.getByRole('radio', { name: /^Partner Manager/ }).check()
      await dialog.getByRole('button', { name: 'Save role' }).click()
      await expectNotice(page, "Riley Okafor's role has been updated.")
      await page.getByRole('link', { name: 'Riley Okafor' }).click()
      await waitForUrl(page, u => u.pathname.includes('/edit-partner-contact'), 'edit partner contact page')
      // A notice expires when the user navigates on (after its exit motion).
      await notice(page, 'role has been updated').waitFor({ state: 'detached', timeout: 3000 })
    },
  },
  {
    name: 'inline feedback: "Saved" sits beside Save and clears on the next edit; Undo restores a removed product',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto('/customers/customer-accounts/edit-customer-account/?id=acc-adventure')
      await page.getByLabel('Account number').fill('ACC-1001')
      await page.getByRole('button', { name: 'Save account', exact: true }).click()
      const footer = page.getByRole('button', { name: 'Save account', exact: true }).locator('..')
      await expectInline(footer, 'Account saved.')
      assert.equal(await notice(page, 'Account saved.').count(), 0, 'a same-page save is not repeated as a page notice')
      await page.getByLabel('Account number').fill('ACC-1002')
      await footer.getByRole('status').filter({ hasText: 'Account saved.' }).waitFor({ state: 'detached' })

      await goto(details('opp-2404'))
      const products = page.locator('.fui-Card').filter({ has: page.getByRole('heading', { name: 'Products', exact: true }) })
      await products.getByRole('button', { name: 'Remove Cloud Migration Services' }).click()
      await expectInline(products, 'Removed Cloud Migration Services.')
      await products.getByRole('button', { name: 'Undo', exact: true }).click()
      await expectInline(products, 'Cloud Migration Services restored.')
      await products.getByRole('button', { name: 'Remove Cloud Migration Services' }).waitFor()
    },
  },
  {
    name: 'currency: amounts and money hints use US dollars, never CA$',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto(details('opp-2404'))
      await expectH1(page, 'Cloud migration – phase 1')
      const main = page.getByRole('main')
      await expectText(main, /^\$25,000$/)
      await expectText(main, 'In US dollars (USD)')
      assert.equal(await main.getByText(/CA\$|Canadian/).count(), 0, 'no Canadian currency text on the page')
    },
  },
  {
    name: 'pending actions: confirm dialog stays open with "Accepting…", ignores Esc and repeat clicks, then navigates',
    role: 'partner-admin',
    async run({ page, context, goto }) {
      await setMockLatency(context, 1500)
      const topic = 'Fleet telematics rollout'
      await goto('/opportunities/distributed-opportunities/')
      await expectH1(page, 'Distributed opportunities')
      await page.getByRole('button', { name: `Accept ${topic}` }).click()
      const dialog = page.getByRole('dialog', { name: 'Accept opportunity' })
      await dialog.waitFor()
      const confirm = dialog.getByRole('button', { name: 'Accept opportunity', exact: true })
      await confirm.dblclick()
      const busy = dialog.getByRole('button', { name: 'Accepting…' })
      await busy.waitFor()
      assert.equal(await busy.getAttribute('aria-disabled'), 'true', 'the pending button is disabled but focusable')
      assert.equal(await dialog.getByRole('button', { name: 'Cancel' }).getAttribute('aria-disabled'), 'true', 'Cancel is blocked while the write runs')
      await page.keyboard.press('Escape')
      assert.ok(await dialog.isVisible(), 'Esc does not close the dialog while the write runs')
      await waitForUrl(page, u => u.pathname.endsWith('/opportunity-details/') && !!u.searchParams.get('id'), 'opportunity details page')
      await expectH1(page, topic)
      await expectNotice(page, `"${topic}" accepted. Next, add products and customer contacts.`)
    },
  },
  {
    name: 'pending actions: a double click on Add note writes one note and shows "Adding…"',
    role: 'partner-admin',
    async run({ page, context, goto }) {
      await setMockLatency(context, 1000)
      const text = `E2E pending note ${Date.now()}`
      await goto(details('opp-2404'))
      const notes = page.getByRole('group', { name: 'Add a note' })
      await notes.getByLabel('New note').fill(text)
      await notes.getByRole('button', { name: 'Add note' }).dblclick()
      await notes.getByLabel('New note').press('Control+Enter')
      await notes.getByRole('button', { name: 'Adding…' }).waitFor()
      await expectInline(notes, 'Note added.')
      await notes.getByRole('button', { name: 'Add note' }).waitFor()
      assert.equal(await page.getByRole('main').getByText(text, { exact: true }).count(), 1, 'exactly one note is written')
    },
  },
  {
    name: 'retired technician is absent from seed personas and is removed from saved mock sessions',
    role: 'anonymous',
    async run({ page, goto }) {
      await goto('/')
      const snapshot = await page.evaluate(keys => {
        const db = JSON.parse(localStorage.getItem(keys.db))
        return {
          contacts: db.contacts.map(c => c.id),
          bookings: db.bookings.map(b => b.resourceContactId),
          options: [...document.querySelectorAll('select option')].map(o => o.value),
          workOrders: db.workOrders.length,
        }
      }, STORAGE_KEYS)
      assert.ok(!snapshot.contacts.includes('c-marco'))
      assert.ok(!snapshot.bookings.includes('c-marco'))
      assert.ok(snapshot.contacts.includes('c-kenji') && snapshot.contacts.includes('c-dmitri'))
      assert.ok(!snapshot.options.includes('partner-technician'))
      await goto('/login')
      assert.equal(await page.getByRole('radio', { name: /Partner Technician/ }).count(), 0)
      await page.evaluate(keys => {
        const db = JSON.parse(localStorage.getItem(keys.db))
        db.contacts.push({ id: 'c-marco', firstName: 'Retired', lastName: 'User', active: true, fieldTechnician: true, parentAccountId: 'acc-fabrikam' })
        db.bookings.push({ id: 'retired-booking', workOrderId: 'wo-204', resourceContactId: 'c-marco', resourceName: 'Retired User' })
        db.invitations.push({ id: 'retired-invitation', contactId: 'c-marco' })
        db.accounts[0].description = 'Preserve this edit'
        db.workOrders[0].timeline.push({ id: 'retired-event', text: 'Assigned to Retired User', by: 'Retired User' })
        localStorage.setItem(keys.db, JSON.stringify(db))
        localStorage.setItem(keys.role, JSON.stringify('partner-technician'))
        localStorage.setItem(keys.contact, JSON.stringify({ contactId: 'c-marco', role: 'partner-technician' }))
      }, STORAGE_KEYS)
      await goto('/')
      await expectH1(page, 'Grow together with the Zava partner network')
      const migrated = await page.evaluate(keys => ({
        db: JSON.parse(localStorage.getItem(keys.db)),
        contact: localStorage.getItem(keys.contact),
      }), STORAGE_KEYS)
      assert.ok(!migrated.db.contacts.some(c => c.id === 'c-marco'))
      assert.ok(!migrated.db.bookings.some(b => b.resourceContactId === 'c-marco'))
      assert.ok(!migrated.db.invitations.some(i => i.contactId === 'c-marco'))
      assert.equal(migrated.db.accounts[0].description, 'Preserve this edit')
      assert.equal(migrated.db.workOrders.length, snapshot.workOrders)
      assert.equal(migrated.db.workOrders[0].timeline.at(-1).by, 'Former technician')
      assert.equal(migrated.contact, null)
    },
  },
  // Technician workspace (Partner Technician web role) ----------------------------------------------------------
  {
    name: 'partner-technician works the assigned CU-204 visit: travel, arrival, diagnosis, service report',
    role: 'partner-technician',
    async run({ page, goto }) {
      await goto('/')
      await expectH1(page, 'Welcome back, Test')
      await page.getByRole('link', { name: 'Open work order', exact: true }).click()
      await expectH1(page, 'WO-00123 · High-temperature alarm on CU-204')

      await page.getByRole('button', { name: 'Start travel', exact: true }).click()
      await expectInline(page, 'Status updated: traveling to site.')
      await page.getByRole('button', { name: "I've arrived", exact: true }).click()
      await expectInline(page, 'Arrival recorded. You can now record your diagnosis.')
      assert.equal(await page.getByRole('button', { name: 'Submit service report', exact: true }).count(), 0, 'report waits for the diagnosis')

      await page.getByRole('button', { name: 'Record diagnosis', exact: true }).click()
      const diagnosis = page.getByRole('dialog', { name: 'Record diagnosis' })
      await diagnosis.waitFor()
      await diagnosis.getByRole('button', { name: 'Save diagnosis' }).click()
      await expectText(diagnosis, "There's a problem")
      await expectFieldMessage(diagnosis, 'dx-fault', 'Select the fault you found')
      await expectFieldMessage(diagnosis, 'dx-findings', 'Describe what you found')
      await diagnosis.getByLabel('Fault').selectOption('Compressor failure')
      await diagnosis.getByLabel('What you found').fill('Compressor seized; high discharge temperature and tripped overload.')
      await diagnosis.getByRole('checkbox', { name: 'Replacement part required' }).check()
      await diagnosis.getByRole('button', { name: 'Save diagnosis' }).click()
      await expectFieldMessage(diagnosis, 'dx-part', 'Select the replacement part, or clear Replacement part required')
      await diagnosis.getByRole('combobox', { name: /^Replacement part/ }).selectOption({ label: 'Zava Replacement Cooling Compressor (datZAVA-SP-COMP-200)' })
      await diagnosis.getByRole('button', { name: 'Save diagnosis' }).click()
      await diagnosis.waitFor({ state: 'hidden' })
      await expectNotice(
        page,
        'Diagnosis saved for WO-00123. A purchase order for Zava Replacement Cooling Compressor is raised when you submit the service report.',
      )

      await page.getByRole('button', { name: 'Submit service report', exact: true }).click()
      const report = page.getByRole('dialog', { name: 'Submit service report' })
      await report.waitFor()
      await expectText(report, /Contoso Hotels will see the summary in Customer Hub, and you can't edit the report afterwards\./)
      await expectText(report, /A purchase order for Zava Replacement Cooling Compressor is raised with Zava\./)
      await report.getByRole('button', { name: 'Submit service report' }).click()
      await expectFieldMessage(report, 'rp-confirm', 'Confirm the report is accurate')
      await report.getByLabel('Work performed').fill('Isolated the unit, confirmed the compressor failure and set a temporary cooling bypass.')
      await report.getByLabel('Outcome').selectOption('Follow-up visit needed')
      await report.getByLabel('Summary for the customer').fill('The CU-204 compressor has failed. A replacement is on order and we will return to fit it.')
      await report.getByRole('checkbox', { name: 'I confirm this report is accurate and complete' }).check()
      await report.getByRole('button', { name: 'Submit service report' }).click()
      await report.waitFor({ state: 'hidden' })
      await expectNotice(
        page,
        'Service report submitted for WO-00123. Contoso Hotels can now see your summary in Customer Hub. Purchase order PO-WO-00123 was raised for Zava Replacement Cooling Compressor.',
      )
      const main = page.getByRole('main')
      await expectText(main, 'The CU-204 compressor has failed. A replacement is on order and we will return to fit it.')
      await expectText(main, /PO-WO-00123/)
      await expectText(main, 'Purchase order PO-WO-00123 raised for the replacement part')
      assert.equal(await main.getByRole('button', { name: /Submit service report|Edit diagnosis|Start travel/ }).count(), 0, 'a submitted report is read-only')

      await goto('/work-orders/?view=completed')
      await expectText(page.getByRole('table', { name: 'Completed work orders' }), 'WO-00123 · High-temperature alarm on CU-204')

      // Zava dispatch books the follow-up visit: the earlier report must not block it.
      await page.evaluate(key => {
        const db = JSON.parse(localStorage.getItem(key))
        const start = new Date(Date.now() + 86_400_000).toISOString()
        db.bookings.push({ id: 'bk-204-follow-up', workOrderId: 'wo-204', resourceContactId: 'c-test-technician', resourceName: 'Test Technician', status: 'Scheduled', start, end: start, assignedOn: new Date().toISOString() })
        db.workOrders.find(w => w.id === 'wo-204').systemStatus = 'Scheduled'
        localStorage.setItem(key, JSON.stringify(db))
      }, STORAGE_KEYS.db)
      await goto('/work-orders/')
      await expectText(page.getByRole('table', { name: 'Work orders assigned to me' }), 'WO-00123 · High-temperature alarm on CU-204')
      await goto('/work-orders/work-order-details/?id=wo-204')
      await page.getByRole('button', { name: 'Start travel', exact: true }).waitFor()
    },
  },
  {
    name: 'partner-technician sees teammate work orders read-only and never another partner’s or sales records',
    role: 'partner-technician',
    async run({ page, goto }) {
      await goto('/work-orders/')
      await expectH1(page, 'Work orders')
      const primary = page.getByRole('navigation', { name: 'Primary', exact: true })
      assert.deepEqual(
        (await primary.getByRole('link').allInnerTexts()).map(t => t.trim()).filter(Boolean),
        ['Home', 'Work orders'],
        'technician navigation is limited to the Technician workspace',
      )
      await page.getByRole('tab', { name: /My organization/ }).click()
      await expectText(page.getByRole('table', { name: 'Open work orders in my organization' }), 'WO-00131 · Quarterly maintenance – AHU-3')
      assert.equal(await page.getByRole('main').getByText('WO-00140', { exact: false }).count(), 0, 'a rival partner’s work order is never listed')

      await goto('/work-orders/work-order-details/?id=wo-311')
      await expectH1(page, 'WO-00131 · Quarterly maintenance – AHU-3')
      await expectText(page.getByRole('main'), 'Assigned to Kenji Tanaka')
      assert.equal(await page.getByRole('main').getByRole('button', { name: /Start travel|Record diagnosis|Submit service report/ }).count(), 0)

      await goto('/work-orders/work-order-details/?id=wo-901')
      await expectText(page.getByRole('main'), "You can't view this work order")
    },
  },
  {
    name: 'partner-manager (Account Manager workspace) has no work orders or technician actions',
    role: 'partner-manager',
    async run({ page, goto }) {
      await goto('/')
      await expectH1(page, 'Welcome back, Jordan')
      assert.equal(await page.getByRole('navigation', { name: 'Primary', exact: true }).getByRole('link', { name: 'Work orders' }).count(), 0)
      await goto('/work-orders/work-order-details/?id=wo-204')
      await expectH1(page, 'Access denied')
    },
  },
  // Record lists show the Dataverse createdon date; sorting it descending brings the newest record to the top.
  ...[
    { role: 'partner-admin', path: '/opportunities/managed-opportunities/', table: /^Managed opportunities/ },
    { role: 'partner-admin', path: '/opportunities/distributed-opportunities/', table: 'Distributed opportunities' },
    { role: 'partner-admin', path: '/customers/customer-accounts/', table: 'Customer accounts' },
    { role: 'partner-admin', path: '/customers/customer-contacts/', table: 'Customer contacts' },
    { role: 'partner-admin', path: '/profile/manage-access/', table: 'Partner contacts and their portal access' },
    { role: 'partner-technician', path: '/work-orders/?view=team', table: 'Open work orders in my organization' },
  ].map(({ role, path, table }) => ({
    name: `${role} sorts ${path} by Created on, newest first`,
    role,
    async run({ page, goto }) {
      await goto(path)
      const grid = page.getByRole('table', { name: table })
      const header = grid.getByRole('columnheader', { name: /Created on/ })
      await header.waitFor()
      await header.getByRole('button').click()
      await header.getByRole('button').click()
      assert.equal(await header.getAttribute('aria-sort'), 'descending')
      const { index, cells } = await grid.evaluate(t => {
        const index = [...t.querySelectorAll('thead th')].findIndex(th => /Created on/.test(th.textContent ?? ''))
        return { index, cells: [...t.querySelectorAll('tbody tr')].map(tr => tr.querySelectorAll('td')[index]?.textContent?.trim() ?? '') }
      })
      assert.ok(index >= 0 && cells.length > 0, 'Created on column has rows')
      const times = cells.map(c => (c === '—' ? Number.NEGATIVE_INFINITY : Date.parse(c)))
      assert.ok(times.every(t => !Number.isNaN(t)), `Created on shows dates: ${cells.join(' | ')}`)
      assert.ok(times.every((t, i) => i === 0 || times[i - 1] >= t), `newest first: ${cells.join(' | ')}`)
    },
  })),
]
