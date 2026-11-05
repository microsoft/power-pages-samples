import { test as base, expect, type Page, type Route } from '@playwright/test'
import { decodeSearchSummary, SearchSummaryApiError, verifyKnowledgeSummary } from '../src/services/aiSummaryService'

const test = base.extend<{ browserErrors: string[] }>({
  browserErrors: [async ({ page }, use) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await use(errors)
    expect(errors).toEqual([])
  }, { auto: true }],
})
const contactId = '11111111-1111-4111-8111-111111111111'
const caseId = '22222222-2222-4222-8222-222222222222'
const articleId = '44444444-4444-4444-8444-444444444444'
const article = { id: articleId, number: 'KA-1001', title: 'Published gateway guidance', description: 'Customer-safe steps.', content: '<p>Review the recorded readings.</p>' }
const articleUrl = `/page-not-found/?id=${articleId}`
const summary = (url = articleUrl, content = 'Check the gateway readings') => ({
  Summary: `${content}[[1]](${url}).\nContact support if needed.`,
  SummaryTitle: 'Gateway guidance', SearchTitle: 'gateway', Citations: { '[1]': url },
  CitationTitleMapping: { '[1]': 'Untrusted title <script>not HTML</script>' }, ResponseStatus: 'Success', ErrorMessage: '',
})
const hostedSummary = (url = `/?id=${articleId}`) => ({
  ...summary(url), SummaryTitle: 'Summarized by AI', SearchTitle: 'Other results',
  ErrorMessage: null, ResponseStatus: { Code: 200, Message: 'Success' },
  CitationTitleMapping: { '[1]': article.title }, Chunks: null,
})
const hostedEmpty = () => ({
  Summary: null, SummaryTitle: 'Summarized by AI', SearchTitle: 'Other results',
  ErrorMessage: "I'm sorry, I'm unable to process your question. Can you rephrase or ask another question?",
  ResponseStatus: { Code: 200, Message: 'No relevant responses were found.' },
  Citations: null, CitationTitleMapping: null, Chunks: null,
})
const origin = 'https://portal.example'
type Call = { body: string | null; headers: Record<string, string>; method: string }

function requireEnabledAi() {
  test.skip(process.env.VITE_KB_AI_SEARCH_ENABLED !== 'true', 'Requires VITE_KB_AI_SEARCH_ENABLED=true on the isolated mocked test server.')
}

async function mockPortal(page: Page, respond: (route: Route) => Promise<void> = route => route.fulfill({ json: summary() })) {
  const calls: Call[] = [], knowledgePages: string[] = []
  let tokenCalls = 0
  await page.addInitScript(() => {
    const original = window.fetch
    window.fetch = (input, options) => {
      if (input === '/_api/search/v1.0/summary') Reflect.set(window, 'aiCredentials', options?.credentials)
      return original(input, options)
    }
  })
  await page.route('**/_layout/tokenhtml', route => {
    tokenCalls++
    return route.fulfill({ contentType: 'text/html', body: '<input name="__RequestVerificationToken" value="test-csrf">' })
  })
  await page.route('**/_api/**', route => {
    const request = route.request(), url = new URL(request.url())
    expect(request.headers().__requestverificationtoken).toBe('test-csrf')
    const success = (data: unknown) => route.fulfill({ json: { Success: true, Data: JSON.stringify({ status: 'success', data }) } })
    if (url.pathname === '/_api/search/v1.0/summary') {
      calls.push({ body: request.postData(), headers: request.headers(), method: request.method() })
      return respond(route)
    }
    expect(request.method()).toBe('GET')
    if (url.pathname.endsWith('/northwind-profile')) return success({
      id: contactId, firstName: 'Ada', lastName: 'Customer', email: 'ada@example.test', phone: '', address: '', account: null,
    })
    if (url.pathname === '/_api/incidents') return route.fulfill({ json: { value: [{
      incidentid: caseId, ticketnumber: 'CAS-1001', title: 'Customer gateway request', description: 'Private case details not sent to AI',
      statecode: 0, statuscode: 1, createdon: '2026-10-15T10:00:00Z', modifiedon: '2026-10-15T10:00:00Z', _customerid_value: contactId,
    }] } })
    if (url.pathname === '/_api/products' || url.pathname === '/_api/categories') return route.fulfill({ json: { value: [] } })
    if (url.pathname.endsWith('/northwind-knowledge')) {
      knowledgePages.push(url.searchParams.get('cursor') ?? 'first')
      return success({ items: url.searchParams.has('cursor') ? [article] : [], cursor: url.searchParams.has('cursor') ? null : 'page-two' })
    }
    throw new Error(`Unexpected portal API: ${url.pathname}`)
  })
  return { calls, knowledgePages, tokenCalls: () => tokenCalls }
}
async function openConnected(page: Page) {
  await page.goto('/?data=dataverse')
  await expect(page.getByRole('heading', { name: 'Hi Ada! How can we help you?' })).toBeVisible()
  return page.getByLabel('Search cases and articles')
}
async function search(page: Page, query = 'gateway') {
  const input = page.getByLabel('Search cases and articles')
  await input.fill(query)
  await input.press('Enter')
  return page.locator('.ai-search-summary')
}
function expectCode(operation: () => unknown, code: string) {
  let failure: unknown
  try { operation() } catch (error) { failure = error }
  expect(failure).toBeInstanceOf(SearchSummaryApiError)
  expect((failure as SearchSummaryApiError).code).toBe(code)
}

