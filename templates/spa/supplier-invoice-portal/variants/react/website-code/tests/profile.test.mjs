import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createServer as createHttpServer } from 'node:http'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { canAccess, contactGraph, field, read, siteRoleIds } from './profilePermissionModel.mjs'

const contactId = '11111111-1111-4111-8111-111111111111'
const companyId = '33333333-3333-4333-8333-333333333333'
let server
let browser
let localOrigin

before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    server: { host: '127.0.0.1', port: 0, hmr: false },
  })
  await server.listen()
  localOrigin = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ headless: true })
})

after(async () => {
  await browser?.close()
  await server?.close()
})

async function portalFixture(options = {}) {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: options.viewport })
  let contact = {
    contactid: contactId, firstname: 'Original', lastname: 'Contact',
    fullname: 'Original Contact', emailaddress1: 'original@example.com',
    telephone1: '555-0100', jobtitle: 'Buyer',
    '_parentcustomerid_value@OData.Community.Display.V1.FormattedValue': 'Fixture Supplier',
    ...(options.includeCompany ? {
      _parentcustomerid_value: companyId,
      '_parentcustomerid_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'account',
    } : {}),
  }
  const writes = []
  const requests = []
  const actor = { roles: siteRoleIds(options.roles ?? ['Supplier', 'Reviewer'], !options.anonymous), contactId }
  const graph = contactGraph()
  const configured = field(read('site-settings/Webapi-contact-fields.sitesetting.yml'), 'value').split(',')
  const allowed = options.missingLookupAlias ? configured.filter(name => name !== '_parentcustomerid_value') : configured
  let releasePatch
  const patchGate = new Promise(resolve => { releasePatch = resolve })
  await context.addInitScript(user => {
    window.Microsoft = { Dynamic365: { Portal: { User: user } } }
  }, {
    contactId: options.missingIdentity ? '' : contactId,
    userName: options.anonymous ? '' : '22222222-2222-4222-8222-222222222222', firstName: '', lastName: '',
    email: 'original@example.com', userRoles: options.roles ?? ['Authenticated Users', 'Supplier', 'Reviewer'],
  })
  // A non-local browser origin exercises the deployed auth/data branches.
  // All traffic is fulfilled locally; no portal or Dataverse request can escape.
  await context.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    requests.push({ path: url.pathname, method: request.method(), selected: url.searchParams.get('$select') })
    if (options.simulateReservedProfile && url.pathname === '/profile') {
      return route.fulfill({ status: 301, headers: { Location: '/profile/' } })
    }
    if (options.simulateReservedProfile && url.pathname === '/profile/') {
      return route.fulfill({ contentType: 'text/html', body: '<h1>Native host profile</h1>' })
    }
    if (url.pathname === '/_layout/tokenhtml') {
      if (options.tokenFailure) return route.fulfill({ status: 500, body: 'Token unavailable' })
      return route.fulfill({ body: '<input value="fixture-csrf" />', contentType: 'text/html' })
    }
    if (url.pathname.startsWith('/_api/')) {
      if (url.pathname === `/_api/contacts(${contactId})`) {
        if (request.method() === 'PATCH') {
          if (options.enforceProfilePermissions && !Object.keys(request.postDataJSON()).every(name =>
            canAccess(graph, actor, contactId, 'write', name, allowed))) {
            return route.fulfill({ status: 403, json: { error: { message: 'Contact profile write denied' } } })
          }
          writes.push({ url: url.pathname, headers: request.headers(), body: request.postDataJSON() })
          if (options.delayPatch) await patchGate
          if (options.networkFailure) return route.abort('failed')
          if (options.patchStatus) return route.fulfill({
            status: options.patchStatus, json: { error: { message: 'Profile write denied' } },
          })
          contact = { ...contact, ...request.postDataJSON() }
          contact.fullname = [contact.firstname, contact.lastname].filter(Boolean).join(' ')
          return route.fulfill({ status: 204 })
        }
        const missing = url.searchParams.get('$select').split(',').find(name => !allowed.includes(name))
        if (missing) {
          return route.fulfill({ status: 403, json: { error: {
            code: '90040101', message: `Attribute ${missing} in table contact is not enabled for Web Api.`,
          } } })
        }
        if (options.readDenied || (options.enforceProfilePermissions &&
            !url.searchParams.get('$select').split(',').every(name => canAccess(graph, actor, contactId, 'read', name, allowed)))) {
          return route.fulfill({ status: 403, json: { error: {
            code: '90040120', message: "You don't have permission to read the contact table.",
          } } })
        }
        if (options.readFailure || (options.readbackFailure && writes.length)) {
          return route.fulfill({ status: 400, json: { error: { message: 'Contact read unavailable' } } })
        }
        return route.fulfill({ json: contact })
      }
      if (options.includeCompany && url.pathname === `/_api/accounts(${companyId})`) {
        return route.fulfill({ json: {
          accountid: companyId, name: 'Fixture Supplier', accountcategorycode: 132140000, statecode: 0,
        } })
      }
      return route.fulfill({ json: { value: [] } })
    }
    assert.ok(['portal.example', 'localhost'].includes(url.hostname), 'fixture must never contact an external host')
    const response = await route.fetch({ url: `${localOrigin}${url.pathname}${url.search}` })
    return route.fulfill({ response })
  })
  const page = await context.newPage()
  const path = options.profilePath ?? '/myprofile'
  await page.goto(`${options.mock ? 'http://localhost' : 'http://portal.example'}${path}`)
  return { context, page, writes, requests, releasePatch }
}

