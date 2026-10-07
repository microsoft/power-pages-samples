import assert from 'node:assert/strict'
import { after, afterEach, before, mock, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

let server
let suppliers
let orders
let invoices
let types
let api
let affiliation
let mockData

before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, hmr: false },
    appType: 'custom',
  })
  suppliers = await server.ssrLoadModule('/src/services/supplierService.ts')
  orders = await server.ssrLoadModule('/src/services/purchaseOrderService.ts')
  invoices = await server.ssrLoadModule('/src/services/invoiceService.ts')
  types = await server.ssrLoadModule('/src/types/supplier.ts')
  api = await server.ssrLoadModule('/src/services/powerPagesApi.ts')
  affiliation = await server.ssrLoadModule('/src/services/supplierAffiliationService.ts')
  mockData = await server.ssrLoadModule('/src/data/mockData.ts')
})

after(async () => { await server?.close() })
afterEach(() => { mock.restoreAll() })

const accountId = '22222222-2222-4222-8222-222222222222'
const recordId = '33333333-3333-4333-8333-333333333333'
const account = { accountid: accountId, name: 'Supplier company', accountcategorycode: 132140000, statecode: 0 }

test('assignment queries only active Supplier Accounts and maps standard keys', async () => {
  mock.method(globalThis, 'fetch', async (url) => {
    if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
    const request = new URL(url, 'https://portal.example')
    assert.equal(request.pathname, '/_api/accounts')
    assert.equal(request.searchParams.get('$select'), 'accountid,name,accountcategorycode,statecode')
    assert.equal(request.searchParams.get('$filter'), '(accountcategorycode eq 132140000 and statecode eq 0)')
    assert.equal(request.searchParams.get('$orderby'), 'name asc')
    assert.equal(request.searchParams.get('fetchXml'), null)
    assert.ok(!request.search.includes('contactid'), 'table permissions determine the current contact')
    return Response.json({ value: [account] })
  })
  assert.deepEqual(await suppliers.listAssignableSuppliers(), [{ id: accountId, name: account.name, status: 'Active' }])
})

test('ordinary Accounts and inactive Supplier Accounts are not assignable', () => {
  assert.equal(types.isAssignableSupplierAccount(account), true)
  for (const category of [1, 2, null, undefined]) {
    assert.equal(types.isAssignableSupplierAccount({ ...account, accountcategorycode: category }), false)
  }
  assert.equal(types.isAssignableSupplierAccount({ ...account, statecode: 1 }), false)
})

test('get supplier by ID verifies Supplier category without hiding API errors', async () => {
  let response = account
  mock.method(globalThis, 'fetch', async (url) => {
    if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
    assert.equal(new URL(url, 'https://portal.example').pathname, `/_api/accounts(${accountId})`)
    return Response.json(response)
  })
  assert.equal((await suppliers.getSupplierById(accountId)).id, accountId)
  response = { ...account, accountcategorycode: 2 }
  assert.equal(await suppliers.getSupplierById(accountId), null)
  mock.restoreAll()
  mock.method(globalThis, 'fetch', async url => url === '/_layout/tokenhtml'
    ? new Response('<input value="test-token" />')
    : new Response('Forbidden', { status: 403 }))
  await assert.rejects(suppliers.getSupplierById(accountId))
})

test('invoice and PO list/get map Account lookup annotations without requiring Account reads', async () => {
  let balanceReads = 0
  mock.method(globalThis, 'fetch', async (url) => {
    if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
    const request = new URL(url, 'https://portal.example')
    const serverRead = request.pathname === '/_api/serverlogics/invoice-po-reads'
    if (serverRead && request.searchParams.get('select') === 'spnvc_invoiceid,spnvc_amount,spnvc_invoicestatus,_spnvc_purchaseorderid_value') {
      balanceReads++
      assert.equal(request.searchParams.get('table'), 'spnvc_invoices')
      return Response.json({ success: true, error: null, data: JSON.stringify({ result: { value: [], '@odata.count': 0 } }) })
    }
    assert.ok(request.searchParams.get(serverRead ? 'select' : '$select').split(',').includes('_spnvc_supplieraccountid_value'))
    assert.equal(request.searchParams.get('fetchXml'), null)
    assert.equal(request.searchParams.get('$expand'), null)
    const entity = {
      spnvc_invoiceid: recordId, spnvc_purchaseorderid: recordId,
      _spnvc_supplieraccountid_value: accountId,
      '_spnvc_supplieraccountid_value@OData.Community.Display.V1.FormattedValue': account.name,
    }
    return Response.json(serverRead
      ? { success: true, error: null, data: JSON.stringify({ result: { value: [entity], '@odata.count': 1 } }) }
      : entity)
  })
  for (const record of [
    (await invoices.listInvoices()).items[0],
    await invoices.getInvoiceById(recordId),
    (await orders.listPurchaseOrders()).items[0],
    await orders.getPurchaseOrderById(recordId),
  ]) {
    assert.equal(record.supplierId, accountId)
    assert.equal(record.supplierName, account.name)
  }
  assert.equal(balanceReads, 2)
})

