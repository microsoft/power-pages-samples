import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, afterEach, before, mock, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

let server
let service
let orders
let api

before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, hmr: false },
    appType: 'custom',
  })
  service = await server.ssrLoadModule('/src/services/invoiceService.ts')
  orders = await server.ssrLoadModule('/src/services/purchaseOrderService.ts')
  api = await server.ssrLoadModule('/src/services/powerPagesApi.ts')
})

after(async () => { await server?.close() })
afterEach(() => { mock.restoreAll() })

const recordId = '33333333-3333-4333-8333-333333333333'
const contactId = '11111111-1111-4111-8111-111111111111'
const supplierId = '22222222-2222-4222-8222-222222222222'
const purchaseOrderId = '44444444-4444-4444-8444-444444444444'
const capturedErrors = JSON.parse(readFileSync(new URL('./fixtures/query-errors.json', import.meta.url), 'utf8'))

for (const kind of ['invoice', 'purchase order']) {
  test(`approved ${kind} create calls a fixed scoped endpoint without browser identity authority`, async () => {
    const requests = []
    const endpoint = kind === 'invoice' ? 'submit-invoice' : 'create-purchase-order'
    mock.method(globalThis, 'fetch', async (url, options = {}) => {
      if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
      const path = new URL(url, 'https://portal.example').pathname
      if (options.method !== 'POST') {
        assert.equal(path, `/_api/accounts(${supplierId})`)
        return Response.json({ accountid: supplierId, accountcategorycode: 132140000, statecode: 0 })
      }
      requests.push(path)
      if (path === '/_api/spnvc_invoices' || path === '/_api/spnvc_purchaseorders') {
        const captured = kind === 'invoice' ? capturedErrors.invoiceCreateAssociation : capturedErrors.purchaseOrderCreateAssociation
        return Response.json({ error: captured.error }, { status: captured.status })
      }
      assert.equal(path, `/_api/serverlogics/${endpoint}`)
      const input = JSON.parse(options.body)
      assert.equal(Object.keys(input).some(key => key.includes('@odata.bind')), false)
      assert.equal(input.contactId, undefined)
      if (kind === 'invoice') {
        assert.equal(input.supplierId, undefined)
        assert.equal(input.submissionDate, undefined)
        assert.equal(input.purchaseOrderId, purchaseOrderId)
      } else assert.equal(input.supplierId, supplierId)
      return Response.json({ success: true, error: null, data: JSON.stringify({ record: {
        spnvc_invoiceid: recordId, spnvc_purchaseorderid: recordId,
        _spnvc_contactid_value: contactId, _spnvc_supplieraccountid_value: supplierId,
        _spnvc_purchaseorderid_value: purchaseOrderId, spnvc_name: 'FIXTURE',
        spnvc_amount: 123, spnvc_totalamount: 123, spnvc_invoicestatus: 1, spnvc_postatus: 1,
      } }) })
    })
    const created = kind === 'invoice'
      ? await service.createInvoice({
        invoiceNumber: 'FIXTURE', amount: 123,
        contactId: '99999999-9999-4999-8999-999999999999',
        supplierId: '88888888-8888-4888-8888-888888888888', purchaseOrderId,
      })
      : await orders.createPurchaseOrder({ poNumber: 'FIXTURE', totalAmount: 123, supplierId })
    assert.equal(created.id, recordId)
    assert.equal(created.supplierId, supplierId)
    if (kind === 'invoice') assert.equal(created.contactId, contactId)
    assert.deepEqual(requests, [`/_api/serverlogics/${endpoint}`])
  })
}

test('invoice creation maps verified server audit associations without forwarding browser identity hints', async () => {
  let posted
  mock.method(globalThis, 'fetch', async (url, options = {}) => {
    if (url === '/_layout/tokenhtml') {
      return new Response('<input value="test-token" />')
    }
    if (options.method === 'POST') {
      assert.equal(url, '/_api/serverlogics/submit-invoice')
      posted = JSON.parse(options.body)
      return Response.json({ success: true, error: null, data: JSON.stringify({ record: {
        spnvc_invoiceid: recordId, spnvc_name: posted.invoiceNumber, spnvc_amount: posted.amount,
        spnvc_invoicestatus: 2,
        _spnvc_contactid_value: contactId, _spnvc_supplieraccountid_value: supplierId,
        _spnvc_purchaseorderid_value: purchaseOrderId,
      } }) })
    }
    assert.fail('create must not fall back to ordinary OData')
  })

  const created = await service.createInvoice({
    invoiceNumber: 'INV-TEST-001',
    poNumber: 'PO-TEST-001',
    amount: 1250,
    status: 'Submitted',
    contactId,
    supplierId,
    purchaseOrderId,
  })

  assert.equal(posted.contactId, undefined)
  assert.equal(posted.supplierId, undefined)
  assert.equal(posted.purchaseOrderId, purchaseOrderId)
  assert.equal(created.purchaseOrderId, purchaseOrderId)
  assert.equal(created.supplierId, supplierId)
})

