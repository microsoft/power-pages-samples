import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from 'playwright'

let server
let browser
let origin
const contactId = '11111111-1111-4111-8111-111111111111'
const accounts = [
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
]
const invoiceId = '55555555-5555-4555-8555-555555555555'
const poId = '66666666-6666-4666-8666-666666666666'
const capturedErrors = JSON.parse(await readFile(new URL('./fixtures/query-errors.json', import.meta.url), 'utf8'))
const invoiceStatuses = JSON.parse(await readFile(new URL('../dataverse-choice-values.json', import.meta.url), 'utf8')).tables.spnvc_invoice.spnvc_invoicestatus
const fields = {}
for (const table of ['contact', 'account', 'spnvc_invoice', 'spnvc_purchaseorder', 'spnvc_invoicecomment', 'spnvc_invoiceattachment']) {
  const setting = await readFile(new URL(`../.powerpages-site/site-settings/Webapi-${table}-fields.sitesetting.yml`, import.meta.url), 'utf8')
  fields[table] = /^value: (.+)$/m.exec(setting)[1].split(',')
}

before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    server: { host: '127.0.0.1', port: 0, hmr: false },
  })
  await server.listen()
  origin = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ headless: true })
})
after(async () => { await browser?.close(); await server?.close() })

// This fixture models response scope at the real service/browser seam, not live
// portal ACL enforcement. Every network request is fulfilled locally.
async function fixture({
  width = 1440, state = 'success', mode = 'reviewer', summaryState = state, writeState = 'blocked',
  preflightState = 'success',
  commentState, includeDraftPO = false,
  poMetricScenario = false,
  roles = ['Authenticated Users', 'Supplier', 'Reviewer'],
} = {}) {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 1000 } })
  const requests = []
  const pageErrors = []
  const createdInvoices = []
  const createdOrders = []
  let createdComment
  let refreshStarted = false
  let finishComment
  let finishRefresh
  const commentGate = new Promise(resolve => { finishComment = resolve })
  const refreshGate = new Promise(resolve => { finishRefresh = resolve })
  const contact = {
    contactid: contactId, firstname: 'Fixture', lastname: 'Contact', fullname: 'Fixture Contact',
    emailaddress1: 'fixture@example.com', telephone1: '', jobtitle: '',
    _parentcustomerid_value: accounts[0],
    '_parentcustomerid_value@Microsoft.Dynamics.CRM.lookuplogicalname': 'account',
    '_parentcustomerid_value@OData.Community.Display.V1.FormattedValue': 'Company A',
  }
  await context.addInitScript(({ contactId, mode, roles }) => {
    window.Microsoft = { Dynamic365: { Portal: { User: {
      contactId, userName: 'fixture-login', firstName: 'Fixture', lastName: 'Contact',
      email: 'fixture@example.com', userRoles: roles,
    } } } }
    localStorage.setItem('supplier-invoice-role-mode', mode)
  }, { contactId, mode, roles })
  const account = id => ({ accountid: id, name: `Company ${String.fromCharCode(65 + accounts.indexOf(id))}`, accountcategorycode: 132140000, statecode: 0 })
  const invoice = (id, company = accounts[0], index = 1) => ({
    spnvc_invoiceid: id, spnvc_name: `INV-FIXTURE-${index}`, spnvc_ponumber: 'PO-FIXTURE-1',
    spnvc_description: 'Fixture invoice', spnvc_amount: 1250, spnvc_invoicestatus: 2,
    spnvc_submissiondate: '2026-01-01T00:00:00Z', spnvc_duedate: '2026-02-01T00:00:00Z',
    _spnvc_contactid_value: contactId, _spnvc_supplieraccountid_value: company,
    _spnvc_purchaseorderid_value: poId,
    '_spnvc_supplieraccountid_value@OData.Community.Display.V1.FormattedValue': account(company).name,
  })
  const po = (id, company = accounts[0], index = 1) => ({
    spnvc_purchaseorderid: id, spnvc_name: `PO-FIXTURE-${index}`, spnvc_description: 'Fixture order',
    spnvc_totalamount: poMetricScenario ? 15000 : 5000, spnvc_postatus: 2, spnvc_deliverydate: '2026-02-01T00:00:00Z',
    _spnvc_supplieraccountid_value: company,
    '_spnvc_supplieraccountid_value@OData.Community.Display.V1.FormattedValue': account(company).name,
  })
  const metricRows = selected => selected.flatMap((id, poIndex) => {
    if (id === 'aaaaaaaa-6666-4666-8666-666666666666' || createdOrders.some(row => row.spnvc_purchaseorderid === id)) return []
    const values = poMetricScenario
      ? [[1, invoiceStatuses.Submitted], [8500, invoiceStatuses.Approved], [6500, invoiceStatuses.Approved],
        [1200, invoiceStatuses.Paid], [500, invoiceStatuses.Approved], [1100, invoiceStatuses.Rejected], [9999, invoiceStatuses.Draft]]
      : [[1250, invoiceStatuses.Submitted]]
    return values.map(([amount, status], index) => ({
      ...invoice(`${String(poIndex + 1).padStart(8, '0')}-aaaa-4aaa-8aaa-${String(index + 1).padStart(12, '0')}`, accounts[0], index + 1),
      spnvc_name: `INV-METRIC-${index + 1}`, spnvc_amount: amount, spnvc_invoicestatus: status,
      _spnvc_purchaseorderid_value: id,
    }))
  })
  await context.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname === '/_layout/tokenhtml') {
      return route.fulfill({ contentType: 'text/html', body: '<input value="fixture-csrf" />' })
    }
    if (url.pathname.startsWith('/_api/')) {
      requests.push({ path: url.pathname, query: url.search, method: request.method(), body: request.postData() })
      assert.equal(url.searchParams.has('fetchXml'), false)
      if (url.pathname.startsWith('/_api/summarization/')) {
        const set = url.pathname.split('/').at(-1).split('(')[0]
        const table = set.slice(0, -1)
        assert.ok(url.searchParams.get('$select').split(',').every(name => fields[table].includes(name)))
        if (summaryState === 'relationship-all') {
          return route.fulfill({ status: capturedErrors.relationshipQuery.status, json: { error: capturedErrors.relationshipQuery.error } })
        }
        if (summaryState === 'empty') {
          return route.fulfill({ status: 400, json: { error: { code: '90041005', message: 'There is nothing to summarize yet.' } } })
        }
        return route.fulfill(summaryState === 'success'
          ? { json: { Summary: 'Fixture summary', Recommendations: [] } }
          : { status: 403, json: { error: { code: '90040120', message: 'Fixture summary denied' } } })
      }
      if (request.method() === 'POST') {
        if (url.pathname === '/_api/spnvc_invoicecomments' && commentState) {
          const body = request.postDataJSON()
          assert.equal(body['spnvc_AuthorContactId@odata.bind'], `/contacts(${contactId})`)
          assert.equal(body['spnvc_ContactId@odata.bind'], `/contacts(${contactId})`)
          assert.equal(body['spnvc_InvoiceId@odata.bind'], `/spnvc_invoices(${invoiceId})`)
          await commentGate
          if (commentState === 'denied') {
            return route.fulfill({ status: 403, json: { error: { code: '90040103', message: 'Fixture comment denied' } } })
          }
          createdComment = {
            spnvc_invoicecommentid: '99999999-7777-4777-8777-777777777777',
            spnvc_commenttext: body.spnvc_commenttext,
            _spnvc_authorcontactid_value: contactId, _spnvc_invoiceid_value: invoiceId,
            '_spnvc_authorcontactid_value@OData.Community.Display.V1.FormattedValue': 'Fixture Contact',
            createdon: new Date().toISOString(),
          }
          return route.fulfill({ status: 201, json: createdComment })
        }
        assert.notEqual(writeState, 'blocked', 'only explicit local form fixtures may simulate creates')
        if (['/_api/spnvc_invoices', '/_api/spnvc_purchaseorders'].includes(url.pathname)) {
          const captured = url.pathname === '/_api/spnvc_invoices'
            ? capturedErrors.invoiceCreateAssociation : capturedErrors.purchaseOrderCreateAssociation
          return route.fulfill({ status: captured.status, json: { error: captured.error } })
        }
        assert.ok(['/_api/serverlogics/submit-invoice', '/_api/serverlogics/create-purchase-order'].includes(url.pathname))
        const body = request.postDataJSON()
        assert.equal(Object.keys(body).some(key => key.includes('@odata.bind')), false)
        assert.equal(body.contactId, undefined)
        const isInvoice = url.pathname === '/_api/serverlogics/submit-invoice'
        if (isInvoice) {
          assert.equal(body.supplierId, undefined)
          assert.equal(body.purchaseOrderId, poId)
          assert.equal(body.status, 'Submitted')
        } else {
          assert.equal(body.supplierId, accounts[0])
          assert.equal(body.status, 'Draft')
        }
        if (writeState === 'denied') {
          const captured = isInvoice ? capturedErrors.invoiceCreateAssociation : capturedErrors.purchaseOrderCreateAssociation
          return route.fulfill({ json: { success: true, error: null, data: JSON.stringify({
            status: 'error', message: captured.error.message, httpStatus: captured.status, code: captured.error.code,
            persistence: 'rejected',
          }) } })
        }
        assert.ok(['success', 'unverified'].includes(writeState))
        const record = writeState === 'unverified'
          ? { spnvc_invoiceid: invoiceId, spnvc_purchaseorderid: poId }
          : isInvoice ? {
            ...invoice('77777777-7777-4777-8777-777777777777'),
            spnvc_name: body.invoiceNumber, spnvc_amount: body.amount, spnvc_duedate: body.dueDate,
          } : {
            ...po('88888888-8888-4888-8888-888888888888', body.supplierId),
            spnvc_name: body.poNumber, spnvc_totalamount: body.totalAmount, spnvc_postatus: 1,
          }
        if (writeState === 'success') (isInvoice ? createdInvoices : createdOrders).push(record)
        return route.fulfill({ json: { success: true, error: null, data: JSON.stringify({ record }) } })
      }
      assert.equal(request.method(), 'GET', 'fixture must never write business or profile data')
      if (['/_api/serverlogics/submit-invoice', '/_api/serverlogics/create-purchase-order'].includes(url.pathname)) {
        const field = url.pathname.endsWith('submit-invoice') ? 'purchaseOrderId' : 'supplierId'
        assert.equal(url.searchParams.size, 1)
        assert.ok(url.searchParams.get(field), 'preflight must be a fixed related-record selector')
        if (preflightState === 'error') {
          return route.fulfill({ json: { success: true, error: null, data: JSON.stringify({
            status: 'error', message: 'Fixture create prerequisites denied', httpStatus: 403, persistence: 'not_attempted',
          }) } })
        }
        return route.fulfill({ json: { success: true, error: null,
          data: JSON.stringify({ ready: true, creationVerified: false }) } })
      }
      const serverRead = url.pathname === '/_api/serverlogics/invoice-po-reads'
      if (url.pathname.startsWith('/_api/serverlogics/') && !serverRead) {
        const stat = url.searchParams.get('stat')
        return route.fulfill({ json: {
          success: true, error: null,
          data: JSON.stringify(state === 'error'
            ? { status: 'error', message: 'Fixture dashboard denied' }
            : stat === 'invoice-amount-stats'
              ? { stats: { total: 2500, avg: 1250 } }
              : { counts: state === 'empty' ? [] : [{ statusValue: 2, count: 12 }] }),
        } })
      }
      const set = serverRead ? url.searchParams.get('table') : url.pathname.slice('/_api/'.length).split('(')[0]
      const table = set === 'accounts' ? 'account' : set === 'contacts' ? 'contact' : set.slice(0, -1)
      const select = url.searchParams.get(serverRead ? 'select' : '$select')?.split(',') ?? []
      assert.ok(select.length, 'read must select explicit fields')
      const missing = select.find(name => !fields[table]?.includes(name))
      if (missing) return route.fulfill({ status: 403, json: { error: { code: '90040101', message: `Attribute ${missing} in table ${table} is not enabled for Web Api.` } } })
      // The post-upload console captured HTTP 400 for both child collections,
      // but not their response bodies. Keep this synthetic failure at that seam.
      if (!serverRead && !url.pathname.includes('(') &&
          ['spnvc_invoicecomments', 'spnvc_invoiceattachments'].includes(set)) {
        return route.fulfill({ status: 400, json: { error: { message: 'Captured child collection HTTP 400' } } })
      }
      if (set === 'contacts') return route.fulfill({ json: contact })
      if (set === 'accounts') {
        const id = /\(([^)]+)\)/.exec(url.pathname)?.[1]
        if (id) return route.fulfill(id === accounts[2] ? { status: 404, body: '' } : { json: account(id) })
        return route.fulfill({ json: { value: accounts.slice(0, 2).map(account) } })
      }
      if (state === 'error') return route.fulfill({ status: 403, json: { error: { code: '90040120', message: 'Fixture business read denied' } } })
      const id = /\(([^)]+)\)/.exec(url.pathname)?.[1]
      if (id) {
        if (commentState && createdComment && set === 'spnvc_invoices') {
          refreshStarted = true
          await refreshGate
          if (commentState === 'refresh-error') {
            return route.fulfill({ status: 403, json: { error: { code: '90040120', message: 'Fixture detail refresh denied' } } })
          }
        }
        if (id === accounts[2] || state === 'empty') return route.fulfill({ status: 404, body: '' })
        return route.fulfill({ json: set === 'spnvc_invoices' ? invoice(id) : po(id) })
      }
      const filter = url.searchParams.get(serverRead ? 'filter' : '$filter') ?? ''
      const filterObject = serverRead && filter ? JSON.parse(filter) : null
      const selectedPoIds = filterValues(filterObject, '_spnvc_purchaseorderid_value', 'eq')
      const supplierScope = serverRead
        ? filterHasCompany(filter ? JSON.parse(filter) : null, accounts[0])
        : filter.includes(`_spnvc_supplieraccountid_value eq ${accounts[0]}`)
      const second = serverRead ? url.searchParams.get('page') === '2' : url.searchParams.has('$skiptoken')
      const cursor = new URL(url)
      cursor.searchParams.set(serverRead ? 'page' : '$skiptoken', serverRead ? '2' : 'page2')
      const nextPage = `${cursor.pathname}${cursor.search}`
      if (set === 'spnvc_invoices' && selectedPoIds.length > 0 && select.length === 4 && select.includes('spnvc_amount')) {
        if (poMetricScenario === 'denied') {
          return route.fulfill({ status: 403, json: { error: { code: '90040120', message: 'Fixture invoice totals denied' } } })
        }
        let totals = state === 'empty' ? [] : metricRows(selectedPoIds)
          .filter(row => [invoiceStatuses.Submitted, invoiceStatuses.Approved, invoiceStatuses.Paid].includes(row.spnvc_invoicestatus))
        const count = totals.length
        const hasNext = poMetricScenario && !second && totals.length > 2
        if (poMetricScenario) totals = second ? totals.slice(2) : totals.slice(0, 2)
        return route.fulfill({ json: { success: true, error: null, data: JSON.stringify({
          result: { value: totals, '@odata.count': count, ...(hasNext ? { '@odata.nextLink': nextPage } : {}) },
        }) } })
      }
      let rows = []
      let next
      let count = 0
      if (state !== 'empty') {
        if (set === 'spnvc_invoices') {
          if (poMetricScenario && selectedPoIds.length > 0) {
            rows = metricRows(selectedPoIds)
            count = rows.length
          } else {
            const size = supplierScope ? 1 : 12
            count = size
            rows = Array.from({ length: second ? 2 : Math.min(10, size) }, (_, i) =>
              invoice(`${(second ? 20 : 10) + i}000000-5555-4555-8555-555555555555`, accounts[i % 2], second ? 11 + i : 1 + i))
            if (!second && size > 10) next = nextPage
          }
        } else if (set === 'spnvc_purchaseorders') {
          count = supplierScope ? 1 : 2
          rows = [po(poId, second ? accounts[1] : accounts[0], second ? 2 : 1)]
          if (!second && !supplierScope) next = nextPage
          if (includeDraftPO && !second) {
            const excludesDraft = serverRead && filterHasCondition(filter ? JSON.parse(filter) : null, 'spnvc_postatus', 'ne', 1)
            if (!excludesDraft) rows.push({ ...po('aaaaaaaa-6666-4666-8666-666666666666'), spnvc_name: 'PO-DRAFT-FIXTURE', spnvc_postatus: 1 })
          }
        } else if (set === 'spnvc_invoicecomments') {
          count = 2
          rows = [{
            spnvc_invoicecommentid: `${second ? '8' : '7'}7777777-7777-4777-8777-777777777777`,
            spnvc_commenttext: second ? 'Second page comment' : 'First page comment',
            _spnvc_invoiceid_value: invoiceId, createdon: '2026-01-01T00:00:00Z',
          }]
          if (!second) next = nextPage
        } else if (set === 'spnvc_invoiceattachments') {
          count = 2
          rows = [{
            spnvc_invoiceattachmentid: `${second ? '9' : '8'}8888888-8888-4888-8888-888888888888`,
            spnvc_name: second ? 'second-page.pdf' : 'first-page.pdf',
            _spnvc_invoiceid_value: invoiceId, spnvc_filesize: '1 KB', spnvc_filetype: 'application/pdf',
          }]
          if (!second) next = nextPage
        }
      }
      const created = set === 'spnvc_invoices' ? createdInvoices : set === 'spnvc_purchaseorders' ? createdOrders : []
      count += created.length
      if (!second) rows.unshift(...created)
      if (set === 'spnvc_invoicecomments' && createdComment && !second) rows.push(createdComment)
      const result = { value: rows, '@odata.count': count, ...(next ? { '@odata.nextLink': next } : {}) }
      return route.fulfill({ json: serverRead
        ? { success: true, error: null, data: JSON.stringify({ result }) } : result })
    }
    assert.equal(url.hostname, 'portal.example', 'no external network request may escape')
    return route.fulfill({ response: await route.fetch({ url: `${origin}${url.pathname}${url.search}` }) })
  })
  const page = await context.newPage()
  page.on('pageerror', error => pageErrors.push(error.message))
  return { context, page, requests, pageErrors, finishComment, finishRefresh, hasRefreshStarted: () => refreshStarted }
}

