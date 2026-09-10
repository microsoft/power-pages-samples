import assert from 'node:assert/strict'
import { after, afterEach, before, mock, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

let server
let mappings
let service

before(async () => {
    server = await createServer({
        root: fileURLToPath(new URL('../', import.meta.url)),
        configFile: false,
        optimizeDeps: { noDiscovery: true, include: [] },
        server: { middlewareMode: true, watch: null, hmr: false },
        appType: 'custom',
    })
    mappings = await server.ssrLoadModule('/src/types/serviceRequest.ts')
    service = await server.ssrLoadModule('/src/shared/services/serviceRequestService.ts')
})

after(async () => { await server?.close() })
afterEach(() => { mock.restoreAll() })

const recordId = '33333333-3333-4333-8333-333333333333'
const input = {
    serviceTypeId: '11111111-1111-4111-8111-111111111111',
    serviceTypeName: 'Noise Concern',
    categoryId: '22222222-2222-4222-8222-222222222222',
    categoryName: 'Neighbourhood Services',
    description: 'Testing this request flow',
    address: '60 Hudson Street, New York, 10013',
    urgency: 'medium',
}

function mockApi(handler) {
    mock.method(globalThis, 'fetch', async (url, options = {}) => {
        if (url === '/_layout/tokenhtml') {
            return new Response('<input value="test-token" />')
        }
        assert.ok(url.startsWith('/_api/'))
        return handler(url, options)
    })
}

test('status values match the packaged Dataverse solution in both directions', () => {
    const statuses = ['submitted', 'reviewed', 'assigned', 'in-progress', 'resolved', 'closed']
    for (const [index, status] of statuses.entries()) {
        const value = 100000000 + index
        assert.equal(mappings.mapStatusToPicklist(status), value)
        assert.equal(mappings.mapStatusFromPicklist(value), status)
    }
})

test('urgency values match the packaged Dataverse solution in both directions', () => {
    for (const [index, urgency] of ['low', 'medium', 'high'].entries()) {
        const value = 100000000 + index
        assert.equal(mappings.mapUrgencyToPicklist(urgency), value)
        assert.equal(mappings.mapUrgencyFromPicklist(value), urgency)
    }
})

for (const [index, urgency] of ['low', 'medium', 'high'].entries()) {
    test(`creation sends valid choices for ${urgency} urgency and returns the saved number`, async () => {
        let posted
        mockApi((url, options) => {
            if (options.method === 'POST') {
                assert.equal(url, '/_api/spa311_servicerequests')
                posted = JSON.parse(options.body)
                assert.equal(posted.spa311_status, 100000000)
                assert.equal(posted.spa311_urgency, 100000000 + index)
                assert.equal(posted['spa311_CategoryId@odata.bind'], `/spa311_categories(${input.categoryId})`)
                assert.equal(posted['spa311_ServiceTypeId@odata.bind'], `/spa311_servicetypes(${input.serviceTypeId})`)
                assert.match(posted.spa311_requestnumber, /^SR-\d{8}-\d{5}$/)
                return new Response(null, {
                    status: 204,
                    headers: { 'OData-EntityId': `https://portal.example/_api/spa311_servicerequests(${recordId})` },
                })
            }
            assert.ok(url.startsWith(`/_api/spa311_servicerequests(${recordId})?`))
            assert.ok(new URL(url, 'https://portal.example').searchParams.has('$select'))
            return Response.json({
                ...posted,
                spa311_servicerequestid: recordId,
                _spa311_categoryid_value: input.categoryId,
                _spa311_servicetypeid_value: input.serviceTypeId,
            })
        })

        const created = await service.createServiceRequest({ ...input, urgency })
        assert.equal(created.id, recordId)
        assert.equal(created.requestNumber, posted.spa311_requestnumber)
        assert.equal(created.status, 'submitted')
        assert.equal(created.urgency, urgency)
        assert.equal(created.categoryId, input.categoryId)
        assert.equal(created.serviceTypeId, input.serviceTypeId)
    })
}

test('a rejected POST throws instead of returning a created request', async () => {
    let posts = 0
    mockApi((_url, options) => {
        assert.equal(options.method, 'POST')
        posts++
        return Response.json({ error: { message: 'Common Data Service error occurred.' } }, { status: 400 })
    })

    await assert.rejects(service.createServiceRequest(input), /Common Data Service error occurred/)
    assert.equal(posts, 1)
})

test('a network failure does not return a created request', async () => {
    mockApi(() => { throw new TypeError('Failed to fetch') })
    await assert.rejects(service.createServiceRequest(input), /Failed to fetch/)
})

test('creation without a record ID cannot claim a confirmed request', async () => {
    mockApi((_url, options) => {
        assert.equal(options.method, 'POST')
        return new Response(null, { status: 204 })
    })
    await assert.rejects(service.createServiceRequest(input), /Failed to retrieve created service request/)
})

test('a failed read after creation cannot return a fabricated request', async () => {
    mockApi((_url, options) => {
        if (options.method === 'POST') {
            return new Response(null, {
                status: 204,
                headers: { 'OData-EntityId': `https://portal.example/_api/spa311_servicerequests(${recordId})` },
            })
        }
        return Response.json({ error: { message: 'Read permission denied.' } }, { status: 400 })
    })
    await assert.rejects(service.createServiceRequest(input), /Failed to retrieve created service request/)
})

test('updates use the corrected choice values and decode the returned status', async () => {
    let patched
    mockApi((_url, options) => {
        if (options.method === 'PATCH') {
            patched = JSON.parse(options.body)
            assert.deepEqual(patched, { spa311_status: 100000004, spa311_urgency: 100000002 })
            return new Response(null, { status: 204 })
        }
        return Response.json({ ...patched, spa311_servicerequestid: recordId })
    })

    const updated = await service.updateServiceRequest(recordId, { status: 'resolved', urgency: 'high' })
    assert.equal(updated.status, 'resolved')
    assert.equal(updated.urgency, 'high')
})