test('AI decoder guards the contract, disabled envelope, soft failures and empty results', () => {
  expectCode(() => decodeSearchSummary({ Code: 400, Message: 'Gen AI Search is disabled.' }), 'DISABLED')
  expectCode(() => decodeSearchSummary({ Code: 500, Message: 'Service failure' }), 'SERVICE')
  for (const value of [
    null, [], {}, { Summary: 10, Citations: {} }, { Summary: '', Citations: [] },
    { ...summary(), SummaryTitle: {} }, { ...summary(), SearchTitle: false },
    { ...summary(), Citations: { '[1]': 5 } }, { ...summary(), Citations: { source: articleUrl } },
    { ...summary(), CitationTitleMapping: { '[1]': {} } },
    { ...summary(), Chunks: {} }, { ...summary(), Chunks: [null] }, { ...summary(), Chunks: [{ Score: 'high' }] },
    { ...summary(), ErrorMessage: false }, { ...summary(), ResponseStatus: {} },
  ]) expectCode(() => decodeSearchSummary(value), 'INVALID_RESPONSE')
  for (const value of [
    { ...summary(), ErrorMessage: 'Backend failed' },
    { ...summary(), ResponseStatus: 'Failure' },
    { Summary: '', Citations: {}, ErrorMessage: 'Unexpected error' },
  ]) expectCode(() => decodeSearchSummary(value), 'SERVICE')
  for (const extra of [{}, { ErrorMessage: 'No results found', ResponseStatus: 'Failure' }, { ResponseStatus: 'NoResults' }]) {
    expect(verifyKnowledgeSummary(decodeSearchSummary({ Summary: ' \n ', Citations: {}, ...extra }), [article], origin)).toBeNull()
  }
})

test('AI hosted success normalizes object status and nullable optional fields without changing the typed API', () => {
  const result = decodeSearchSummary(hostedSummary())
  expect(result.ResponseStatus).toBe('Success')
  expect(result.SummaryTitle).toBe('Summarized by AI')
  expect(result.SearchTitle).toBe('Other results')
  expect(result.ErrorMessage).toBeUndefined()
  expect(result.Chunks).toBeUndefined()
  expect(verifyKnowledgeSummary(result, [article], origin)?.sources[0].href).toBe(`/articles/${articleId}`)
  const absent = decodeSearchSummary({
    ...hostedSummary(), SummaryTitle: null, SearchTitle: null, CitationTitleMapping: null, ResponseStatus: null,
  })
  for (const key of ['SummaryTitle', 'SearchTitle', 'CitationTitleMapping', 'ResponseStatus', 'ErrorMessage', 'Chunks'] as const) {
    expect(absent[key]).toBeUndefined()
  }
  expect(verifyKnowledgeSummary(absent, [article], origin)?.sources[0].title).toBe(article.title)
  const chunks = decodeSearchSummary({ ...hostedSummary(), Chunks: [{ Id: null, Title: null, Url: articleUrl, Score: null }] })
  expect(chunks.Chunks).toEqual([{ Id: undefined, Title: undefined, Url: articleUrl, Score: undefined }])
  expect(decodeSearchSummary({ Summary: 'Legacy answer', Citations: {} }).Summary).toBe('Legacy answer')
})

test('AI hosted no-results status alone permits consistent null answer fields and the exact apology', () => {
  for (const payload of [
    hostedEmpty(),
    { ...hostedEmpty(), Summary: ' \n ', Citations: {}, CitationTitleMapping: {}, Chunks: [] },
    { ...hostedEmpty(), Summary: '', ErrorMessage: null },
    { ...hostedEmpty(), Citations: {} },
    { ...hostedEmpty(), ResponseStatus: 'NoResults', ErrorMessage: null },
  ]) {
    const result = decodeSearchSummary(payload)
    expect(result.Summary.trim()).toBe('')
    expect(result.Citations).toEqual({})
    expect(verifyKnowledgeSummary(result, [article], origin)).toBeNull()
  }
  expect(decodeSearchSummary(hostedEmpty()).ResponseStatus).toBe('No relevant responses were found.')
})

