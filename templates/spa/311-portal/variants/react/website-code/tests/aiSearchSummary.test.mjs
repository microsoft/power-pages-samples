import assert from 'node:assert/strict'
import { after, afterEach, before, mock, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

let server
let ai

before(async () => {
    server = await createServer({
        root: fileURLToPath(new URL('../', import.meta.url)),
        configFile: false,
        optimizeDeps: { noDiscovery: true, include: [] },
        server: { middlewareMode: true, watch: null, hmr: false },
        appType: 'custom',
    })
    ai = await server.ssrLoadModule('/src/services/aiSummaryService.ts')

    // extractKnowledgeArticleId resolves relative URLs against the page origin. The SPA only ever
    // runs in a browser, so the production code reads window directly rather than carrying a
    // Node-safe branch it would never take.
    globalThis.window = { location: { origin: 'https://portal.example' } }
})

after(async () => {
    delete globalThis.window
    await server?.close()
})

afterEach(() => { mock.restoreAll() })

const SUMMARY_URL = '/_api/search/v1.0/summary'

/**
 * Answer the anti-forgery token request, then hand the summary request to `respond`.
 * Returns the captured summary request so assertions can inspect what went on the wire.
 */
function mockSummary(respond) {
    const captured = {}
    mock.method(globalThis, 'fetch', async (url, init) => {
        if (String(url).includes('/_layout/tokenhtml')) {
            return new Response('<input value="test-token" />', { status: 200 })
        }
        captured.url = String(url)
        captured.init = init
        return respond()
    })
    return captured
}

const jsonResponse = (body, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })

test('the summary request is form encoded, not JSON', async () => {
    // Sending "application/json" here is the single most common cause of a 400 from this
    // endpoint, and it is exactly the Content-Type the data summarization calls in the same
    // module require, so the two must not drift together.
    const captured = mockSummary(() => jsonResponse({ Summary: 'Text.', Citations: {} }))

    await ai.fetchSearchSummary('Streetlight outage: a light is out on my street')

    assert.equal(captured.url, SUMMARY_URL)
    assert.equal(captured.init.method, 'POST')
    assert.equal(captured.init.headers['Content-Type'], 'application/x-www-form-urlencoded')
    assert.equal(captured.init.headers.Accept, 'application/json')
    assert.equal(captured.init.headers.__RequestVerificationToken, 'test-token')
    assert.equal(captured.init.headers['X-Requested-With'], 'XMLHttpRequest')

    // OData versioning belongs to /_api/summarization/data only.
    assert.equal(captured.init.headers['OData-Version'], undefined)
    assert.equal(captured.init.headers['OData-MaxVersion'], undefined)

    assert.equal(
        new URLSearchParams(captured.init.body).get('userQuery'),
        'Streetlight outage: a light is out on my street'
    )
})

test('the disabled envelope arrives as HTTP 200 and is not treated as a summary', async () => {
    // With Site search (preview) off, the endpoint answers 200 with an error body. A naive
    // response.ok check reads that as a success with an empty summary.
    mockSummary(() => jsonResponse({ Code: 400, Message: 'Gen AI Search is disabled.' }))

    const error = await ai.fetchSearchSummary('anything').then(
        value => assert.fail(`expected a rejection, got ${JSON.stringify(value)}`),
        err => err
    )

    assert.ok(error instanceof ai.SearchSummaryApiError)
    assert.equal(error.code, 400)
    assert.equal(ai.isGenAiSearchDisabled(error), true)
    // The data endpoint's codes live in a different namespace and must not match here.
    assert.equal(ai.isSummarizationDisabledError(error), false)
})

test('a summary that happens to be absent still resolves when there is no error envelope', async () => {
    mockSummary(() => jsonResponse({ ResponseStatus: 'Success' }))

    const response = await ai.fetchSearchSummary('anything')

    assert.equal(response.Summary, '')
    assert.deepEqual(response.Citations, {})
    // The envelope fields never ride along on a value typed as a successful response.
    assert.equal('Code' in response, false)
    assert.equal('Message' in response, false)
})

test('a transport failure carries the HTTP status', async () => {
    mockSummary(() => jsonResponse({ error: 'nope' }, 403))

    const error = await ai.fetchSearchSummary('anything').then(
        () => assert.fail('expected a rejection'),
        err => err
    )

    assert.ok(error instanceof ai.SearchSummaryApiError)
    assert.equal(error.code, 403)
    assert.equal(ai.isGenAiSearchDisabled(error), false)
})