function filterHasCondition(filter, attribute, operator, value) {
  if (!filter) return false
  if (Array.isArray(filter.filters)) return filter.filters.some(child => filterHasCondition(child, attribute, operator, value))
  return filter.attribute === attribute && filter.operator === operator && filter.value === value
}

function filterValues(filter, attribute, operator) {
  if (!filter) return []
  if (Array.isArray(filter.filters)) return filter.filters.flatMap(child => filterValues(child, attribute, operator))
  return filter.attribute === attribute && filter.operator === operator ? [filter.value] : []
}

function filterHasCompany(filter, company) {
  if (!filter) return false
  if (Array.isArray(filter.filters)) return filter.filters.some(child => filterHasCompany(child, company))
  return filter.attribute === '_spnvc_supplieraccountid_value' && filter.operator === 'eq' && filter.value === company
}

async function inspectLayout(page, name, width) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(async () => {
    const animations = document.getAnimations().filter(animation =>
      Number.isFinite(animation.effect?.getComputedTiming().endTime))
    await Promise.allSettled(animations.map(animation => animation.finished))
  })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'page must not overflow horizontally')
  if (process.env.SUPPLIER_UI_EVIDENCE_DIR) {
    await mkdir(process.env.SUPPLIER_UI_EVIDENCE_DIR, { recursive: true })
    await page.screenshot({ path: join(process.env.SUPPLIER_UI_EVIDENCE_DIR, `${name}-${width}.png`), fullPage: true })
  }
}