test('AI hosted status and null boundaries reject malformed, failed and contradictory envelopes', () => {
  for (const status of [
    {}, [], false, 200, { Message: 'Success' }, { Code: 200 }, { Code: '200', Message: 'Success' },
    { Code: 200.5, Message: 'Success' }, { Code: NaN, Message: 'Success' }, { Code: Infinity, Message: 'Success' },
    { Code: null, Message: 'Success' }, { Code: 200, Message: null }, { Code: 200, Message: {} },
  ]) expectCode(() => decodeSearchSummary({ ...hostedSummary(), ResponseStatus: status }), 'INVALID_RESPONSE')
  for (const code of [0, 201, 204, 400, 403, 500]) {
    expectCode(() => decodeSearchSummary({ ...hostedSummary(), ResponseStatus: { Code: code, Message: 'Success' } }), 'SERVICE')
    expectCode(() => decodeSearchSummary({ ...hostedEmpty(), ResponseStatus: { Code: code, Message: 'No relevant responses were found.' } }), 'SERVICE')
  }
  for (const message of ['', 'Failure', 'Unknown', 'No relevant responses were found. Backend failed.']) {
    expectCode(() => decodeSearchSummary({ ...hostedSummary(), ResponseStatus: { Code: 200, Message: message } }), 'SERVICE')
  }
  for (const payload of [
    { ...hostedSummary(), Summary: null }, { ...hostedSummary(), Citations: null },
    { ...hostedSummary(), SummaryTitle: {} }, { ...hostedSummary(), SearchTitle: [] },
    { ...hostedSummary(), CitationTitleMapping: { '[1]': null } },
    { ...hostedSummary(), Chunks: {} }, { ...hostedSummary(), Chunks: [null] },
    { ...hostedSummary(), Chunks: [{ Url: {} }] }, { ...hostedSummary(), Chunks: [{ Score: 'high' }] },
    { ...hostedSummary(), Chunks: [{ Score: Infinity }] }, { ...hostedSummary(), ErrorMessage: {} },
    { ...hostedEmpty(), Summary: undefined }, { ...hostedEmpty(), Citations: undefined },
    { ...hostedEmpty(), Summary: 0 }, { ...hostedEmpty(), Citations: [] },
    { ...hostedEmpty(), CitationTitleMapping: [] }, { ...hostedEmpty(), Chunks: false },
    { ...hostedEmpty(), ResponseStatus: undefined }, { ...hostedEmpty(), ResponseStatus: null },
    { ...hostedEmpty(), ResponseStatus: 'Success' }, { ...hostedEmpty(), ResponseStatus: { Code: 200, Message: 'Success' } },
  ]) expectCode(() => decodeSearchSummary(payload), 'INVALID_RESPONSE')
  for (const payload of [
    { ...hostedEmpty(), Summary: 'An answer contradicts this no-results status.' },
    { ...hostedEmpty(), Citations: { '[1]': articleUrl } },
    { ...hostedEmpty(), CitationTitleMapping: { '[1]': article.title } },
    { ...hostedEmpty(), Chunks: [{ Url: articleUrl }] },
    { ...hostedEmpty(), ErrorMessage: 'Database failed' },
    { ...hostedEmpty(), ResponseStatus: 'NoResults' },
    { ...hostedSummary(), ErrorMessage: hostedEmpty().ErrorMessage },
    { ...hostedSummary(), Summary: '', Citations: {}, CitationTitleMapping: null, ErrorMessage: hostedEmpty().ErrorMessage },
    { ...hostedSummary(), ResponseStatus: { Code: 200, Message: 'No results found' } },
  ]) expectCode(() => decodeSearchSummary(payload), 'SERVICE')
})

test('AI citations accept only authorized GUID and KA routes and prefer trusted titles', () => {
  for (const url of [articleUrl, `${origin}${articleUrl}`, `/articles/${articleId}`, '/knowledgebase/article/KA-1001', 'knowledgebase/article/ka-1001/']) {
    const result = verifyKnowledgeSummary(decodeSearchSummary(summary(url)), [article], origin)
    expect(result?.sources).toEqual([{ token: '[1]', articleId, href: `/articles/${articleId}`, title: article.title }])
    expect(result?.parts.find(part => part.kind === 'citation')).toEqual({ kind: 'citation', source: result?.sources[0] })
  }
  const alternateInline = { ...summary('/knowledgebase/article/KA-1001'), Citations: { '[1]': articleUrl } }
  expect(verifyKnowledgeSummary(decodeSearchSummary(alternateInline), [article], origin)?.sources).toHaveLength(1)
  expectCode(() => verifyKnowledgeSummary(decodeSearchSummary(summary('/knowledgebase/article/KA-1001')), [article, { ...article, id: caseId }], origin), 'UNSAFE_SOURCE')
})

test('AI root citations normalize authorized Home sources to the article route', () => {
  const rootUrl = `/?id=${articleId}`
  for (const url of [rootUrl, `${origin}${rootUrl}`]) {
    const result = verifyKnowledgeSummary(decodeSearchSummary({
      ...summary(url), Chunks: [{ Url: url }],
    }), [article], origin)
    expect(result?.sources).toEqual([{ token: '[1]', articleId, href: `/articles/${articleId}`, title: article.title }])
    expect(result?.parts.find(part => part.kind === 'citation')).toEqual({ kind: 'citation', source: result?.sources[0] })
  }
  for (const [inline, citation] of [[rootUrl, articleUrl], [articleUrl, rootUrl]]) {
    const result = verifyKnowledgeSummary(decodeSearchSummary({
      ...summary(inline), Citations: { '[1]': citation },
    }), [article], origin)
    expect(result?.sources[0].href).toBe(`/articles/${articleId}`)
  }
})

