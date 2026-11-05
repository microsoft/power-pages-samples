import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { endpoints, ID, keys, opportunityFields, row, runEndpoint, wrap } from './endpoint-harness.mjs'

const writes = ['contact-actions', 'customer-account-create', 'opportunity-create']
const isWrite = call => call.method === 'CreateRecord' || call.method === 'UpdateRecord'
const answerText = result => JSON.stringify(result.blocks)

for (const name of endpoints) {
  test(`${name}: accepts documented wrapper and raw read shapes`, () => {
    for (const encode of [wrap, value => JSON.stringify(wrap(value)), value => value, value => JSON.stringify(value)]) {
      const { result } = runEndpoint(name, { encode })
      assert.equal(result.status, 'success', JSON.stringify(result))
    }
  })
  test(`${name}: rejects malformed and unsuccessful reads, without leaking connector data`, () => {
    for (const response of [
      null,
      [],
      'not JSON',
      { StatusCode: 200, Body: 'not JSON' },
      { IsSuccessStatusCode: false, Body: '{}' },
      { StatusCode: 200, ServerError: true, ServerErrorMessage: 'private connector detail', Body: '{}' },
      { StatusCode: 200, Body: '{"error":{"message":"private connector detail"}}' },
      { StatusCode: 503, Body: 'private connector detail' },
      { StatusCode: 'invalid', Body: '{}' },
    ]) {
      const { result, calls, logs } = runEndpoint(name, { respond: () => response })
      assert.equal(result.status, 'error', `${name} accepted ${JSON.stringify(response)}`)
      assert.ok(!JSON.stringify(result).includes('private connector detail'))
      assert.equal(calls.filter(isWrite).length, 0)
      assert.ok(logs.some(log => log.level === 'Error'))
    }
  })
  test(`${name}: anonymous calls do not reach Dataverse`, () => {
    const { result, calls } = runEndpoint(name, { user: null })
    assert.equal(result.status, 'error')
    assert.equal(calls.length, 0)
  })
}

for (const name of writes) {
  test(`${name}: failed or unconfirmed creates never report success`, () => {
    for (const response of [
      null,
      {},
      { IsSuccessStatusCode: false, Body: '{}' },
      { StatusCode: 200, Body: '{"error":{"message":"Rejected"}}' },
      { StatusCode: 204, Body: '', Headers: {} },
      { StatusCode: 204, Body: '', Headers: { entityid: 'not-a-guid' } },
    ]) {
      const { result, calls } = runEndpoint(name, { respond: call => (call.method === 'CreateRecord' ? response : undefined) })
      assert.equal(result.status, 'error')
      assert.match(result.message, /Check the list before trying again/)
      assert.equal(calls.filter(isWrite).length, 1, 'must not retry an uncertain write')
    }
  })
  test(`${name}: recognizes create IDs in mixed-case headers and response records`, () => {
    const key = name === 'contact-actions' ? 'contactid' : name === 'opportunity-create' ? 'opportunityid' : 'accountid'
    for (const response of [
      { StatusCode: 204, Body: '', Headers: { EnTiTyId: ID.record } },
      { StatusCode: 204, Body: null, Headers: { 'oDaTa-EnTiTyId': `https://example.test/records(${ID.record})` } },
      { StatusCode: 201, Body: '', Headers: { location: `https://example.test/records(${ID.record})` } },
      wrap({ [key]: ID.record }),
    ]) {
      const { result, calls } = runEndpoint(name, { respond: call => (call.method === 'CreateRecord' ? response : undefined) })
      assert.equal(result.status, 'success', JSON.stringify(result))
      assert.equal(result.id, ID.record)
      for (const call of calls.filter(call => call.method === 'RetrieveRecord')) {
        assert.equal(call.skipCache, true, 'write authorization must use fresh records')
        assert.match(call.query, /^\$select=/)
      }
    }
  })
  test(`${name}: invalid payloads do not write`, () => {
    for (const body of [null, [], 'text', { fields: [] }, { fields: { name: ' ', lastname: ' ' }, action: 'create', parentAccountId: ID.partner }]) {
      const { result, calls } = runEndpoint(name, { body })
      assert.equal(result.status, 'error')
      assert.equal(calls.filter(isWrite).length, 0)
    }
  })
}