for (const mode of ['supplier', 'reviewer']) {
  test(`${mode} invoice list has no AI card or summary requests when filtering and searching`, async () => {
    const f = await fixture({ mode, summaryState: 'relationship-all' })
    try {
      await f.page.goto('http://portal.example/invoices')
      await f.page.getByText('INV-FIXTURE-1', { exact: true }).waitFor()
      await f.page.waitForLoadState('networkidle')
      assert.equal(await f.page.getByRole('heading', { name: /AI Summary/ }).count(), 0)
      assert.equal(await f.page.locator('#my-invoices-ai-summary-body').count(), 0)
      assert.equal(await f.page.getByRole('button', { name: 'Try again', exact: true }).count(), 0)
      assert.equal(f.requests.some(request => request.path.startsWith('/_api/summarization/')), false)
      const filteredRequest = f.page.waitForRequest(request => {
        const url = new URL(request.url())
        return url.pathname === '/_api/serverlogics/invoice-po-reads' && url.searchParams.get('table') === 'spnvc_invoices' &&
          filterHasCondition(JSON.parse(url.searchParams.get('filter') || 'null'), 'spnvc_invoicestatus', 'eq', 2)
      })
      await f.page.locator('#status-filter').selectOption('Submitted')
      await filteredRequest
      await f.page.waitForLoadState('networkidle')
      await f.page.getByRole('searchbox', { name: 'Search invoices', exact: true }).fill('INV-FIXTURE')
      await f.page.waitForURL(url => url.searchParams.get('q') === 'INV-FIXTURE')
      await f.page.waitForLoadState('networkidle')
      await assertEventually(() => f.requests.some(request => request.path === '/_api/serverlogics/invoice-po-reads' &&
        filterHasCondition(JSON.parse(new URLSearchParams(request.query).get('filter') || 'null'), 'spnvc_name', 'contains', 'INV-FIXTURE')))
      assert.equal(f.requests.some(request => request.path.startsWith('/_api/summarization/')), false)
      const lists = f.requests.filter(request => request.path === '/_api/serverlogics/invoice-po-reads' &&
        new URLSearchParams(request.query).get('table') === 'spnvc_invoices')
      assert.ok(lists.length >= 3)
      assert.ok(lists.some(request => filterHasCondition(JSON.parse(new URLSearchParams(request.query).get('filter') || 'null'),
        'spnvc_name', 'contains', 'INV-FIXTURE')), JSON.stringify({
          filters: lists.map(request => new URLSearchParams(request.query).get('filter')),
          alerts: await f.page.getByRole('alert').allTextContents(),
          errors: f.pageErrors,
        }))
      assert.ok(lists.every(request => new URLSearchParams(request.query).get('select').includes('spnvc_invoiceid')))
      assert.ok(lists.every(request => filterHasCompany(JSON.parse(new URLSearchParams(request.query).get('filter') || 'null'), accounts[0]) === (mode === 'supplier')))
      assert.ok(lists.every(request => new URLSearchParams(request.query).get('pageSize') === '10'))
      await inspectLayout(f.page, `invoice-list-no-ai-${mode}`, 1440)
    } finally { await f.context.close() }
  })
}