for (const kind of ['invoice', 'purchase order']) {
  test(`native ${kind} API success header remains usable by the shared response helper`, async () => {
    const requests = []
    const entitySet = kind === 'invoice' ? 'spnvc_invoices' : 'spnvc_purchaseorders'
    mock.method(globalThis, 'fetch', async (url, options = {}) => {
      if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
      requests.push({ url, method: options.method ?? 'GET' })
      if (options.method === 'POST') {
        assert.equal(url, `/_api/${entitySet}`)
        return new Response(null, { status: 204, headers: { entityid: recordId } })
      }
      assert.fail('native header extraction does not fabricate an entity')
    })
    const response = await api.powerPagesFetchResponse(`/_api/${entitySet}`, { method: 'POST', body: '{}' })
    assert.equal(api.extractRecordId(response), recordId)
    assert.equal(requests.filter(request => request.method === 'POST').length, 1)
  })
}

test('create header parser accepts native GUIDs and rejects malformed identities', () => {
  for (const header of ['entityid', 'EntityId', 'ENTITYID']) {
    assert.equal(api.extractRecordId(new Response(null, { headers: { [header]: recordId } })), recordId)
  }
  for (const value of ['', 'not-a-guid', `${recordId} trailing`, '------------------------------------']) {
    assert.equal(api.extractRecordId(new Response(null, { headers: { entityid: value } })), null)
  }
  for (const header of ['Location', 'OData-EntityId']) {
    assert.equal(api.extractRecordId(new Response(null, { headers: {
      [header]: `https://portal.example/_api/spnvc_invoices(${recordId})`,
    } })), recordId)
  }
})

test('captured PO association denial is surfaced once without replaying the rejected create', async () => {
  let posts = 0
  mock.method(globalThis, 'fetch', async (url, options = {}) => {
    if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
    if (options.method !== 'POST') {
      assert.equal(new URL(url, 'https://portal.example').pathname, `/_api/accounts(${supplierId})`)
      return Response.json({ accountid: supplierId, accountcategorycode: 132140000, statecode: 0 })
    }
    posts++
    assert.equal(url, '/_api/serverlogics/create-purchase-order')
    const body = JSON.parse(options.body)
    assert.equal(body.supplierId, supplierId)
    const captured = capturedErrors.purchaseOrderCreateAssociation
    return Response.json({ success: true, error: null, data: JSON.stringify({
      status: 'error', message: captured.error.message, code: captured.error.code, httpStatus: captured.status,
      persistence: 'rejected',
    }) })
  })
  await assert.rejects(orders.createPurchaseOrder({
    poNumber: 'FIXTURE-DENIED', totalAmount: 123, supplierId,
  }), error => error.status === 403 && error.code === '90040106')
  assert.equal(posts, 1, 'table-permission denial is not an expired CSRF token')
})

test('captured invoice Contact association denial preserves its exact code and cannot become create success', async () => {
  let posts = 0
  const captured = capturedErrors.invoiceCreateAssociation
  mock.method(globalThis, 'fetch', async (url, options = {}) => {
    if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
    assert.equal(options.method, 'POST')
    assert.equal(url, '/_api/serverlogics/submit-invoice')
    const body = JSON.parse(options.body)
    assert.equal(body.contactId, undefined)
    assert.equal(body.supplierId, undefined)
    assert.equal(body.purchaseOrderId, purchaseOrderId)
    posts++
    return Response.json({ success: true, error: null, data: JSON.stringify({
      status: 'error', message: captured.error.message, code: captured.error.code,
      httpStatus: captured.status, innerCode: captured.error.innererror.code, persistence: 'rejected',
    }) })
  })
  await assert.rejects(service.createInvoice({
    invoiceNumber: 'FIXTURE-DENIED', amount: 123, contactId, supplierId, purchaseOrderId, status: 'Submitted',
  }), error => error.status === captured.status && error.code === captured.error.code &&
    error.message === captured.error.message && error.details.innerCode === captured.error.innererror.code)
  assert.equal(posts, 1)
})

