import { assert, expectH1, expectText, ROLES, STORAGE_KEYS } from './lib.mjs'
import { MATRIX } from './smoke.mjs'

const normalize = path => path.replace(/\/$/, '').toLowerCase()
const expectedHeading = (path, role) => {
  const route = MATRIX.find(r => normalize(r.path) === normalize(path))
  assert.ok(route, `add a heading expectation for ${path}`)
  return typeof route.h1 === 'object' ? route.h1[role] : route.h1
}

async function follow(page, path, heading) {
  await page.getByRole('main').locator(`a[href=${JSON.stringify(path)}]`).first().click()
  await expectH1(page, heading)
}

async function toSitemap(page) {
  await page.getByRole('navigation', { name: 'Footer', exact: true }).getByRole('link', { name: 'Sitemap', exact: true }).click()
  await expectH1(page, 'Sitemap')
}

const navigationTests = ROLES.map(role => ({
  name: `${role}: every available sitemap destination and security screen via in-app navigation`,
  role,
  async run({ page, goto }) {
    await goto('/sitemap/')
    await expectH1(page, 'Sitemap')
    const paths = await page.getByRole('main').locator('a[href]').evaluateAll(links =>
      [...new Set(links.map(link => link.getAttribute('href')))].filter(path => path !== '/sitemap/'))
    assert.ok(paths.length >= 6, 'navigation inventory must not be empty')
    for (const path of paths) {
      await follow(page, path, expectedHeading(path, role))
      await toSitemap(page)
    }
    if (role !== 'anonymous') {
      await follow(page, '/profile/', 'Profile')
      const securityPaths = await page.getByRole('main').locator('a[href]').evaluateAll(links =>
        [...new Set(links.map(link => link.getAttribute('href')))].filter(path => path.startsWith('/Account/Manage/')))
      assert.ok(securityPaths.length >= 3)
      for (const path of securityPaths) {
        await follow(page, path, expectedHeading(path, role))
        await follow(page, '/profile/', 'Profile')
      }
    }
  },
}))

const contextTests = ['UnsavedChanges', 'AppStore'].map(module => ({
  name: `${module}: provider and lazy consumer share context across dev module versions`,
  role: 'partner-admin',
  async run({ page, goto, baseUrl, notes }) {
    const dev = (await (await fetch(baseUrl)).text()).includes('/@vite/client')
    const rewritten = new Set()
    if (dev) {
      // Reproduce stale HMR import timestamps without editing source or restarting the user's server.
      await page.route(/\/src\/(?:App|pages\/opportunities\/CreateOpportunity)\.tsx(?:\?|$)/, async route => {
        const response = await route.fetch()
        const path = new URL(route.request().url()).pathname
        const original = await response.text()
        const version = path === '/src/App.tsx' ? 'provider' : 'consumer'
        const expression = new RegExp(`(["'])(/src/(?:components|store)/${module}\\.tsx)(?:\\?[^"']*)?\\1`, 'g')
        const body = original.replace(expression, (_, quote, url) => `${quote}${url}?journey-context=${version}${quote}`)
        if (body !== original) rewritten.add(version)
        await route.fulfill({ response, body })
      })
    } else {
      notes.push('Production bundle: normal context integration; distinct HMR module imports are exercised on the dev server.')
    }
    await goto('/opportunities/managed-opportunities/create-opportunity/')
    await expectH1(page, 'Create opportunity')
    if (dev) assert.deepEqual([...rewritten].sort(), ['consumer', 'provider'])
    await page.locator('#opp-topic').fill('Context integration draft')
    await page.getByRole('button', { name: 'Create customer account', exact: true }).click()
    const panel = page.getByRole('dialog', { name: 'Create customer account', exact: true })
    await panel.getByRole('textbox', { name: 'Account name' }).fill(`Context customer ${module}`)
    await panel.getByRole('button', { name: 'Create and select account' }).click()
    await panel.waitFor({ state: 'hidden' })
    assert.equal(await page.locator('#opp-topic').inputValue(), 'Context integration draft')
    const db = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEYS.db)
    assert.ok(db.accounts.some(a => a.name === `Context customer ${module}`))
    await page.getByRole('navigation', { name: 'Primary', exact: true }).getByRole('link', { name: 'Home', exact: true }).click()
    const guard = page.getByRole('dialog', { name: 'Discard unsaved changes?', exact: true })
    await guard.getByRole('button', { name: 'Keep editing' }).click()
    assert.equal(await page.locator('#opp-topic').inputValue(), 'Context integration draft', 'context fix must not bypass draft protection')
  },
}))