test('live comment optimistic author is the signed-in Contact, never the mock user', async () => {
  const f = await fixture({ commentState: 'success' })
  try {
    await f.page.goto(`http://portal.example/invoices/${invoiceId}`)
    await f.page.getByText('First page comment', { exact: true }).waitFor()
    await f.page.locator('textarea').fill('Caller identity regression')
    await f.page.getByRole('button', { name: 'Send comment', exact: true }).click()
    await f.page.getByText('Caller identity regression', { exact: true }).waitFor()
    assert.equal(await f.page.getByText('Chris Green', { exact: true }).count(), 0)
    assert.ok(await f.page.getByText('Fixture Contact', { exact: true }).count() >= 1)
  } finally {
    f.finishComment(); f.finishRefresh()
    await f.context.close()
  }
})

test('comment readback preserves detail DOM and a new draft instead of replacing the page', async () => {
  const f = await fixture({ commentState: 'success' })
  try {
    await f.page.goto(`http://portal.example/invoices/${invoiceId}`)
    await f.page.getByText('First page comment', { exact: true }).waitFor()
    const editor = await f.page.locator('textarea').elementHandle()
    await f.page.locator('textarea').fill('Saved comment regression')
    await f.page.getByRole('button', { name: 'Send comment', exact: true }).click()
    f.finishComment()
    await assertEventually(() => f.hasRefreshStarted())
    assert.equal(await editor.evaluate(node => node.isConnected), true, 'readback must not replace detail with a page skeleton')
    await f.page.locator('textarea').fill('Next unsent comment')
    f.finishRefresh()
    await f.page.getByText('Saved comment regression', { exact: true }).waitFor()
    assert.equal(await f.page.locator('textarea').inputValue(), 'Next unsent comment')
    assert.equal(f.requests.filter(request => request.method === 'POST' && request.path === '/_api/spnvc_invoicecomments').length, 1)
    await inspectLayout(f.page, 'comment-readback', 1440)
  } finally {
    f.finishComment(); f.finishRefresh()
    await f.context.close()
  }
})