test('AI root citations reject malformed IDs, extra parameters and unsafe or non-Home routes', () => {
  const rootUrl = `/?id=${articleId}`
  for (const url of [
    '/', '/?id=', '/?id=not-a-guid', `/?id=${caseId}`,
    `${rootUrl}&id=${articleId}`, `${rootUrl}&id=${caseId}`,
    `${rootUrl}&table=knowledgearticle`, `${rootUrl}&lang=en-US`, `/?ID=${articleId}`,
    `${rootUrl}#extra`, `https://foreign.example${rootUrl}`, `//foreign.example${rootUrl}`,
    `http://portal.example${rootUrl}`, `/assets${rootUrl}`, `/assets?id=${articleId}`,
    `/cases/${articleId}?id=${articleId}`,
  ]) expectCode(() => verifyKnowledgeSummary(decodeSearchSummary(summary(url)), [article], origin), 'UNSAFE_SOURCE')
  expectCode(() => verifyKnowledgeSummary(decodeSearchSummary(summary(rootUrl)), [], origin), 'UNSAFE_SOURCE')
  expectCode(() => verifyKnowledgeSummary(decodeSearchSummary({
    ...summary(rootUrl), Citations: { '[1]': rootUrl, '[2]': `/?id=${caseId}` },
  }), [article], origin), 'UNSAFE_SOURCE')
})

test('AI citations fail closed for unsafe, unknown, unlisted, contradictory and hidden sources', () => {
  for (const url of [
    `https://foreign.example${articleUrl}`, `//foreign.example${articleUrl}`,
    `https://name:password@portal.example${articleUrl}`, `http://portal.example${articleUrl}`,
    'javascript:alert(1)', 'data:text/html,unsafe', '/cases/' + caseId, `/cases/${caseId}?id=${articleId}`,
    '/page-not-found/?id=' + caseId, `/page-not-found/?id=${articleId}&id=${caseId}`,
    `/page-not-found/?id=${articleId}&table=incident`, `/page-not-found/?id=${articleId}#extra`,
    '/articles/not-a-guid', '/knowledgebase/article/KA-9999', `/unrecognized?id=${articleId}`,
    `\\foreign.example\\page-not-found\\?id=${articleId}`,
  ]) expectCode(() => verifyKnowledgeSummary(decodeSearchSummary(summary(url)), [article], origin), 'UNSAFE_SOURCE')
  for (const response of [
    { ...summary(), Citations: {} },
    { ...summary(), Citations: { '[2]': articleUrl } },
    { ...summary(), Citations: { '[1]': articleUrl, '[2]': `/cases/${caseId}` } },
    { ...summary('/articles/' + caseId), Citations: { '[1]': articleUrl } },
    { ...summary(), Summary: 'Broken [[1]] citation' },
    { ...summary(), Chunks: [{ Url: `/cases/${caseId}` }] },
  ]) expectCode(() => verifyKnowledgeSummary(decodeSearchSummary(response), [article], origin), 'UNSAFE_SOURCE')
  expectCode(() => verifyKnowledgeSummary(decodeSearchSummary(summary()), [], origin), 'UNSAFE_SOURCE')
})

test('AI submit uses encoded query only, cached CSRF and required headers while preserving ordinary results', async ({ page }) => {
  requireEnabledAi()
  const mock = await mockPortal(page)
  const input = await openConnected(page)
  await input.fill('gateway')
  await expect(page.locator('.search-result')).toHaveCount(2)
  await expect(page.locator('.ai-search-summary')).toHaveCount(0)
  expect(mock.calls).toHaveLength(0)
  await input.press('ArrowDown')
  await expect(page.locator('.search-result').first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(input).toBeFocused()
  await expect(page.locator('#support-results')).toBeHidden()

  const query = 'gateway + & = ? café العربية'
  const card = await search(page, query)
  await expect(card).toContainText('AI knowledge answer ready')
  await expect(input).toHaveValue(query)
  await expect(input).toBeFocused()
  expect([...new Set(mock.knowledgePages)]).toEqual(['first', 'page-two'])
  expect(mock.tokenCalls()).toBe(1)
  expect(mock.calls).toHaveLength(1)
  expect(mock.calls[0].method).toBe('POST')
  expect(mock.calls[0].body).toBe(new URLSearchParams({ userQuery: query }).toString())
  expect(mock.calls[0].headers).toMatchObject({
    accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded', __requestverificationtoken: 'test-csrf', 'x-requested-with': 'XMLHttpRequest',
  })
  expect(mock.calls[0].headers).not.toHaveProperty('odata-version')
  expect(mock.calls[0].headers).not.toHaveProperty('odata-maxversion')
  expect(await page.evaluate(() => Reflect.get(window, 'aiCredentials'))).toBe('same-origin')
  await expect(card.locator('.ai-search-answer a')).toHaveAttribute('href', `/articles/${articleId}`)
  await expect(card.getByRole('link', { name: '[1] Published gateway guidance', exact: true })).toBeVisible()
  await expect(page.locator('.search-result[href^="/cases/"]')).toHaveCount(1)
  await expect(page.locator('.search-result[href^="/articles/"]')).toHaveCount(1)
  await input.press('ArrowDown')
  await expect(page.locator('.search-result').first()).toBeFocused()
  await page.keyboard.press('Escape')
  await input.press('Enter')
  await expect(card).toContainText('AI knowledge answer ready')
  await card.locator('.ai-search-answer a').click()
  await expect(page).toHaveURL(new RegExp(`/articles/${articleId}$`))
  await expect(page.locator('#article-content')).toContainText('Review the recorded readings.')
})

test('AI demo submit never calls a service or invents an answer; personal case navigation stays intact', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => { if (request.url().includes('/_api/') || request.url().includes('/_layout/')) requests.push(request.url()) })
  await page.goto('/')
  const card = await search(page)
  await expect(card.getByRole('status')).toContainText('No AI request was sent')
  await expect(card.locator('.ai-search-answer')).toHaveCount(0)
  expect(requests).toEqual([])
  await expect(page.locator('.search-result[href^="/cases/"]')).toHaveCount(1)
  await page.locator('.search-result[href^="/cases/"]').click()
  await expect(page).toHaveURL(/\/cases\/CAS-01001-S9D5F3$/)
})