test('opportunity create: enforce form invariants and derive parent only from validated customer', () => {
  for (const fields of [
    { ...opportunityFields, name: 42 },
    { ...opportunityFields, estimatedvalue: -1 },
    { ...opportunityFields, estimatedvalue: '100' },
    { ...opportunityFields, estimatedclosedate: '' },
    { ...opportunityFields, estimatedclosedate: '2026-02-30' },
    { ...opportunityFields, 'customerid_account@odata.bind': undefined, 'parentaccountid@odata.bind': `/accounts(${ID.other})` },
    { ...opportunityFields, 'customerid_account@odata.bind': '/accounts(------------------------------------)' },
  ]) {
    const { result, calls } = runEndpoint('opportunity-create', { body: { fields } })
    assert.equal(result.status, 'error')
    assert.equal(calls.filter(isWrite).length, 0)
  }
  const { result, calls } = runEndpoint('opportunity-create', {
    body: { fields: { ...opportunityFields, 'parentaccountid@odata.bind': `/accounts(${ID.other})` } },
  })
  assert.equal(result.status, 'success')
  assert.equal(calls.find(isWrite).payload['parentaccountid@odata.bind'], `/accounts(${ID.customer})`)
})

test('contact actions: successful 204 updates, failed updates and self-demotion protection', () => {
  const body = { action: 'setRole', contactid: ID.other, role: 756150001 }
  assert.equal(runEndpoint('contact-actions', { body }).result.status, 'success')
  for (const response of [null, {}, { IsSuccessStatusCode: false, Body: '' }, { StatusCode: 204, ServerError: true, Body: '' }]) {
    assert.equal(runEndpoint('contact-actions', { body, respond: call => (call.method === 'UpdateRecord' ? response : undefined) }).result.status, 'error')
  }
  const denied = runEndpoint('contact-actions', { body: { ...body, contactid: ID.me } })
  assert.equal(denied.result.status, 'error')
  assert.equal(denied.calls.filter(isWrite).length, 0)
})

test('write authorization: preserve seller/manager and managed-account boundaries', () => {
  for (const [name, options] of [
    ['customer-account-create', { roleCode: 756150002 }],
    ['contact-actions', { roleCode: 756150001 }],
    ['contact-actions', { roleCode: 756150002, body: { action: 'setRole', contactid: ID.other, role: 756150000 } }],
    ['opportunity-create', { roleCode: 756150002, body: { fields: opportunityFields, partnerContactId: ID.other } }],
    [
      'opportunity-create',
      {
        respond: call =>
          call.set === 'accounts' ? wrap({ accountid: ID.customer, accountclassificationcode: 1, _msa_managingpartnerid_value: ID.other }) : undefined,
      },
    ],
  ]) {
    const { result, calls } = runEndpoint(name, options)
    assert.equal(result.status, 'error', name)
    assert.equal(calls.filter(isWrite).length, 0)
  }
})

