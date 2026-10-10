import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, afterEach, before, mock, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

let server
let invoices
let orders
let comments
let attachments
let suppliers
let api
let summaries
const errors = JSON.parse(await readFile(new URL('./fixtures/query-errors.json', import.meta.url), 'utf8'))
const choices = JSON.parse(await readFile(new URL('../dataverse-choice-values.json', import.meta.url), 'utf8'))

before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, hmr: false },
    appType: 'custom',
  })
  invoices = await server.ssrLoadModule('/src/services/invoiceService.ts')
  orders = await server.ssrLoadModule('/src/services/purchaseOrderService.ts')
  comments = await server.ssrLoadModule('/src/services/invoiceCommentService.ts')
  attachments = await server.ssrLoadModule('/src/services/invoiceAttachmentService.ts')
  suppliers = await server.ssrLoadModule('/src/services/supplierService.ts')
  api = await server.ssrLoadModule('/src/services/powerPagesApi.ts')
  summaries = await server.ssrLoadModule('/src/services/aiSummaryService.ts')
})
after(async () => { await server?.close() })
afterEach(() => { mock.restoreAll() })

// Only the failing paths/status/errors were retained from the HAR. This gate
// reproduces the captured field mismatch, not the unknown cause of invoice 500.
function capturedGate(fixture) {
  const timer = globalThis.setTimeout
  mock.method(globalThis, 'setTimeout', (callback, _delay, ...args) => timer(callback, 0, ...args))
  mock.method(globalThis, 'fetch', async url => {
    if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
    const request = new URL(url, 'https://portal.example')
    if (request.pathname === '/_api/serverlogics/invoice-po-reads') {
      assert.equal(request.searchParams.get('table'), fixture.path.slice('/_api/'.length))
      assert.ok(request.searchParams.get('select').split(',').includes('_spnvc_supplieraccountid_value'))
      assert.equal(request.searchParams.get('fetchXml'), null)
      return serverReply({ value: [], '@odata.count': 0 })
    }
    assert.equal(request.pathname, fixture.path)
    const xml = request.searchParams.get('fetchXml')
    if (xml) return Response.json({ error: fixture.error }, { status: fixture.status })
    const select = request.searchParams.get('$select').split(',')
    if (select.includes('spnvc_supplieraccountid')) {
      return Response.json({ error: errors.purchaseOrder.error }, { status: 403 })
    }
    assert.ok(select.includes('_spnvc_supplieraccountid_value'))
    assert.equal(request.searchParams.get('$count'), 'true')
    return Response.json({ value: [], '@odata.count': 0 })
  })
}

function serverReply(result) {
  return Response.json({ success: true, error: null, data: JSON.stringify({ result }) })
}

function requestFilter(request) {
  return request.searchParams.has('filter')
    ? api.serializeODataFilter(JSON.parse(request.searchParams.get('filter')))
    : request.searchParams.get('$filter')
}

for (const captured of errors.invoiceDetailChildren) {
  test(`captured HTTP 400 at ${captured.path} uses the scoped child-read contract`, async () => {
    const requests = []
    const set = captured.path.slice('/_api/'.length)
    const idField = set === 'spnvc_invoicecomments' ? 'spnvc_invoicecommentid' : 'spnvc_invoiceattachmentid'
    mock.method(globalThis, 'fetch', async url => {
      if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
      const request = new URL(url, 'https://portal.example')
      requests.push(request)
      assert.equal(request.searchParams.has('fetchXml'), false)
      if (request.pathname === captured.path) {
        assert.equal(request.searchParams.get('$select'), captured.select)
        assert.equal(request.searchParams.get('$orderby'), captured.orderBy)
        // Only the HTTP status and request were captured. This response message
        // is synthetic; it does not claim an inner platform error was observed.
        return Response.json({ error: { message: 'Captured child collection HTTP 400' } }, { status: captured.status })
      }
      assert.equal(request.pathname, '/_api/serverlogics/invoice-po-reads')
      assert.equal(request.searchParams.get('table'), set)
      assert.equal(request.searchParams.get('select'), captured.select)
      assert.equal(requestFilter(request), captured.filter.replace('<invoiceId>', recordId))
      assert.equal(request.searchParams.get('orderBy'), captured.orderBy)
      return serverReply({ value: [{ [idField]: recordId, _spnvc_invoiceid_value: recordId }], '@odata.count': 1 })
    })
    const result = set === 'spnvc_invoicecomments'
      ? await comments.listCommentsByInvoiceId(recordId)
      : await attachments.listAttachmentsByInvoice(recordId)
    assert.equal(result.items[0].id, recordId)
    assert.equal(result.totalCount, 1)
    assert.equal(requests.length, 1)
  })
}