async function assertEventually(predicate) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  assert.fail('Expected the actual fixture request seam to be reached')
}

for (const mode of ['supplier', 'reviewer']) {
  test(`${mode} PO list Draft visibility matches mode and server-side filter`, async () => {
    const f = await fixture({ mode, includeDraftPO: true })
    try {
      await f.page.goto('http://portal.example/purchase-orders')
      await f.page.getByText('PO-FIXTURE-1', { exact: true }).waitFor()
      await f.page.waitForLoadState('networkidle')
      assert.equal(await f.page.getByText('PO-DRAFT-FIXTURE', { exact: true }).count(), mode === 'reviewer' ? 1 : 0)
      assert.equal(await f.page.locator('#po-status-filter option').filter({ hasText: /^Draft$/ }).count(), mode === 'reviewer' ? 1 : 0)
      const queries = f.requests.filter(request => request.path === '/_api/serverlogics/invoice-po-reads' && new URLSearchParams(request.query).get('table') === 'spnvc_purchaseorders')
      assert.equal(queries.some(request => filterHasCondition(JSON.parse(new URLSearchParams(request.query).get('filter') || 'null'), 'spnvc_postatus', 'ne', 1)), mode === 'supplier')
      await inspectLayout(f.page, `po-draft-${mode}`, 1440)
    } finally { await f.context.close() }
  })
}

test('website headings, form controls and error details use the Segoe UI stack', async () => {
  const f = await fixture({ state: 'error' })
  try {
    await f.page.goto(`http://portal.example/invoices/${invoiceId}`)
    await f.page.getByRole('button', { name: 'Show details' }).click()
    const fonts = await f.page.locator('h2,button').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).fontFamily))
    fonts.push(await f.page.getByText('Fixture business read denied', { exact: true }).evaluate(node => getComputedStyle(node).fontFamily))
    assert.ok(fonts.every(font => font.startsWith('"Segoe UI"') || font.startsWith('Segoe UI')), JSON.stringify(fonts))
  } finally { await f.context.close() }
})

for (const width of [1440, 390]) {
  test(`PO invoiced and overage metrics agree across list/detail and fit at ${width}px`, async () => {
    const f = await fixture({ mode: 'supplier', poMetricScenario: true, width })
    try {
      await f.page.goto('http://portal.example/purchase-orders')
      await f.page.getByText('PO-FIXTURE-1', { exact: true }).waitFor()
      const row = f.page.getByRole('row').filter({ hasText: 'PO-FIXTURE-1' }).first()
      await row.getByText('$16,701', { exact: true }).waitFor()
      await row.getByText('Over-invoiced by $1,701', { exact: true }).waitFor()
      assert.ok((await row.getByRole('cell').nth(4).textContent()).startsWith('$0'))
      await inspectLayout(f.page, 'po-invoiced-list', width)
      await f.page.getByRole('link', { name: 'PO-FIXTURE-1', exact: true }).click()
      await f.page.getByText('Over-invoiced', { exact: true }).waitFor()
      const summaryCard = label => f.page.getByText(label, { exact: true }).first().locator('..')
      assert.ok((await summaryCard('Invoiced').textContent()).includes('$16,701'))
      assert.ok((await summaryCard('Remaining').textContent()).includes('$0'))
      assert.ok((await summaryCard('Over-invoiced').textContent()).includes('$1,701'))
      await f.page.getByText('111% invoiced', { exact: true }).waitFor()
      assert.equal(await f.page.getByRole('link', { name: 'Create Invoice', exact: true }).count(), 0,
        'a Supplier must not be offered an unfulfillable PO-specific invoice action when available balance is zero')
      const transform = await f.page.locator('.progress-bar-fill').evaluate(node => node.style.transform)
      assert.equal(transform, 'scaleX(1)', 'overage must not overflow the progress track')
      const linked = f.requests.find(request => request.path === '/_api/serverlogics/invoice-po-reads' &&
        new URLSearchParams(request.query).get('table') === 'spnvc_invoices' &&
        new URLSearchParams(request.query).get('select')?.includes('spnvc_name') &&
        filterHasCondition(JSON.parse(new URLSearchParams(request.query).get('filter') || 'null'), '_spnvc_purchaseorderid_value', 'eq', poId))
      assert.ok(linked, 'linked invoice table must use the actual PO lookup, not a loose name search')
      await inspectLayout(f.page, 'po-invoiced-detail', width)
    } finally { await f.context.close() }
  })
}