const paged = [
  ['contact-directory', 'accounts', 'accounts', { scope: 'accounts' }],
  ['partner-dashboard', 'opportunities', 'opportunities', { sections: 'rows' }],
  ['opportunity-list', 'opportunities', 'opportunities', { view: 'distributed' }],
  ['opportunity-workspace', 'adx_dealregistrationrequests', 'registrations', { id: ID.record }],
  ['customer-account-workspace', 'contacts', 'contacts', { id: ID.customer }],
  ['partner-team', 'contacts', 'contacts', {}],
  ['assistant', 'opportunities', null, {}],
]
for (const [name, set, output, query] of paged) {
  test(`${name}: follows encoded continuation without rewriting it`, () => {
    const continuation = `$select=${keys[set]}&$skiptoken=%3Ccookie%20x%3D%22a%2Bb%26c%22%2F%3E`
    const { result, calls } = runEndpoint(name, {
      query,
      roles: ['Partner Manager'],
      respond: call =>
        call.method === 'RetrieveMultipleRecords' && call.set === set
          ? wrap({
              value: [row(set, call.query === continuation ? ID.other : ID.record)],
              ...(call.query !== continuation ? { '@odata.nextLink': `https://example.test/api/data/v9.2/${set}?${continuation}` } : {}),
            })
          : undefined,
    })
    assert.equal(result.status, 'success', JSON.stringify(result))
    const reads = calls.filter(call => call.method === 'RetrieveMultipleRecords' && call.set === set)
    assert.equal(reads.length, 2)
    assert.match(reads[0].query, new RegExp(`\\$orderby=[^&]*${keys[set]}`))
    assert.equal(reads[1].query, continuation)
    if (output) assert.equal(result[output].length, 2)
    else assert.match(answerText(result), /(?<!CA)\$20/)
  })
  test(`${name}: rejects missing collections, cycles, wrong targets and incomplete expansions`, () => {
    for (const body of [
      {},
      { value: {} },
      { value: [null] },
      { value: [{}] },
      { value: [row(set)], '@odata.nextLink': `${set}?$skiptoken=repeat` },
      { value: [row(set)], '@odata.nextLink': 'otherentities?$skiptoken=wrong' },
      { value: [row(set)], '@odata.nextLink': true },
      { value: [{ ...row(set), 'related@odata.nextLink': 'more' }] },
    ]) {
      const { result, calls } = runEndpoint(name, {
        query,
        roles: ['Partner Manager'],
        respond: call => (call.method === 'RetrieveMultipleRecords' && call.set === set ? wrap(body) : undefined),
      })
      assert.equal(result.status, 'error', `${name}: ${JSON.stringify(body)}`)
      assert.ok(calls.length <= 5, 'cycle detection must bound the number of requests')
    }
  })
}

test('bounded reads: accept 10,000 records, reject overflow and stop after 20 pages', () => {
  for (const count of [10000, 10001]) {
    const { result } = runEndpoint('opportunity-list', {
      query: { view: 'distributed' },
      respond: call =>
        call.method === 'RetrieveMultipleRecords' ? wrap({ value: Array.from({ length: count }, (_, i) => ({ opportunityid: String(i) })) }) : undefined,
    })
    assert.equal(result.status, count === 10000 ? 'success' : 'error')
  }
  const { result, calls } = runEndpoint('opportunity-list', {
    query: { view: 'distributed' },
    respond: (call, calls) => wrap({ value: [row('opportunities')], '@odata.nextLink': `opportunities?$skiptoken=${calls.length}` }),
  })
  assert.equal(result.status, 'error')
  assert.equal(calls.length, 20)
})

test('dashboard counts include every continuation page', () => {
  const { result } = runEndpoint('partner-dashboard', {
    query: { sections: 'counts' },
    respond: call =>
      call.method === 'RetrieveMultipleRecords'
        ? wrap({
            value: [{ ...row(call.set, call.query.includes('skiptoken') ? ID.other : ID.record), statecode: call.query.includes('skiptoken') ? 1 : 0 }],
            ...(!call.query.includes('skiptoken') ? { '@odata.nextLink': `${call.set}?$skiptoken=2` } : {}),
          })
        : undefined,
  })
  assert.equal(result.status, 'success')
  assert.deepEqual(result.counts, { customerAccounts: 2, activeCustomerAccounts: 1, customerContacts: 2 })
})