test('captured invoice request no longer uses the failing FetchXML transport', async () => {
  capturedGate(errors.invoice)
  assert.deepEqual(await invoices.listInvoicesByStatus('Submitted'), {
    items: [], totalCount: 0, nextLink: undefined,
  })
})

test('captured PO request keeps the enabled OData lookup alias at the selection gate', async () => {
  capturedGate(errors.purchaseOrder)
  assert.deepEqual(await orders.listPurchaseOrders(), {
    items: [], totalCount: 0, nextLink: undefined,
  })
})

test('captured relationship compiler failure uses a scoped server read without browser XML', async () => {
  const calls = []
  mock.method(globalThis, 'fetch', async (url, options = {}) => {
    if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
    const request = new URL(url, 'https://portal.example')
    calls.push(request)
    assert.equal(request.searchParams.has('fetchXml'), false)
    assert.ok(!options.method || options.method === 'GET')
    if (request.pathname === '/_api/serverlogics/invoice-po-reads') {
      assert.ok(['spnvc_invoices', 'spnvc_purchaseorders'].includes(request.searchParams.get('table')))
      return Response.json({
        success: true, error: null,
        data: JSON.stringify({ result: { value: [], '@odata.count': 0 } }),
      })
    }
    return Response.json({ error: errors.relationshipQuery.error }, { status: errors.relationshipQuery.status })
  })
  assert.equal((await invoices.listInvoicesByStatus('Submitted')).totalCount, 0)
  assert.equal((await orders.listPurchaseOrders()).totalCount, 0)
  assert.equal(calls.filter(request => request.pathname === '/_api/serverlogics/invoice-po-reads').length, 2)
})

test('key reads recover only the exact captured relationship signature through scoped server logic', async () => {
  let backendCalls = 0
  let balanceCalls = 0
  mock.method(globalThis, 'fetch', async url => {
    if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
    const request = new URL(url, 'https://portal.example')
    if (request.pathname === '/_api/serverlogics/invoice-po-reads') {
      if (request.searchParams.get('table') === 'spnvc_invoices' && !request.searchParams.has('mode')) {
        balanceCalls++
        assert.equal(request.searchParams.get('select'), 'spnvc_invoiceid,spnvc_amount,spnvc_invoicestatus,_spnvc_purchaseorderid_value')
        return serverReply({ value: [], '@odata.count': 0 })
      }
      backendCalls++
      assert.equal(request.searchParams.get('mode'), 'record')
      assert.equal(request.searchParams.get('id'), recordId)
      return Response.json({ success: true, error: null, data: JSON.stringify({
        record: { spnvc_invoiceid: recordId, spnvc_purchaseorderid: recordId },
      }) })
    }
    return Response.json({ error: errors.relationshipQuery.error }, { status: 400 })
  })
  assert.equal((await invoices.getInvoiceById(recordId)).id, recordId)
  assert.equal((await orders.getPurchaseOrderById(recordId)).id, recordId)
  assert.equal(backendCalls, 2)
  assert.equal(balanceCalls, 1)
  mock.restoreAll()
  mock.method(globalThis, 'fetch', async url => url === '/_layout/tokenhtml'
    ? new Response('<input value="test-token" />')
    : Response.json({ error: { code: '9004010D', message: 'A different CDS failure' } }, { status: 400 }))
  await assert.rejects(invoices.getInvoiceById(recordId), /different CDS failure/)
})

