import assert from 'node:assert/strict'
import { after, afterEach, before, mock, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

let server
let service

before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null, hmr: false },
    appType: 'custom',
  })
  service = await server.ssrLoadModule('/src/services/invoiceService.ts')
})

after(async () => { await server?.close() })
afterEach(() => { mock.restoreAll() })

const recordId = '33333333-3333-4333-8333-333333333333'
const contactId = '11111111-1111-4111-8111-111111111111'
const supplierId = '22222222-2222-4222-8222-222222222222'
const purchaseOrderId = '44444444-4444-4444-8444-444444444444'

test('invoice creation binds the selected purchase order, supplier, and submitter', async () => {
  let posted
  mock.method(globalThis, 'fetch', async (url, options = {}) => {
    if (url === '/_layout/tokenhtml') {
      return new Response('<input value="test-token" />')
    }
    if (options.method === 'POST') {
      assert.equal(url, '/_api/spnvc_invoices')
      posted = JSON.parse(options.body)
      return new Response(null, {
        status: 204,
        headers: { 'OData-EntityId': `https://portal.example/_api/spnvc_invoices(${recordId})` },
      })
    }

    assert.ok(url.startsWith(`/_api/spnvc_invoices(${recordId})?`))
    return Response.json({
      spnvc_invoiceid: recordId,
      spnvc_name: posted.spnvc_name,
      spnvc_ponumber: posted.spnvc_ponumber,
      spnvc_amount: posted.spnvc_amount,
      spnvc_invoicestatus: posted.spnvc_invoicestatus,
      _spnvc_contactid_value: contactId,
      _spnvc_supplierid_value: supplierId,
      _spnvc_purchaseorderid_value: purchaseOrderId,
    })
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

  assert.equal(posted['spnvc_ContactId@odata.bind'], `/contacts(${contactId})`)
  assert.equal(posted['spnvc_SupplierId@odata.bind'], `/spnvc_suppliers(${supplierId})`)
  assert.equal(
    posted['spnvc_PurchaseOrderId@odata.bind'],
    `/spnvc_purchaseorders(${purchaseOrderId})`,
  )
  assert.equal(created.purchaseOrderId, purchaseOrderId)
  assert.equal(created.supplierId, supplierId)
})
