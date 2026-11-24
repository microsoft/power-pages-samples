import { test as base, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const test = base.extend<{ browserErrors: string[] }>({
  browserErrors: [async ({ page }, use) => {
    const errors: string[] = []
    const summaryRequests: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => { if (new URL(request.url()).pathname === '/_api/search/v1.0/summary') summaryRequests.push(request.url()) })
    await use(errors)
    expect(errors).toEqual([])
    expect(summaryRequests).toEqual([])
  }, { auto: true }],
})

const contactId = '11111111-1111-4111-8111-111111111111'
const caseId = '22222222-2222-4222-8222-222222222222'
const secondId = '33333333-3333-4333-8333-333333333333'
const articleId = '44444444-4444-4444-8444-444444444444'
const productId = '55555555-5555-4555-8555-555555555555'
const fileId = '66666666-6666-4666-8666-666666666666'
const now = '2026-10-15T10:00:00Z'
const profile = { id: contactId, firstName: 'Ada', lastName: 'Customer', email: 'ada@example.test', phone: '555-0100', address: '', account: null }
const firstCase = { id: caseId, number: 'CAS-1001', title: 'Customer gateway request', description: 'Readings stopped arriving.', state: 0, status: 1, created: now, updated: now }
const secondCase = { ...firstCase, id: secondId, number: 'CAS-1002', title: 'Completed service request', state: 1, status: 5 }
const dataverseCase = (item: typeof firstCase, customer = contactId) => ({
  incidentid: item.id, ticketnumber: item.number, title: item.title, description: item.description,
  statecode: item.state, statuscode: item.status, createdon: item.created, modifiedon: item.updated, _customerid_value: customer,
})
const article = { id: articleId, number: 'KA-1001', title: 'Published gateway guidance', description: 'Customer-safe steps.', content: '<p>Review the recorded readings.</p><script>window.articleScriptRan=true</script><img src="https://untrusted.invalid/tracker.png" onerror="window.articleScriptRan=true"><p>Contact support if needed.</p>' }
type Call = { path: string; method: string; body: Record<string, unknown>; query?: string }
type MockOptions = {
  failedWrite?: boolean; failedLoad?: boolean; repeatedCursor?: boolean; malformedProfile?: boolean
  empty?: boolean; catalogNextLink?: string; pagedKnowledge?: boolean; missingToken?: boolean; profileStatus?: number; offline?: boolean
  caseNextLink?: string | number; caseCustomer?: string; malformedCase?: boolean; firstStatus?: number
  createHeader?: string | null; createHeaderName?: string; createFailure?: number | 'offline'
  confirmation?: 'forbidden' | 'foreign' | 'wrong-id' | 'malformed'
  publishedResponse?: string
  knowledgeId?: string
  knowledgeStatus?: number
  attachmentFailure?: number | 'offline'
  receiptFailure?: number | 'offline' | 'unconfirmed' | 'wrong-id' | 'malformed' | 'not-found'
  statusReadFailure?: boolean
  historicalDocument?: { name: string; type: string; content: string }
}

test('signed-in identity and notifications stay visible at the bottom of the page', async ({ page }) => {
  await mockSupport(page)
  await page.goto('/?data=dataverse')
  await expect(page.getByRole('heading', { name: 'Hi Ada! How can we help you?' })).toBeVisible()
  const header = page.getByRole('banner')
  const account = header.getByRole('link', { name: /Signed in Ada Customer/ })
  const bell = header.getByRole('button', { name: /Notifications,/ })
  await expect(header.getByText('Customer support', { exact: true })).toHaveCount(0)
  await header.locator('.workspace-user-copy strong').evaluate(element => {
    element.textContent = 'Ada Customer with an expanded account display name'
  })
  await header.locator('.workspace-user-email').evaluate(element => {
    element.textContent = 'ada.customer.with.an.expanded.address@example.test'
  })
  for (const direction of ['ltr', 'rtl']) {
    await page.evaluate(dir => { document.documentElement.dir = dir }, direction)
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    await expect(account).toBeInViewport({ ratio: 1 })
    await expect(bell).toBeInViewport({ ratio: 1 })
    await bell.click()
    const notifications = page.getByRole('dialog', { name: 'Notifications', exact: true })
    await expect(notifications).toBeVisible()
    await notifications.press('Escape')
    await expect(bell).toBeFocused()
  }
})