test('scoped creates send selectors while direct updates retain the actual Account navigation binding', async () => {
  const writes = []
  mock.method(globalThis, 'fetch', async (url, options = {}) => {
    if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
    if (url.startsWith('/_api/accounts(')) return Response.json(account)
    const request = new URL(url, 'https://portal.example')
    if (request.pathname === '/_api/serverlogics/invoice-po-reads' && request.searchParams.get('table') === 'spnvc_invoices') {
      assert.equal(options.method, 'GET')
      assert.equal(request.searchParams.get('select'), 'spnvc_invoiceid,spnvc_amount,spnvc_invoicestatus,_spnvc_purchaseorderid_value')
      return Response.json({ success: true, error: null, data: JSON.stringify({ result: { value: [], '@odata.count': 0 } }) })
    }
    if (['POST', 'PATCH'].includes(options.method)) {
      writes.push({ method: options.method, url, body: JSON.parse(options.body) })
      if (options.method === 'PATCH') return new Response(null, { status: 204 })
    }
    const entity = {
      spnvc_invoiceid: recordId, spnvc_purchaseorderid: recordId,
      _spnvc_supplieraccountid_value: accountId, spnvc_SupplierAccountId: account,
      _spnvc_contactid_value: recordId, _spnvc_purchaseorderid_value: recordId,
      spnvc_name: 'FIXTURE', spnvc_amount: 1, spnvc_totalamount: 1, spnvc_invoicestatus: 1, spnvc_postatus: 1,
    }
    return options.method === 'POST'
      ? Response.json({ success: true, error: null, data: JSON.stringify({ record: entity }) }) : Response.json(entity)
  })
  await invoices.createInvoice({ invoiceNumber: 'INV-TEST', amount: 1, supplierId: accountId, purchaseOrderId: recordId })
  await invoices.updateInvoice(recordId, { supplierId: accountId })
  await orders.createPurchaseOrder({ poNumber: 'PO-TEST', totalAmount: 1, supplierId: accountId })
  await orders.updatePurchaseOrder(recordId, { supplierId: accountId })
  for (const { body } of writes.filter(write => write.method === 'PATCH')) {
    assert.equal(body['spnvc_SupplierAccountId@odata.bind'], `/accounts(${accountId})`)
    assert.equal(body['spnvc_SupplierId@odata.bind'], undefined)
  }
  const creates = writes.filter(write => write.method === 'POST')
  assert.deepEqual(creates.map(write => write.url), ['/_api/serverlogics/submit-invoice', '/_api/serverlogics/create-purchase-order'])
  assert.equal(creates[0].body.supplierId, undefined)
  assert.equal(creates[1].body.supplierId, accountId)
  await orders.updatePurchaseOrder(recordId, { supplierId: null })
  assert.equal(writes.at(-1).body['spnvc_SupplierAccountId@odata.bind'], null)
})

test('OData preserves typed filters, escaping, count and complete continuation pages', async () => {
  const url = api.buildCollectionUrl('spnvc_invoices', {
    select: 'spnvc_invoiceid,_spnvc_supplieraccountid_value',
    filter: api.and(api.eq('spnvc_invoicestatus', 2),
      api.contains('spnvc_name', `O'Brien & <100%>`)),
    count: true, orderBy: 'createdon desc',
  })
  const request = new URL(url, 'https://portal.example')
  assert.equal(request.searchParams.get('$count'), 'true')
  assert.equal(request.searchParams.get('$filter'), `(spnvc_invoicestatus eq 2 and contains(spnvc_name,'O''Brien & <100%>'))`)
  assert.equal(request.searchParams.get('$top'), null, 'page size must not cap the complete collection')
  const nextLink = '/_api/spnvc_invoices?$select=spnvc_invoiceid&$skiptoken=opaque%26cursor'
  let requests = 0
  mock.method(globalThis, 'fetch', async (url, options) => {
    if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
    assert.ok(options.headers.get('Prefer').includes('odata.maxpagesize=1'))
    requests++
    if (requests === 1) {
      return Response.json({
        value: [{ id: 'first' }],
        '@odata.count': 2,
        '@odata.nextLink': nextLink,
      })
    }
    assert.equal(url, nextLink)
    return Response.json({ value: [{ id: 'second' }] })
  })
  assert.deepEqual(await api.fetchAllPages(url, 1), [{ id: 'first' }, { id: 'second' }])
  assert.throws(() => api.buildCollectionUrl('accounts', { select: 'name"/><bad' }))
  await assert.rejects(api.fetchODataCollection(url, 0), /page size/)
})

test('OData fails explicitly instead of truncating a malformed page response', async () => {
  const url = api.buildCollectionUrl('accounts', { select: 'accountid' })
  mock.method(globalThis, 'fetch', async url => url === '/_layout/tokenhtml'
    ? new Response('<input value="test-token" />')
    : Response.json({ value: null }))
  await assert.rejects(api.fetchODataCollection(url), /Missing OData collection/)
})