test('single-level expansion navigation URLs are not mistaken for continuation pages', () => {
  for (const name of ['opportunity-workspace', 'opportunity-list']) {
    for (const count of [0, 1, 4999, 5000]) {
      const expanded = {
        ...row('opportunities'),
        adx_opportunity_account: Array.from({ length: count }, () => row('accounts')),
        'adx_opportunity_account@odata.nextLink': `https://example.test/opportunities(${ID.record})/adx_opportunity_account?$select=accountid,name`,
      }
      const { result } = runEndpoint(name, {
        query: name === 'opportunity-list' ? { view: 'distributed' } : { id: ID.record },
        respond: call => (call.set === 'opportunities' ? wrap(call.method === 'RetrieveRecord' ? expanded : { value: [expanded] }) : undefined),
      })
      assert.equal(result.status, count < 5000 ? 'success' : 'error')
    }
    const { result } = runEndpoint(name, {
      query: name === 'opportunity-list' ? { view: 'distributed' } : { id: ID.record },
      respond: call => {
        if (call.set !== 'opportunities') return undefined
        const paged = {
          ...row('opportunities'),
          adx_opportunity_account: [row('accounts')],
          'adx_opportunity_account@odata.nextLink': `https://example.test/opportunities(${ID.record})/adx_opportunity_account?$skiptoken=2`,
        }
        return wrap(call.method === 'RetrieveRecord' ? paged : { value: [paged] })
      },
    })
    assert.equal(result.status, 'error')
  }
})

test('workspace dependency failures remain errors, including denied required sections', () => {
  for (const [name, set, query, rows] of [
    ['opportunity-workspace', 'opportunityproducts', { id: ID.record }],
    ['opportunity-workspace', 'adx_dealregistrationrequests', { id: ID.record }],
    ['opportunity-workspace', 'adx_portalcomments', { id: ID.record }],
    ['opportunity-workspace', 'territories', { mode: 'create' }],
    ['partner-team', 'adx_invitations', {}, { contacts: [row('contacts')] }],
  ]) {
    for (const status of [403, 503]) {
      const { result } = runEndpoint(name, {
        query,
        rows,
        respond: call => (call.method === 'RetrieveMultipleRecords' && call.set === set ? { StatusCode: status, Body: '' } : undefined),
      })
      assert.equal(result.status, 'error', `${name}/${set}/${status}`)
    }
  }
})

test('denied or missing primary records retain not-found behavior', () => {
  for (const name of ['contact-directory', 'opportunity-workspace', 'customer-account-workspace']) {
    for (const status of [403, 404]) {
      assert.deepEqual(runEndpoint(name, { query: { id: ID.record }, respond: () => ({ StatusCode: status, Body: '<not json>' }) }).result, {
        status: 'success',
        found: false,
      })
    }
  }
  for (const status of [403, 404, 503]) {
    const { result } = runEndpoint('contact-directory', {
      query: { scope: 'me' },
      respond: call => (call.set === 'accounts' ? { StatusCode: status, Body: '' } : undefined),
    })
    assert.equal(result.status, status === 503 ? 'error' : 'success')
    if (status !== 503) assert.equal(result.account, null)
  }
})

test('validate query IDs, modes, sections and enum values before loading records', () => {
  for (const [name, query] of [
    ['opportunity-list', { view: 'toString' }],
    ['partner-dashboard', { sections: 'rows,invalid' }],
    ['opportunity-workspace', { id: '-'.repeat(36) }],
    ['opportunity-workspace', { mode: 'delete' }],
    ['customer-account-workspace', { id: '-'.repeat(36) }],
    ['partner-team', { contactId: '-'.repeat(36) }],
    ['global-search', { q: 'Sample', types: 'invalid' }],
  ]) {
    const { result, calls } = runEndpoint(name, { query })
    assert.equal(result.status, 'error')
    assert.equal(calls.length, 0)
  }
})