test('captured AI relationship failure stays an explicit compatibility error, never a fabricated summary', async () => {
  mock.method(globalThis, 'fetch', async url => url === '/_layout/tokenhtml'
    ? new Response('<input value="test-token" />')
    : Response.json({ error: errors.relationshipQuery.error }, { status: 400 }))
  await assert.rejects(
    summaries.fetchDataSummary({ entitySet: 'spnvc_invoices', id: recordId, select: 'spnvc_name' }),
    error => error.code === '9004010D' &&
      error.status === 400 && error.message.includes('No summary was generated.'),
  )
})

test('AI summary service has no collection summarization client', () => {
  assert.equal(summaries.fetchListSummary, undefined)
})

test('failed Server Logic envelopes preserve their reason instead of a bare HTTP status', async () => {
  for (const body of [
    { success: false, error: 'Scoped script validation failed' },
    { Success: false, Error: 'Scoped script validation failed' },
    { Error: { Message: 'Scoped script validation failed' } },
  ]) {
    mock.method(globalThis, 'fetch', async url => url === '/_layout/tokenhtml'
      ? new Response('<input value="test-token" />') : Response.json(body, { status: 400 }))
    await assert.rejects(invoices.listInvoices(), /Scoped script validation failed/)
    mock.restoreAll()
  }
})

  const recordId = '33333333-3333-4333-8333-333333333333'
  const accountId = '22222222-2222-4222-8222-222222222222'