test('myprofile direct navigation and full reload avoid the captured native profile redirect', async () => {
  const { context, page, requests, writes } = await portalFixture({
    profilePath: '/myprofile', simulateReservedProfile: true, roles: ['Authenticated Users'],
  })
  try {
    await page.getByLabel('Email Address').waitFor()
    assert.equal(await page.getByLabel('Email Address').inputValue(), 'original@example.com')
    await page.reload()
    await page.getByLabel('Email Address').waitFor()
    assert.equal(new URL(page.url()).pathname, '/myprofile')
    assert.equal(await page.getByLabel('Email Address').inputValue(), 'original@example.com')
    assert.equal(requests.filter(request => request.path.startsWith('/_api/contacts(') && request.method === 'GET').length, 2)
    assert.equal(writes.length, 0)
    assert.equal(requests.some(request => request.path === '/profile' || request.path === '/profile/'), false)
    assert.equal(await page.locator('aside').getByRole('link', { name: 'My Profile', exact: true }).getAttribute('href'), '/myprofile')
    await page.getByRole('button', { name: 'User menu', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Profile', exact: true }).click()
    assert.equal(new URL(page.url()).pathname, '/myprofile')
  } finally { await context.close() }
})

test('captured reserved profile route redirects to the native host page, not the SPA', async () => {
  const nativeServer = createHttpServer((request, response) => {
    if (request.url === '/profile') {
      response.writeHead(301, { Location: '/profile/' })
      response.end()
    } else {
      response.writeHead(200, { 'Content-Type': 'text/html' })
      response.end('<h1>Native host profile</h1>')
    }
  })
  await new Promise(resolve => nativeServer.listen(0, '127.0.0.1', resolve))
  const context = await browser.newContext()
  const page = await context.newPage()
  const requests = []
  page.on('request', request => requests.push(new URL(request.url()).pathname))
  try {
    await page.goto(`http://127.0.0.1:${nativeServer.address().port}/profile`)
    await page.getByRole('heading', { name: 'Native host profile', exact: true }).waitFor()
    assert.equal(new URL(page.url()).pathname, '/profile/')
    assert.deepEqual(requests, ['/profile', '/profile/'])
  } finally {
    await context.close()
    await new Promise(resolve => nativeServer.close(resolve))
  }
})

test('real Profile Save writes Contact and retains values after reload', async () => {
  const { context, page, writes } = await portalFixture()
  try {
    const name = page.locator('#profile-name, #profile-first-name')
    await name.fill('Updated')
    await page.getByLabel('Email Address').fill('updated@example.com')
    await page.getByLabel('Phone Number').fill('555-0199')
    await page.getByLabel('Job Title').fill('Purchasing lead')
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await page.getByText('Profile updated successfully', { exact: true }).waitFor()
    const writesAtSuccess = writes.length
    await page.locator('aside').getByText('Updated Contact', { exact: true }).waitFor()
    assert.equal(await page.locator('main').getByText('Updated Contact', { exact: true }).count(), 1,
      'mounted profile header must refresh without a reload')
    assert.equal(await page.locator('main').getByText('updated@example.com', { exact: true }).count(), 1)
    assert.equal(await page.getByText('Fixture Supplier', { exact: true }).count(), 1)
    await page.reload()
    await page.getByLabel('Email Address').waitFor()
    const reloadedEmail = await page.getByLabel('Email Address').inputValue()
    console.log(`Profile caller: success toast, Contact PATCH count=${writesAtSuccess}, reload retained email=${reloadedEmail === 'updated@example.com'}`)
    assert.equal(writesAtSuccess, 1, 'success toast must follow an authenticated Contact PATCH, not a simulated save')
    assert.equal(reloadedEmail, 'updated@example.com', 'server-backed profile must survive reload')
    assert.equal(writes[0].headers.__requestverificationtoken, 'fixture-csrf')
    assert.equal(writes[0].body.fullname, undefined, 'computed fullname must never be written')
    assert.deepEqual(writes[0].body, {
      firstname: 'Updated', lastname: 'Contact', emailaddress1: 'updated@example.com',
      telephone1: '555-0199', jobtitle: 'Purchasing lead',
    })
    assert.equal(await page.getByLabel('First Name').inputValue(), 'Updated')
    assert.equal(await page.getByLabel('Last Name').inputValue(), 'Contact')
    assert.equal(await page.getByLabel('Phone Number').inputValue(), '555-0199')
    assert.equal(await page.getByLabel('Job Title').inputValue(), 'Purchasing lead')
    const identity = await page.evaluate(async () => {
      const { getCurrentUser } = await import('/src/services/authService.ts')
      return getCurrentUser()
    })
    assert.equal(identity.firstName, 'Updated')
    assert.equal(identity.userName, '22222222-2222-4222-8222-222222222222', 'business email must not change the login identifier')
    assert.equal(identity.contactId, contactId)
    assert.deepEqual(identity.userRoles, ['Authenticated Users', 'Supplier', 'Reviewer'])
    assert.ok(await page.locator('aside').getByText('Updated Contact', { exact: true }).count())
  } finally {
    await context.close()
  }
})

test('real role-mode switching preserves saved Contact, company and additive grants', async () => {
  const { context, page, writes } = await portalFixture()
  try {
    await page.getByLabel('Email Address').fill('updated@example.com')
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await page.getByText('Profile updated successfully', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'User menu' }).click()
    const switcher = page.getByRole('menuitem', { name: /^Switch to (Supplier|Reviewer)$/ })
    const nextMode = (await switcher.innerText()).includes('Reviewer') ? 'reviewer' : 'supplier'
    await Promise.all([page.waitForEvent('load'), switcher.click()])
    await page.getByLabel('Email Address').waitFor()
    assert.equal(await page.getByLabel('Email Address').inputValue(), 'updated@example.com')
    assert.equal(await page.getByText('Fixture Supplier', { exact: true }).count(), 1)
    const identity = await page.evaluate(async () => {
      const auth = await import('/src/services/authService.ts')
      return { user: auth.getCurrentUser(), mode: auth.getActiveRoleModePreference() }
    })
    assert.equal(identity.mode, nextMode)
    assert.equal(identity.user.contactId, contactId)
    assert.equal(identity.user.userName, '22222222-2222-4222-8222-222222222222')
    assert.deepEqual(identity.user.userRoles, ['Authenticated Users', 'Supplier', 'Reviewer'])
    assert.equal(writes.length, 1, 'changing presentation mode must not write Contact or membership')
  } finally {
    await context.close()
  }
})

test('real save waits for response, disables controls and rejects duplicate in-flight submits', async () => {
  const { context, page, writes, releasePatch } = await portalFixture({ delayPatch: true })
  try {
    await page.getByLabel('Email Address').fill('updated@example.com')
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await page.waitForFunction(() => document.querySelector('button[type="submit"]')?.disabled)
    assert.equal(await page.getByText('Profile updated successfully', { exact: true }).count(), 0)
    await page.locator('form').evaluate(form => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await page.waitForTimeout(100)
    assert.equal(writes.length, 1)
    assert.equal(await page.getByLabel('Email Address').isDisabled(), true)
    releasePatch()
    await page.getByText('Profile updated successfully', { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Save Changes' }).isDisabled(), true, 'clean form cannot resubmit')
  } finally {
    releasePatch()
    await context.close()
  }
})

for (const width of [1440, 390]) {
test(`Authenticated Users onboarding reads and saves its own profile without business grants at ${width}px`, async () => {
  const { context, page, writes, requests } = await portalFixture({
    roles: ['Authenticated Users'], enforceProfilePermissions: true, viewport: { width, height: 900 },
  })
  try {
    await page.locator('form[aria-busy="false"]').waitFor()
    assert.equal(await page.getByLabel('Email Address').inputValue(), 'original@example.com',
      'default authenticated role must read its own Contact without a Supplier/Reviewer assignment')
    assert.equal(await page.locator('aside').getByText('Authenticated User', { exact: true }).count(), 1)
    assert.equal(await page.getByText('Total Invoices', { exact: true }).count(), 0)
    assert.equal(await page.locator('aside').getByRole('link', { name: /Invoice|Purchase|PO|Review|Dashboard/ }).count(), 0)
    await page.getByLabel('Email Address').fill('onboarding@example.com')
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await page.getByText('Profile updated successfully', { exact: true }).waitFor()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    if (process.env.PROFILE_SCREENSHOT_DIR) {
      await page.locator('main').evaluate(main => main.scrollTo(0, 0))
      await page.screenshot({ path: join(process.env.PROFILE_SCREENSHOT_DIR,
        `profile-${width}-onboarding.png`), animations: 'disabled' })
    }
    if (width < 768) await page.getByRole('button', { name: 'Open navigation menu' }).click()
    await page.getByRole('button', { name: 'User menu' }).click()
    assert.equal(await page.getByRole('menuitem', { name: /^Switch to / }).count(), 0)
    await page.reload()
    await page.getByLabel('Email Address').waitFor()
    assert.equal(await page.getByLabel('Email Address').inputValue(), 'onboarding@example.com')
    assert.equal(writes.length, 1)
    assert.equal(requests.filter(request => request.path.startsWith('/_api/') && !request.path.startsWith('/_api/contacts')).length, 0,
      'profile onboarding must not issue unauthorized business-statistics reads')
  } finally {
    await context.close()
  }
})
}

test('supplier affiliation reads the exact enabled Contact lookup alias before checking its Account', async () => {
  const { context, page, requests } = await portalFixture({ includeCompany: true, enforceProfilePermissions: true })
  try {
    await page.locator('form[aria-busy="false"]').waitFor()
    const actual = await page.evaluate(async () => {
      const { getSupplierCompanyId } = await import('/src/services/supplierAffiliationService.ts')
      return getSupplierCompanyId()
    })
    assert.equal(actual, companyId)
    assert.ok(requests.some(request => request.path === `/_api/contacts(${contactId})` &&
      request.selected === '_parentcustomerid_value'))
  } finally {
    await context.close()
  }
})

test('an omitted lookup read alias fails explicitly in both Profile and supplier affiliation callers', async () => {
  const { context, page, requests, writes } = await portalFixture({
    missingLookupAlias: true, includeCompany: true, enforceProfilePermissions: true,
  })
  try {
    const message = 'Attribute _parentcustomerid_value in table contact is not enabled for Web Api.'
    await page.getByRole('alert').filter({ hasText: message }).waitFor()
    assert.equal(await page.getByLabel('Email Address').inputValue(), '')
    assert.equal(await page.getByRole('button', { name: 'Save Changes' }).isDisabled(), true)
    const affiliationError = await page.evaluate(async () => {
      const { getSupplierCompanyId } = await import('/src/services/supplierAffiliationService.ts')
      try {
        await getSupplierCompanyId()
        throw new Error('Expected the missing lookup alias to fail.')
      } catch (error) {
        return error.message
      }
    })
    assert.equal(affiliationError, message)
    assert.equal(writes.length, 0)
    assert.equal(requests.filter(request => request.path === '/_api/accounts').length, 0,
      'a denied Contact lookup must not fall back to a different company or Account query')
  } finally {
    await context.close()
  }
})

test('anonymous users cannot load or save a Contact profile', async () => {
  const { context, page, writes, requests } = await portalFixture({ roles: [], anonymous: true, enforceProfilePermissions: true })
  try {
    await page.getByText('Sign in required', { exact: true }).waitFor()
    assert.equal(await page.getByLabel('Email Address').count(), 0)
    assert.equal(writes.length, 0)
    assert.equal(requests.filter(request => request.path.startsWith('/_api/contacts')).length, 0)
  } finally {
    await context.close()
  }
})

for (const scenario of [
  { patchStatus: 400, expected: 'Profile write denied' },
  { patchStatus: 401, expected: 'Session expired' },
  { patchStatus: 403, expected: 'Profile write denied' },
  { patchStatus: 500, expected: 'Profile write denied' },
  { networkFailure: true, expected: 'Failed to fetch' },
  { readbackFailure: true, expected: 'Profile saved, but' },
]) {
  test(`real Profile Save surfaces ${Object.keys(scenario)[0]} without success`, async () => {
    const { context, page } = await portalFixture(scenario)
    try {
      await page.getByLabel('Email Address').fill('updated@example.com')
      await page.getByRole('button', { name: 'Save Changes' }).click()
      await page.getByRole('alert').filter({ hasText: scenario.expected }).waitFor()
      assert.equal(await page.getByText('Profile updated successfully', { exact: true }).count(), 0)
      assert.equal(await page.getByLabel('Email Address').inputValue(), 'updated@example.com')
      assert.equal(await page.getByLabel('Email Address').isEnabled(), true)
      assert.equal(await page.getByRole('button', { name: 'Save Changes' }).isEnabled(), true)
    } finally {
      await context.close()
    }
  })
}

for (const scenario of [
  { readDenied: true, expected: "You don't have permission to read the contact table." },
  { readFailure: true, expected: 'Contact read unavailable' },
  { missingIdentity: true, expected: 'Sign in' },
  { tokenFailure: true, expected: 'Failed to fetch token' },
]) {
  test(`profile ${Object.keys(scenario)[0]} fails closed with no sample defaults or writes`, async () => {
    const { context, page, writes } = await portalFixture(scenario)
    try {
      await page.getByRole('alert').filter({ hasText: scenario.expected }).waitFor()
      assert.equal(await page.getByRole('button', { name: 'Save Changes' }).isDisabled(), true)
      assert.equal(await page.getByLabel('Phone Number').inputValue(), '')
      assert.equal(writes.length, 0)
      assert.equal(await page.getByText('Contoso Supplies Ltd', { exact: true }).count(), 0)
      assert.equal(await page.getByText('Last changed 30 days ago').count(), 0)
      assert.equal(await page.getByRole('button', { name: 'Change Password' }).count(), 0)
    } finally {
      await context.close()
    }
  })
}

test('mock profile explicitly saves only in this browser, survives reload and keeps role profiles separate', async () => {
  const { context, page, writes, requests } = await portalFixture({ mock: true })
  try {
    await page.getByLabel('Email Address').fill('demo@example.com')
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await page.getByText('Demo profile saved in this browser only', { exact: true }).waitFor()
    await page.reload()
    await page.getByLabel('Email Address').waitFor()
    assert.equal(await page.getByLabel('Email Address').inputValue(), 'demo@example.com')
    await page.evaluate(() => localStorage.setItem('mock-role', 'reviewer'))
    await page.reload()
    await page.getByLabel('Email Address').waitFor()
    assert.notEqual(await page.getByLabel('Email Address').inputValue(), 'demo@example.com')
    assert.equal(writes.length, 0)
    assert.equal(requests.filter(request => request.path.startsWith('/_api/contacts')).length, 0)
  } finally {
    await context.close()
  }
})

test('profile validation prevents blank last name and overlong contact fields', async () => {
  const { context, page, writes } = await portalFixture()
  try {
    await page.getByLabel('Last Name').fill('   ')
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await page.getByRole('alert').filter({ hasText: 'Last Name is required' }).waitFor()
    assert.equal(writes.length, 0)
    await page.getByLabel('Last Name').fill('Contact')
    await page.getByLabel('Job Title').evaluate(input => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(input, 'x'.repeat(101))
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await page.locator('form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    await page.getByRole('alert').filter({ hasText: 'Job Title must be at most 100 characters' }).waitFor()
    assert.equal(writes.length, 0)
  } finally {
    await context.close()
  }
})

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`profile visible success, reload and error layouts at ${viewport.width}px`, async () => {
    for (const patchStatus of [undefined, 400]) {
      const { context, page, writes } = await portalFixture({ viewport, patchStatus })
      try {
        const email = page.getByLabel('Email Address')
        await email.waitFor()
        assert.equal(await email.inputValue(), 'original@example.com')
        await page.getByLabel('First Name').fill('Updated')
        await email.fill('updated@example.com')
        await page.getByRole('button', { name: 'Save Changes' }).click()
        const state = patchStatus ? 'error' : 'success'
        await page.getByText(patchStatus ? 'Profile write denied' : 'Profile updated successfully',
          { exact: true }).first().waitFor()
        assert.equal(writes.length, 1)
        if (patchStatus) {
          assert.equal(await page.locator('main [role="alert"]').evaluate(alert => getComputedStyle(alert).color),
            'rgb(185, 28, 28)', 'persistent profile errors must use the existing error color')
        }
        assert.equal(await page.getByText('Fixture Supplier', { exact: true }).count(), 1)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true,
          'profile must not overflow the viewport')
        for (const label of ['First Name', 'Last Name', 'Email Address', 'Phone Number', 'Job Title']) {
          const bounds = await page.getByLabel(label).boundingBox()
          assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= viewport.width,
            `${label} must remain within the viewport`)
        }
        if (process.env.PROFILE_SCREENSHOT_DIR) {
          await page.screenshot({ path: join(process.env.PROFILE_SCREENSHOT_DIR,
            `profile-${viewport.width}-${state}.png`), fullPage: true, animations: 'disabled' })
          await page.locator('main').evaluate(main => main.scrollTo(0, 0))
          await page.screenshot({ path: join(process.env.PROFILE_SCREENSHOT_DIR,
            `profile-${viewport.width}-${state}-header.png`), animations: 'disabled' })
        }
        await page.reload()
        await email.waitFor()
        assert.equal(await email.inputValue(), patchStatus ? 'original@example.com' : 'updated@example.com')
      } finally {
        await context.close()
      }
    }
  })
}