test('team comments require membership; Admin name substring does not grant invitation reads', () => {
  const { result, calls } = runEndpoint('partner-team', { query: { contactId: ID.other }, roles: ['Not Partner Admin'], rows: { contacts: [row('contacts')] } })
  assert.equal(result.status, 'error')
  assert.ok(!calls.some(call => ['adx_portalcomments', 'adx_invitations'].includes(call.set)))
  assert.ok(
    !runEndpoint('global-search', { roles: ['Not Partner Admin'], query: { q: 'Avery', types: 'partner' } }).calls.some(
      call => call.method === 'RetrieveMultipleRecords',
    ),
  )
})

test('assistant totals cover over 100 opportunities but keep answer payload bounded', () => {
  const { result, calls } = runEndpoint('assistant', {
    respond: call =>
      call.set === 'opportunities'
        ? wrap({
            value: Array.from({ length: call.query.includes('skiptoken') ? 1 : 100 }, (_, i) =>
              row('opportunities', `opportunity-${call.query.includes('skiptoken') ? 100 : i}`),
            ),
            ...(!call.query.includes('skiptoken') ? { '@odata.nextLink': 'opportunities?$skiptoken=last' } : {}),
          })
        : undefined,
  })
  assert.equal(result.status, 'success')
  assert.match(answerText(result), /(?<!CA)\$1,010/)
  assert.match(answerText(result), /101 opportunit/)
  assert.equal(result.citations.length, 20)
  assert.ok(!calls.some(call => call.query?.includes('$top=100')))
})

test('assistant does not fall back on authentication, permission, throttling or service failures', () => {
  for (const status of [401, 403, 429, 503]) {
    const { result, calls } = runEndpoint('assistant', {
      body: { message: 'Summarize Sample' },
      respond: call => (call.set === 'opportunities' ? { StatusCode: status, Body: '' } : undefined),
    })
    assert.equal(result.status, 'error')
    assert.equal(calls.filter(call => call.set === 'opportunities').length, 1)
  }
})

test('assistant explicitly discloses unsupported-query fallback limits', () => {
  const { result, calls } = runEndpoint('assistant', {
    body: { message: 'Summarize Sample' },
    respond: call => (call.set === 'opportunities' && decodeURIComponent(call.query).includes('contains(') ? { StatusCode: 400, Body: '' } : undefined),
  })
  assert.equal(result.status, 'success')
  assert.match(answerText(result), /500 accessible candidates/)
  assert.match(answerText(result), /not an exhaustive search/)
  assert.equal(calls.filter(call => call.set === 'opportunities').length, 2)
})

test('assistant rejects invalid questions instead of coercing or truncating them', () => {
  for (const body of [null, [], { message: 42 }, { message: ' ' }, { message: 'x'.repeat(501) }]) {
    const { result, calls } = runEndpoint('assistant', { body })
    assert.equal(result.status, 'error')
    assert.equal(calls.length, 0)
  }
})

// Products and comments inherit many-to-many opportunity permissions; portal OData reads of such chains fail, so
// the workspace reads them with FetchXML and keeps the row shape the client maps.
test('workspace reads products and comments with FetchXML and keeps the client row shape', () => {
  const fetchRows = {
    opportunityproducts: [
      {
        opportunityproductid: ID.record,
        productdescription: null,
        isproductoverridden: false,
        quantity: 3,
        priceperunit: 10,
        _productid_value: ID.other,
        '_productid_value@OData.Community.Display.V1.FormattedValue': 'Power BI Pro',
        _uomid_value: ID.customer,
        '_uomid_value@OData.Community.Display.V1.FormattedValue': 'License',
      },
    ],
    adx_portalcomments: [{ activityid: ID.record, description: 'Note', createdon: '2026-10-21T00:00:00Z', _createdby_value: ID.me }],
  }
  const { result, calls } = runEndpoint('opportunity-workspace', {
    query: { id: ID.record },
    respond: call => (call.method === 'RetrieveMultipleRecords' && fetchRows[call.set] ? wrap({ value: fetchRows[call.set] }) : undefined),
  })
  assert.equal(result.status, 'success', JSON.stringify(result))
  for (const [set, entity, attribute] of [
    ['opportunityproducts', 'opportunityproduct', 'opportunityid'],
    ['adx_portalcomments', 'adx_portalcomment', 'regardingobjectid'],
  ]) {
    const read = calls.find(call => call.set === set)
    assert.match(read.query, /^fetchXml=/)
    assert.ok(!read.query.includes('$'), `${set} must not use OData query options`)
    const xml = decodeURIComponent(read.query.slice('fetchXml='.length))
    assert.match(xml, new RegExp(`<entity name="${entity}">`))
    assert.match(xml, new RegExp(`<condition attribute="${attribute}" operator="eq" value="${ID.record}"/>`))
    assert.match(xml, new RegExp(`<order attribute="${keys[set]}"/></entity>`), 'primary key keeps page boundaries stable')
  }
  assert.deepEqual(result.products[0].productid, { productid: ID.other, name: 'Power BI Pro' })
  assert.deepEqual(result.products[0].uomid, { uomid: ID.customer, name: 'License' })
  assert.equal(result.products[0].quantity, 3)
  assert.equal(result.comments[0].description, 'Note')
})