test('denied linked invoice amounts are visible errors rather than successful zero PO balances', async () => {
  const f = await fixture({ mode: 'supplier', poMetricScenario: 'denied' })
  try {
    await f.page.goto('http://portal.example/purchase-orders')
    await f.page.getByText('Fixture invoice totals denied', { exact: true }).waitFor()
    assert.equal(await f.page.getByText('PO-FIXTURE-1', { exact: true }).count(), 0)
    await f.page.goto(`http://portal.example/purchase-orders/${poId}`)
    await f.page.getByText('Fixture invoice totals denied', { exact: true }).waitFor()
    assert.equal(await f.page.getByText('0% invoiced', { exact: true }).count(), 0)
  } finally { await f.context.close() }
})

test('failed comment refresh retains the detail and unsent text with an explicit refresh error', async () => {
  const f = await fixture({ commentState: 'refresh-error' })
  try {
    await f.page.goto(`http://portal.example/invoices/${invoiceId}`)
    await f.page.getByText('First page comment', { exact: true }).waitFor()
    await f.page.getByRole('textbox', { name: 'Add a comment', exact: true }).fill('Saved before failed readback')
    await f.page.getByRole('button', { name: 'Send comment', exact: true }).click()
    f.finishComment()
    await assertEventually(() => f.hasRefreshStarted())
    await f.page.getByRole('textbox', { name: 'Add a comment', exact: true }).fill('Unsent next comment')
    f.finishRefresh()
    await f.page.getByRole('alert').getByText(/The invoice could not be refreshed/).waitFor()
    assert.equal(await f.page.getByRole('textbox', { name: 'Add a comment', exact: true }).inputValue(), 'Unsent next comment')
    assert.equal(await f.page.getByText('Saved before failed readback', { exact: true }).count(), 1)
    assert.equal(f.requests.filter(request => request.method === 'POST' && request.path === '/_api/spnvc_invoicecomments').length, 1,
      'a failed readback must never replay comment creation')
    await inspectLayout(f.page, 'comment-refresh-error', 1440)
  } finally {
    f.finishComment(); f.finishRefresh()
    await f.context.close()
  }
})

test('comment permission denial rolls back only the optimistic comment without replay or page reset', async () => {
  const f = await fixture({ commentState: 'denied' })
  try {
    await f.page.goto(`http://portal.example/invoices/${invoiceId}`)
    await f.page.getByText('First page comment', { exact: true }).waitFor()
    const editor = await f.page.getByRole('textbox', { name: 'Add a comment', exact: true }).elementHandle()
    await f.page.getByRole('textbox', { name: 'Add a comment', exact: true }).fill('Denied fixture comment')
    await f.page.getByRole('button', { name: 'Send comment', exact: true }).click()
    f.finishComment()
    await f.page.getByText('Failed to save comment', { exact: true }).waitFor()
    assert.equal(await editor.evaluate(node => node.isConnected), true)
    assert.equal(await f.page.getByText('Denied fixture comment', { exact: true }).count(), 0)
    assert.equal(f.requests.filter(request => request.method === 'POST' && request.path === '/_api/spnvc_invoicecomments').length, 1)
    assert.equal(f.hasRefreshStarted(), false)
  } finally {
    f.finishComment(); f.finishRefresh()
    await f.context.close()
  }
})

for (const width of [1440, 390]) {
  for (const state of ['success', 'empty', 'error']) {
    test(`scoped invoice/PO/dashboard visible ${state} states at ${width}px`, async () => {
      const { context, page, requests, pageErrors } = await fixture({ width, state })
      try {
        await page.goto('http://portal.example/invoices')
        await page.getByRole('heading', { name: 'All Invoices', exact: true }).waitFor()
        if (state === 'success') await page.getByText('INV-FIXTURE-1', { exact: true }).waitFor()
        else if (state === 'empty') await page.getByText('No invoices found matching your criteria.', { exact: true }).waitFor()
        else await page.getByText('Fixture business read denied', { exact: true }).waitFor()
        await inspectLayout(page, `invoices-${state}`, width)
        await page.goto('http://portal.example/purchase-orders')
        if (state === 'success') await page.getByText('PO-FIXTURE-2', { exact: true }).waitFor()
        else if (state === 'empty') await page.getByText('No purchase orders found.', { exact: true }).waitFor()
        else await page.getByText('Fixture business read denied', { exact: true }).waitFor()
        await inspectLayout(page, `purchase-orders-${state}`, width)
        await page.goto('http://portal.example/dashboard')
        if (state === 'error') {
          await page.getByRole('alert').getByText('Fixture dashboard denied', { exact: true }).waitFor()
          assert.equal(await page.getByText('Get started with your first invoice', { exact: true }).count(), 0)
          await page.getByRole('alert').getByText('Fixture business read denied', { exact: true }).waitFor()
        } else if (state === 'empty') await page.getByText('Get started with your first invoice', { exact: true }).waitFor()
        else await page.getByText('INV-FIXTURE-1', { exact: true }).waitFor()
        await inspectLayout(page, `dashboard-${state}`, width)
        assert.deepEqual(pageErrors, [])
        assert.ok(requests.every(request => request.method === 'GET'), 'read-only paths must not write')
      } finally { await context.close() }
    })
  }
}

