import assert from 'node:assert/strict'
import { after, afterEach, before, mock, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

let server
let service
let mappings

before(async () => {
    server = await createServer({
        root: fileURLToPath(new URL('../', import.meta.url)),
        configFile: false,
        optimizeDeps: { noDiscovery: true, include: [] },
        server: { middlewareMode: true, watch: null, hmr: false },
        appType: 'custom',
    })
    service = await server.ssrLoadModule('/src/shared/services/articleService.ts')
    mappings = await server.ssrLoadModule('/src/types/knowledgeArticle.ts')
})

after(async () => { await server?.close() })
afterEach(() => { mock.restoreAll() })

const article = {
    knowledgearticleid: '11111111-1111-4111-8111-111111111111',
    title: 'Reporting a pothole',
    content: 'Report road damage to the city.',
    keywords: 'Roads, repairs',
    articlepublicnumber: 'KA-01001',
    description: 'How to report road damage.',
    publishon: '2026-09-09T08:00:00Z',
    statecode: 3,
}

function mockArticles(inspect = () => { }, response = { value: [article] }) {
    mock.method(globalThis, 'fetch', async url => {
        const query = new URL(url, 'https://portal.example').searchParams
        assert.doesNotMatch(decodeURIComponent(url), /spa311_/)
        assert.equal(query.get('$select'), 'knowledgearticleid,title,content,keywords,articlepublicnumber,description,publishon,statecode,createdon,modifiedon')
        inspect(query)
        return Response.json(response)
    })
}

test('article lists select standard fields and keep the published filter', async () => {
    mockArticles(query => {
        assert.equal(query.get('$filter'), 'statecode eq 3')
        assert.equal(query.get('$orderby'), 'publishon desc')
    }, { value: [article], '@odata.count': 1 })
    const result = await service.listArticles()
    assert.equal(result.totalCount, 1)
    assert.equal(result.items[0].slug, 'KA-01001')
    assert.equal(result.items[0].summary, article.description)
    assert.equal(result.items[0].publishedAt, article.publishon)
})

test('the knowledge page loads API articles instead of silently falling back', async () => {
    mockArticles(query => {
        assert.equal(query.get('$top'), '250')
        assert.equal(query.get('$orderby'), 'publishon desc')
        assert.equal(query.get('$filter'), 'statecode eq 3')
    })
    const result = await service.getAllArticles()
    assert.equal(result.length, 1)
    assert.equal(result[0].id, article.knowledgearticleid)
})

test('article links resolve by public number with OData escaping', async () => {
    mockArticles(query => {
        assert.equal(query.get('$filter'), "statecode eq 3 and (articlepublicnumber eq 'KA-01''001')")
    })
    assert.equal((await service.getArticleBySlug("KA-01'001")).id, article.knowledgearticleid)
})

test('an article without a public number has a working record-ID link', async () => {
    const withoutNumber = { ...article, articlepublicnumber: '' }
    const mapped = mappings.mapKnowledgeArticleEntity(withoutNumber)
    assert.equal(mapped.slug, article.knowledgearticleid)
    mockArticles(query => {
        assert.equal(query.get('$filter'), `statecode eq 3 and (knowledgearticleid eq ${article.knowledgearticleid})`)
    }, { value: [withoutNumber] })
    assert.equal((await service.getArticleBySlug(mapped.slug)).id, article.knowledgearticleid)
})

test('direct article reads also use standard columns', async () => {
    mockArticles(() => { }, article)
    assert.equal((await service.getArticleById(article.knowledgearticleid)).slug, article.articlepublicnumber)
})

test('search and filtered lists search description and escape apostrophes', async () => {
    mockArticles(query => {
        assert.match(query.get('$filter'), /^statecode eq 3 and /)
        assert.ok(query.get('$filter').includes("contains(description,'city''s roads')"))
        assert.equal(query.get('$orderby'), 'publishon desc')
    })
    assert.equal((await service.searchArticles("city's roads"))[0].id, article.knowledgearticleid)
    assert.equal((await service.listArticles({ search: "city's roads" })).items[0].id, article.knowledgearticleid)
})

test('empty tables retain local English and French articles and their links', async () => {
    mockArticles(() => { }, { value: [] })
    for (const language of ['en', 'fr']) {
        const articles = await service.getAllArticles(language)
        assert.ok(articles.length > 0)
        assert.deepEqual(await service.getArticleBySlug(articles[0].slug, language), articles[0])
    }
})