test('workspace FetchXML reads page until Dataverse reports no more records, within bounds', () => {
  const page = query => Number(/page="(\d+)"/.exec(decodeURIComponent(query))[1])
  const products = (respond, set = 'opportunityproducts') =>
    runEndpoint('opportunity-workspace', {
      query: { id: ID.record },
      respond: (call, calls) => (call.method === 'RetrieveMultipleRecords' && call.set === set ? respond(call, calls) : undefined),
    })
  const twoPages = products(call =>
    wrap({ value: [row('opportunityproducts', page(call.query) === 1 ? ID.record : ID.other)], '@Microsoft.Dynamics.CRM.morerecords': page(call.query) === 1 }),
  )
  assert.equal(twoPages.result.status, 'success', JSON.stringify(twoPages.result))
  assert.deepEqual(twoPages.result.products.map(p => p.opportunityproductid), [ID.record, ID.other])
  assert.deepEqual(twoPages.calls.filter(call => call.set === 'opportunityproducts').map(call => page(call.query)), [1, 2])

  const endless = products(() => wrap({ value: [row('opportunityproducts')], '@Microsoft.Dynamics.CRM.morerecords': true }))
  assert.equal(endless.result.status, 'error')
  assert.equal(endless.calls.filter(call => call.set === 'opportunityproducts').length, 20)

  for (const body of [{}, { value: [{}] }, { value: [], '@Microsoft.Dynamics.CRM.morerecords': true }]) {
    assert.equal(products(() => wrap(body), 'adx_portalcomments').result.status, 'error', JSON.stringify(body))
  }
  const overflow = products(() => wrap({ value: Array.from({ length: 10001 }, (_, i) => ({ opportunityproductid: String(i) })) }))
  assert.equal(overflow.result.status, 'error')
})

// https://learn.microsoft.com/power-pages/configure/author-server-logic#limitations — the platform rejects a script
// that contains any of these anywhere (code, strings or comments) before it runs, returning an opaque exception.
test('server logic avoids keywords the platform script validator rejects', () => {
  const restricted = [
    '__dirname', '__filename', 'import(', 'import from', 'eval(', 'Function(', 'setTimeout(', 'setInterval(', 'setImmediate(',
    'process.exit', 'process.kill', 'child_process', 'fs.', 'require(', 'constructor.constructor', 'this.constructor',
    'arguments.callee', 'with(', 'delete', 'Object.getPrototypeOf', 'Object.setPrototypeOf', 'Proxy(', 'Reflect.', 'Symbol.for',
    '__proto__', 'prototype', 'debugger',
  ]
  for (const name of endpoints) {
    const source = readFileSync(new URL(`../../.powerpages-site/server-logic/${name}/${name}.js`, import.meta.url), 'utf8')
    assert.deepEqual(restricted.filter(keyword => source.includes(keyword)), [], `${name}.js contains a restricted keyword`)
  }
})