test('Reviewer-only callers cannot open the invoice-submit form or see its list action', async () => {
  const { context, page, requests } = await fixture({ roles: ['Authenticated Users', 'Reviewer'] })
  try {
    await page.goto('http://portal.example/invoices/new')
    await page.getByRole('heading', { name: 'Access Denied', exact: true }).waitFor()
    await page.getByText('Only suppliers can submit invoices.', { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Submit Invoice', exact: true }).count(), 0)
    assert.equal(requests.some(request => request.path.startsWith('/_api/contacts(')), false,
      'an unauthorized submit page must not hydrate Supplier Company/PO inputs')
    await page.goto('http://portal.example/invoices')
    await page.getByRole('heading', { name: 'All Invoices', exact: true }).waitFor()
    assert.equal(await page.getByRole('link', { name: 'Submit New Invoice', exact: true }).count(), 0)
    assert.equal(requests.some(request => request.method !== 'GET'), false)
  } finally { await context.close() }
})

test('dual-role callers retain invoice submission in Reviewer presentation mode', async () => {
  const { context, page, requests } = await fixture({ mode: 'reviewer' })
  try {
    await page.goto('http://portal.example/invoices')
    await page.getByRole('link', { name: 'Submit New Invoice', exact: true }).waitFor()
    await page.goto('http://portal.example/invoices/new')
    await page.getByRole('heading', { name: 'Submit New Invoice', exact: true }).waitFor()
    await page.getByLabel('Purchase Order', { exact: false }).selectOption(poId)
    assert.equal(await page.getByRole('button', { name: 'Submit Invoice', exact: true }).count(), 1)
    assert.equal(requests.some(request => request.method !== 'GET'), false)
  } finally { await context.close() }
})

for (const kind of ['invoice', 'purchase order']) {
  test(`${kind} selector performs a read-only preflight and blocks denied prerequisites without POST`, async () => {
    const { context, page, requests } = await fixture({
      mode: kind === 'invoice' ? 'supplier' : 'reviewer', preflightState: 'error',
    })
    try {
      await page.goto(`http://portal.example/${kind === 'invoice' ? 'invoices' : 'purchase-orders'}/new`)
      await page.getByLabel(kind === 'invoice' ? 'Purchase Order' : 'Supplier', { exact: false })
        .selectOption(kind === 'invoice' ? poId : accounts[0])
      await page.getByRole('alert').getByText('Fixture create prerequisites denied', { exact: true }).waitFor()
      assert.equal(await page.getByRole('button', {
        name: kind === 'invoice' ? 'Submit Invoice' : 'Create Purchase Order', exact: true,
      }).isDisabled(), true)
      const endpoint = `/_api/serverlogics/${kind === 'invoice' ? 'submit-invoice' : 'create-purchase-order'}`
      assert.ok(requests.some(request => request.path === endpoint && request.method === 'GET'))
      assert.equal(requests.some(request => request.method !== 'GET'), false)
    } finally { await context.close() }
  })
}

for (const kind of ['invoice', 'purchase order']) {
  for (const writeState of ['success', 'denied', 'unverified']) {
    test(`${kind} form preserves persistence and association-denial outcomes (${writeState})`, async () => {
      const { context, page, requests, pageErrors } = await fixture({
        mode: kind === 'invoice' ? 'supplier' : 'reviewer', writeState,
      })
      try {
        await page.goto(`http://portal.example/${kind === 'invoice' ? 'invoices' : 'purchase-orders'}/new`)
        if (kind === 'invoice') {
          await page.getByLabel('Purchase Order', { exact: false }).selectOption(poId)
          await page.getByLabel('Amount (USD)', { exact: false }).fill('123')
          await page.getByLabel('Due Date', { exact: false }).fill('2030-10-08')
        } else {
          await page.getByLabel('PO Number', { exact: false }).fill('PO-FIXTURE-CREATE')
          await page.getByLabel('Supplier', { exact: false }).selectOption(accounts[0])
          await page.getByLabel('Total Amount (USD)', { exact: false }).fill('123')
        }
        await page.getByRole('button', { name: kind === 'invoice' ? 'Submit Invoice' : 'Create Purchase Order', exact: true }).click()
        if (writeState !== 'success') {
          const message = writeState === 'denied'
            ? (kind === 'invoice' ? capturedErrors.invoiceCreateAssociation : capturedErrors.purchaseOrderCreateAssociation).error.message
            : 'The create response could not verify persistence. Check existing records before submitting again.'
          await page.getByRole('alert').getByText(message, { exact: true }).waitFor()
          assert.ok(new URL(page.url()).pathname.endsWith('/new'), 'a denied write must not navigate as success')
          assert.equal(await page.getByText('Invoice submitted successfully', { exact: true }).count(), 0)
        } else {
          await page.waitForURL(`http://portal.example/${kind === 'invoice' ? 'invoices' : 'purchase-orders'}`)
          await page.getByRole('heading', { name: kind === 'invoice' ? 'My Invoices' : 'Purchase Orders', exact: true }).waitFor()
          await page.getByText(kind === 'invoice' ? 'INV-FIXTURE-1' : 'PO-FIXTURE-1', { exact: true }).waitFor()
        }
        const creates = requests.filter(request => request.method === 'POST' &&
          request.path === `/_api/serverlogics/${kind === 'invoice' ? 'submit-invoice' : 'create-purchase-order'}`)
        assert.equal(creates.length, 1)
        assert.equal(requests.some(request => request.method === 'POST' &&
          ['/_api/spnvc_invoices', '/_api/spnvc_purchaseorders'].includes(request.path)), false,
        'a scoped create must never fall back to the captured OData failure path')
        await inspectLayout(page, `${kind.replace(' ', '-')}-create-${writeState}`, 1440)
        assert.deepEqual(pageErrors, [])
      } finally { await context.close() }
    })
  }
}

for (const width of [1440, 390]) {
test(`invoice page two and detail child collections use continuation links at ${width}px`, async () => {
  const { context, page, requests } = await fixture({ width })
  try {
    await page.goto('http://portal.example/invoices')
    await page.getByText('INV-FIXTURE-1', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Next page', exact: true }).click()
    await page.getByText('INV-FIXTURE-11', { exact: true }).waitFor()
    assert.equal(await page.getByText('INV-FIXTURE-1', { exact: true }).count(), 0)
    await page.goto(`http://portal.example/invoices/${invoiceId}`)
    await page.getByText('Second page comment', { exact: true }).waitFor()
    await page.getByText('second-page.pdf', { exact: true }).first().waitFor()
    assert.ok(requests.some(request => request.path === '/_api/serverlogics/invoice-po-reads' &&
      new URLSearchParams(request.query).get('table') === 'spnvc_invoices' &&
      new URLSearchParams(request.query).get('page') === '2'))
    for (const set of ['spnvc_invoicecomments', 'spnvc_invoiceattachments']) {
      assert.ok(requests.some(request => request.path === '/_api/serverlogics/invoice-po-reads' &&
        new URLSearchParams(request.query).get('table') === set &&
        new URLSearchParams(request.query).get('page') === '2'))
      assert.equal(requests.some(request => request.path === `/_api/${set}`), false,
        'the detail page must not call the captured failing child collection')
    }
    const progress = page.getByRole('list', { name: 'Invoice status progress' })
    const card = await progress.locator('..').boundingBox()
    const paid = await progress.getByText('Paid', { exact: true }).boundingBox()
    assert.ok(card && paid && paid.x >= card.x && paid.x + paid.width <= card.x + card.width,
      'all status labels must fit inside the timeline card without clipping')
    await inspectLayout(page, 'invoice-detail', width)
  } finally { await context.close() }
})
}

test('dual-role supplier mode uses Company A while reviewer assignment replies contain only A/B, never C', async () => {
  for (const mode of ['supplier', 'reviewer']) {
    const { context, page, requests } = await fixture({ mode })
    try {
      await page.goto('http://portal.example/invoices')
      await page.getByText('INV-FIXTURE-1', { exact: true }).waitFor()
      const invoiceRequest = requests.find(request => request.path === '/_api/serverlogics/invoice-po-reads' &&
        new URLSearchParams(request.query).get('table') === 'spnvc_invoices')
      const filter = new URLSearchParams(invoiceRequest.query).get('filter')
      assert.equal(filterHasCompany(filter ? JSON.parse(filter) : null, accounts[0]), mode === 'supplier')
      assert.equal(requests.some(request => request.path.startsWith('/_api/summarization/')), false)
      const scope = await page.evaluate(async ({ forbidden, assigned }) => {
        const { listAssignableSuppliers, getSupplierById } = await import('/src/services/supplierService.ts')
        const { getInvoiceById } = await import('/src/services/invoiceService.ts')
        return {
          suppliers: (await listAssignableSuppliers()).map(supplier => supplier.id),
          forbiddenSupplier: await getSupplierById(forbidden),
          forbiddenInvoice: await getInvoiceById(forbidden),
          assignedInvoice: (await getInvoiceById(assigned)).supplierId,
        }
      }, { forbidden: accounts[2], assigned: invoiceId })
      assert.deepEqual(scope.suppliers, accounts.slice(0, 2))
      assert.equal(scope.forbiddenSupplier, null)
      assert.equal(scope.forbiddenInvoice, null)
      assert.equal(scope.assignedInvoice, accounts[0])
      assert.equal(await page.getByText('Company C', { exact: true }).count(), 0)
    } finally { await context.close() }
  }
})

for (const summaryState of ['success', 'empty', 'error']) {
  test(`record-level invoice, PO and queue summary callers retain OData selections and visible ${summaryState} states`, async () => {
    const { context, page, requests } = await fixture({ mode: 'supplier', summaryState })
    try {
      for (const path of [`/invoices/${invoiceId}`, `/purchase-orders/${poId}`, '/review']) {
        await page.goto(`http://portal.example${path}`)
        const message = summaryState === 'success'
          ? 'Fixture summary'
          : summaryState === 'error'
            ? 'Fixture summary denied'
            : path === '/review'
                ? 'No invoices in the review queue right now'
                : 'There is nothing to summarize yet.'
        await page.getByText(message, { exact: summaryState !== 'empty' }).first().waitFor()
      }
      const summaries = requests.filter(request => request.path.startsWith('/_api/summarization/'))
      // React StrictMode replays mount effects in the local development build.
      // Check the retained caller contracts without mistaking that replay for retries.
      assert.equal(new Set(summaries.map(request => JSON.parse(request.body).InstructionIdentifier)).size, 3)
      assert.ok(summaries.every(request => request.method === 'POST' && JSON.parse(request.body).InstructionIdentifier))
      assert.ok(summaries.every(request => !request.query.includes('fetchXml')))
    } finally { await context.close() }
  })
}
