import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

const source = readFileSync(new URL('../scripts/business-create-server.js', import.meta.url), 'utf8')
const errors = JSON.parse(readFileSync(new URL('./fixtures/query-errors.json', import.meta.url), 'utf8'))
const actorId = '11111111-1111-4111-8111-111111111111'
const companyId = '22222222-2222-4222-8222-222222222222'
const companyB = '33333333-3333-4333-8333-333333333333'
const companyC = '44444444-4444-4444-8444-444444444444'
const poId = '55555555-5555-4555-8555-555555555555'
const recordId = '66666666-6666-4666-8666-666666666666'
const invoiceInput = { invoiceNumber: 'INV-FIXTURE', amount: 123, dueDate: '2030-10-08', purchaseOrderId: poId, status: 'Submitted' }
const poInput = { poNumber: 'PO-FIXTURE', totalAmount: 123, supplierId: companyB }
const endpointRoles = { 'submit-invoice': '997e7996-e241-4117-9c09-28e90a1fcdbc', 'create-purchase-order': 'c8031dd9-b8d4-435a-87df-3b90748d2fc4' }
const clock = '2026-10-07T09:30:00.000Z'
class FixtureDate extends Date {
  constructor(value) { super(value === undefined ? clock : value) }
  static now() { return Date.parse(clock) }
}

// The SDK fixtures model caller-scoped responses, not live ACL enforcement.
function fixture(endpoint = 'submit-invoice', input = invoiceInput, options = {}) {
  const calls = []
  const logs = []
  let saved
  const reply = value => JSON.stringify({ StatusCode: 200, IsSuccessStatusCode: true, Body: JSON.stringify({ value }) })
  const context = vm.createContext({
    Date: FixtureDate,
    Server: {
      User: options.anonymous ? null : { contactid: actorId },
      Context: { ServerLogicName: endpoint, Body: JSON.stringify(input) },
      Logger: { Error(message) { logs.push(message) } },
      Connector: { Dataverse: {
        RetrieveMultipleRecords(table, query, skipCache) {
          assert.equal(skipCache, true, 'eligibility and persistence reads must bypass data caching')
          calls.push({ method: 'read', table, query })
          if (table === 'contacts') {
            assert.ok(query.includes(`contactid eq ${actorId}`))
            return reply(options.contactRows ?? [{
              contactid: actorId, _parentcustomerid_value: companyId,
              '_parentcustomerid_value@Microsoft.Dynamics.CRM.lookuplogicalname': options.companyType ?? 'account',
            }])
          }
          const xml = new URLSearchParams(query).get('fetchXml')
          assert.ok(xml.includes('<filter><condition'), 'fixed key predicates must be root filtered')
          const id = /operator="eq" value="([^"]+)"/.exec(xml)[1]
          if (table === 'accounts') {
            return reply(id === companyC ? [] : [{ accountid: id, accountcategorycode: options.category ?? 132140000, statecode: options.accountState ?? 0 }])
          }
          if (table === 'spnvc_purchaseorders' && id === poId) {
            return reply(options.missingPO ? [] : [{ spnvc_purchaseorderid: poId, spnvc_name: 'PO-AUTHORITATIVE',
              spnvc_postatus: options.poStatus ?? 2, spnvc_supplieraccountid: options.poCompany ?? companyId }])
          }
          assert.equal(id, recordId)
          if (options.readbackMissing) return reply([])
          const invoice = table === 'spnvc_invoices'
          return reply([{
            ...saved, [invoice ? 'spnvc_invoiceid' : 'spnvc_purchaseorderid']: recordId,
            spnvc_supplieraccountid: options.readbackCompany ?? (invoice ? companyId : input.supplierId),
            ...(invoice ? { spnvc_contactid: actorId, spnvc_purchaseorderid: poId } : {}),
            secret: 'private record must not escape',
            ...(options.malformedRecord ? { spnvc_amount: undefined, spnvc_totalamount: undefined } : {}),
          }])
        },
        CreateRecord(table, payload) {
          calls.push({ method: 'create', table })
          assert.equal(typeof payload, 'string', 'SDK CreateRecord requires a serialized payload')
          saved = JSON.parse(payload)
          if (options.throwCreate) throw new TypeError('private connector body must not escape')
          if (options.sdkException) throw new Error(options.sdkException)
          if (options.createError) {
            return JSON.stringify({ StatusCode: options.createError.status, IsSuccessStatusCode: false,
              Body: JSON.stringify({ error: options.createError.error }) })
          }
          return JSON.stringify({ StatusCode: 204, IsSuccessStatusCode: true, Body: options.createBody ?? '',
            Headers: options.noId ? {} : options.createHeaders ?? { EntityId: recordId } })
        },
      } },
    },
  })
  vm.runInContext(source, context)
  return { run: () => JSON.parse(context.post()), preflight: () => JSON.parse(context.get()), calls, logs, saved: () => saved, context }
}

