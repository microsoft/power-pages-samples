import assert from 'node:assert/strict'
import { after, afterEach, before, mock, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

let server
let suppliers
let orders
let invoices
let types
let fetchXml
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
  fetchXml = await server.ssrLoadModule('/src/services/fetchXmlApi.ts')
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
    const xml = request.searchParams.get('fetchXml')
    for (const column of ['accountid', 'name', 'accountcategorycode', 'statecode']) {
      assert.ok(xml.includes(`<attribute name="${column}"/>`))
    }
    assert.ok(xml.includes('<condition attribute="accountcategorycode" operator="eq" value="132140000"/>'))
    assert.ok(xml.includes('<condition attribute="statecode" operator="eq" value="0"/>'))
    assert.ok(xml.includes('<order attribute="name" descending="false"/>'))
    assert.ok(!xml.includes('contactid'), 'table permissions determine the current contact')
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
    assert.ok(url.startsWith('/_api/accounts?'))
    const xml = new URL(url, 'https://portal.example').searchParams.get('fetchXml')
    assert.ok(xml.includes(`<condition attribute="accountid" operator="eq" value="${accountId}"/>`))
    return Response.json({ value: [response] })
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
  mock.method(globalThis, 'fetch', async (url) => {
    if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
    const request = new URL(url, 'https://portal.example')
    const xml = request.searchParams.get('fetchXml')
    assert.ok(xml.includes('<attribute name="spnvc_supplieraccountid"/>'))
    assert.equal(request.searchParams.get('$expand'), null)
    const entity = {
      spnvc_invoiceid: recordId, spnvc_purchaseorderid: recordId,
      _spnvc_supplieraccountid_value: accountId,
      '_spnvc_supplieraccountid_value@OData.Community.Display.V1.FormattedValue': account.name,
    }
    return Response.json({ value: [entity] })
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
})

test('invoice and PO create/update bind Accounts using the new navigation property', async () => {
  const writes = []
  mock.method(globalThis, 'fetch', async (url, options = {}) => {
    if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
    if (url.startsWith('/_api/accounts?')) return Response.json({ value: [account] })
    if (['POST', 'PATCH'].includes(options.method)) {
      writes.push(JSON.parse(options.body))
      if (options.method === 'PATCH') return new Response(null, { status: 204 })
    }
    const entity = {
      spnvc_invoiceid: recordId, spnvc_purchaseorderid: recordId,
      _spnvc_supplieraccountid_value: accountId, spnvc_SupplierAccountId: account,
    }
    return Response.json(options.method === 'POST' ? entity : { value: [entity] })
  })
  await invoices.createInvoice({ invoiceNumber: 'INV-TEST', amount: 1, supplierId: accountId })
  await invoices.updateInvoice(recordId, { supplierId: accountId })
  await orders.createPurchaseOrder({ poNumber: 'PO-TEST', totalAmount: 1, supplierId: accountId })
  await orders.updatePurchaseOrder(recordId, { supplierId: accountId })
  for (const body of writes) {
    assert.equal(body['spnvc_SupplierAccountId@odata.bind'], `/accounts(${accountId})`)
    assert.equal(body['spnvc_SupplierId@odata.bind'], undefined)
  }
  await orders.updatePurchaseOrder(recordId, { supplierId: null })
  assert.equal(writes.at(-1)['spnvc_SupplierAccountId@odata.bind'], null)
})

test('FetchXML preserves typed filters, escaping, count and complete paging cookies', async () => {
  const url = fetchXml.buildFetchXmlUrl('spnvc_invoices', {
    select: 'spnvc_invoiceid,_spnvc_supplieraccountid_value',
    filter: fetchXml.and(fetchXml.eq('spnvc_invoicestatus', 2),
      fetchXml.contains('spnvc_name', `O'Brien & <100%>`)),
    count: true, pageSize: 1, orderBy: 'createdon desc',
  })
  const xml = new URL(url, 'https://portal.example').searchParams.get('fetchXml')
  assert.ok(xml.includes('returntotalrecordcount="true"'))
  assert.ok(xml.includes('O&apos;Brien &amp; &lt;100[%]&gt;'))
  const rawCookie = '<cookie page="1"><spnvc_invoiceid last="a" first="a"/></cookie>'
  const envelope = `<cookie pagenumber="2" pagingcookie="${encodeURIComponent(encodeURIComponent(rawCookie))}" istracking="False" />`
  let requests = 0
  mock.method(globalThis, 'fetch', async url => {
    if (url === '/_layout/tokenhtml') return new Response('<input value="test-token" />')
    requests++
    if (requests === 1) {
      return Response.json({
        value: [{ id: 'first' }],
        '@Microsoft.Dynamics.CRM.totalrecordcount': 2,
        '@Microsoft.Dynamics.CRM.fetchxmlpagingcookie': envelope,
        '@Microsoft.Dynamics.CRM.morerecords': true,
      })
    }
    const next = new URL(url, 'https://portal.example').searchParams.get('fetchXml')
    assert.ok(next.includes('page="2"'))
    assert.ok(next.includes('paging-cookie="&lt;cookie page=&quot;1&quot;'))
    return Response.json({ value: [{ id: 'second' }] })
  })
  assert.deepEqual(await fetchXml.fetchAllXmlPages(url), [{ id: 'first' }, { id: 'second' }])
  assert.throws(() => fetchXml.buildFetchXmlUrl('accounts', { select: 'name"/><bad', pageSize: 1 }))
  assert.throws(() => fetchXml.buildFetchXmlUrl('accounts', { select: 'name', pageSize: 0 }))
})

test('FetchXML fails explicitly instead of truncating a malformed page response', async () => {
  const url = fetchXml.buildFetchXmlUrl('accounts', { select: 'accountid' })
  mock.method(globalThis, 'fetch', async url => url === '/_layout/tokenhtml'
    ? new Response('<input value="test-token" />')
    : Response.json({ value: [], '@Microsoft.Dynamics.CRM.morerecords': true }))
  await assert.rejects(fetchXml.fetchXmlCollection(url), /without a paging cookie/)
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
    assert.ok(url.startsWith('/_api/accounts?'))
    const xml = new URL(url, 'https://portal.example').searchParams.get('fetchXml')
    assert.ok(xml.includes(`<condition attribute="accountid" operator="eq" value="${accountId}"/>`))
    if (denied) return new Response('Forbidden', { status: 403 })
    return Response.json({ value: companies })
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

test('company-wide invoice mapping supports FetchXML logical lookup fields without Account reads', async () => {
  mock.method(globalThis, 'fetch', async url => url === '/_layout/tokenhtml'
    ? new Response('<input value="test-token" />')
    : Response.json({ value: [{
      spnvc_invoiceid: recordId, spnvc_supplieraccountid: accountId,
      'spnvc_supplieraccountid@OData.Community.Display.V1.FormattedValue': account.name,
      spnvc_contactid: '11111111-1111-4111-8111-111111111111',
    }] }))
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
    return Response.json({ value: entities })
  })
  for (const candidate of [[], [{ ...account, statecode: 1 }], [{ ...account, accountcategorycode: 2 }]]) {
    entities = candidate
    await assert.rejects(orders.createPurchaseOrder({ poNumber: 'PO-INVALID', totalAmount: 1, supplierId: accountId }), /active Supplier Account/)
    await assert.rejects(orders.updatePurchaseOrder(recordId, { supplierId: accountId }), /active Supplier Account/)
  }
  assert.equal(writes, 0)
})
