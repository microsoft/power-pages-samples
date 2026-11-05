import { assert, expectH1, STORAGE_KEYS, VIEWPORTS } from './lib.mjs'

const moduleMatches = name => request => {
  const path = request instanceof URL ? request.pathname : new URL(typeof request === 'string' ? request : request.url()).pathname
  return new RegExp(`/(?:${name}\\.tsx|${name}-[a-z0-9]+\\.js)$`).test(path)
}

function trackModules(page, name) {
  const requests = []
  page.on('request', request => {
    if (moduleMatches(name)(request)) requests.push(request)
  })
  return requests
}

const state = page => page.evaluate(keys => ({
  url: location.href,
  heading: document.querySelector('h1')?.textContent,
  history: history.length,
  storage: Object.values(keys).map(key => localStorage.getItem(key)),
}), STORAGE_KEYS)

export const tests = [
  {
    name: 'hover waits 100ms, cancels brief intent, and warms navigation without mounting the screen',
    role: 'anonymous',
    async run({ page, goto }) {
      const requests = trackModules(page, 'ProgramDetails')
      const api = []
      page.on('request', request => {
        if (new URL(request.url()).pathname.startsWith('/_api/')) api.push(request.url())
      })
      await goto('/sitemap/')
      await expectH1(page, 'Sitemap')
      const before = await state(page)
      const link = page.getByRole('main').getByRole('link', { name: 'Program details', exact: true })
      assert.equal(requests.length, 0, 'screen code must stay lazy until intent')
      await page.clock.install()
      await page.clock.pauseAt(new Date(Date.now() + 1000))

      await link.dispatchEvent('pointerover', { pointerType: 'mouse' })
      await page.clock.runFor(50)
      await link.dispatchEvent('pointerout', { pointerType: 'mouse' })
      await page.clock.runFor(150)
      assert.equal(requests.length, 0, 'leaving before the dwell threshold must cancel')

      await link.dispatchEvent('pointerover', { pointerType: 'mouse' })
      await page.clock.runFor(99)
      await page.waitForTimeout(50)
      assert.equal(requests.length, 0, 'hover must not start before 100ms')
      const requested = page.waitForRequest(moduleMatches('ProgramDetails'))
      await page.clock.runFor(1)
      await requested
      await page.waitForLoadState('networkidle')
      assert.deepEqual(await state(page), before, 'preloading must not navigate, mount or change stored data')
      assert.deepEqual(api, [], 'code preloading must not fetch business data')

      await link.dispatchEvent('pointerout', { pointerType: 'mouse' })
      await link.dispatchEvent('pointerover', { pointerType: 'mouse' })
      await page.clock.runFor(200)
      await link.dispatchEvent('click', { button: 0 })
      await expectH1(page, 'Program details')
      assert.equal(requests.length, 1, 'repeat intent and navigation must reuse the screen import')
    },
  },
  {
    name: 'click during a preload reuses the in-flight import and preserves the SPA document',
    role: 'anonymous',
    async run({ page, goto }) {
      const requests = trackModules(page, 'ProgramDetails')
      let release
      const held = new Promise(resolve => { release = resolve })
      await page.route(moduleMatches('ProgramDetails'), async route => {
        await held
        await route.continue()
      })
      await goto('/sitemap/')
      await expectH1(page, 'Sitemap')
      await page.evaluate(() => { window.preloadDocumentMarker = true })
      const link = page.getByRole('main').getByRole('link', { name: 'Program details', exact: true })
      const requested = page.waitForRequest(moduleMatches('ProgramDetails'))
      try {
        await link.hover()
        await requested
        await link.click()
        assert.equal(requests.length, 1)
      } finally {
        release()
      }
      await expectH1(page, 'Program details')
      assert.equal(await page.evaluate(() => window.preloadDocumentMarker), true, 'navigation must not reload the document')
      assert.equal(requests.length, 1)
    },
  },
  {
    name: 'focused create link and query-string edit links share one form module',
    role: 'partner-admin',
    async run({ page, goto }) {
      const requests = trackModules(page, 'CustomerAccountForm')
      await goto('/sitemap/')
      await expectH1(page, 'Sitemap')
      const before = await state(page)
      const requested = page.waitForRequest(moduleMatches('CustomerAccountForm'))
      await page.getByRole('main').getByRole('link', { name: 'Create customer account', exact: true }).focus()
      await requested
      await page.waitForLoadState('networkidle')
      assert.deepEqual(await state(page), before, 'focus must preload without creating a record or mounting a form')
      await page.getByRole('main').getByRole('link', { name: 'Customer accounts', exact: true }).click()
      await expectH1(page, 'Customer accounts')
      const edit = page.getByRole('main').getByRole('link', { name: 'Adventure Works Cycles', exact: true })
      assert.match(await edit.getAttribute('href'), /\?id=/)
      await edit.hover()
      await page.waitForTimeout(200)
      await edit.click()
      await expectH1(page, 'Adventure Works Cycles')
      assert.equal(requests.length, 1, 'create/edit paths, trailing slashes and record queries share screen code')
    },
  },
  {
    name: 'desktop group hover stays lazy; destination and account menu focus preload only their screens',
    role: 'partner-admin',
    async run({ page, goto }) {
      const overview = trackModules(page, 'ProgramHome')
      const details = trackModules(page, 'ProgramDetails')
      const faqs = trackModules(page, 'ProgramFAQs')
      const profile = trackModules(page, 'Profile')
      await goto('/sitemap/')
      await expectH1(page, 'Sitemap')
      const nav = page.getByRole('navigation', { name: 'Primary', exact: true })
      const trigger = nav.getByRole('button', { name: 'Partner program', exact: true })
      await trigger.hover()
      await page.waitForTimeout(200)
      assert.equal(overview.length + details.length + faqs.length, 0, 'group hover must not warm an entire submenu')
      await trigger.click()
      const requested = page.waitForRequest(moduleMatches('ProgramDetails'))
      await page.getByRole('menuitem', { name: /Program details/ }).focus()
      await requested
      await page.waitForLoadState('networkidle')
      assert.equal(details.length, 1)
      assert.equal(faqs.length, 0)
      await expectH1(page, 'Sitemap')
      await page.keyboard.press('Escape')
      const profileRequested = page.waitForRequest(moduleMatches('Profile'))
      await page.getByRole('button', { name: /Avery Chen/ }).click()
      await page.getByRole('menuitem', { name: 'Profile', exact: true }).focus()
      await profileRequested
      await expectH1(page, 'Sitemap')
      await page.getByRole('menuitem', { name: 'Profile', exact: true }).click()
      await expectH1(page, 'Profile')
      assert.equal(profile.length, 1)
    },
  },
  {
    name: 'touch intent in the mobile drawer preloads without navigating until tap',
    role: 'partner-admin',
    viewport: VIEWPORTS.mobile,
    contextOptions: { hasTouch: true, isMobile: true },
    async run({ page, goto }) {
      const requests = trackModules(page, 'CustomerContacts')
      await goto('/sitemap/')
      await expectH1(page, 'Sitemap')
      await page.getByRole('button', { name: 'Open navigation menu', exact: true }).tap()
      const link = page.getByRole('navigation', { name: 'Mobile', exact: true }).getByRole('link', { name: 'Customer contacts', exact: true })
      await link.dispatchEvent('pointerover', { pointerType: 'touch' })
      await page.waitForTimeout(150)
      assert.equal(requests.length, 0, 'touch pointer-enter is not hover intent')
      const requested = page.waitForRequest(moduleMatches('CustomerContacts'))
      await link.dispatchEvent('pointerdown', { pointerType: 'touch', button: 0 })
      await requested
      await expectH1(page, 'Sitemap')
      await link.tap()
      await expectH1(page, 'Customer contacts')
      assert.equal(requests.length, 1)
    },
  },
  {
    name: 'search hover and active-descendant keyboard selection preload destination screens only',
    role: 'anonymous',
    async run({ page, goto }) {
      const requests = trackModules(page, 'ProgramFAQs')
      await goto('/sitemap/')
      await expectH1(page, 'Sitemap')
      const input = page.getByRole('combobox', { name: 'Search the partner program' })
      await input.focus()
      const requested = page.waitForRequest(moduleMatches('ProgramDetails'))
      await page.getByRole('option').filter({ hasText: 'Program details' }).hover()
      await requested
      await expectH1(page, 'Sitemap')
      for (let i = 0; i < 6; i++) await input.press('ArrowDown')
      await page.waitForLoadState('networkidle')
      assert.equal(requests.length, 1, 'keyboard selection must warm the FAQ destination while focus stays on the input')
      assert.match(await page.locator(`#${await input.getAttribute('aria-activedescendant')}`).textContent(), /Frequently asked questions/)
      await expectH1(page, 'Sitemap')
      await input.press('Enter')
      await expectH1(page, 'Frequently asked questions')
    },
  },
  {
    name: 'a warmed destination still respects dirty-form recovery and normal navigation',
    role: 'partner-admin',
    async run({ page, goto }) {
      const requests = trackModules(page, 'ProgramFAQs')
      await goto('/opportunities/managed-opportunities/create-opportunity/')
      await expectH1(page, 'Create opportunity')
      await page.locator('#opp-topic').fill('Keep this preloaded navigation draft')
      const link = page.getByRole('navigation', { name: 'Footer', exact: true }).getByRole('link', { name: 'Frequently asked questions', exact: true })
      const requested = page.waitForRequest(moduleMatches('ProgramFAQs'))
      await link.hover()
      await requested
      await page.waitForLoadState('networkidle')
      assert.equal(await page.getByRole('dialog').count(), 0, 'preloading must not attempt navigation or open a draft warning')
      await link.click()
      const guard = page.getByRole('dialog', { name: 'Discard unsaved changes?', exact: true })
      await guard.getByRole('button', { name: 'Keep editing', exact: true }).click()
      assert.equal(await page.locator('#opp-topic').inputValue(), 'Keep this preloaded navigation draft')
      await expectH1(page, 'Create opportunity')
      await link.click()
      await guard.getByRole('button', { name: 'Discard changes', exact: true }).click()
      await expectH1(page, 'Frequently asked questions')
      assert.equal(requests.length, 1)
    },
  },
  {
    name: 'a failed speculative import is diagnosed without a notice or unhandled rejection',
    role: 'anonymous',
    async run({ page, goto, errors }) {
      await goto('/sitemap/')
      await expectH1(page, 'Sitemap')
      const before = await state(page)
      const beforeAlerts = await page.getByRole('main').getByRole('alert').allTextContents()
      const warnings = []
      page.on('console', message => {
        if (message.type() === 'warning' && message.text().includes('Route preloading failed for /partner-program/partner-program-details:')) warnings.push(message.text())
      })
      await page.route(moduleMatches('ProgramDetails'), route => route.abort('failed'))
      await page.getByRole('main').getByRole('link', { name: 'Program details', exact: true }).hover()
      await page.waitForTimeout(500)
      assert.equal(warnings.length, 1, 'speculative failures must have a diagnostic')
      assert.deepEqual(await state(page), before)
      assert.deepEqual(await page.getByRole('main').getByRole('alert').allTextContents(), beforeAlerts, 'hover failure must not show a page error')
      // A deliberate failed module request emits a browser resource error, not an application rejection.
      for (let i = errors.length - 1; i >= 0; i--) {
        if (/^console: Failed to load resource: net::ERR_FAILED/.test(errors[i]) && /ProgramDetails(?:-|\.tsx)/.test(errors[i])) errors.splice(i, 1)
      }
      assert.deepEqual(errors, [])
    },
  },
]