test('role exports are generated from one source and pass the exact captured host matcher', () => {
  assert.equal(/with\s*\(/i.test(source), false)
  for (const [endpoint, role] of Object.entries(endpointRoles)) {
    const script = readFileSync(new URL(`../.powerpages-site/server-logic/${endpoint}/${endpoint}.js`, import.meta.url), 'utf8')
    assert.equal(script, '// Generated by scripts/postbuild.js from scripts/business-create-server.js.\n' + source)
    const metadata = readFileSync(new URL(`../.powerpages-site/server-logic/${endpoint}/${endpoint}.serverlogic.yml`, import.meta.url), 'utf8')
    assert.deepEqual([...metadata.matchAll(/^\s+- ([0-9a-f-]{36})$/gm)].map(match => match[1]), [role])
  }
})

test('invoice SDK create derives audit Contact, Company, PO number and timestamp and verifies persisted links', () => {
  const f = fixture()
  const result = f.run()
  assert.equal(result.record.spnvc_invoiceid, recordId)
  assert.equal(result.record._spnvc_contactid_value, actorId)
  assert.equal(result.record._spnvc_supplieraccountid_value, companyId)
  assert.equal(result.record.secret, undefined)
  const saved = f.saved()
  assert.equal(saved['spnvc_ContactId@odata.bind'], `/contacts(${actorId})`)
  assert.equal(saved['spnvc_SupplierAccountId@odata.bind'], `/accounts(${companyId})`)
  assert.equal(saved['spnvc_PurchaseOrderId@odata.bind'], `/spnvc_purchaseorders(${poId})`)
  assert.equal(saved.spnvc_ponumber, 'PO-AUTHORITATIVE')
  assert.equal(saved.spnvc_invoicestatus, 2)
  assert.equal(saved.spnvc_submissiondate, clock)
  assert.equal(f.calls.filter(call => call.method === 'create').length, 1)
  assert.equal(f.calls.at(-1).method, 'read')
})

test('reviewer PO create allows assigned Account B without requiring Company B and rejects unassigned C', () => {
  const assigned = fixture('create-purchase-order', poInput)
  assert.equal(assigned.run().record._spnvc_supplieraccountid_value, companyB)
  assert.equal(assigned.saved().spnvc_postatus, 1)
  const unassigned = fixture('create-purchase-order', { ...poInput, supplierId: companyC })
  assert.equal(unassigned.run().status, 'error')
  assert.equal(unassigned.calls.some(call => call.method === 'create'), false)
})

test('invalid input and client identity authority fail before any connector operation', () => {
  for (const change of [
    { contactId: actorId }, { supplierId: companyId }, { table: 'contacts' }, { query: 'arbitrary' },
    { 'spnvc_ContactId@odata.bind': `/contacts(${actorId})` }, { invoiceNumber: '' },
    { invoiceNumber: 'x'.repeat(201) }, { description: 'x'.repeat(10001) },
    { amount: 0 }, { amount: -1 }, { amount: '123' }, { amount: 1e20 },
    { purchaseOrderId: 'not-guid' }, { status: 'Approved' }, { dueDate: '' }, { dueDate: '2030-02-30' },
    { dueDate: '2026-10-06' },
  ]) {
    const f = fixture('submit-invoice', { ...invoiceInput, ...change })
    assert.equal(f.run().status, 'error')
    assert.equal(f.calls.length, 0)
  }
  const anonymous = fixture('submit-invoice', invoiceInput, { anonymous: true })
  assert.equal(anonymous.run().httpStatus, 401)
  assert.equal(anonymous.calls.length, 0)
  for (const change of [{ contactId: actorId }, { table: 'contacts' }, { supplierId: 'not-guid' }, { status: 'Issued' }, { totalAmount: '1' }]) {
    const f = fixture('create-purchase-order', { ...poInput, ...change })
    assert.equal(f.run().status, 'error')
    assert.equal(f.calls.length, 0)
  }
})

test('caller/Company/PO mismatches, inaccessible rows and ineligible states never create', () => {
  for (const options of [
    { contactRows: [] }, { contactRows: [{ contactid: companyB }] }, { companyType: 'contact' },
    { category: 2 }, { accountState: 1 }, { poCompany: companyB }, { poStatus: 5 }, { missingPO: true },
  ]) {
    const f = fixture('submit-invoice', invoiceInput, options)
    assert.equal(f.run().status, 'error')
    assert.equal(f.calls.some(call => call.method === 'create'), false)
  }
})

test('captured SDK association failures remain explicit with one create attempt and no fallback', () => {
  for (const [endpoint, input, error] of [
    ['submit-invoice', invoiceInput, errors.invoiceCreateAssociation],
    ['create-purchase-order', poInput, errors.purchaseOrderCreateAssociation],
  ]) {
    const f = fixture(endpoint, input, { createError: error })
    const result = f.run()
    assert.equal(result.status, 'error')
    assert.equal(result.code, '90040106')
    assert.equal(result.httpStatus, 403)
    assert.equal(result.message, error.error.message)
    assert.equal(result.persistence, 'rejected')
    assert.equal(f.calls.filter(call => call.method === 'create').length, 1)
  }
})

test('captured CreateRecord validator exception is a rejected association, not unknown persistence', () => {
  const captured = errors.purchaseOrderSdkAssociationException
  const message = captured.prefix + JSON.stringify({ error: captured.error })
  const f = fixture('create-purchase-order', poInput, { sdkException: message })
  const result = f.run()
  assert.equal(result.status, 'error')
  assert.equal(result.persistence, 'rejected')
  assert.equal(result.httpStatus, 403)
  assert.equal(result.code, captured.error.code)
  assert.equal(result.innerCode, captured.error.innererror.code)
  assert.equal(result.message, captured.error.message)
  assert.equal(f.calls.filter(call => call.method === 'create').length, 1)
  assert.equal(f.calls.at(-1).method, 'create', 'a denied create must not attempt readback, retry or rollback')
  assert.deepEqual(f.logs, ['Business create failed; persistence=rejected'])
})

test('SDK exception classification rejects unobserved signatures and does not leak arbitrary messages', () => {
  const captured = errors.purchaseOrderSdkAssociationException
  const detail = captured.error
  for (const message of [
    'private connector failure',
    captured.prefix + '{truncated-json',
    "Error executing POST request to 'accounts': " + JSON.stringify({ error: detail }),
    captured.prefix + JSON.stringify({ error: { ...detail, code: '9004010A' } }),
    captured.prefix + JSON.stringify({ error: { ...detail, innererror: { ...detail.innererror, code: '90040105' } } }),
    captured.prefix + JSON.stringify({ error: { ...detail, innererror: { ...detail.innererror, type: 'UnclassifiedException' } } }),
    captured.prefix + JSON.stringify({ error: { ...detail, message: 'private target record must not escape' } }),
  ]) {
    const f = fixture('create-purchase-order', poInput, { sdkException: message })
    const result = f.run()
    assert.equal(result.persistence, 'unknown')
    assert.equal(result.code, undefined)
    assert.ok(result.message.includes('Check existing records'))
    assert.ok(!JSON.stringify(f.logs).includes('private'))
    assert.equal(f.calls.filter(call => call.method === 'create').length, 1)
  }
  const accepted = fixture('create-purchase-order', poInput)
  const read = accepted.context.Server.Connector.Dataverse.RetrieveMultipleRecords
  accepted.context.Server.Connector.Dataverse.RetrieveMultipleRecords = (table, query, skipCache) => {
    if (table === 'spnvc_purchaseorders') {
      throw new Error(captured.prefix + JSON.stringify({ error: detail }))
    }
    return read(table, query, skipCache)
  }
  assert.equal(accepted.run().persistence, 'created_unverified',
    'a matching later read error cannot reclassify an accepted create as rejected')
})

test('ambiguous and accepted-but-unverified creates never report success or encourage retry', () => {
  for (const options of [{ throwCreate: true }, { noId: true }, { readbackMissing: true }, { readbackCompany: companyB }, { malformedRecord: true }]) {
    const f = fixture('submit-invoice', invoiceInput, options)
    const result = f.run()
    assert.equal(result.status, 'error')
    assert.equal(result.persistence, options.throwCreate ? 'unknown' : 'created_unverified')
    assert.ok(result.message.includes('Check existing records'))
    assert.equal(f.calls.filter(call => call.method === 'create').length, 1)
    assert.ok(!JSON.stringify(f.logs).includes(actorId))
    assert.ok(!JSON.stringify(f.logs).includes('private'))
  }
})

test('read/SDK response failures and unknown host operation cannot proceed to persistence', () => {
  for (const raw of ['not-json', '{}', JSON.stringify({ StatusCode: 200, IsSuccessStatusCode: true, Body: '{}' })]) {
    const f = fixture()
    f.context.Server.Connector.Dataverse.RetrieveMultipleRecords = () => raw
    assert.equal(f.run().status, 'error')
    assert.equal(f.calls.some(call => call.method === 'create'), false)
  }
  const other = fixture('unknown-operation')
  assert.equal(other.run().status, 'error')
  assert.equal(other.calls.length, 0)
})

test('native create IDs use real headers or a primary-key body, never fabricated request identities', () => {
  for (const options of [
    { createHeaders: { entityid: recordId } },
    { createHeaders: { Location: `https://portal.example/_api/spnvc_invoices(${recordId})` } },
    { createHeaders: { 'OData-EntityId': `https://portal.example/_api/spnvc_invoices(${recordId})` } },
    { noId: true, createBody: JSON.stringify({ spnvc_invoiceid: recordId }) },
  ]) {
    assert.equal(fixture('submit-invoice', invoiceInput, options).run().record.spnvc_invoiceid, recordId)
  }
})

test('fixed GET preflight verifies caller and related records without attempting a create or exposing records', () => {
  for (const [endpoint, input, field, id] of [
    ['submit-invoice', invoiceInput, 'purchaseOrderId', poId],
    ['create-purchase-order', poInput, 'supplierId', companyB],
  ]) {
    const f = fixture(endpoint, input)
    f.context.Server.Context.QueryParameters = { [field]: id }
    assert.deepEqual(f.preflight(), { ready: true, creationVerified: false })
    assert.equal(f.calls.some(call => call.method === 'create'), false)
    assert.equal(f.saved(), undefined)
  }
  for (const parameters of [{}, { table: 'contacts' }, { purchaseOrderId: 'not-guid' }, { purchaseOrderId: poId, contactId: actorId }]) {
    const f = fixture()
    f.context.Server.Context.QueryParameters = parameters
    assert.equal(f.preflight().status, 'error')
    assert.equal(f.calls.length, 0)
  }
  const crossCompany = fixture('submit-invoice', invoiceInput, { poCompany: companyB })
  crossCompany.context.Server.Context.QueryParameters = { purchaseOrderId: poId }
  assert.equal(crossCompany.preflight().httpStatus, 403)
  assert.equal(crossCompany.calls.some(call => call.method === 'create'), false)
  const unavailableIdentity = fixture()
  unavailableIdentity.context.Server.User = { fullname: 'Fixture' }
  unavailableIdentity.context.Server.Context.QueryParameters = { purchaseOrderId: poId }
  assert.equal(unavailableIdentity.preflight().httpStatus, 401)
  assert.equal(unavailableIdentity.calls.length, 0, 'do not guess a different identity field or use a singleton Contact collection')
})
