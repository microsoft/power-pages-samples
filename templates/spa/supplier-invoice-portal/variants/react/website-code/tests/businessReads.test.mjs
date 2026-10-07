import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

const script = readFileSync(new URL('../.powerpages-site/server-logic/invoice-po-reads/invoice-po-reads.js', import.meta.url), 'utf8')
const recordId = '33333333-3333-4333-8333-333333333333'
const accountId = '22222222-2222-4222-8222-222222222222'

test('server source passes the exact case-insensitive host restriction captured in the trace', () => {
  assert.equal(/with\s*\(/i.test(script), false,
    'The host scans source text without token boundaries, including legitimate string-prefix method names.')
})

function fixture(parameters = {}, replies = []) {
  const queries = []
  const logs = []
  const context = vm.createContext({
    Server: {
      User: { contactid: '11111111-1111-4111-8111-111111111111' },
      Logger: { Error(message) { logs.push(message) }, Log(message) { logs.push(message) } },
      Context: { QueryParameters: { table: 'spnvc_invoices', select: 'spnvc_invoiceid,_spnvc_supplieraccountid_value', ...parameters } },
      Connector: { Dataverse: { RetrieveMultipleRecords(table, query) {
        queries.push({ table, xml: new URLSearchParams(query).get('fetchXml') })
        const body = replies.shift() ?? { value: [{ spnvc_invoiceid: recordId, spnvc_supplieraccountid: accountId }], '@odata.count': 1 }
        if (body.status) return JSON.stringify({ IsSuccessStatusCode: false, StatusCode: body.status, Body: 'private response must not be logged' })
        return JSON.stringify({ IsSuccessStatusCode: true, StatusCode: 200, Body: JSON.stringify(body) })
      } } },
    },
  })
  vm.runInContext(script, context)
  return { context, queries, logs, run: () => JSON.parse(context.get()) }
}

test('scoped connector projects only allowed OData fields and lookup annotations', () => {
  const f = fixture({}, [{ value: [{
    spnvc_invoiceid: recordId, spnvc_supplieraccountid: accountId, secret: 'must not escape',
    'spnvc_supplieraccountid@OData.Community.Display.V1.FormattedValue': 'Company A',
  }], '@odata.count': 1 }])
  assert.deepEqual(f.run().result, {
    value: [{
      spnvc_invoiceid: recordId, _spnvc_supplieraccountid_value: accountId,
      '_spnvc_supplieraccountid_value@OData.Community.Display.V1.FormattedValue': 'Company A',
    }], '@odata.count': 1,
  })
  assert.ok(f.queries[0].xml.includes('<attribute name="spnvc_supplieraccountid"/>'))
  assert.ok(!f.queries[0].xml.includes('contactid'), 'current caller permissions, not supplied Contact IDs, scope the connector')
  for (const table of ['spnvc_invoices', 'spnvc_purchaseorders', 'spnvc_invoicecomments', 'spnvc_invoiceattachments']) {
    const contract = f.context.tableContract(table)
    const setting = readFileSync(new URL(`../.powerpages-site/site-settings/Webapi-${contract.entity}-fields.sitesetting.yml`, import.meta.url), 'utf8')
    const allowed = /^value: (.+)$/m.exec(setting)[1].split(',')
    assert.ok(contract.columns.every(column => allowed.includes(column)))
  }
})

test('invoice child contracts preserve parent filters, lookup annotations and paging', () => {
  for (const [table, idField, lookup] of [
    ['spnvc_invoicecomments', 'spnvc_invoicecommentid', 'spnvc_authorcontactid'],
    ['spnvc_invoiceattachments', 'spnvc_invoiceattachmentid', 'spnvc_invoicecommentid'],
  ]) {
    const f = fixture({
      table, select: `${idField},_spnvc_invoiceid_value,_${lookup}_value`, pageSize: '1',
      filter: JSON.stringify({ attribute: '_spnvc_invoiceid_value', operator: 'eq', value: recordId }),
      orderBy: table === 'spnvc_invoicecomments' ? 'createdon asc' : 'createdon desc',
    }, [{ value: [{
      [idField]: recordId, spnvc_invoiceid: recordId, [lookup]: accountId, secret: 'must not escape',
      [`${lookup}@OData.Community.Display.V1.FormattedValue`]: 'Fixture name',
    }], '@odata.count': 2 }])
    const result = f.run().result
    assert.deepEqual(result.value, [{
      [idField]: recordId, _spnvc_invoiceid_value: recordId, [`_${lookup}_value`]: accountId,
      [`_${lookup}_value@OData.Community.Display.V1.FormattedValue`]: 'Fixture name',
    }])
    assert.equal(result['@odata.count'], 2)
    assert.equal(new URL(result['@odata.nextLink'], 'https://portal.example').searchParams.get('table'), table)
    assert.ok(f.queries[0].xml.includes(`<condition attribute="spnvc_invoiceid" operator="eq" value="${recordId}"/>`))
    assert.ok(!f.queries[0].xml.includes('contactid eq'), 'a supplied Contact is not an authorization substitute')
  }
})

test('typed search/status filters are root-wrapped, escaped and do not become arbitrary XML', () => {
  const f = fixture({ filter: JSON.stringify({ type: 'and', filters: [
    { attribute: 'spnvc_invoicestatus', operator: 'eq', value: 2 },
    { attribute: 'spnvc_name', operator: 'contains', value: `O'Brien & <100%_[]>` },
  ] }) })
  f.run()
  const xml = f.queries[0].xml
  assert.ok(xml.includes('<filter type="and"><filter type="and">'))
  assert.ok(xml.includes('operator="eq" value="2"'))
  assert.ok(xml.includes('O&apos;Brien &amp; &lt;100[%][_][[]]&gt;'))
  assert.ok(!xml.includes('<100'))
})

test('PO eligibility uses the actual supplier navigation contract without fetching unrelated Accounts', () => {
  const f = fixture({
    table: 'spnvc_purchaseorders', select: 'spnvc_purchaseorderid,_spnvc_supplieraccountid_value',
    filter: JSON.stringify({ type: 'and', filters: [
      { attribute: '_spnvc_supplieraccountid_value', operator: 'eq', value: accountId },
      { attribute: 'spnvc_SupplierAccountId/accountcategorycode', operator: 'eq', value: 132140000 },
      { attribute: 'spnvc_SupplierAccountId/statecode', operator: 'eq', value: 0 },
    ] }),
  }, [{ value: [{ spnvc_purchaseorderid: recordId }], '@odata.count': 1 }])
  assert.equal(f.run().result.value[0].spnvc_purchaseorderid, recordId)
  assert.ok(f.queries[0].xml.includes('entityname="supplier" operator="eq" value="132140000"'))
  assert.ok(f.queries[0].xml.includes('to="spnvc_supplieraccountid" alias="supplier" link-type="outer"'))
})

test('SDK paging cookies round-trip through the server endpoint and full pages are not truncated', () => {
  const cookie = '<cookie page="1"><spnvc_invoiceid last="a" first="a"/></cookie>'
  const envelope = `<cookie pagenumber="2" pagingcookie="${encodeURIComponent(encodeURIComponent(cookie))}" />`
  const f = fixture({ pageSize: '1' }, [{ value: [{ spnvc_invoiceid: recordId }], '@odata.count': 2,
    '@Microsoft.Dynamics.CRM.morerecords': true, '@Microsoft.Dynamics.CRM.fetchxmlpagingcookie': envelope }])
  const next = new URL(f.run().result['@odata.nextLink'], 'https://portal.example')
  assert.equal(next.pathname, '/_api/serverlogics/invoice-po-reads')
  assert.equal(next.searchParams.has('fetchXml'), false)
  assert.equal(next.searchParams.get('cookie'), cookie)
  assert.equal(next.searchParams.get('page'), '2')
  f.context.Server.Context.QueryParameters = Object.fromEntries(next.searchParams)
  f.run()
  assert.ok(f.queries.at(-1).xml.includes('page="2"'))
  assert.ok(f.queries.at(-1).xml.includes('paging-cookie="&lt;cookie page=&quot;1&quot;'))
  const simple = fixture({ pageSize: '1' })
  assert.ok(simple.run().result['@odata.nextLink'], 'missing cookie annotations must not silently end a full page')
  const last = fixture({ pageSize: '1', page: '100' })
  assert.equal(last.run().status, 'error')
})

test('counts fall back to a protected SDK aggregate, not the size of one page', () => {
  const f = fixture({}, [
    { value: [{ spnvc_invoiceid: recordId }] },
    { value: [{ recordcount: 42 }] },
  ])
  assert.equal(f.run().result['@odata.count'], 42)
  assert.ok(f.queries[1].xml.includes('aggregate="count"'))
  const missing = fixture({}, [{ value: [] }, { value: [{ wrongAlias: 2 }] }])
  assert.equal(missing.run().status, 'error')
})

test('server contract rejects unknown tables/fields/operators/IDs/pages without sending a query', () => {
  for (const parameters of [
    { table: 'contacts' }, { select: '*' }, { select: 'ownerid' }, { orderBy: 'createdon;delete' },
    { mode: 'record', id: 'not-guid' }, { mode: 'delete' }, { pageSize: '0' }, { page: '101' },
    { cookie: '<fetch malicious="true"/>' },
    { filter: JSON.stringify({ attribute: 'ownerid', operator: 'eq', value: accountId }) },
    { filter: JSON.stringify({ attribute: 'spnvc_name', operator: 'in', value: 'x' }) },
    { filter: JSON.stringify({ attribute: '_spnvc_supplieraccountid_value', operator: 'eq', value: 'not-guid' }) },
    { filter: JSON.stringify({ attribute: 'spnvc_amount', operator: 'eq', value: '10' }) },
  ]) {
    const f = fixture(parameters)
    assert.equal(f.run().status, 'error')
    assert.equal(f.queries.length, 0)
  }
  const anonymous = fixture()
  anonymous.context.Server.User = null
  assert.equal(anonymous.run().status, 'error')
  assert.equal(anonymous.queries.length, 0)
})

test('record reads filter on the explicit primary key and API failures do not become empty successes', () => {
  const f = fixture({ mode: 'record', id: recordId })
  assert.equal(f.run().record.spnvc_invoiceid, recordId)
  assert.ok(f.queries[0].xml.includes(`<condition attribute="spnvc_invoiceid" operator="eq" value="${recordId}"/>`))
  const missing = fixture({ mode: 'record', id: recordId }, [{ value: [] }])
  assert.equal(missing.run().record, null)
  const denied = fixture({}, [{ status: 403 }])
  assert.equal(denied.run().status, 'error')
  assert.ok(!JSON.stringify(denied.logs).includes('private response'))
  const malformed = fixture({}, [{ missingValue: true }])
  assert.equal(malformed.run().status, 'error')
})

test('server endpoint role bindings match business roles and never default Authenticated Users', () => {
  const metadata = readFileSync(new URL('../.powerpages-site/server-logic/invoice-po-reads/invoice-po-reads.serverlogic.yml', import.meta.url), 'utf8')
  assert.deepEqual([...metadata.matchAll(/^\s+- ([0-9a-f-]{36})$/gm)].map(match => match[1]), [
    '997e7996-e241-4117-9c09-28e90a1fcdbc', 'c8031dd9-b8d4-435a-87df-3b90748d2fc4',
  ])
})

test('failed reads surface errors without logging inputs, connector bodies or temporary diagnostics', () => {
  const contextFailure = fixture({ select: 'private-field-must-not-be-logged' })
  const contextResult = contextFailure.run()
  assert.deepEqual(contextResult, { status: 'error', message: 'Could not load invoice or purchase order data.' })
  assert.ok(!JSON.stringify(contextFailure.logs).includes('private-field'))
  const connectorFailure = fixture()
  connectorFailure.context.Server.Connector.Dataverse.RetrieveMultipleRecords = () => {
    throw new TypeError('private response must not be logged')
  }
  assert.deepEqual(connectorFailure.run(), contextResult)
  assert.ok(!JSON.stringify(connectorFailure.logs).includes('private response'))
  assert.deepEqual(connectorFailure.logs, ['Scoped business read failed (TypeError).'])
  const normalizationFailure = fixture()
  normalizationFailure.context.Server.Connector.Dataverse.RetrieveMultipleRecords = () => 'not-json-private-body'
  const result = normalizationFailure.run()
  assert.deepEqual(result, contextResult)
  assert.ok(!JSON.stringify(normalizationFailure.logs).includes('private-body'))
  assert.ok(!result.message.includes('private-body'))
  assert.deepEqual(normalizationFailure.logs, ['Scoped business read failed (SyntaxError).'])
  assert.ok(!script.includes('SDKDIAG-c071'))
})