const workflowTests = [
  {
    name: 'remove retired feature data from existing browser storage without resetting partner work',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto('/customers/customer-accounts/')
      await expectH1(page, 'Customer accounts')
      const expected = await page.evaluate(key => {
        const db = JSON.parse(localStorage.getItem(key))
        db.accounts.find(a => a.id === 'acc-adventure').name = 'Preserved customer draft'
        db.comments.push({ id: 'kept-note', regardingType: 'contact', regardingId: 'c-sam', text: 'Keep this partner note', authorName: 'Avery Chen', createdOn: '2026-10-19' })
        const active = structuredClone(db)
        for (const key of ['cases', 'forums', 'threads', 'posts', 'articles', 'leads', 'polls']) {
          db[key] = [{ id: 'retired-record' }]
        }
        db.comments.push({ id: 'retired-note', regardingType: 'case', regardingId: 'retired-record', text: 'Retired case note' })
        localStorage.setItem(key, JSON.stringify(db))
        return active
      }, STORAGE_KEYS.db)
      await page.reload({ waitUntil: 'networkidle' })
      await expectH1(page, 'Customer accounts')
      const actual = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEYS.db)
      assert.deepEqual(actual, expected, 'retain every active collection and note while dropping retired data')
      assert.ok(await page.getByRole('link', { name: 'Preserved customer draft', exact: true }).count())
      await toSitemap(page)
      const retiredLinks = await page.getByRole('main').locator('a[href]').evaluateAll(links =>
        links.map(link => link.getAttribute('href')).filter(path =>
          /^\/(?:support|forums|knowledgebase|search|poll-archives|contact-us|public-profile)(?:\/|$)|^\/profile\/myportal(?:\/|$)/.test(path)))
      assert.deepEqual(retiredLinks, [])
    },
  },
  {
    name: 'switch personas repeatedly without reloading and preserve navigation permissions',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto('/')
      for (const role of [...ROLES, 'partner-admin']) {
        await page.getByLabel('Viewing as', { exact: true }).selectOption(role)
        await expectH1(page, expectedHeading('/', role))
        await toSitemap(page)
        const manage = page.getByRole('main').getByRole('link', { name: 'Manage access', exact: true })
        assert.equal(await manage.count(), role === 'partner-admin' ? 1 : 0)
        await follow(page, '/', expectedHeading('/', role))
      }
    },
  },
  {
    name: 'new partner application through approval, first customer and first opportunity',
    role: 'anonymous',
    async run({ page, goto }) {
      await goto('/registration')
      await page.locator('#reg-email').fill('journey@example.com')
      await page.locator('#reg-password').fill('Prototype-password')
      await page.locator('#reg-confirm').fill('Prototype-password')
      await page.locator('form').getByRole('button', { name: 'Create account', exact: true }).click()
      await expectH1(page, 'Register to be a partner')
      await page.locator('#app-org').fill('Journey Partners')
      await page.locator('#app-website').fill('https://journey.example.com')
      await page.locator('#app-competencies').fill('Cloud implementation')
      await page.getByRole('button', { name: 'Submit application', exact: true }).click()
      await expectText(page, 'Application submitted')
      await page.getByRole('button', { name: 'Prototype controls', exact: true }).click()
      await page.getByRole('button', { name: 'Simulate: move to Under Review', exact: true }).click()
      await page.getByRole('button', { name: 'Simulate: approve', exact: true }).click()
      await page.getByRole('button', { name: 'Sign in as Partner Admin of Journey Partners', exact: true }).click()
      await expectH1(page, 'Welcome back, Taylor')
      await page.getByRole('link', { name: 'Create opportunity', exact: true }).click()
      await expectH1(page, 'Create opportunity')
      await page.locator('#opp-topic').fill('Journey launch')
      await page.getByRole('button', { name: 'Create customer account', exact: true }).click()
      const panel = page.getByRole('dialog', { name: 'Create customer account', exact: true })
      await panel.getByRole('textbox', { name: 'Account name' }).fill('Journey Customer')
      await panel.getByRole('button', { name: 'Create and select account', exact: true }).click()
      await panel.waitFor({ state: 'hidden' })
      await page.locator('#opp-close').fill('2027-05-01')
      await page.locator('form').getByRole('button', { name: 'Create opportunity', exact: true }).click()
      await expectH1(page, 'Journey launch')
      await page.reload()
      await expectH1(page, 'Journey launch')
      const db = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEYS.db)
      const partner = db.accounts.find(a => a.name === 'Journey Partners')
      const customer = db.accounts.find(a => a.name === 'Journey Customer')
      const deal = db.opportunities.find(o => o.topic === 'Journey launch')
      assert.equal(customer.managingPartnerId, partner.id)
      assert.equal(deal.partnerId, partner.id)
      assert.equal(deal.customerId, customer.id)
    },
  },
  {
    name: 'create colleague, invite, redeem, edit profile and save contact preferences',
    role: 'partner-admin',
    async run({ page, goto }) {
      await goto('/profile/manage-access/')
      await page.getByRole('button', { name: 'Create partner contact', exact: true }).click()
      const panel = page.getByRole('dialog', { name: 'Create partner contact', exact: true })
      await panel.locator('#pc-first').fill('Journey')
      await panel.locator('#pc-last').fill('Seller')
      await panel.locator('#pc-email').fill('seller.journey@example.com')
      await panel.getByRole('radio', { name: /^Partner Seller/ }).check()
      await panel.getByRole('button', { name: 'Create contact', exact: true }).click()
      await panel.waitFor({ state: 'hidden' })
      await page.getByRole('link', { name: 'Journey Seller', exact: true }).click()
      await expectH1(page, 'Journey Seller')
      await page.getByRole('button', { name: 'Send invitation', exact: true }).click()
      const invitation = page.getByRole('dialog', { name: 'Invitation created', exact: true })
      const url = await invitation.locator('#invite-url').inputValue()
      await invitation.getByRole('button', { name: 'Close', exact: true }).last().click()
      await invitation.waitFor({ state: 'hidden' })
      await page.getByLabel('Viewing as', { exact: true }).selectOption('anonymous')
      await expectH1(page, 'Sign in')
      await goto(new URL(url).pathname + new URL(url).search)
      await page.locator('form').getByRole('button', { name: 'Redeem invitation', exact: true }).click()
      await expectH1(page, 'Profile')
      assert.equal(await page.locator('#pf-first').inputValue(), 'Journey')
      await page.locator('#pf-title').fill('Account executive')
      await page.getByRole('button', { name: 'Save profile', exact: true }).click()
      await expectText(page, 'Your profile has been saved.')
      await follow(page, '/Account/Manage/ChangeEmail', 'Change email')
      await page.locator('#sec-email').fill('updated.journey@example.com')
      await page.getByRole('button', { name: 'Update email', exact: true }).click()
      await expectText(page, 'Your email has been updated.')
      await follow(page, '/profile/', 'Profile')
      await page.reload()
      await page.locator('#pf-title').waitFor()
      assert.equal(await page.locator('#pf-title').inputValue(), 'Account executive')
      await expectText(page.getByRole('main'), 'updated.journey@example.com')
    },
  },
]

export const tests = [...contextTests, ...navigationTests, ...workflowTests]