test('AI disabled and empty responses remain distinct and retain keyword matches', async ({ page }) => {
  requireEnabledAi()
  let payload: unknown = { Code: 400, Message: 'Gen AI Search is disabled.' }
  const mock = await mockPortal(page, route => route.fulfill({ json: payload }))
  await openConnected(page)
  const card = await search(page)
  await expect(card).toContainText('turned off for this site')
  await expect(card).toContainText('tenant AI settings')
  await expect(card).toContainText('Copilot Hub')
  await expect(card.getByRole('link', { name: 'Enable AI search in Power Pages' })).toBeVisible()
  await expect(card.getByRole('button', { name: /Retry/ })).toHaveCount(0)
  await expect(page.locator('.search-result')).toHaveCount(2)
  expect(mock.calls).toHaveLength(1)
  payload = { Summary: ' \n ', Citations: {}, ErrorMessage: 'No results found', ResponseStatus: 'Failure' }
  await page.getByRole('button', { name: 'Search support', exact: true }).click()
  await expect(card.getByRole('status')).toContainText('No AI answer was found')
  await expect(page.getByRole('button', { name: 'Search support', exact: true })).toBeFocused()
  await expect(page.locator('.search-result')).toHaveCount(2)
})

test('AI hosted success renders object status and null fields with a validated Home citation', async ({ page }) => {
  requireEnabledAi()
  const mock = await mockPortal(page, route => route.fulfill({
    json: hostedSummary(new URL(`/?id=${articleId}`, route.request().url()).href),
  }))
  const input = await openConnected(page)
  const card = await search(page)
  await expect(card.getByRole('alert')).toHaveCount(0)
  await expect(card).toContainText('AI knowledge answer ready')
  await expect(card.getByRole('heading', { name: 'Summarized by AI' })).toBeVisible()
  await expect(card.locator('.ai-search-answer a')).toHaveAttribute('href', `/articles/${articleId}`)
  await expect(card.locator('.ai-search-sources')).toContainText(article.title)
  await expect(page.locator('.search-result')).toHaveCount(2)
  await expect(input).toBeFocused()
  expect(mock.calls).toHaveLength(1)
  await card.locator('.ai-search-answer a').click()
  await expect(page).toHaveURL(new RegExp(`/articles/${articleId}$`))
})

test('AI hosted no-results envelope shows an empty state instead of a service failure', async ({ page }) => {
  requireEnabledAi()
  const mock = await mockPortal(page, route => route.fulfill({ json: hostedEmpty() }))
  const input = await openConnected(page)
  const card = await search(page, 'Customer gateway request')
  await expect(card.getByRole('status')).toContainText('No AI answer was found')
  await expect(card.getByRole('alert')).toHaveCount(0)
  await expect(card.getByRole('button', { name: 'Retry AI search' })).toHaveCount(0)
  await expect(card.locator('.ai-search-answer')).toHaveCount(0)
  await expect(page.locator('.search-result[href^="/cases/"]')).toHaveCount(1)
  await expect(page.locator('.search-result[href^="/articles/"]')).toHaveCount(1)
  await expect(input).toBeFocused()
  expect(mock.calls).toHaveLength(1)
})