test('hosting 90040107 after an RPC handler attempt never causes a duplicate create', async () => {
  let handlerAttempts = 0
  mock.method(globalThis, 'fetch', async (url, options = {}) => {
    if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
    assert.equal(url, '/_api/serverlogics/submit-invoice')
    assert.equal(options.method, 'POST')
    assert.equal('retryAntiForgery' in options, false, 'retry policy is not an HTTP fetch option')
    handlerAttempts++
    return Response.json({ error: { code: '90040107', message: 'Hosting anti-forgery rejection' } }, { status: 403 })
  })
  await assert.rejects(service.createInvoice({
    invoiceNumber: 'FIXTURE', amount: 123, purchaseOrderId,
  }), error => error.code === '90040107' && error.message.includes('Check existing records'))
  assert.equal(handlerAttempts, 1)
})

for (const wrapper of ['powerPagesFetch', 'powerPagesFetchResponse']) {
  test(`${wrapper} does not replay an ambiguous create failure`, async () => {
    let posts = 0
    const timer = globalThis.setTimeout
    mock.method(globalThis, 'setTimeout', (callback, _delay, ...args) => timer(callback, 0, ...args))
    mock.method(globalThis, 'fetch', async (url, options = {}) => {
      if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
      assert.equal(options.method, 'POST')
      posts++
      return Response.json({ error: { message: 'Ambiguous write response' } }, { status: 500 })
    })
    await assert.rejects(api[wrapper]('/_api/spnvc_invoices', { method: 'POST', body: '{}' }), /Ambiguous write response/)
    assert.equal(posts, 1, 'a failed response does not prove that a record was not persisted')
  })

  test(`${wrapper} refreshes only an explicitly rejected anti-forgery token`, async () => {
    let calls = 0
    let tokens = 0
    mock.method(globalThis, 'fetch', async url => {
      if (url === '/_layout/tokenhtml') {
        tokens++
        return new Response('<input value="test-token" />')
      }
      calls++
      return calls === 1
        ? Response.json({ error: { code: '90040107', message: 'Anti-forgery mismatch' } }, { status: 403 })
        : Response.json({ value: [] })
    })
    await api[wrapper]('/_api/spnvc_invoices', { method: 'POST', body: '{}' })
    assert.equal(calls, 2)
    assert.ok(tokens >= 1, 'the rejected cached token must be fetched again')
  })

  test(`${wrapper} retains bounded transient read retries`, async () => {
    let calls = 0
    const timer = globalThis.setTimeout
    mock.method(globalThis, 'setTimeout', (callback, _delay, ...args) => timer(callback, 0, ...args))
    mock.method(globalThis, 'fetch', async url => {
      if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
      calls++
      return calls < 3
        ? Response.json({ error: { message: 'Transient read failure' } }, { status: 503 })
        : Response.json({ value: [] })
    })
    await api[wrapper]('/_api/spnvc_invoices')
    assert.equal(calls, 3)
  })
}

for (const operation of ['upload', 'delete']) {
  for (const status of [403, 500]) {
    test(`${operation} does not replay a denied or ambiguous file-column mutation (${status})`, async () => {
      let mutations = 0
      const timer = globalThis.setTimeout
      mock.method(globalThis, 'setTimeout', (callback, _delay, ...args) => timer(callback, 0, ...args))
      mock.method(globalThis, 'fetch', async (url, options = {}) => {
        if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
        assert.equal(options.method, operation === 'upload' ? 'PATCH' : 'DELETE')
        mutations++
        return Response.json({ error: {
          code: status === 403 ? '90040106' : '9004010A', message: 'Fixture file mutation failure',
        } }, { status })
      })
      const run = operation === 'upload'
        ? () => api.uploadFileColumn('spnvc_invoiceattachments', recordId, 'spnvc_file', new Blob(['fixture']), 'fixture.txt')
        : () => api.deleteFileColumn('spnvc_invoiceattachments', recordId, 'spnvc_file')
      await assert.rejects(run(), /File .*failed/)
      assert.equal(mutations, 1)
    })
  }
}