test('a non-JSON body does not crash the parser', async () => {
    mockSummary(() => new Response('<html>WAF challenge</html>', { status: 200 }))

    await assert.rejects(
        ai.fetchSearchSummary('anything'),
        err => err instanceof ai.SearchSummaryApiError
    )
})

test('inline citations are split out of the prose', () => {
    const parts = ai.parseSummaryWithCitations(
        'Report it online.[[1]](https://portal.example/page-not-found/?id=11111111-1111-4111-8111-111111111111) ' +
        'Crews respond in 5 days.[[2]](https://portal.example/help)'
    )

    assert.deepEqual(parts.map(part => part.kind), [
        'text', 'citation', 'text', 'citation',
    ])
    assert.equal(parts[0].text, 'Report it online.')
    assert.equal(parts[1].token, '[1]')
    assert.equal(parts[3].url, 'https://portal.example/help')
    // Nothing is dropped: concatenating the literal runs and tokens reproduces the input.
    assert.equal(
        parts.map(part => (part.kind === 'text' ? part.text : '')).join(''),
        'Report it online. Crews respond in 5 days.'
    )
})

test('prose without citations survives intact and an unterminated token stays literal', () => {
    assert.deepEqual(ai.parseSummaryWithCitations('Just prose.'), [
        { kind: 'text', text: 'Just prose.' },
    ])
    assert.deepEqual(ai.parseSummaryWithCitations(''), [])
    assert.deepEqual(ai.parseSummaryWithCitations('Broken [[1]](no-close'), [
        { kind: 'text', text: 'Broken [[1]](no-close' },
    ])
})

test('knowledge article citations are recovered from the stock 404 URL', () => {
    // The search service points citations at the built-in knowledge base route, which a code
    // site does not serve, so they come back pre-redirected to page-not-found.
    assert.equal(
        ai.extractKnowledgeArticleId(
            'https://portal.example/page-not-found/?id=2f1c9b7e-4d3a-4a51-9b2e-7c6d5e4f3a2b'
        ),
        '2f1c9b7e-4d3a-4a51-9b2e-7c6d5e4f3a2b'
    )

    // An ordinary page, an unrelated id, and a malformed URL all mean "link to it verbatim".
    assert.equal(ai.extractKnowledgeArticleId('https://portal.example/services'), null)
    assert.equal(ai.extractKnowledgeArticleId('https://portal.example/thing/?id=42'), null)
    assert.equal(
        ai.extractKnowledgeArticleId(
            'https://other.example/page-not-found/?id=2f1c9b7e-4d3a-4a51-9b2e-7c6d5e4f3a2b'
        ),
        null
    )
    assert.equal(
        ai.extractKnowledgeArticleId(
            'https://portal.example/services/?id=2f1c9b7e-4d3a-4a51-9b2e-7c6d5e4f3a2b'
        ),
        null
    )
    assert.equal(ai.extractKnowledgeArticleId('not a url at all'), null)
})

test('citation links allow only web URLs', () => {
    assert.equal(
        ai.normalizeCitationUrl('/knowledge/KA-01055'),
        'https://portal.example/knowledge/KA-01055'
    )
    assert.equal(
        ai.normalizeCitationUrl('https://learn.microsoft.com/power-pages'),
        'https://learn.microsoft.com/power-pages'
    )
    assert.equal(ai.normalizeCitationUrl('javascript:alert(1)'), null)
    assert.equal(ai.normalizeCitationUrl('data:text/html,<script>alert(1)</script>'), null)
})

test('the search query is built from display text, never the slug', () => {
    assert.equal(
        ai.buildServiceTypeSearchQuery({
            name: 'Streetlight Outage',
            description: 'A street light is broken or stays on during the day.',
        }),
        'Streetlight Outage: A street light is broken or stays on during the day.'
    )

    assert.equal(ai.buildServiceTypeSearchQuery({ name: 'Pothole Repair' }), 'Pothole Repair')

    // The hook uses undefined to hold the request until the service type resolves.
    assert.equal(ai.buildServiceTypeSearchQuery(undefined), undefined)
    assert.equal(ai.buildServiceTypeSearchQuery(null), undefined)
    assert.equal(ai.buildServiceTypeSearchQuery({ name: '   ' }), undefined)

    const long = ai.buildServiceTypeSearchQuery({ name: 'Noise', description: 'x '.repeat(400) })
    assert.ok(long.length <= ai.SEARCH_SUMMARY_QUERY_MAX_LENGTH)
    assert.equal(long, long.trimEnd())
})