test('connected assistant loads lazily, reports SDK failures, preserves tickets and closes its bot session', async ({ page }) => {
  const calls = await mockSupport(page)
  const sdkRequests: string[] = []
  await page.route('**/webchat-4.18.0.js', route => {
    sdkRequests.push(route.request().url())
    return route.abort('blockedbyclient')
  })
  await page.goto('/?data=dataverse')
  await expect(page.getByRole('heading', { name: 'Hi Ada! How can we help you?' })).toBeVisible()
  expect(sdkRequests).toEqual([])
  await page.locator('.hero-actions').getByRole('button', { name: /Ask assistant/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Northwind Assistant', exact: true })
  const bot = page.frameLocator('.assistant-bot-frame')
  await expect(bot.getByRole('alert')).toContainText('could not load from this site')
  await expect(dialog.getByRole('button', { name: 'Start a new conversation' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Raise a ticket', exact: true }).click()
  await dialog.getByLabel('Review your issue before submitting').fill('Support needed while the assistant is unavailable')
  await dialog.getByLabel('How is this affecting you?').selectOption('I have a question')
  await dialog.getByRole('button', { name: 'Submit ticket', exact: true }).click()
  await expect(dialog.getByRole('status')).toContainText('Ticket submitted')
  expect(calls.filter(call => call.path === '/_api/incidents' && call.method === 'POST')).toHaveLength(1)
  await bot.getByRole('alert').press('Escape')
  await expect(dialog).not.toBeVisible()
  await page.locator('.hero-actions').getByRole('button', { name: /Ask assistant/ }).click()
  await expect(bot.getByRole('alert')).toContainText('could not load from this site')
  expect(sdkRequests).toHaveLength(1)
  await dialog.getByRole('button', { name: 'Start a new conversation' }).click()
  await expect.poll(() => sdkRequests.length).toBe(2)
  await expect(bot.getByRole('alert')).toContainText('could not load from this site')
  await dialog.getByRole('button', { name: 'Close assistant' }).click()
  await expect(page.locator('.assistant-bot-frame')).toHaveCount(0)
})

test('connected assistant queues search questions until ready and preserves its conversation across navigation', async ({ page }) => {
  await mockSupport(page)
  let sessions = 0
  await page.route('**/bot-chat.html', route => {
    sessions++
    return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="en"><body>
      <button id="ready">Connect</button><pre id="received"></pre>
      <script>
        document.getElementById('ready').onclick = () => parent.postMessage({ source: 'northwind-bot', type: 'ready' }, location.origin);
        addEventListener('message', event => {
          if (event.origin === location.origin && event.source === parent && event.data.source === 'northwind-assistant')
            document.getElementById('received').textContent += JSON.stringify(event.data) + '\\n';
        });
      </script></body></html>` })
  })
  await page.goto('/?data=dataverse')
  await expect(page.getByRole('heading', { name: 'Hi Ada! How can we help you?' })).toBeVisible()
  await page.getByLabel('Search cases and articles').fill('Help with a gateway')
  await page.getByRole('button', { name: /Ask Northwind about/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Northwind Assistant', exact: true })
  const bot = page.frameLocator('.assistant-bot-frame')
  await expect(bot.locator('#received')).toBeEmpty()
  await page.evaluate(() => window.postMessage({ source: 'northwind-bot', type: 'ready' }, location.origin))
  await expect(bot.locator('#received')).toBeEmpty()
  await bot.getByRole('button', { name: 'Connect', exact: true }).click()
  await expect(bot.locator('#received')).toContainText('"question":"Help with a gateway","send":true')
  await dialog.getByRole('button', { name: 'Minimize assistant', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await page.locator('.hero-actions').getByRole('button', { name: /Ask assistant/ }).click()
  await expect(bot.locator('#received')).toContainText('Help with a gateway')
  expect(sessions).toBe(1)
  await dialog.getByRole('button', { name: 'Contact support', exact: true }).click()
  await expect(page).toHaveURL(/\/account#contact-support$/)
  await expect(page.locator('.assistant-bot-frame')).toHaveCount(1)
  expect(sessions).toBe(1)
})

async function mockSupport(page: Page, options: MockOptions = {}) {
  const calls: Call[] = []
  await page.route(/^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//, route => route.abort('blockedbyclient'))
  let identity = { ...profile }, cases = [{ ...firstCase, status: options.firstStatus ?? firstCase.status }, { ...secondCase }]
  const comments: { id: string; subject?: string; body: string; created: string; author: string }[] = options.publishedResponse
    ? [{ id: fileId, body: options.publishedResponse, created: now, author: 'Support' }] : []
  const documents: { id: string; name: string; size: number; type: string }[] = options.historicalDocument
    ? [{ id: fileId, name: options.historicalDocument.name, type: options.historicalDocument.name.endsWith('.pdf') ? 'application/pdf' : options.historicalDocument.type, size: Buffer.from(options.historicalDocument.content, 'base64').length }] : []
  const fileContents = new Map<string, string>(options.historicalDocument ? [[fileId, options.historicalDocument.content]] : [])
  const savedComments = new Map<string, string>()
  await page.route('**/_layout/tokenhtml', route => route.fulfill({ contentType: 'text/html', body: options.missingToken ? '<p>No token</p>' : '<input name="__RequestVerificationToken" value="test-csrf">' }))
  await page.route('**/_api/**', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method()
    expect(request.headers().__requestverificationtoken).toBe('test-csrf')
    const body: Record<string, unknown> = method === 'GET' ? {} : request.postDataJSON()
    calls.push({ path: url.pathname, method, body, ...(method === 'GET' ? { query: url.search } : {}) })
    const success = (data: unknown, pascal = false) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(pascal
        ? { Success: true, Data: JSON.stringify({ status: 'success', data }) }
        : { success: true, data: JSON.stringify({ status: 'success', data }) }),
    })
    if (method !== 'GET' && options.failedWrite) return ['/_api/incidents', '/_api/adx_portalcomments'].includes(url.pathname)
      ? route.fulfill({ status: 403, json: { error: { message: 'You cannot create this record.' } } })
      : route.fulfill({
        contentType: 'application/json', body: JSON.stringify({ success: true, data: JSON.stringify({ status: 'error', code: 'FORBIDDEN', message: 'You cannot change this record.' }) }),
      })
    if (url.pathname === '/_api/adx_portalcomments') {
      expect(method).toBe('POST')
      expect(request.headers()['content-type']).toBe('application/json')
      const note = (body.adx_portalcomment_Annotations as Record<string, unknown>[])[0]
      const key = String(note.annotationid), commentKey = String(body.activityid)
      savedComments.set(commentKey, key)
      if (options.receiptFailure !== 'not-found') {
        fileContents.set(key, String(note.documentbody))
        documents.push({ id: key, name: String(note.filename), size: Buffer.from(String(note.documentbody), 'base64').length, type: String(note.mimetype) })
        comments.push({ id: commentKey, body: String(body.description), created: now, author: 'Customer' })
      }
      if (options.attachmentFailure === 'offline') return route.abort('internetdisconnected')
      if (options.attachmentFailure) return route.fulfill({ status: options.attachmentFailure, json: { error: { message: 'Write outcome unavailable.' } } })
      return route.fulfill({ status: 204 })
    }
    if (url.pathname.startsWith('/_api/annotations(')) {
      expect(method).toBe('GET')
      const document = documents.find(document => url.pathname === `/_api/annotations(${document.id})`)
      return document ? route.fulfill({ json: {
        annotationid: document.id, filename: document.name, mimetype: document.id === fileId ? options.historicalDocument?.type : document.type,
        isdocument: true, notetext: '*WEB* Customer-uploaded document',
        ...(url.searchParams.get('$select')?.includes('documentbody') ? { documentbody: fileContents.get(document.id) } : {}),
      } }) : route.fulfill({ status: 404, json: { error: { message: 'Attachment not found.' } } })
    }
    if (url.pathname === '/_api/products') return route.fulfill({ json: {
      value: options.empty ? [] : [{ productid: url.searchParams.has('$skiptoken') ? secondId : productId, name: 'Customer product', statecode: 0 }],
      ...(!url.searchParams.has('$skiptoken') && options.catalogNextLink ? { '@odata.nextLink': options.catalogNextLink } : {}),
    } })
    if (url.pathname === '/_api/categories') return route.fulfill({ json: { value: [{ categoryid: productId, title: 'Gateway' }] } })
    if (url.pathname.endsWith('/northwind-profile')) {
      if (options.offline) return route.abort('internetdisconnected')
      if (options.profileStatus) return route.fulfill({ status: options.profileStatus, json: { error: 'unavailable' } })
      if (options.failedLoad) return route.fulfill({ status: 401, json: { error: 'not signed in' } })
      if (method === 'PATCH') identity = { ...identity, ...body }
      return success(options.malformedProfile ? { ...identity, id: 'invalid-id' } : identity, true)
    }
    if (url.pathname === '/_api/incidents') {
      if (method === 'POST') {
        if (options.createFailure === 'offline') return route.abort('internetdisconnected')
        if (options.createFailure) return route.fulfill({ status: options.createFailure, json: { error: { message: 'Creation failed.' } } })
        const created = { ...firstCase, id: fileId, number: 'CAS-1003', title: String(body.title), description: String(body.description) }
        cases = [created, ...cases]
        return route.fulfill({ status: 204, headers: options.createHeader === null ? {} : {
          [options.createHeaderName ?? 'entityid']: options.createHeader ?? fileId,
        } })
      }
      expect(method).toBe('GET')
      const continuation = url.searchParams.has('$skiptoken')
      const next = !options.empty && (!continuation || options.repeatedCursor) ? options.caseNextLink ?? '/_api/incidents?$skiptoken=page-two' : null
      return route.fulfill({ json: {
        value: options.empty ? [] : (continuation ? cases.slice(1) : cases.slice(0, 1)).map(item => ({
          ...dataverseCase(item, options.caseCustomer), ...(options.malformedCase ? { statecode: 99 } : {}),
        })),
        ...(next === null ? {} : { '@odata.nextLink': next }),
      } })
    }
    if (url.pathname.startsWith('/_api/incidents(')) {
      expect(method).toBe('GET')
      if (options.statusReadFailure && savedComments.size) return route.fulfill({ status: 503, json: { error: 'Status unavailable' } })
      const saved = cases.find(item => url.pathname === `/_api/incidents(${item.id})`)
      if (!saved || options.confirmation === 'forbidden') return route.fulfill({ status: 403, json: { error: { message: 'Unavailable.' } } })
      return route.fulfill({ json: {
        ...dataverseCase(saved, options.confirmation === 'foreign' ? secondId : contactId),
        ...(options.confirmation === 'wrong-id' ? { incidentid: caseId } : {}),
        ...(options.confirmation === 'malformed' ? { ticketnumber: null } : {}),
      } })
    }
    if (url.pathname.endsWith('/northwind-cases')) {
      expect(method).toBe('PATCH')
      const updated = { ...firstCase, title: String(body.title), description: String(body.description) }
      cases = cases.map(item => item.id === body.id ? updated : item)
      return success(updated)
    }
    if (url.pathname.endsWith('/northwind-knowledge') && options.knowledgeStatus) return route.fulfill({ status: options.knowledgeStatus, json: { error: 'unavailable' } })
    if (url.pathname.endsWith('/northwind-knowledge')) return success({
      items: options.empty || (options.pagedKnowledge && !url.searchParams.has('cursor')) ? [] : [{ ...article, id: options.knowledgeId ?? article.id }],
      cursor: options.pagedKnowledge && !url.searchParams.has('cursor') ? 'knowledge-two' : null,
    }, true)
    if (url.pathname.endsWith('/northwind-case-activity')) {
      if (method === 'POST') {
        if (body.kind === 'comment') comments.push({ id: fileId, body: String(body.body), created: now, author: 'Portal conversation' })
        else if (body.kind === 'attachmentReceipt') {
          expect(Object.keys(body).sort()).toEqual(['caseId', 'commentId', 'documentId', 'kind'])
          expect(savedComments.get(String(body.commentId))).toBe(body.documentId)
          if (options.receiptFailure === 'not-found') return route.fulfill({ json: {
            success: true, data: JSON.stringify({ status: 'error', code: 'NOT_FOUND', message: 'The assigned attachment was not found.' }),
          } })
          if (options.receiptFailure === 'offline') return route.abort('internetdisconnected')
          if (typeof options.receiptFailure === 'number') return route.fulfill({ status: options.receiptFailure, json: { error: 'Processing unavailable' } })
        } else {
          throw new Error(`Unexpected activity kind: ${String(body.kind)}`)
        }
        const waiting = cases.find(item => item.id === body.caseId && item.state === 0 && item.status === 3)
        if (waiting) cases = cases.map(item => item === waiting ? { ...item, status: 1, updated: '2026-10-15T10:05:00Z' } : item)
        return success({ id: body.kind === 'attachmentReceipt' && options.receiptFailure !== 'wrong-id' ? body.documentId : fileId, statusChanged: Boolean(waiting),
          ...(body.kind === 'attachmentReceipt' ? { processingConfirmed: options.receiptFailure === 'malformed' ? null : options.receiptFailure !== 'unconfirmed' } : {}) })
      }
      if (url.searchParams.has('documentId')) {
        expect(method).toBe('GET')
        expect(url.searchParams.get('caseId')).toBe(caseId)
        const document = documents.find(item => item.id === url.searchParams.get('documentId'))
        if (!document) return route.fulfill({ status: 404, json: { error: { message: 'Document not found.' } } })
        return success({ name: document.name, type: document.type, content: fileContents.get(document.id) })
      }
      return success({ comments, documents })
    }
    if (url.pathname.endsWith('/northwind-feedback')) return success({ id: fileId })
    throw new Error(`Unexpected API route: ${method} ${url.pathname}`)
  })
  return calls
}

test('live data replaces fixtures, follows pagination, and renders safe knowledge', async ({ page }) => {
  const externalRequests: string[] = []
  page.on('request', request => { if (request.url().includes('untrusted.invalid')) externalRequests.push(request.url()) })
  const calls = await mockSupport(page)
  await page.goto('/?data=dataverse')
  await expect(page.getByRole('heading', { name: 'Hi Ada! How can we help you?' })).toBeVisible()
  await expect(page.locator('.snapshot-number')).toHaveText('1')
  await expect(page.getByText('Waiting on you', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Mona Kane')).toHaveCount(0)
  await page.locator('.panel').getByRole('link', { name: 'View all cases' }).click()
  await expect(page.locator('.case-card')).toHaveCount(2)
  await expect(page.locator('.case-card .badge').first()).toHaveText('In progress')
  await expect(page.getByRole('button', { name: 'Local drafts', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Action needed', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Browse articles', exact: false }).first().click()
  await page.getByRole('link', { name: 'Read Published gateway guidance' }).click()
  await expect(page.locator('#article-content')).toContainText('Review the recorded readings.')
  expect(await page.evaluate(() => 'articleScriptRan' in window)).toBe(false)
  expect(externalRequests).toEqual([])
  await expect(page.locator('#article-content img, #article-content script')).toHaveCount(0)
  await page.getByRole('button', { name: 'Yes, helpful', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('saved to Dataverse')
  expect(calls.find(call => call.path.endsWith('northwind-feedback'))?.body).toEqual({ kind: 'article', articleId, helpful: true })
  for (const direction of ['ltr', 'rtl']) {
    await page.evaluate(dir => { document.documentElement.dir = dir }, direction)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  }
})

test.describe('direct knowledge links', () => {
  const citationId = 'abcdefab-cdef-4abc-8def-abcdefabcdef'
  for (const [name, id] of [['canonical', citationId], ['uppercase', citationId.toUpperCase()]]) {
    test(`${name} GUID waits for the complete catalogue and replaces history with the authorized article`, async ({ page }) => {
      const calls = await mockSupport(page, { pagedKnowledge: true, knowledgeId: citationId })
      await page.goto('/account?data=dataverse')
      await expect(page).toHaveTitle('Account & support - Northwind Customer Support')
      const historyLength = await page.evaluate(() => history.length)
      calls.length = 0
      let release!: () => void
      const pending = new Promise<void>(resolve => { release = resolve })
      await page.route('**/northwind-knowledge?cursor=knowledge-two', async route => {
        await pending
        await route.fallback()
      })
      const secondPage = page.waitForRequest(request => new URL(request.url()).searchParams.get('cursor') === 'knowledge-two')
      const query = `?data=dataverse&id=${id}&lang=en-US&source=portal&source=bookmark`
      await page.goto(`/${query}`)
      await secondPage
      await expect(page.getByRole('heading', { name: 'Loading your support workspace' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Article not found' })).toHaveCount(0)
      await expect(page).toHaveURL(`/${query}`)
      release()
      await expect(page).toHaveURL(`/articles/${citationId}?data=dataverse&lang=en-US&source=portal&source=bookmark`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(article.title)
      await expect(page).toHaveTitle(`${article.title} - Northwind Customer Support`)
      await expect(page.locator('#main-content')).toBeFocused()
      await expect(page.locator('#article-content')).toContainText('Review the recorded readings.')
      expect(await page.evaluate(() => 'articleScriptRan' in window)).toBe(false)
      expect(await page.evaluate(() => history.length)).toBe(historyLength + 1)
      expect(new Set(calls.filter(call => call.path.endsWith('northwind-knowledge')).map(call => call.query))).toEqual(new Set(['', '?cursor=knowledge-two']))
      expect(calls.every(call => call.method === 'GET')).toBe(true)
      expect(new Set(calls.map(call => call.path))).toEqual(new Set([
        '/_api/serverlogics/northwind-profile', '/_api/incidents', '/_api/products', '/_api/categories', '/_api/serverlogics/northwind-knowledge',
      ]))
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      await page.goBack()
      await expect(page).toHaveURL('/account?data=dataverse')
      await expect(page).toHaveTitle('Account & support - Northwind Customer Support')
    })
  }

  for (const [name, query] of [
    ['empty', 'id='],
    ['malformed', 'id=not-a-guid'],
    ['whitespace', `id=%20${articleId}`],
    ['braced', `id=%7B${articleId}%7D`],
    ['duplicate', `id=${articleId}&id=${articleId}`],
    ['conflicting duplicate', `id=${articleId}&id=${caseId}`],
    ['unknown', `id=${fileId}`],
    ['case', `id=${caseId}`],
    ['demo article', 'id=KA-0182'],
    ['URL', 'id=https%3A%2F%2Funtrusted.invalid%2F'],
  ]) {
    test(`${name} ID shows the article not-found state without redirecting`, async ({ page }) => {
      const calls = await mockSupport(page, { pagedKnowledge: true })
      await page.goto(`/?data=dataverse&${query}`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Article not found')
      await expect(page.getByText('That article is not available in the support library.')).toBeVisible()
      await expect(page).toHaveTitle('Article not found - Northwind Customer Support')
      await expect(page.locator('#main-content')).toBeFocused()
      await expect(page).toHaveURL(`/?data=dataverse&${query}`)
      await expect(page.locator('#article-content, .hero-actions')).toHaveCount(0)
      expect(calls.every(call => call.method === 'GET')).toBe(true)
      await page.getByRole('link', { name: 'Browse articles', exact: true }).click()
      await expect(page.locator('#support-library')).toBeFocused()
      await expect(page.getByRole('heading', { name: 'Hi Ada! How can we help you?' })).toBeVisible()
    })
  }

  test('failed catalogue continuation stays unavailable instead of displaying a partially loaded article', async ({ page }) => {
    await mockSupport(page)
    await page.route('**/northwind-knowledge*', route => {
      const cursor = new URL(route.request().url()).searchParams.get('cursor')
      return cursor ? route.fulfill({ status: 503, json: { error: 'unavailable' } }) : route.fulfill({
        json: { Success: true, Data: JSON.stringify({ status: 'success', data: { items: [article], cursor: 'knowledge-two' } }) },
      })
    })
    await page.goto(`/?data=dataverse&id=${articleId}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Support data is unavailable')
    await expect(page).toHaveURL(`/?data=dataverse&id=${articleId}`)
    await expect(page.locator('#article-content, .hero-actions')).toHaveCount(0)
    await expect(page.getByText('No sample records are substituted for unavailable customer data.')).toBeVisible()
  })

  test('signed-out direct entry opens the published article and keeps feedback behind sign-in', async ({ page }) => {
    await mockSupport(page, { failedLoad: true })
    await page.goto(`/?data=dataverse&id=${articleId}`)
    await expect(page).toHaveURL(`/articles/${articleId}?data=dataverse`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(article.title)
    await expect(page.getByRole('link', { name: 'Sign in to give feedback' })).toBeVisible()
  })

  test('signed-out direct entry retains the sign-in state when published knowledge is unavailable', async ({ page }) => {
    await mockSupport(page, { failedLoad: true, knowledgeStatus: 403 })
    await page.goto(`/?data=dataverse&id=${articleId}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in to customer support')
    await expect(page).toHaveURL(`/?data=dataverse&id=${articleId}`)
    await expect(page.locator('#article-content, .hero-actions')).toHaveCount(0)
  })

  test('unrelated query parameters cannot choose a redirect destination', async ({ page }) => {
    await mockSupport(page)
    const extra = 'data=dataverse&returnUrl=https%3A%2F%2Funtrusted.invalid%2F&saved=1'
    await page.goto(`/?${extra}&id=${articleId}`)
    await expect(page).toHaveURL(`/articles/${articleId}?${extra}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(article.title)
  })

  test('saved Home remains Home and bookmarks keep working through ordinary navigation', async ({ page }) => {
    await mockSupport(page)
    await page.goto('/?data=dataverse&saved=1')
    await expect(page.getByRole('heading', { name: 'Hi Ada! How can we help you?' })).toBeVisible()
    await expect(page).toHaveTitle('Northwind Customer Support')
    await expect(page.getByRole('button', { name: 'Saved articles', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.library-grid article')).toHaveCount(0)
    await page.getByRole('button', { name: 'Clear filters' }).click()
    await page.getByRole('link', { name: `Read ${article.title}` }).click()
    await page.getByRole('button', { name: 'Save article', exact: true }).click()
    await page.getByRole('link', { name: 'View saved articles' }).click()
    await expect(page).toHaveURL('/?saved=1#support-library')
    await expect(page).toHaveTitle('Northwind Customer Support')
    await expect(page.locator('#support-library')).toBeFocused()
    await expect(page.locator('.library-grid article')).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Saved articles', exact: true })).toHaveAttribute('aria-pressed', 'true')
  })
})

async function prepareCase(page: Page, description = 'New customer question') {
  await page.goto('/?data=dataverse')
  await expect(page.locator('.hero-actions')).toBeVisible()
  await page.locator('.hero-actions').getByRole('button', { name: 'Report an issue' }).click()
  const dialog = page.getByRole('dialog', { name: 'Report an issue', exact: true })
  await dialog.getByLabel('What do you need help with?').fill(description)
  await dialog.getByLabel('How is this affecting you?').selectOption('I have a question')
  await dialog.getByRole('button', { name: 'Check for matches' }).click()
  return dialog
}

test('case creation posts once through Web API with Web origin, binds the session customer and fetches the confirmed record', async ({ page }) => {
  const calls = await mockSupport(page)
  const dialog = await prepareCase(page)
  await dialog.getByLabel('Product (optional)').selectOption(productId)
  await dialog.getByRole('button', { name: 'Submit case', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/cases/${fileId}$`))
  await expect(page.locator('h1')).toHaveText('New customer question')
  expect(calls.filter(call => call.method === 'POST' && call.path === '/_api/incidents')).toEqual([
    { path: '/_api/incidents', method: 'POST', body: {
      title: 'New customer question', description: 'New customer question\n\nBusiness impact: I have a question',
      caseorigincode: 3,
      'customerid_contact@odata.bind': `/contacts(${contactId})`, 'productid@odata.bind': `/products(${productId})`,
    } },
  ])
  const createIndex = calls.findIndex(call => call.method === 'POST' && call.path === '/_api/incidents')
  expect(calls[createIndex + 1].path).toBe(`/_api/incidents(${fileId})`)
  expect(calls[createIndex + 1].method).toBe('GET')
  expect(calls.some(call => call.path.endsWith('northwind-cases') && call.method !== 'PATCH')).toBe(false)
  const initial = new URLSearchParams(calls.find(call => call.path === '/_api/incidents' && call.method === 'GET')?.query)
  expect(initial.get('$filter')).toBe(`_customerid_value eq ${contactId}`)
  expect(initial.get('$select')).toBe('incidentid,ticketnumber,title,description,statecode,statuscode,createdon,modifiedon,_customerid_value')
})

test('Web API creation accepts the exact combined limit and the OData entity header without a response body', async ({ page }) => {
  const calls = await mockSupport(page, { createHeaderName: 'OData-EntityId', createHeader: `https://org.example/api/data/v9.2/incidents(${fileId})` })
  const maximum = 1898 - '\n\nBusiness impact: I have a question'.length
  const dialog = await prepareCase(page, 'x'.repeat(maximum))
  await dialog.getByRole('button', { name: 'Submit case', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/cases/${fileId}$`))
  const body = calls.find(call => call.method === 'POST')?.body
  expect(body?.description).toHaveLength(1898)
  expect(body?.title).toHaveLength(200)
  expect(body?.caseorigincode).toBe(3)
  expect(Object.keys(body!).sort()).toEqual(['caseorigincode', 'customerid_contact@odata.bind', 'description', 'title'])
})

test('Web API creation rejects an over-limit draft without issuing a write', async ({ page }) => {
  const calls = await mockSupport(page)
  const description = 'x'.repeat(1899 - '\n\nBusiness impact: I have a question'.length)
  const dialog = await prepareCase(page, description)
  await expect(dialog.getByRole('button', { name: 'Submit case', exact: true })).toHaveCount(0)
  await expect(dialog.getByText('The case description and selected impact must fit within 1,898 characters.')).toBeVisible()
  await expect(dialog.getByLabel('What do you need help with?')).toHaveValue(description)
  expect(calls.filter(call => call.method === 'POST')).toHaveLength(0)
})

for (const [name, options, message] of [
  ['rejected write', { createFailure: 403 }, 'does not have permission'],
  ['server creation failure', { createFailure: 500 }, 'Reload your cases before submitting again'],
  ['lost create response', { createFailure: 'offline' }, 'Reload your cases before submitting again'],
  ['missing created ID', { createHeader: null }, 'Reload your cases before submitting again'],
  ['malformed created ID', { createHeader: `{${fileId}` }, 'Reload your cases before submitting again'],
  ['failed confirmation', { confirmation: 'forbidden' }, 'Reload your cases before submitting again'],
  ['foreign customer confirmation', { confirmation: 'foreign' }, 'Reload your cases before submitting again'],
  ['wrong record confirmation', { confirmation: 'wrong-id' }, 'Reload your cases before submitting again'],
  ['malformed confirmation', { confirmation: 'malformed' }, 'Reload your cases before submitting again'],
] as const) {
  test(`${name} preserves the case draft with no automatic resubmission`, async ({ page }) => {
    const calls = await mockSupport(page, options)
    const dialog = await prepareCase(page)
    await dialog.getByRole('button', { name: 'Submit case', exact: true }).click()
    await expect(dialog.getByRole('alert')).toContainText(message)
    await expect(dialog.getByLabel('What do you need help with?')).toHaveValue('New customer question')
    await expect(page).not.toHaveURL(new RegExp(`/cases/${fileId}$`))
    expect(calls.filter(call => call.method === 'POST' && call.path === '/_api/incidents')).toHaveLength(1)
    expect(calls.some(call => call.path.endsWith('northwind-cases'))).toBe(false)
  })
}

test('comments, actual file bytes, downloads and case edits use guarded endpoints', async ({ page }) => {
  const calls = await mockSupport(page)
  await page.goto(`/cases/${caseId}?data=dataverse`)
  await expect(page.getByLabel('Reply to support')).toBeVisible()
  await page.getByLabel('Reply to support').fill('Here are the requested details.')
  await page.getByRole('button', { name: 'Send reply', exact: true }).click()
  await expect(page.locator('.timeline')).toContainText('Here are the requested details.')
  await page.getByRole('tab', { name: 'Documents', exact: true }).click()
  const input = page.getByLabel('Attachments', { exact: true })
  await expect(page.getByLabel('Document purpose')).toHaveCount(0)
  await expect(page.locator('input[type="file"]')).toHaveCount(1)
  await expect(input).toHaveAttribute('accept', '.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.zip')
  await input.setInputFiles({ name: 'large.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(3_932_161) })
  await expect(page.getByRole('alert').filter({ hasText: 'up to 3.75 MiB' })).toBeVisible()
  const bytes = Buffer.from('%PDF-1.7\nsafe sample')
  await input.setInputFiles({ name: 'sample.pdf', mimeType: 'application/pdf', buffer: bytes })
  await expect(page.getByRole('button', { name: 'Download sample.pdf' })).toBeVisible()
  const upload = calls.find(call => call.path === '/_api/adx_portalcomments')!
  const commentId = upload.body.activityid, documentId = (upload.body.adx_portalcomment_Annotations as { annotationid: string }[])[0].annotationid
  expect(commentId).toMatch(/^[0-9a-f-]{36}$/)
  expect(documentId).toMatch(/^[0-9a-f-]{36}$/)
  expect(commentId).not.toBe(documentId)
  expect(upload.body).toEqual({
    activityid: commentId, description: 'Attachment uploaded: sample.pdf\nDocument reference: ' + documentId,
    'regardingobjectid_incident_adx_portalcomment@odata.bind': `/incidents(${caseId})`,
    adx_portalcomment_Annotations: [{
      annotationid: documentId, filename: 'sample.pdf', mimetype: 'application/pdf', isdocument: true,
      notetext: '*WEB* Customer-uploaded document', documentbody: bytes.toString('base64'),
    }],
  })
  expect(calls.find(call => call.body.kind === 'attachmentReceipt')?.body).toEqual({ caseId, kind: 'attachmentReceipt', commentId, documentId })
  expect(calls.filter(call => call.path.includes('/serverlogics/') && call.method !== 'GET').every(call => !JSON.stringify(call.body).includes(bytes.toString('base64')))).toBe(true)
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download sample.pdf' }).click()
  expect((await downloaded).suggestedFilename()).toBe('sample.pdf')
  await page.getByRole('tab', { name: 'Original request', exact: true }).click()
  await page.getByLabel('Case title').fill('Updated customer title')
  await page.getByRole('button', { name: 'Save case details' }).click()
  await expect(page.locator('h1')).toHaveText('Updated customer title')
  expect(calls.find(call => call.method === 'PATCH')?.body).toEqual({ id: caseId, title: 'Updated customer title', description: firstCase.description })
})

test('native attachment receipt refreshes confirmed case status and the expanded bidirectional chooser', async ({ page }) => {
  const calls = await mockSupport(page, { firstStatus: 3 })
  await page.goto(`/cases/${caseId}?data=dataverse`)
  await page.getByRole('tab', { name: 'Documents', exact: true }).click()
  const input = page.getByLabel('Attachments', { exact: true })
  await expect(page.locator('input[type="file"]')).toHaveCount(1)
  await expect(page.getByRole('combobox')).toHaveCount(0)
  await input.setInputFiles({ name: 'empty.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(0) })
  await expect(page.getByRole('alert').filter({ hasText: 'up to 3.75 MiB' })).toBeVisible()
  expect(calls.some(call => call.path === '/_api/adx_portalcomments')).toBe(false)
  const bytes = Buffer.from('%PDF-1.7\nsynthetic local test fixture only')
  await input.setInputFiles({ name: 'demo-proof.pdf', mimeType: 'application/pdf', buffer: bytes })
  await expect(page.getByRole('button', { name: 'Download demo-proof.pdf' })).toBeVisible()
  await expect(page.locator('.case-hero .badge')).toHaveText('In progress')
  await expect(page.getByRole('status').filter({ hasText: 'The document was uploaded.' })).toContainText('back in progress')
  await page.evaluate(() => {
    const hint = document.getElementById('document-hint')!
    hint.textContent = `${hint.textContent} ${hint.textContent}`
  })
  for (const dir of ['ltr', 'rtl'] as const) {
    await page.evaluate(direction => { document.documentElement.dir = direction }, dir)
    await expect(input).toBeVisible()
    expect(await input.evaluate(element => getComputedStyle(element).direction)).toBe(dir)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  }
  await page.getByRole('tab', { name: 'Timeline', exact: true }).click()
  await expect(page.locator('.timeline')).toContainText('Attachment uploaded: demo-proof.pdf')
  expect(calls.filter(call => call.method !== 'GET').map(call => call.path)).toEqual(['/_api/adx_portalcomments', '/_api/serverlogics/northwind-case-activity'])
})

test('native attachment permission denial reports failure and allows another selection', async ({ page }) => {
  const calls = await mockSupport(page, { failedWrite: true })
  await page.goto(`/cases/${caseId}?data=dataverse`)
  await page.getByRole('tab', { name: 'Documents', exact: true }).click()
  const input = page.getByLabel('Attachments', { exact: true })
  await input.setInputFiles({ name: 'demo-proof.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nlocal fixture') })
  await expect(page.getByRole('alert').filter({ hasText: 'does not have permission' })).toBeVisible()
  await expect(input).toBeEnabled()
  await expect(input).toHaveValue('')
  await expect(page.getByRole('status').filter({ hasText: 'The document was uploaded' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Download demo-proof.pdf' })).toHaveCount(0)
  expect(calls.filter(call => call.path === '/_api/adx_portalcomments')).toHaveLength(1)
  expect(calls.filter(call => call.body.kind === 'attachmentReceipt')).toHaveLength(0)
})

const attachmentFixtures = [
  { name: 'report.pdf', type: 'application/pdf', bytes: Buffer.from('%PDF-1.7\nlocal browser fixture'), browserType: '' },
  { name: 'letter.doc', type: 'application/msword', bytes: Buffer.from('d0cf11e0a1b11ae100000000', 'hex'), browserType: '' },
  { name: 'letter.DOCX', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes: Buffer.from('504b0506000000000000000000000000000000000000', 'hex'), browserType: 'application/octet-stream' },
  { name: 'image.png', type: 'image/png', bytes: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=', 'base64'), browserType: 'image/png' },
  { name: 'image.jpg', type: 'image/jpeg', bytes: Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex'), browserType: 'image/jpeg' },
  { name: 'image.jpeg', type: 'image/jpeg', bytes: Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex'), browserType: '' },
  { name: 'image.gif', type: 'image/gif', bytes: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'), browserType: 'image/gif' },
  { name: 'archive.zip', type: 'application/zip', bytes: Buffer.from('504b0506000000000000000000000000000000000000', 'hex'), browserType: 'application/x-zip-compressed' },
]
for (const fixture of attachmentFixtures) {
  test(`native attachments infer canonical MIME and download ${fixture.name}`, async ({ page }) => {
    const calls = await mockSupport(page)
    await page.goto(`/cases/${caseId}?data=dataverse`)
    await page.getByRole('tab', { name: 'Documents', exact: true }).click()
    await page.getByLabel('Attachments', { exact: true }).setInputFiles({ name: fixture.name, mimeType: fixture.browserType, buffer: fixture.bytes })
    const button = page.getByRole('button', { name: `Download ${fixture.name}`, exact: true })
    await expect(button).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'The document was uploaded to this case.' })).toBeVisible()
    const native = calls.find(call => call.path === '/_api/adx_portalcomments')!
    const note = (native.body.adx_portalcomment_Annotations as Record<string, unknown>[])[0]
    expect(note.mimetype).toBe(fixture.type)
    expect(note.documentbody).toBe(fixture.bytes.toString('base64'))
    expect(calls.filter(call => call.body.kind === 'attachmentReceipt')).toHaveLength(1)
    const downloaded = page.waitForEvent('download')
    await button.click()
    const file = await downloaded
    expect(file.suggestedFilename()).toBe(fixture.name)
    expect(await readFile((await file.path())!)).toEqual(fixture.bytes)
    expect(calls.some(call => call.path.endsWith('/northwind-case-activity') && call.method === 'GET' &&
      new URLSearchParams(call.query).has('documentId'))).toBe(false)
    expect(calls.some(call => call.path === `/_api/annotations(${note.annotationid})` &&
      new URLSearchParams(call.query).get('$select')?.includes('documentbody'))).toBe(true)
    expect(calls.some(call => call.path.includes('/serverlogics/') && ('content' in call.body || 'documentbody' in call.body))).toBe(false)
  })
}

test('native attachments enforce the exact 3.75 MiB raw and 5 MiB encoded boundary', async ({ page }) => {
  const calls = await mockSupport(page)
  await page.goto(`/cases/${caseId}?data=dataverse`)
  await page.getByRole('tab', { name: 'Documents', exact: true }).click()
  const input = page.getByLabel('Attachments', { exact: true })
  for (const file of [
    { name: 'empty.doc', mimeType: '', buffer: Buffer.alloc(0) },
    { name: 'too-large.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(3_932_161) },
    { name: 'not-allowed.txt', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7') },
  ]) {
    await input.setInputFiles(file)
    await expect(page.getByRole('alert').filter({ hasText: '3,932,160 bytes' })).toBeVisible()
  }
  expect(calls.filter(call => call.path === '/_api/adx_portalcomments')).toHaveLength(0)
  const bytes = Buffer.alloc(3_932_160)
  Buffer.from('%PDF-1.7\n').copy(bytes)
  await input.setInputFiles({ name: 'boundary.pdf', mimeType: '', buffer: bytes })
  await expect(page.getByRole('button', { name: 'Download boundary.pdf' })).toBeVisible()
  const note = (calls.find(call => call.path === '/_api/adx_portalcomments')!.body.adx_portalcomment_Annotations as { documentbody: string }[])[0]
  expect(note.documentbody.length).toBe(5_242_880)
  expect(Buffer.from(note.documentbody, 'base64').length).toBe(3_932_160)
})

for (const failure of ['offline', 500, 503, 408] as const) {
  test(`native ambiguous attachment ${failure} is not retried and refreshes activity`, async ({ page }) => {
    const calls = await mockSupport(page, { attachmentFailure: failure })
    await page.goto(`/cases/${caseId}?data=dataverse`)
    await page.getByRole('tab', { name: 'Documents', exact: true }).click()
    await expect(page.getByText('No customer-visible documents are available.')).toBeVisible()
    const before = calls.filter(call => call.method === 'GET' && call.path.endsWith('/northwind-case-activity')).length
    const input = page.getByLabel('Attachments', { exact: true })
    await input.setInputFiles({ name: 'possibly-saved.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nfixture') })
    await expect(page.getByRole('status').filter({ hasText: 'The upload is unconfirmed.' })).toContainText('before retrying')
    await expect(page.getByRole('button', { name: 'Download possibly-saved.pdf' })).toBeVisible()
    await expect(input).toBeEnabled()
    await expect(input).toHaveValue('')
    await expect(page.locator('.error')).toBeEmpty()
    expect(calls.filter(call => call.path === '/_api/adx_portalcomments')).toHaveLength(1)
    expect(calls.filter(call => call.body.kind === 'attachmentReceipt')).toHaveLength(0)
    expect(calls.filter(call => call.method === 'GET' && call.path.endsWith('/northwind-case-activity')).length).toBeGreaterThan(before)
  })
}

for (const failure of ['offline', 503, 403, 'unconfirmed', 'wrong-id', 'malformed', 'status-read'] as const) {
  test(`native saved attachment ${failure} warns without inviting duplicate upload`, async ({ page }) => {
    const calls = await mockSupport(page, { firstStatus: 3,
      ...(failure === 'status-read' ? { statusReadFailure: true } : { receiptFailure: failure }) })
    await page.goto(`/cases/${caseId}?data=dataverse`)
    await page.getByRole('tab', { name: 'Documents', exact: true }).click()
    const input = page.getByLabel('Attachments', { exact: true })
    await input.setInputFiles({ name: 'saved.doc', mimeType: '', buffer: attachmentFixtures[1].bytes })
    const savedMetadataConfirmed = failure === 'unconfirmed' || failure === 'status-read'
    const feedback = page.getByRole('status').filter({ hasText: savedMetadataConfirmed ? 'The attachment was saved' : 'The native write was accepted' })
    await expect(feedback).toContainText(savedMetadataConfirmed ? 'processing is unconfirmed' : 'attachment persistence and protected processing remain unconfirmed')
    await expect(feedback).toContainText('Do not upload the same file again.')
    if (!savedMetadataConfirmed) await expect(feedback).not.toContainText(/\bsaved\b/i)
    await expect(page.getByRole('button', { name: 'Download saved.doc' })).toBeVisible()
    await expect(page.locator('.error')).toBeEmpty()
    await expect(input).toBeEnabled()
    expect(calls.filter(call => call.path === '/_api/adx_portalcomments')).toHaveLength(1)
    expect(calls.filter(call => call.body.kind === 'attachmentReceipt')).toHaveLength(1)
    if (failure === 'unconfirmed') {
      // A post-save marker failure must not erase an already confirmed status transition.
      await expect(page.locator('.case-hero .badge')).toHaveText('In progress')
      expect(calls.some(call => call.method !== 'GET' && call.path.startsWith('/_api/incidents'))).toBe(false)
      const warning = page.getByRole('status').filter({ hasText: 'The attachment was saved' })
      await warning.evaluate(element => { element.textContent = `${element.textContent} ${element.textContent}` })
      for (const direction of ['ltr', 'rtl'] as const) {
        await page.evaluate(dir => { document.documentElement.dir = dir }, direction)
        await expect(warning).toBeVisible()
        expect(await warning.evaluate(element => getComputedStyle(element).direction)).toBe(direction)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      }
    }
  })
}

test('native attachment NOT_FOUND receipt with missing document leaves persistence unconfirmed', async ({ page }) => {
  const calls = await mockSupport(page, { receiptFailure: 'not-found' })
  await page.goto(`/cases/${caseId}?data=dataverse`)
  await page.getByRole('tab', { name: 'Documents', exact: true }).click()
  await expect(page.getByText('No customer-visible documents are available.')).toBeVisible()
  const activityReadsBefore = calls.filter(call => call.method === 'GET' && call.path.endsWith('/northwind-case-activity')).length
  const input = page.getByLabel('Attachments', { exact: true })
  await input.setInputFiles({ name: 'unconfirmed.pdf', mimeType: 'application/pdf', buffer: attachmentFixtures[0].bytes })
  const feedback = page.getByRole('status').filter({ hasText: 'The native write was accepted' })
  await expect(feedback).toContainText('attachment persistence and protected processing remain unconfirmed')
  await expect(feedback).toContainText('Do not upload the same file again.')
  await expect(feedback).not.toContainText(/\bsaved\b/i)
  await expect(input).toBeEnabled()
  await expect(page.getByText('No customer-visible documents are available.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download unconfirmed.pdf' })).toHaveCount(0)
  await expect(page.locator('.error')).toBeEmpty()
  expect(calls.filter(call => call.method === 'GET' && call.path.endsWith('/northwind-case-activity')).length).toBeGreaterThan(activityReadsBefore)
  const nativeWrites = calls.filter(call => call.method === 'POST' && call.path === '/_api/adx_portalcomments')
  expect(nativeWrites).toHaveLength(1)
  const note = (nativeWrites[0].body.adx_portalcomment_Annotations as { annotationid: string }[])[0]
  const receipts = calls.filter(call => call.body.kind === 'attachmentReceipt')
  expect(receipts).toHaveLength(1)
  expect(receipts[0].body).toEqual({ caseId, kind: 'attachmentReceipt', commentId: nativeWrites[0].body.activityid, documentId: note.annotationid })
})

test('native historical attachment downloads retain the 5 MiB limit', async ({ page }) => {
  const bytes = Buffer.alloc(5 * 1024 * 1024)
  Buffer.from('%PDF-1.7\n').copy(bytes)
  const calls = await mockSupport(page, { historicalDocument: { name: 'historical.pdf', type: 'application/pdf', content: bytes.toString('base64') } })
  await page.goto(`/cases/${caseId}?data=dataverse`)
  await page.getByRole('tab', { name: 'Documents', exact: true }).click()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download historical.pdf' }).click()
  const file = await downloaded
  expect(file.suggestedFilename()).toBe('historical.pdf')
  expect(await readFile((await file.path())!)).toEqual(bytes)
  expect(calls.some(call => call.path === `/_api/annotations(${fileId})` &&
    new URLSearchParams(call.query).get('$select')?.includes('documentbody'))).toBe(true)
})

test('attachment metadata failures stay visible and can be retried without hiding documents', async ({ page }) => {
  await mockSupport(page, { historicalDocument: {
    name: 'available.pdf', type: 'application/pdf', content: Buffer.from('%PDF-1.7\nfixture').toString('base64'),
  } })
  await page.route('**/_api/annotations(*)?*', route => route.fulfill({ status: 503, json: { error: { message: 'Temporary attachment outage.' } } }))
  await page.goto(`/cases/${caseId}?data=dataverse`)
  await expect(page.getByRole('button', { name: 'Reload conversation', exact: true })).toBeVisible()
  await expect(page.getByRole('alert').filter({ hasText: 'The support service could not complete the request.' }).first()).toBeVisible()
  await page.unroute('**/_api/annotations(*)?*')
  await page.getByRole('button', { name: 'Reload conversation', exact: true }).click()
  await page.getByRole('tab', { name: 'Documents', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Download available.pdf' })).toBeVisible()
})

test('native attachment methods validate case and document IDs before requesting', async ({ page }) => {
  const calls = await mockSupport(page)
  await page.goto(`/cases/${caseId}?data=dataverse`)
  await expect(page.getByLabel('Reply to support')).toBeVisible()
  const codes = await page.evaluate(async ({ caseId, fileId }) => {
    const modulePath = '/src/services/supportApi.ts'
    const { supportApi } = await import(modulePath)
    const results: string[] = []
    for (const operation of [
      () => supportApi.download('not-a-guid', fileId),
      () => supportApi.download(caseId, 'not-a-guid'),
      () => supportApi.upload('not-a-guid', new File(['%PDF-1.7'], 'test.pdf')),
    ]) {
      try { await operation(); results.push('unexpected success') }
      catch (error) { results.push((error as { code: string }).code) }
    }
    return results
  }, { caseId, fileId })
  expect(codes).toEqual(['INVALID_RESPONSE', 'INVALID_RESPONSE', 'INVALID_RESPONSE'])
  expect(calls.some(call => call.path === '/_api/adx_portalcomments' || call.path.startsWith('/_api/annotations('))).toBe(false)
})

for (const document of [
  { name: 'unsafe.pdf', type: 'text/html', content: Buffer.from('<script>unsafe</script>').toString('base64') },
  { name: 'malformed.pdf', type: 'application/pdf', content: '%%%not-base64%%%' },
  { name: 'oversize.pdf', type: 'application/pdf', content: Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64') },
]) {
  test(`native attachment download rejects ${document.name}`, async ({ page }) => {
    await mockSupport(page, { historicalDocument: document })
    const downloads: string[] = []
    page.on('download', download => downloads.push(download.suggestedFilename()))
    await page.goto(`/cases/${caseId}?data=dataverse`)
    await page.getByRole('tab', { name: 'Documents', exact: true }).click()
    await page.getByRole('button', { name: `Download ${document.name}` }).click()
    await expect(page.locator('.error')).not.toBeEmpty()
    expect(downloads).toEqual([])
  })
}

test('a reply to a Waiting for Details case shows the confirmed In progress status', async ({ page }) => {
  const calls = await mockSupport(page, { firstStatus: 3, publishedResponse: 'Please send the gateway serial number.' })
  await page.goto(`/cases/${caseId}?data=dataverse`)
  await expect(page.locator('.case-hero .badge')).toHaveText('Action needed')
  await page.getByLabel('Reply to support').fill('The serial number is NW-4471.')
  await page.getByRole('button', { name: 'Send reply', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Your reply was saved. The case is back in progress with support.' })).toBeVisible()
  await expect(page.locator('.case-hero .badge')).toHaveText('In progress')
  await expect(page.locator('.timeline')).toContainText('The serial number is NW-4471.')
  expect(calls.some(call => call.method === 'GET' && call.path === `/_api/incidents(${caseId})`)).toBe(true)
  expect(calls.some(call => call.method !== 'GET' && call.path.startsWith('/_api/incidents'))).toBe(false)
})

test('incident status reasons drive the case state, next step and timeline filters', async ({ page }) => {
  await mockSupport(page, { firstStatus: 3, publishedResponse: 'Please send the gateway serial number.' })
  await page.goto('/cases?data=dataverse')
  await expect(page.locator('.case-card .badge').first()).toHaveText('Action needed')
  await page.getByRole('button', { name: 'Action needed', exact: true }).click()
  await expect(page.locator('.case-card')).toHaveCount(1)
  await page.getByRole('link', { name: `Open ${firstCase.title}`, exact: true }).click()
  await expect(page.locator('.case-hero .badge')).toHaveText('Action needed')
  await expect(page.locator('.progress-steps [aria-current="step"]')).toContainText('Waiting on you')
  await page.getByRole('button', { name: 'Respond', exact: true }).click()
  await expect(page.getByLabel('Reply to support')).toBeFocused()
  await expect(page.locator('.timeline-item')).toHaveCount(2)
  await page.getByRole('button', { name: 'Actions taken', exact: true }).click()
  await expect(page.locator('.timeline-item')).toHaveCount(1)
  await expect(page.locator('.timeline-item.system')).toContainText('Case submitted')
  await page.getByRole('button', { name: 'Communications', exact: true }).click()
  await expect(page.locator('.timeline-item.support')).toContainText('Please send the gateway serial number.')
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'My cases' }).click()
  await page.getByRole('link', { name: `Open ${secondCase.title}`, exact: true }).click()
  await expect(page.locator('.case-hero .badge')).toHaveText('Resolved')
  await expect(page.getByRole('region', { name: 'Case outcome' })).toContainText('Case resolved')
  await expect(page.locator('.timeline-item.system').first()).toContainText('Case resolved')
})

test('published approved responses appear as inert Support text without exposing email APIs', async ({ page }) => {
  const response = 'Approved guidance for your case. <img src=x onerror="window.publishedScriptRan=true">'
  const calls = await mockSupport(page, { publishedResponse: response })
  await page.goto(`/cases/${caseId}?data=dataverse`)
  await expect(page.getByRole('heading', { name: 'Customer conversation' })).toBeVisible()
  await expect(page.locator('.timeline-item.support p')).toHaveText(response)
  await expect(page.locator('.timeline-item.support .timeline-meta')).toContainText('Support')
  await expect(page.locator('.timeline-item img, .timeline-item script')).toHaveCount(0)
  expect(await page.evaluate(() => 'publishedScriptRan' in window)).toBe(false)
  expect(calls.some(call => call.path.startsWith('/_api/emails') || call.path.includes('/cloudflow/'))).toBe(false)
  expect(calls.find(call => call.path.endsWith('/northwind-case-activity'))?.query).toBe(`?caseId=${caseId}`)
})

test('profile and contact writes persist; unsupported widgets do not invent CRM data', async ({ page }) => {
  const calls = await mockSupport(page)
  await page.goto('/account?data=dataverse')
  await page.getByLabel('First name', { exact: true }).fill('Grace')
  await page.getByRole('button', { name: 'Save profile', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Your profile was saved to Dataverse.' })).toBeVisible()
  expect(calls.find(call => call.method === 'PATCH')?.body).toEqual({ firstName: 'Grace', lastName: 'Customer', phone: profile.phone })
  await page.goto('/?data=dataverse')
  await expect(page.locator('#welcome-heading')).toContainText('Hi Grace!')
  await page.goto('/account?data=dataverse')
  await expect(page.getByText('Business Care', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Not connected. The supplied core service model', { exact: false })).toBeVisible()
  await page.getByLabel('Message', { exact: true }).fill('Please contact me about my support request.')
  await page.getByRole('button', { name: 'Save contact request' }).click()
  await expect(page.locator('#contact-support')).toContainText('does not send email, start chat or book a callback')
  expect(calls.find(call => call.path.endsWith('northwind-feedback'))?.body).toEqual({ kind: 'contact', message: 'Please contact me about my support request.' })
})

test('failed writes keep drafts and do not display a successful save', async ({ page }) => {
  await mockSupport(page, { failedWrite: true })
  await page.goto(`/cases/${caseId}?data=dataverse`)
  await page.getByLabel('Reply to support').fill('Keep this draft on failure')
  await page.getByRole('button', { name: 'Send reply' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'cannot change' })).toBeVisible()
  await expect(page.getByLabel('Reply to support')).toHaveValue('Keep this draft on failure')
  await expect(page.getByText('Your reply was saved to this case.', { exact: true })).toHaveCount(0)
})

for (const [name, options] of [
  ['authentication failure', { failedLoad: true }],
  ['repeated page cursor', { repeatedCursor: true }],
  ['malformed profile', { malformedProfile: true }],
  ['missing verification token', { missingToken: true }],
  ['permission failure', { profileStatus: 403 }],
  ['server failure', { profileStatus: 500 }],
  ['offline service', { offline: true }],
  ['external catalog continuation', { catalogNextLink: 'https://untrusted.invalid/_api/products?$skiptoken=two' }],
  ['wrong catalog continuation path', { catalogNextLink: '/_api/contacts?$skiptoken=two' }],
  ['external case continuation', { caseNextLink: 'https://untrusted.invalid/_api/incidents?$skiptoken=two' }],
  ['wrong case continuation path', { caseNextLink: '/_api/contacts?$skiptoken=two' }],
  ['malformed case continuation', { caseNextLink: 123 }],
  ['case continuation fragment', { caseNextLink: '/_api/incidents?$skiptoken=two#fragment' }],
  ['foreign customer case', { caseCustomer: secondId }],
  ['malformed case', { malformedCase: true }],
] as const) {
  test(`${name} fails visibly without falling back to demo records`, async ({ page }) => {
    await mockSupport(page, options)
    await page.goto('/?data=dataverse')
    if (name === 'authentication failure' || name === 'permission failure') {
      await expect(page.locator('main h1')).toHaveText('Welcome to Northwind support')
      await expect(page.getByRole('link', { name: 'Sign in to continue' })).toHaveAttribute('href', '/SignIn?returnUrl=%2F')
      await expect(page.getByRole('button', { name: /^Notifications,/ })).toHaveCount(0)
      await expect(page.locator('.article-card')).toHaveCount(1)
      await expect(page.locator('.case-card')).toHaveCount(0)
    } else {
      await expect(page.locator('main h1')).toHaveText(/Sign in to customer support|Support data is unavailable/)
      await expect(page.getByText('No sample records are substituted for unavailable customer data.')).toBeVisible()
      await expect(page.locator('.case-card, .article-card')).toHaveCount(0)
    }
    await expect(page.getByText('Mona Kane')).toHaveCount(0)
  })
}

test('anonymous visitors search published knowledge without loading private data or AI', async ({ page }) => {
  const calls = await mockSupport(page, { failedLoad: true })
  await page.goto('/?data=dataverse')
  await expect(page.locator('main h1')).toHaveText('Welcome to Northwind support')
  const inquiry = page.getByLabel('Search knowledge articles')
  await inquiry.fill('gateway')
  const results = page.getByRole('region', { name: 'Support search results' })
  await expect(results.getByRole('group', { name: 'Support articles' }).getByRole('link')).toHaveCount(1)
  await expect(results.getByRole('group', { name: 'Cases' })).toHaveCount(0)
  await expect(results.getByRole('button', { name: /Chat with an assistant/ })).toHaveCount(0)
  await inquiry.press('Enter')
  await expect(page.locator('#support-library')).toBeFocused()
  await expect(page.locator('.article-card')).toHaveCount(1)
  await page.getByRole('link', { name: `Read ${article.title}` }).click()
  await expect(page.locator('h1')).toHaveText(article.title)
  await expect(page.locator('#article-content')).toContainText('Review the recorded readings.')
  await expect(page.getByRole('button', { name: 'Yes, helpful', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Sign in to give feedback' })).toHaveAttribute('href', `/SignIn?returnUrl=${encodeURIComponent(`/articles/${articleId}`)}`)
  expect(new Set(calls.map(call => call.path))).toEqual(new Set(['/_api/serverlogics/northwind-profile', '/_api/serverlogics/northwind-knowledge']))
  expect(calls.every(call => call.method === 'GET')).toBe(true)
})

for (const [label, options] of [
  ['anonymous', { failedLoad: true, knowledgeStatus: 401 }],
  ['private-site gate without portal sign-in', { profileStatus: 403, knowledgeStatus: 403 }],
] as const) test(`signed-out visitors keep the sign-in welcome when published knowledge is unavailable (${label})`, async ({ page }) => {
  await mockSupport(page, options)
  await page.goto('/?data=dataverse')
  await expect(page.locator('main h1')).toHaveText('Welcome to Northwind support')
  await expect(page.getByText('Sign in for personal support', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in to continue' })).toHaveAttribute('href', '/SignIn?returnUrl=%2F')
  await expect(page.getByText('Support data is unavailable')).toHaveCount(0)
  await expect(page.getByLabel('Search knowledge articles')).toHaveCount(0)
  await expect(page.locator('.case-card, .article-card')).toHaveCount(0)
  await page.goto(`/articles/${articleId}?data=dataverse`)
  await expect(page.locator('main h1')).toHaveText('Sign in to customer support')
})

test('closed cases have no customer write controls and arbitrary IDs are not exposed', async ({ page }) => {
  const calls = await mockSupport(page)
  await page.goto(`/cases/${secondId}?data=dataverse`)
  await expect(page.locator('h1')).toHaveText(secondCase.title)
  await expect(page.getByLabel('Reply to support')).toHaveCount(0)
  await page.getByRole('tab', { name: 'Documents', exact: true }).click()
  await expect(page.getByLabel('Attachments', { exact: true })).toHaveCount(0)
  await expect(page.locator('input[type="file"]')).toHaveCount(0)
  await expect(page.getByLabel('Document purpose', { exact: true })).toHaveCount(0)
  expect(calls.some(call => call.method === 'POST' && (call.path === '/_api/adx_portalcomments' || call.body.kind === 'attachmentReceipt'))).toBe(false)
  await page.goto(`/cases/${productId}?data=dataverse`)
  await expect(page.locator('h1')).toHaveText('Case not available')
})

test('empty authorized results remain empty and valid catalog/knowledge pages load completely', async ({ page }) => {
  await mockSupport(page, { empty: true })
  await page.goto('/?data=dataverse')
  await expect(page.locator('.snapshot-number')).toHaveText('0')
  await expect(page.locator('.article-card')).toHaveCount(0)
  await page.unrouteAll()
  const calls = await mockSupport(page, { catalogNextLink: '/_api/products?$skiptoken=two', pagedKnowledge: true })
  await page.goto('/?data=dataverse')
  await expect(page.locator('.article-card')).toHaveCount(1)
  expect(new Set(calls.filter(call => call.path === '/_api/products').map(call => call.query))).toEqual(new Set([
    '?$select=productid,name,statecode&$filter=statecode%20eq%200&$orderby=name', '?$skiptoken=two',
  ]))
  expect(new Set(calls.filter(call => call.path.endsWith('northwind-knowledge')).map(call => call.query))).toEqual(new Set(['', '?cursor=knowledge-two']))
})

test('connected routes and case tabs remain usable with doubled text in both directions', async ({ page }, testInfo) => {
  test.setTimeout(60000)
  await mockSupport(page)
  for (const route of ['/', '/cases', `/cases/${caseId}`, `/articles/${articleId}`, '/account']) {
    await page.goto(`${route}?data=dataverse`)
    await expect(page.getByRole('button', { name: /^Notifications, / }).first()).toBeAttached()
    for (const direction of ['ltr', 'rtl']) {
      await page.evaluate(dir => {
        document.documentElement.dir = dir
        const walker = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT)
        let current: Node | null
        while ((current = walker.nextNode())) {
          const parent = current.parentElement
          if (dir === 'ltr' && current.textContent?.trim() && parent && !parent.closest('script,style,textarea,input,select,svg')) {
            current.textContent = `${current.textContent} ${current.textContent}`
          }
        }
      }, direction)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      if (route === `/cases/${caseId}`) {
        await page.getByRole('tab').first().focus()
        await page.keyboard.press(direction === 'ltr' ? 'ArrowRight' : 'ArrowLeft')
        await expect(page.getByRole('tab').nth(1)).toBeFocused()
        await page.keyboard.press('End')
        await expect(page.getByRole('tab').nth(2)).toBeFocused()
        await page.getByLabel('Case title').fill('عنوان دعم العميل / Customer support request')
        await expect(page.getByLabel('Case title')).toHaveAttribute('dir', 'auto')
        await page.getByLabel('Case title').clear()
      }
      await page.screenshot({ path: testInfo.outputPath(`${route.replaceAll('/', '-') || 'home'}-${direction}.png`), fullPage: true })
    }
  }
})