test('AI hosted malformed and inconsistent envelopes stay visible errors without rendering answers', async ({ page }) => {
  requireEnabledAi()
  let payload: unknown
  const mock = await mockPortal(page, route => route.fulfill({ json: payload }))
  await openConnected(page)
  for (const [response, message] of [
    [{ ...hostedSummary(), ResponseStatus: { Code: 503, Message: 'Success' } }, 'could not generate'],
    [{ ...hostedSummary(), ResponseStatus: { Code: '200', Message: 'Success' } }, 'invalid response'],
    [{ ...hostedSummary(), Summary: null }, 'invalid response'],
    [{ ...hostedEmpty(), Citations: { '[1]': articleUrl } }, 'could not generate'],
  ] as const) {
    payload = response
    const card = await search(page)
    await expect(card.getByRole('alert')).toContainText(message)
    await expect(card.locator('.ai-search-answer')).toHaveCount(0)
    await expect(page.locator('.search-result')).toHaveCount(2)
  }
  expect(mock.calls).toHaveLength(4)
})

test('AI auth, network, HTTP, malformed and out-of-scope failures never look like success', async ({ page }) => {
  requireEnabledAi()
  let response: 'auth' | 'network' | 'http' | 'json' | 'shape' | 'source' | 'soft' = 'auth'
  await mockPortal(page, route => {
    if (response === 'auth') return route.fulfill({ status: 403, json: {} })
    if (response === 'network') return route.abort('internetdisconnected')
    if (response === 'http') return route.fulfill({ status: 503, json: {} })
    if (response === 'json') return route.fulfill({ contentType: 'application/json', body: '<html>not JSON</html>' })
    if (response === 'shape') return route.fulfill({ json: { Summary: null, Citations: {} } })
    if (response === 'soft') return route.fulfill({ json: { ...summary(), ErrorMessage: 'backend failure' } })
    return route.fulfill({ json: { ...summary(), Citations: { '[1]': articleUrl, '[2]': `/cases/${caseId}` } } })
  })
  await openConnected(page)
  const cases = [
    ['auth', 'Your session cannot access'], ['network', 'could not connect'], ['http', 'temporarily unavailable'],
    ['json', 'invalid response'], ['shape', 'invalid response'], ['source', 'could not be verified'], ['soft', 'could not generate'],
  ] as const
  for (const [kind, message] of cases) {
    response = kind
    const card = await search(page)
    await expect(card.getByRole('alert')).toContainText(message)
    await expect(card.locator('.ai-search-answer')).toHaveCount(0)
    await expect(page.locator('.search-result')).toHaveCount(2)
  }
})

test('AI query edits, cancellation and request races cannot reveal an earlier answer', async ({ page }) => {
  requireEnabledAi()
  // Exercise stale-response suppression even when the transport ignores cancellation.
  await page.addInitScript(() => {
    const original = window.fetch
    window.fetch = (input, options) => original(input, input === '/_api/search/v1.0/summary' ? { ...options, signal: undefined } : options)
  })
  let first: Route | undefined
  const mock = await mockPortal(page, async route => {
    const query = new URLSearchParams(route.request().postData()!).get('userQuery')
    if (query === 'gateway first') { first = route; return }
    await route.fulfill({ json: summary(articleUrl, query === 'gateway second' ? 'Current answer' : 'After cancellation') })
  })
  const input = await openConnected(page)
  const card = await search(page, 'gateway first')
  await expect(card.getByRole('status')).toContainText('Searching knowledge articles')
  await expect.poll(() => first !== undefined).toBe(true)
  await input.fill('gateway second')
  await expect(card).toHaveCount(0)
  await input.press('Enter')
  await expect(card.locator('.ai-search-answer')).toContainText('Current answer')
  await first!.fulfill({ json: summary(articleUrl, 'Stale answer must never appear') })
  await expect(card.locator('.ai-search-answer')).toContainText('Current answer')
  await expect(card).not.toContainText('Stale answer')
  await expect(input).toBeFocused()

  await search(page, 'gateway first')
  await expect.poll(() => mock.calls.length).toBe(3)
  await expect(card.getByRole('button', { name: 'Cancel AI search' })).toBeVisible()
  await card.getByRole('button', { name: 'Cancel AI search' }).click()
  await expect(card).toHaveCount(0)
  await expect(input).toBeFocused()
  await first!.fulfill({ json: summary(articleUrl, 'Cancelled answer must never appear') })
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(card).toHaveCount(0)
  await input.fill('')
  await input.press('Enter')
  expect(mock.calls).toHaveLength(3)
  await expect(page.locator('#support-results')).toContainText('Enter a product')
})