test('reviewer picker follows assigned A/B, excludes unassigned C and reflects removal without company fallback', () => {
  const original = [...mockData.reviewerAccountIds]
  try {
    assert.deepEqual(mockData.listMockAssignableSuppliers().map(s => s.name), ['Contoso Supplies Ltd', 'Fabrikam Industrial'])
    mockData.reviewerAccountIds.splice(1, 1)
    assert.deepEqual(mockData.listMockAssignableSuppliers().map(s => s.name), ['Contoso Supplies Ltd'])
    mockData.reviewerAccountIds.splice(0)
    assert.deepEqual(mockData.listMockAssignableSuppliers(), [])
    mockData.reviewerAccountIds.push('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')
    assert.deepEqual(mockData.listMockAssignableSuppliers(), [])
  } finally {
    mockData.reviewerAccountIds.splice(0, mockData.reviewerAccountIds.length, ...original)
  }
})

test('supplier affiliation uses the Self Contact Company Name, rejecting missing or Contact targets', async () => {
  const previous = globalThis.window
  globalThis.window = { Microsoft: { Dynamic365: { Portal: { User: { contactId: recordId } } } } }
  let data = { _parentcustomerid_value: accountId, '_parentcustomerid_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'account' }
  let companies = [account]
  let denied = false
  mock.method(globalThis, 'fetch', async url => {
    if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
    if (url.startsWith('/_api/contacts(')) {
      assert.ok(url.startsWith(`/_api/contacts(${globalThis.window.Microsoft.Dynamic365.Portal.User.contactId})?`))
      return Response.json(data)
    }
    assert.equal(new URL(url, 'https://portal.example').pathname, `/_api/accounts(${accountId})`)
    if (denied) return new Response('Forbidden', { status: 403 })
    if (!companies.length) return new Response(null, { status: 404 })
    return Response.json(companies[0])
  })
  try {
    assert.equal(await affiliation.getSupplierCompanyId(), accountId)
    globalThis.window.Microsoft.Dynamic365.Portal.User.contactId = '44444444-4444-4444-8444-444444444444'
    assert.equal(await affiliation.getSupplierCompanyId(), accountId, 'another Contact can share the same company')
    globalThis.window.Microsoft.Dynamic365.Portal.User.userRoles = ['Supplier', 'Reviewer']
    assert.equal(await affiliation.getSupplierCompanyId(), accountId, 'dual role does not change designated Company')
    companies = []
    await assert.rejects(affiliation.getSupplierCompanyId(), /not accessible through your assignments/)
    companies = [{ ...account, statecode: 1 }]
    await assert.rejects(affiliation.getSupplierCompanyId(), /inactive/)
    companies = [{ ...account, accountcategorycode: 2 }]
    await assert.rejects(affiliation.getSupplierCompanyId(), /not classified as Supplier/)
    companies = [{ ...account, accountid: '55555555-5555-4555-8555-555555555555' }]
    await assert.rejects(affiliation.getSupplierCompanyId(), /not accessible/, 'another assigned account is never a fallback')
    companies = [account]
    denied = true
    await assert.rejects(affiliation.getSupplierCompanyId(), /Cannot access your supplier Company Name Account/)
    denied = false
    data = {}
    await assert.rejects(affiliation.getSupplierCompanyId(), /no supplier Company Name Account/)
    data = { _parentcustomerid_value: accountId, '_parentcustomerid_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'contact' }
    await assert.rejects(affiliation.getSupplierCompanyId(), /Account, not a Contact/)
  } finally {
    if (previous === undefined) delete globalThis.window
    else globalThis.window = previous
  }
})

test('company-wide invoice mapping reads OData lookup annotations without Account reads', async () => {
  mock.method(globalThis, 'fetch', async url => url === '/_layout/tokenhtml'
    ? new Response('<input value="test-token" />')
    : Response.json({
      spnvc_invoiceid: recordId, _spnvc_supplieraccountid_value: accountId,
      '_spnvc_supplieraccountid_value@OData.Community.Display.V1.FormattedValue': account.name,
      _spnvc_contactid_value: '11111111-1111-4111-8111-111111111111',
    }))
  const result = await invoices.getInvoiceById(recordId)
  assert.equal(result.supplierId, accountId)
  assert.equal(result.supplierName, account.name)
  assert.equal(result.contactId, '11111111-1111-4111-8111-111111111111')
})

test('PO create and reassignment reject inactive, ordinary or inaccessible Accounts before writing', async () => {
  let entities = []
  let writes = 0
  mock.method(globalThis, 'fetch', async (url, options = {}) => {
    if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
    if (options.method === 'POST' || options.method === 'PATCH') writes++
    return entities.length ? Response.json(entities[0]) : new Response(null, { status: 404 })
  })
  for (const candidate of [[], [{ ...account, statecode: 1 }], [{ ...account, accountcategorycode: 2 }]]) {
    entities = candidate
    await assert.rejects(orders.createPurchaseOrder({ poNumber: 'PO-INVALID', totalAmount: 1, supplierId: accountId }), /active Supplier Account/)
    await assert.rejects(orders.updatePurchaseOrder(recordId, { supplierId: accountId }), /active Supplier Account/)
  }
  assert.equal(writes, 0)
})