test('PO list and detail derive invoiced totals from all qualifying linked invoice pages, including overage', async () => {
  const requests = []
  const po = {
    spnvc_purchaseorderid: recordId, spnvc_name: 'PO-FIXTURE-METRIC',
    spnvc_totalamount: 15000, spnvc_postatus: choices.tables.spnvc_purchaseorder.spnvc_postatus.Issued,
    _spnvc_supplieraccountid_value: accountId,
  }
  const statuses = choices.tables.spnvc_invoice.spnvc_invoicestatus
  const qualifying = [
    [1, statuses.Submitted], [8500, statuses.Approved], [6500, statuses.Approved],
    [1200, statuses.Paid], [500, statuses.Approved],
  ].map(([amount, status], index) => ({
    spnvc_invoiceid: `aaaaaaaa-aaaa-4aaa-8aaa-${String(index + 1).padStart(12, '0')}`,
    spnvc_amount: amount, spnvc_invoicestatus: status, _spnvc_purchaseorderid_value: recordId,
  }))
  mock.method(globalThis, 'fetch', async (url, options = {}) => {
    if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
    const request = new URL(url, 'https://portal.example')
    requests.push(request)
    assert.ok(!options.method || options.method === 'GET', 'balance reads must not mutate POs or invoices')
    assert.equal(request.searchParams.has('fetchXml'), false)
    if (request.pathname === `/_api/spnvc_purchaseorders(${recordId})`) return Response.json(po)
    assert.equal(request.pathname, '/_api/serverlogics/invoice-po-reads')
    if (request.searchParams.get('table') === 'spnvc_purchaseorders') {
      return serverReply({ value: [po], '@odata.count': 1 })
    }
    assert.equal(request.searchParams.get('table'), 'spnvc_invoices')
    const filter = requestFilter(request)
    assert.ok(filter.includes(`_spnvc_purchaseorderid_value eq ${recordId}`))
    for (const label of ['Submitted', 'Approved', 'Paid']) assert.ok(filter.includes(`spnvc_invoicestatus eq ${statuses[label]}`))
    for (const label of ['Draft', 'Rejected']) assert.equal(filter.includes(`spnvc_invoicestatus eq ${statuses[label]}`), false)
    assert.deepEqual(request.searchParams.get('select').split(',').sort(),
      ['spnvc_invoiceid', 'spnvc_amount', 'spnvc_invoicestatus', '_spnvc_purchaseorderid_value'].sort())
    const second = request.searchParams.get('page') === '2'
    const next = new URL(request)
    next.searchParams.set('page', '2')
    return serverReply({
      value: second ? qualifying.slice(2) : qualifying.slice(0, 2),
      '@odata.count': qualifying.length,
      ...(!second ? { '@odata.nextLink': next.pathname + next.search } : {}),
    })
  })
  const list = await orders.listPurchaseOrders()
  const detail = await orders.getPurchaseOrderById(recordId)
  for (const value of [list.items[0], detail]) {
    assert.equal(value.invoicedAmount, 16701, 'the UI must not inherit the mapper placeholder zero')
    assert.equal(value.remainingAmount, 0, 'available balance cannot be negative')
    assert.equal(value.overInvoicedAmount, 1701, 'the actual overage must remain visible, not silently capped')
  }
  assert.equal(list.totalCount, 1)
  assert.equal(requests.filter(request => request.searchParams.get('table') === 'spnvc_invoices').length, 4)
})
  const selected = {
    spnvc_invoices: 'spnvc_invoiceid,spnvc_name,spnvc_ponumber,spnvc_description,spnvc_submissiondate,spnvc_duedate,spnvc_amount,spnvc_invoicestatus,_spnvc_contactid_value,_spnvc_supplieraccountid_value,_spnvc_purchaseorderid_value,createdon,modifiedon',
    spnvc_purchaseorders: 'spnvc_purchaseorderid,spnvc_name,spnvc_description,spnvc_totalamount,spnvc_deliverydate,spnvc_postatus,_spnvc_supplieraccountid_value,createdon,modifiedon',
    spnvc_invoicecomments: 'spnvc_invoicecommentid,spnvc_name,spnvc_commenttext,spnvc_linkedaction,_spnvc_invoiceid_value,_spnvc_authorcontactid_value,createdon,modifiedon',
    spnvc_invoiceattachments: 'spnvc_invoiceattachmentid,spnvc_name,spnvc_filesize,spnvc_filetype,spnvc_file_name,_spnvc_invoiceid_value,_spnvc_invoicecommentid_value,createdon,modifiedon',
    accounts: 'accountid,name,accountcategorycode,statecode',
  }

  test('every collection and key read selects exactly its enabled fields', async () => {
    const fields = {}
    for (const [set, select] of Object.entries(selected)) {
      const table = set === 'accounts' ? 'account' : set.slice(0, -1)
      const setting = await readFile(new URL(`../.powerpages-site/site-settings/Webapi-${table}-fields.sitesetting.yml`, import.meta.url), 'utf8')
      fields[set] = /^value: (.+)$/m.exec(setting)[1].split(',')
      assert.ok(select.split(',').every(name => fields[set].includes(name)))
    }
    let requests = 0
    let balanceRequests = 0
    mock.method(globalThis, 'fetch', async (url, options) => {
      if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
      requests++
      const request = new URL(url, 'https://portal.example')
      const serverRead = request.pathname === '/_api/serverlogics/invoice-po-reads'
      const set = serverRead ? request.searchParams.get('table') : request.pathname.slice('/_api/'.length).split('(')[0]
      const projection = request.searchParams.get(serverRead ? 'select' : '$select')
      assert.ok(projection.split(',').every(name => fields[set].includes(name)))
      assert.equal(request.searchParams.get('fetchXml'), null)
      assert.equal(request.searchParams.get('$expand'), null)
      assert.equal(options.headers.get('__RequestVerificationToken'), 'test-token')
      if (serverRead && set === 'spnvc_invoices' &&
          projection === 'spnvc_invoiceid,spnvc_amount,spnvc_invoicestatus,_spnvc_purchaseorderid_value') {
        balanceRequests++
        return serverReply({ value: [], '@odata.count': 0 })
      }
      assert.equal(projection, selected[set])
      const entity = {
        spnvc_invoiceid: recordId, spnvc_purchaseorderid: recordId,
        spnvc_invoicecommentid: recordId, spnvc_invoiceattachmentid: recordId,
        accountid: accountId, accountcategorycode: 132140000, statecode: 0,
        _spnvc_supplieraccountid_value: accountId,
      }
      const result = { value: [entity], '@odata.count': 7 }
      return serverRead ? serverReply(result) : Response.json(request.pathname.includes('(') ? entity : result)
    })
    for (const load of [invoices.listInvoices, orders.listPurchaseOrders, comments.listInvoiceComments, attachments.listInvoiceAttachments]) {
      assert.equal((await load()).totalCount, 7)
    }
    await suppliers.listAssignableSuppliers()
    for (const load of [invoices.getInvoiceById, orders.getPurchaseOrderById, comments.getInvoiceCommentById, attachments.getInvoiceAttachmentById]) {
      assert.equal((await load(recordId)).id, recordId)
    }
    await suppliers.getSupplierById(accountId)
    assert.equal(requests, 12)
    assert.equal(balanceRequests, 2)
  })

  test('PO totals bulk reads respect the fixed-reader filter budget instead of querying once per PO', async () => {
    const pos = Array.from({ length: 60 }, (_, index) => ({
      spnvc_purchaseorderid: `bbbbbbbb-bbbb-4bbb-8bbb-${String(index + 1).padStart(12, '0')}`,
      spnvc_totalamount: 100,
    }))
    let bulkCalls = 0
    mock.method(globalThis, 'fetch', async url => {
      if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
      const request = new URL(url, 'https://portal.example')
      if (request.searchParams.get('table') === 'spnvc_purchaseorders') {
        return serverReply({ value: pos, '@odata.count': pos.length })
      }
      bulkCalls++
      assert.equal(request.searchParams.get('table'), 'spnvc_invoices')
      const filter = JSON.parse(request.searchParams.get('filter'))
      const nodeCount = value => 1 + (value.filters?.reduce((sum, child) => sum + nodeCount(child), 0) ?? 0)
      assert.ok(nodeCount(filter) <= 64)
      assert.equal(filter.filters[0].filters.length, bulkCalls === 1 ? 50 : 10)
      return serverReply({ value: [], '@odata.count': 0 })
    })
    const result = await orders.listPurchaseOrders({ pageSize: 60 })
    assert.equal(result.items.length, 60)
    assert.equal(bulkCalls, 2)
    assert.ok(result.items.every(po => po.invoicedAmount === 0 && po.remainingAmount === 100 && po.overInvoicedAmount === 0))
  })

  test('PO balances retain fractional money and reject malformed, foreign or duplicated invoice totals', async () => {
    const statuses = choices.tables.spnvc_invoice.spnvc_invoicestatus
    const base = {
      spnvc_invoiceid: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001',
      _spnvc_purchaseorderid_value: recordId, spnvc_invoicestatus: statuses.Submitted, spnvc_amount: 0.1,
    }
    let rows = [base, { ...base, spnvc_invoiceid: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002', spnvc_amount: 0.2, spnvc_invoicestatus: statuses.Paid }]
    mock.method(globalThis, 'fetch', async url => {
      if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
      const request = new URL(url, 'https://portal.example')
      if (request.pathname.startsWith('/_api/spnvc_purchaseorders(')) {
        return Response.json({ spnvc_purchaseorderid: recordId, spnvc_totalamount: 1 })
      }
      return serverReply({ value: rows, '@odata.count': rows.length })
    })
    const result = await orders.getPurchaseOrderById(recordId)
    assert.equal(result.invoicedAmount, 0.3)
    assert.equal(result.remainingAmount, 0.7)
    for (const invalid of [
      [{ ...base, spnvc_amount: null }],
      [{ ...base, spnvc_amount: -1 }],
      [{ ...base, _spnvc_purchaseorderid_value: accountId }],
      [{ ...base, spnvc_invoicestatus: statuses.Rejected }],
      [base, base],
    ]) {
      rows = invalid
      await assert.rejects(orders.getPurchaseOrderById(recordId), /Invalid or duplicate linked invoice/)
    }
  })

  test('search, typed status and relationship filters retain their OData contracts', async () => {
    const requests = []
    mock.method(globalThis, 'fetch', async url => {
      if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
      const request = new URL(url, 'https://portal.example')
      requests.push(request)
      return request.pathname === '/_api/serverlogics/invoice-po-reads'
        ? serverReply({ value: [], '@odata.count': 0 }) : Response.json({ value: [], '@odata.count': 0 })
    })
    await invoices.listInvoicesByStatus('Submitted', { search: `O'Brien & 100%_[]`, orderBy: 'spnvc_amount asc,createdon desc' })
    assert.equal(requestFilter(requests[0]),
      `(spnvc_invoicestatus eq 2 and (contains(spnvc_name,'O''Brien & 100%_[]') or contains(spnvc_ponumber,'O''Brien & 100%_[]') or contains(spnvc_description,'O''Brien & 100%_[]')))`)
    assert.equal(requests[0].searchParams.get('orderBy'), 'spnvc_amount asc,createdon desc')
    await comments.listCommentsByInvoiceId(recordId)
    assert.equal(requestFilter(requests.at(-1)), `_spnvc_invoiceid_value eq ${recordId}`)
    await attachments.listInvoiceAttachments({ invoiceId: recordId, commentId: accountId })
    assert.equal(requestFilter(requests.at(-1)),
      `((_spnvc_invoiceid_value eq ${recordId}) and _spnvc_invoicecommentid_value eq ${accountId})`)
    await orders.listPurchaseOrders({ assignableOnly: true, filter: api.eq('_spnvc_supplieraccountid_value', accountId) })
    assert.equal(requestFilter(requests.at(-1)),
      `(_spnvc_supplieraccountid_value eq ${accountId} and spnvc_SupplierAccountId/accountcategorycode eq 132140000 and spnvc_SupplierAccountId/statecode eq 0)`)
    const metadata = await readFile(new URL('../../../../solutions/SupplierInvoiceSPAPortal/Other/Relationships/Account.xml', import.meta.url), 'utf8')
    assert.ok(metadata.includes('<NavigationPropertyName>spnvc_SupplierAccountId</NavigationPropertyName>'))
  })

  test('counts use a bounded selection but retain the server count and lookup filters', async () => {
    let calls = 0
    mock.method(globalThis, 'fetch', async url => {
      if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
      const request = new URL(url, 'https://portal.example')
      const serverRead = request.pathname === '/_api/serverlogics/invoice-po-reads'
      if (serverRead) assert.equal(request.searchParams.get('pageSize'), '1')
      else {
        assert.equal(request.searchParams.get('$count'), 'true')
        assert.equal(request.searchParams.get('$top'), '1')
      }
      assert.ok(request.searchParams.get(serverRead ? 'select' : '$select').endsWith('id'))
      calls++
      return serverRead ? serverReply({ value: [], '@odata.count': 42 }) : Response.json({ value: [], '@odata.count': 42 })
    })
    assert.equal(await invoices.getInvoiceCount(api.eq('spnvc_invoicestatus', 2)), 42)
    assert.equal(await comments.getCommentCountForInvoice(recordId), 42)
    assert.equal(await attachments.getAttachmentCountByInvoice(recordId), 42)
    assert.equal(calls, 3)
    mock.restoreAll()
    mock.method(globalThis, 'fetch', async () => serverReply({ value: [] }))
    await assert.rejects(invoices.getInvoiceCount(), /OData count/)
    await assert.rejects(invoices.listInvoices(), /OData count/)
  })

  test('record reads return null only for 404 and propagate the captured 403/500 errors', async () => {
    for (const load of [invoices.getInvoiceById, orders.getPurchaseOrderById, comments.getInvoiceCommentById, attachments.getInvoiceAttachmentById]) {
      for (const fixture of [errors.invoice, errors.purchaseOrder]) {
        const timer = globalThis.setTimeout
        mock.method(globalThis, 'setTimeout', (callback, _delay, ...args) => timer(callback, 0, ...args))
        mock.method(globalThis, 'fetch', async url => url === '/_layout/tokenhtml'
          ? new Response('<input value="test-token" />')
          : Response.json({ error: fixture.error }, { status: fixture.status }))
        await assert.rejects(load(recordId), error =>
          error.status === fixture.status && error.code === fixture.error.code && error.message === fixture.error.message)
        mock.restoreAll()
      }
      mock.method(globalThis, 'fetch', async url => url === '/_layout/tokenhtml'
        ? new Response('<input value="test-token" />') : new Response(null, { status: 404 }))
      assert.equal(await load(recordId), null)
      mock.restoreAll()
    }
    await assert.rejects(invoices.getInvoiceById('not-a-guid'), /GUID/)
  })

  test('PO supplier reads and supplier assignment retrieve all opaque cursor pages', async () => {
    for (const [load, set, entity] of [
      [() => orders.getPOsBySupplier(accountId), 'spnvc_purchaseorders', { spnvc_purchaseorderid: recordId }],
      [suppliers.listAssignableSuppliers, 'accounts', { accountid: accountId, accountcategorycode: 132140000, statecode: 0 }],
    ]) {
      let calls = 0
      let balanceCalls = 0
      const next = set === 'spnvc_purchaseorders'
        ? `/_api/serverlogics/invoice-po-reads?${new URLSearchParams({ table: set, select: selected[set], page: '2' })}`
        : `/_api/${set}?$select=${selected[set]}&$skiptoken=page%2B2%26opaque`
      mock.method(globalThis, 'fetch', async url => {
        if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
        const request = new URL(url, 'https://portal.example')
        if (request.pathname === '/_api/serverlogics/invoice-po-reads' && request.searchParams.get('table') === 'spnvc_invoices') {
          balanceCalls++
          assert.equal(request.searchParams.get('select'), 'spnvc_invoiceid,spnvc_amount,spnvc_invoicestatus,_spnvc_purchaseorderid_value')
          return serverReply({ value: [], '@odata.count': 0 })
        }
        calls++
        if (calls === 2) assert.equal(url, next)
        else if (set === 'spnvc_purchaseorders') {
          assert.equal(requestFilter(new URL(url, 'https://portal.example')), `_spnvc_supplieraccountid_value eq ${accountId}`)
        }
        const result = { value: [entity], '@odata.count': 2, ...(calls === 1 ? { '@odata.nextLink': next } : {}) }
        return set === 'spnvc_purchaseorders' ? serverReply(result) : Response.json(result)
      })
      assert.equal((await load()).length, 2)
      assert.equal(calls, 2)
      assert.equal(balanceCalls, set === 'spnvc_purchaseorders' ? 2 : 0)
      mock.restoreAll()
    }
  })

  test('continuation safety rejects other origins, tables, operations and XML before sending tokens', async () => {
    let calls = 0
    mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({ value: [] }) })
    for (const nextLink of [
      'https://other.example/_api/spnvc_invoices', '//other.example/_api/spnvc_invoices',
      '/_api/accounts?$select=accountid', '/_api/spnvc_invoices(33333333-3333-4333-8333-333333333333)',
      '/_api/spnvc_invoices?fetchXml=xml', '/_api/spnvc_invoices#fragment',
    ]) {
      await assert.rejects(invoices.listInvoices({ nextLink }), /business read cursor/)
    }
    assert.equal(calls, 0)
    const previous = globalThis.window
    try {
      globalThis.window = { location: { origin: 'https://portal.example' } }
      assert.equal(api.validateCollectionUrl('https://portal.example/_api/spnvc_invoices?$skiptoken=a%26b'),
        '/_api/spnvc_invoices?$skiptoken=a%26b')
      assert.throws(() => api.validateCollectionUrl('https://user:pass@portal.example/_api/spnvc_invoices'), /collection URL/)
    } finally {
      if (previous === undefined) delete globalThis.window
      else globalThis.window = previous
    }
  })

  test('malformed collections and infinite cursors fail without a success-shaped partial result', async () => {
    mock.method(globalThis, 'fetch', async url => url === '/_layout/tokenhtml'
      ? new Response('<input value="test-token" />') : Response.json({ value: null }))
    await assert.rejects(api.fetchAllPages('/_api/accounts?$select=accountid'), /collection response/)
    mock.restoreAll()
    let calls = 0
    mock.method(globalThis, 'fetch', async url => {
      if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
      calls++
      return Response.json({ value: [{ accountid: accountId }], '@odata.nextLink': '/_api/accounts?$select=accountid' })
    })
    await assert.rejects(api.fetchAllPages('/_api/accounts?$select=accountid'), /exceeded 100 pages/)
    assert.equal(calls, 100)
  })

  test('filter primitives preserve strings, nulls, dates, booleans and reject malformed input', () => {
    assert.equal(api.serializeODataFilter(api.eq('spnvc_name', accountId)), `spnvc_name eq '${accountId}'`)
    assert.equal(api.serializeODataFilter(api.eq('_spnvc_invoiceid_value', null)), '_spnvc_invoiceid_value eq null')
    assert.equal(api.serializeODataFilter(api.eq('createdon', new Date('2026-01-01T00:00:00Z'))), 'createdon eq 2026-01-01T00:00:00.000Z')
    assert.equal(api.serializeODataFilter(api.eq('active', true)), 'active eq true')
    assert.equal(api.serializeODataFilter(api.and(undefined)), undefined)
    assert.throws(() => api.serializeODataFilter(api.eq('_spnvc_invoiceid_value', 'not-guid')), /GUID/)
    assert.throws(() => api.serializeODataFilter(api.eq('name) or true', 'x')), /property/)
    assert.throws(() => api.serializeODataFilter(api.eq('amount', NaN)), /finite/)
    assert.throws(() => api.buildCollectionUrl('accounts', { select: 'accountid', orderBy: 'name;delete' }), /sort/)
    assert.throws(() => api.buildCollectionUrl('accounts', { select: 'accountid', top: 0 }), /page size/)
  })

  test('denied edits and binary attachment transfers remain explicit failures', async () => {
    const requests = []
    mock.method(globalThis, 'fetch', async (url, options = {}) => {
      if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
      requests.push({ url, options })
      return Response.json({ error: errors.purchaseOrder.error }, { status: 403 })
    })
    await assert.rejects(invoices.updateInvoice(recordId, { status: 'Approved' }), /not enabled/)
    assert.equal(requests[0].options.method, 'PATCH')
    assert.equal(JSON.parse(requests[0].options.body).spnvc_invoicestatus, choices.tables.spnvc_invoice.spnvc_invoicestatus.Approved)
    assert.equal(requests[0].options.headers.get('If-Match'), '*')
    requests.splice(0)
    await assert.rejects(attachments.uploadAttachmentFile(recordId, new Blob(['fixture']), 'fixture.pdf'), /File upload failed: 403/)
    assert.ok(requests.every(request => request.options.method === 'PATCH'))
    assert.ok(requests.every(request => request.options.headers.get('Content-Type') === 'application/octet-stream'))
    assert.ok(requests.every(request => request.url === `/_api/spnvc_invoiceattachments(${recordId})/spnvc_file`))
    requests.splice(0)
    await assert.rejects(attachments.downloadAttachmentFile(recordId), /File download failed: 403/)
    assert.ok(requests.every(request => request.url === `/_api/spnvc_invoiceattachments(${recordId})/spnvc_file/$value`))
  })