test('AI output is inert text and validated links, wraps in LTR/RTL and preserves adaptive input direction', async ({ page }) => {
  requireEnabledAi()
  const unsafeText = '<img src=x onerror=alert(1)> **plain text** [ordinary link](https://foreign.example)'
  const longText = 'Expanded guidance العربية '.repeat(12) + 'long-unbroken-text-'.repeat(20)
  await mockPortal(page, route => route.fulfill({ json: {
    ...summary('/knowledgebase/article/KA-1001', `${unsafeText}\n${longText}`),
    SummaryTitle: 'Expanded AI heading العربية '.repeat(8),
  } }))
  const input = await openConnected(page)
  for (const direction of ['ltr', 'rtl']) {
    await page.evaluate(dir => { document.documentElement.dir = dir }, direction)
    await input.fill('')
    await expect(input).toHaveAttribute('dir', direction)
    for (const [text, expected] of [['مرحبا', 'rtl'], ['gateway', 'ltr']]) {
      await input.fill(text)
      await expect(input).toHaveAttribute('dir', 'auto')
      expect(await input.evaluate(element => getComputedStyle(element).direction)).toBe(expected)
      await input.fill('')
      await expect(input).toHaveAttribute('dir', direction)
    }
    const card = await search(page)
    await expect(card.locator('.ai-search-answer')).toContainText(unsafeText)
    await expect(card.locator('img, script, iframe')).toHaveCount(0)
    await expect(card.locator('a')).toHaveCount(2)
    await expect(card.locator('a').first()).toHaveAttribute('href', `/articles/${articleId}`)
    expect(await card.locator('.ai-search-answer').evaluate(element => getComputedStyle(element).whiteSpace)).toBe('pre-wrap')
    for (const locator of [card, page.locator('#support-results')]) {
      expect(await locator.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await expect(input).toBeFocused()
    const screenshot = test.info().outputPath(`ai-search-expanded-${direction}.png`)
    await page.locator('.support-search').screenshot({ path: screenshot })
    await test.info().attach(`ai-search-expanded-${direction}`, { path: screenshot, contentType: 'image/png' })
    await page.getByLabel('Search support articles').click()
    await expect(page.locator('#support-results')).toBeHidden()
  }
})

test('AI completion does not discard keyboard focus on the cancellation control', async ({ page }) => {
  requireEnabledAi()
  let pending: Route | undefined
  await mockPortal(page, async route => { pending = route })
  await openConnected(page)
  const card = await search(page)
  await expect.poll(() => pending !== undefined).toBe(true)
  await card.getByRole('button', { name: 'Cancel AI search' }).focus()
  await pending!.fulfill({ json: summary() })
  await expect(card.locator('.ai-search-answer')).toBeVisible()
  await expect(card.getByRole('button', { name: 'Dismiss AI answer' })).toBeFocused()
  await card.getByRole('button', { name: 'Dismiss AI answer' }).press('Enter')
  await expect(card).toHaveCount(0)
  await expect(page.getByLabel('Search cases and articles')).toBeFocused()
})

test('AI retry keeps keyboard focus on the search input during loading and completion', async ({ page }) => {
  requireEnabledAi()
  let attempts = 0, pending: Route | undefined
  await mockPortal(page, async route => {
    if (++attempts === 1) { await route.fulfill({ status: 503, json: {} }); return }
    pending = route
  })
  const input = await openConnected(page)
  const card = await search(page)
  await expect(card.getByRole('alert')).toContainText('temporarily unavailable')
  await input.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(card.getByRole('button', { name: 'Retry AI search' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(card.getByRole('status')).toContainText('Searching knowledge articles')
  await expect(input).toBeFocused()
  await expect.poll(() => pending !== undefined).toBe(true)
  await pending!.fulfill({ json: summary() })
  await expect(card.locator('.ai-search-answer')).toBeVisible()
  await expect(input).toBeFocused()
  expect(attempts).toBe(2)
})

for (const target of ['first', 'last', 'single'] as const) test(`AI completion keeps the ${target} keyword match inside the viewport without moving focus or the page`, async ({ page }) => {
  requireEnabledAi()
  let pending: Route | undefined
  // Match the reviewer's original repro, including fallback-font layout when external fonts are blocked.
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
  const mock = await mockPortal(page, async route => { pending = route })
  const input = await openConnected(page)
  await page.waitForLoadState('networkidle')
  const matches = page.locator('.search-result')
  const match = target === 'last' ? matches.last() : matches.first()
  const visibility = () => match.evaluate(element => {
    const container = element.closest<HTMLElement>('#support-results')!
    const bounds = container.getBoundingClientRect(), item = element.getBoundingClientRect()
    const screenTop = window.visualViewport?.offsetTop ?? 0
    const screenBottom = screenTop + (window.visualViewport?.height ?? window.innerHeight)
    const top = bounds.top + container.clientTop, bottom = top + container.clientHeight
    const hit = document.elementFromPoint(item.x + item.width / 2, item.y + item.height / 2)
    return {
      insideContainer: item.top >= top - 1 && item.bottom <= bottom + 1,
      insideViewport: item.top >= Math.max(top, screenTop) - 1 && item.bottom <= Math.min(bottom, screenBottom) + 1,
      visibleHit: !!hit && element.contains(hit),
      scrollportFits: bounds.bottom <= screenBottom + 1,
      item: { top: item.top, bottom: item.bottom }, container: { top: bounds.top, bottom: bounds.bottom, scrollTop: container.scrollTop },
      screen: { top: screenTop, bottom: screenBottom },
    }
  })
  await page.evaluate(() => document.addEventListener('focusin', () => {
    Reflect.set(window, 'aiFocusChanges', Number(Reflect.get(window, 'aiFocusChanges') ?? 0) + 1)
  }))
  for (const direction of ['ltr', 'rtl']) {
    await page.evaluate(dir => { document.documentElement.dir = dir }, direction)
    pending = undefined
    const card = await search(page, target === 'single' ? 'published' : 'gateway')
    await expect.poll(() => pending !== undefined).toBe(true)
    await expect(matches).toHaveCount(target === 'single' ? 1 : 2)
    await input.press('ArrowDown')
    if (target === 'last') await page.keyboard.press('Tab')
    await expect(match).toBeFocused()
    await expect.poll(visibility).toMatchObject({ insideContainer: true, insideViewport: true, visibleHit: true })
    const before = await visibility()
    const pageScroll = await page.evaluate(() => {
      Reflect.set(window, 'aiFocusChanges', 0)
      return { x: window.scrollX, y: window.scrollY }
    })
    await pending!.fulfill({ json: {
      SummaryTitle: 'Gateway guidance العربية',
      Summary: `${'Check gateway readings العربية and follow the documented steps. '.repeat(30)} [[1]](${articleUrl}).`,
      Citations: { '[1]': articleUrl }, ResponseStatus: 'Success', ErrorMessage: '',
    } })
    await expect(card).toContainText('AI knowledge answer ready')
    await expect(match).toBeFocused()
    await expect.poll(visibility).toMatchObject({ insideContainer: true, insideViewport: true, visibleHit: true, scrollportFits: true })
    expect(await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))).toEqual(pageScroll)
    expect(await page.evaluate(() => Reflect.get(window, 'aiFocusChanges'))).toBe(0)
    expect(mock.calls).toHaveLength(direction === 'ltr' ? 1 : 2)
    await test.info().attach(`${target}-${direction}-geometry`, { body: JSON.stringify({ before, after: await visibility() }, null, 2), contentType: 'application/json' })
    await page.screenshot({ path: test.info().outputPath(`${target}-${direction}-focused-match.png`) })
  }
})

test('AI output remains open for text selection without repeating the summary request', async ({ page }) => {
  requireEnabledAi()
  const mock = await mockPortal(page)
  const input = await openConnected(page)
  const card = await search(page)
  const results = page.locator('#support-results'), answerText = card.locator('.ai-search-answer span').first()
  await expect(answerText).toContainText('Check the gateway readings')
  await expect(input).toBeFocused()
  await answerText.click()
  await expect(results).toBeVisible()
  await expect(results).toBeFocused()
  await answerText.click({ clickCount: 3 })
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toContain('gateway')
  await expect(card.locator('.ai-search-answer')).toBeVisible()
  await expect(page.locator('.search-result')).toHaveCount(2)
  expect(mock.calls).toHaveLength(1)
  await page.keyboard.press('Escape')
  await expect(input).toBeFocused()
  await expect(results).toBeHidden()

  await input.press('Enter')
  await expect(answerText).toBeVisible()
  expect(mock.calls).toHaveLength(2)
  await answerText.click()
  await page.getByLabel('Search support articles').click()
  await expect(results).toBeHidden()
  expect(mock.calls).toHaveLength(2)
})

test('AI rollout gate makes no connected summary call while preserving keyword search', async ({ page }) => {
  test.skip(process.env.VITE_KB_AI_SEARCH_ENABLED === 'true', 'Checks the default-off build; run without the flag or with a value other than true.')
  const mock = await mockPortal(page)
  const input = await openConnected(page)
  await page.evaluate(() => {
    const url = new URL(location.href)
    url.searchParams.set('VITE_KB_AI_SEARCH_ENABLED', 'true')
    history.replaceState(null, '', url)
  })
  for (const direction of ['ltr', 'rtl']) {
    await page.evaluate(dir => { document.documentElement.dir = dir }, direction)
    const card = await search(page)
    await expect(card.getByRole('status')).toContainText('not enabled in this build')
    await expect(card.getByRole('status')).toContainText('No AI request was sent')
    await expect(card.locator('.ai-search-answer')).toHaveCount(0)
    await expect(card.getByRole('button', { name: /Retry/ })).toHaveCount(0)
    await expect(input).toBeFocused()
    await expect(page.locator('.search-result[href^="/cases/"]')).toHaveCount(1)
    await expect(page.locator('.search-result[href^="/articles/"]')).toHaveCount(1)
    expect(mock.calls).toHaveLength(0)
    expect(await card.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
    const screenshot = test.info().outputPath(`ai-search-setup-unavailable-${direction}.png`)
    await page.locator('.support-search').screenshot({ path: screenshot })
    await test.info().attach(`ai-search-setup-unavailable-${direction}`, { path: screenshot, contentType: 'image/png' })
    await input.press('ArrowDown')
    await expect(page.locator('.search-result').first()).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(input).toBeFocused()
    await expect(page.locator('#support-results')).toBeHidden()
  }
  await page.getByRole('button', { name: 'Search support', exact: true }).click()
  await expect(page.locator('.ai-search-summary')).toContainText('not enabled in this build')
  expect(mock.calls).toHaveLength(0)
  await page.locator('.search-result[href^="/articles/"]').click()
  await expect(page).toHaveURL(new RegExp(`/articles/${articleId}$`))
})
