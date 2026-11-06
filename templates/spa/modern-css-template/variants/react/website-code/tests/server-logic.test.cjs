const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const contact = '11111111-1111-4111-8111-111111111111'
const foreign = '99999999-9999-4999-8999-999999999999'
const caseId = '22222222-2222-4222-8222-222222222222'
const articleId = '33333333-3333-4333-8333-333333333333'
const fileId = '44444444-4444-4444-8444-444444444444'
const rootId = '55555555-5555-4555-8555-555555555555'
const productId = '66666666-6666-4666-8666-666666666666'
const language = '56940b3e-300f-4070-a559-5a6a4d11a8a3'
const now = '2026-10-15T12:00:00.000Z'
const profile = { contactid: contact, firstname: 'Ada', lastname: 'Customer', emailaddress1: 'ada@example.test', telephone1: '555-0100', address1_composite: '', parentcustomerid_account: null }
const caseRow = { incidentid: caseId, ticketnumber: 'CAS-1001', title: 'Customer request', description: 'Original description', statecode: 0, statuscode: 1, createdon: now, modifiedon: now, customerid_contact: { contactid: contact } }
const article = { knowledgearticleid: articleId, articlepublicnumber: 'KA-1001', title: 'Published article', description: 'Guidance', content: '<p>Safe content</p>', statecode: 3, isinternal: false, isrootarticle: false, _languagelocaleid_value: language, _rootarticleid_value: rootId, publishon: null, expirationdate: null }
const pdf = Buffer.from('%PDF-1.7\nsample')
const note = { annotationid: fileId, _objectid_value: caseId, notetext: '*WEB* Customer-uploaded document', isdocument: true, filename: 'sample.pdf', mimetype: 'application/pdf', filesize: pdf.length, documentbody: pdf.toString('base64') }
const comment = { activityid: fileId, _regardingobjectid_value: caseId, subject: '*WEB* Customer message', description: 'Customer detail', createdon: now, adx_portalcommentdirectioncode: 1 }
const methods = { 'northwind-profile': ['get', 'patch'], 'northwind-cases': ['get', 'post', 'patch'], 'northwind-knowledge': ['get'], 'northwind-case-activity': ['get', 'post'], 'northwind-feedback': ['post'] }
const scripts = Object.fromEntries(Object.keys(methods).map(name => [name, fs.readFileSync(path.join(__dirname, '..', '.powerpages-site', 'server-logic', name, `${name}.js`), 'utf8')]))
const response = (body, status = 200, headers = {}) => ({ StatusCode: status, IsSuccessStatusCode: status >= 200 && status < 300, Body: JSON.stringify(body), Headers: headers })

function run(name, method, settings = {}) {
  const calls = [], logs = []
  let currentCase = structuredClone(settings.caseRow || caseRow), identity = { ...profile }
  const connector = {
    RetrieveRecord(entity, id, options, skipCache) {
      calls.push({ method: 'read', entity, id, options, skipCache })
      if (settings.read) return settings.read(entity, id, options)
      if (entity === 'contacts') return response(identity)
      if (entity === 'incidents') return response(currentCase)
      if (entity === 'products') return response({ productid: productId, statecode: settings.inactiveProduct ? 1 : 0 })
      throw new Error(`Unexpected single read: ${entity}`)
    },
    RetrieveMultipleRecords(entity, options, skipCache) {
      calls.push({ method: 'list', entity, options, skipCache })
      if (settings.list) return settings.list(entity, options)
      if (entity === 'incidents') return response({ value: [currentCase] })
      if (entity === 'knowledgearticles') return response({ value: options.includes('$top=1') ? [{ knowledgearticleid: settings.latest || articleId }] : [settings.article || article] })
      if (entity === 'annotations') return response({ value: [settings.note || note] })
      if (entity === 'adx_portalcomments') return response({ value: [settings.comment || comment] })
      throw new Error(`Unexpected collection read: ${entity}`)
    },
    CreateRecord(entity, raw) {
      const body = JSON.parse(raw)
      calls.push({ method: 'create', entity, body })
      if (settings.writeFailure) return response({}, 403)
      if (entity === 'incidents') currentCase = { ...currentCase, incidentid: fileId, title: body.title, description: body.description }
      return response(null, 204, settings.headers || { 'OData-EntityId': `https://org.example/api/data/v9.2/${entity}(${fileId})` })
    },
    UpdateRecord(entity, id, raw) {
      const body = JSON.parse(raw)
      calls.push({ method: 'update', entity, id, body })
      if (settings.writeFailure || (settings.statusUpdateFailure && entity === 'incidents')) return response({}, 403)
      if (entity === 'contacts') identity = { ...identity, ...body }
      if (entity === 'incidents') currentCase = { ...currentCase, ...body }
      return response(null, 204)
    },
  }
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])) }
    static now() { return Date.parse(now) }
  }
  const sandbox = {
    Date: Clock,
    Server: {
      User: settings.user === undefined ? { contactid: contact } : settings.user,
      Context: { QueryParameters: settings.query || {}, Body: typeof settings.body === 'string' ? settings.body : JSON.stringify(settings.body || {}) },
      SiteSetting: { Get: key => { assert.equal(key, 'Northwind/KnowledgeLanguageLocaleId'); return settings.language === undefined ? language : settings.language } },
      Connector: { Dataverse: Object.fromEntries(Object.entries(connector).map(([method, call]) => [method, (...args) => {
        const result = call(...args)
        return settings.responseFormat === 'object' || typeof result === 'string' ? result : JSON.stringify(result)
      }])) },
      Logger: { Log: message => logs.push(message), Error: message => logs.push(message) },
    },
  }
  vm.createContext(sandbox)
  vm.runInContext(scripts[name], sandbox)
  const raw = vm.runInContext(`${method}()`, sandbox, { timeout: 10000 })
  assert.equal(typeof raw, 'string')
  const result = JSON.parse(raw)
  assert.ok(['success', 'error'].includes(result.status))
  assert.ok(logs.length > 0)
  if (result.status === 'error') {
    assert.equal(typeof result.code, 'string')
    assert.equal(typeof result.message, 'string')
    assert.ok(!result.message.includes('org.example'))
    assert.ok(logs.length >= 2)
  }
  return { result, calls, logs }
}
function noWrite(runResult, code) {
  assert.equal(runResult.result.status, 'error')
  if (code) assert.equal(runResult.result.code, code)
  assert.equal(runResult.calls.filter(call => ['create', 'update'].includes(call.method)).length, 0)
}
function publicationQueries(calls) {
  for (const call of calls.filter(call => call.entity === 'knowledgearticles')) {
    assert.match(call.options, /statecode eq 3 and isinternal eq false and isrootarticle eq false/)
    assert.ok(call.options.includes(`_languagelocaleid_value eq ${language}`))
    assert.match(call.options, /publishon le 2026-10-15T12:00:00.000Z/)
    assert.match(call.options, /expirationdate gt 2026-10-15T12:00:00.000Z/)
    assert.equal(call.skipCache, true)
  }
}

for (const [name, script] of Object.entries(scripts)) {
  test(`${name} avoids hosted script validation false positives`, () => {
    // The hosted validator also matches anonymous callbacks, including in other handlers.
    assert.equal(/Function\s*\(/i.test(script), false, `${name}: use arrow callbacks instead of anonymous function expressions`)
    assert.equal(/with\s*\(/i.test(script), false, `${name}: keep OData function names split in source`)
  })
}

test('every handler accepts hosted serialized connector responses and equivalent object responses', () => {
  for (const [name, method, settings] of [
    ['northwind-profile', 'get', {}],
    ['northwind-profile', 'patch', { body: { firstName: 'Grace', lastName: 'Customer', phone: '' } }],
    ['northwind-cases', 'get', {}],
    ['northwind-cases', 'post', { body: { description: 'Help', impact: 'I have a question', productId } }],
    ['northwind-cases', 'patch', { body: { id: caseId, title: 'Updated', description: 'Details' } }],
    ['northwind-knowledge', 'get', {}],
    ['northwind-case-activity', 'get', { query: { caseId } }],
    ['northwind-case-activity', 'get', { query: { caseId, documentId: fileId } }],
    ['northwind-case-activity', 'post', { body: { caseId, kind: 'comment', body: 'Reply' } }],
    ['northwind-case-activity', 'post', { body: { caseId, kind: 'document', name: 'sample.pdf', type: 'application/pdf', content: pdf.toString('base64') } }],
    ['northwind-feedback', 'post', { body: { kind: 'contact', message: 'Help' } }],
    ['northwind-feedback', 'post', { body: { kind: 'article', articleId, helpful: true } }],
  ]) {
    const serialized = run(name, method, settings)
    const object = run(name, method, { ...settings, responseFormat: 'object' })
    assert.equal(serialized.result.status, 'success', `${name} ${method}`)
    assert.deepEqual(serialized.result, object.result)
    assert.deepEqual(serialized.calls, object.calls)
  }
})
test('serialized missing-record and malformed connector responses retain failure semantics', () => {
  const missing = () => response({}, 404)
  noWrite(run('northwind-profile', 'get', { read: missing }), 'NOT_FOUND')
  noWrite(run('northwind-cases', 'post', {
    body: { description: 'Help', impact: 'I have a question', productId }, read: missing,
  }), 'NOT_FOUND')
  for (const value of [
    undefined, null, [], {}, true, 42, 'not JSON', 'null', '[]',
    response(profile, 403), response(profile, 500),
    { StatusCode: 200, IsSuccessStatusCode: false, Body: JSON.stringify(profile) },
    { StatusCode: 200, IsSuccessStatusCode: true, Body: 'not JSON' },
  ]) noWrite(run('northwind-profile', 'get', { read: () => value }), 'DATAVERSE_ERROR')
})

test('sandbox exposes only approved handler entry points and no unavailable runtime APIs', () => {
  for (const [name, script] of Object.entries(scripts)) {
    assert.deepEqual([...script.matchAll(/^function (\w+)\(/gm)].map(match => match[1]), methods[name])
    assert.doesNotMatch(script, /with\s*\(|\brequire\s*\(|\bfetch\s*\(|\bBuffer\b|\batob\b|\bimport\s|\bsetTimeout\b|\bconsole\./)
    for (const method of methods[name]) {
      const outcome = run(name, method, { user: null })
      if (name === 'northwind-knowledge') continue
      noWrite(outcome, 'UNAUTHENTICATED')
      assert.equal(outcome.calls.length, 0)
    }
  }
})
test('anonymous visitors receive only published external knowledge and cause no writes', () => {
  const outcome = run('northwind-knowledge', 'get', { user: null })
  assert.equal(outcome.result.status, 'success')
  assert.deepEqual(outcome.result.data.items.map(item => item.id), [articleId])
  assert.ok(outcome.calls.every(call => call.method === 'list' && call.entity === 'knowledgearticles'))
  publicationQueries(outcome.calls)
  for (const change of [{ isinternal: true }, { statecode: 1 }, { isrootarticle: true }]) {
    noWrite(run('northwind-knowledge', 'get', { user: null, article: { ...article, ...change } }), 'NOT_FOUND')
  }
})
test('profile reads only the session contact and accepts exactly safe name/phone fields', () => {
  const get = run('northwind-profile', 'get')
  assert.equal(get.result.data.id, contact)
  assert.equal(get.calls[0].id, contact)
  assert.match(get.calls[0].options, /parentcustomerid_account/)
  const patch = run('northwind-profile', 'patch', { body: { firstName: 'Grace', lastName: 'Customer', phone: '555-0200' } })
  assert.equal(patch.result.data.firstName, 'Grace')
  assert.deepEqual(patch.calls.find(call => call.method === 'update').body, { firstname: 'Grace', lastname: 'Customer', telephone1: '555-0200' })
  for (const key of ['id', 'email', 'parentcustomerid', 'ownerid', 'roles', '__proto__']) {
    noWrite(run('northwind-profile', 'patch', { body: `{"firstName":"Ada","lastName":"Customer","phone":"","${key}":"${foreign}"}` }), 'VALIDATION')
  }
  noWrite(run('northwind-profile', 'get', { query: { id: foreign } }), 'VALIDATION')
  assert.equal(run('northwind-profile', 'get', { read: () => ({ Body: JSON.stringify(profile) }) }).result.status, 'error')
})
test('case queries enforce contact-as-customer and reject cross-contact or account-customer records', () => {
  const own = run('northwind-cases', 'get')
  assert.equal(own.result.data.items[0].id, caseId)
  assert.ok(own.calls[0].options.includes(`customerid_contact/contactid eq ${contact}`))
  for (const customer of [null, { contactid: foreign }]) {
    noWrite(run('northwind-cases', 'get', { caseRow: { ...caseRow, customerid_contact: customer } }), 'NOT_FOUND')
    noWrite(run('northwind-cases', 'patch', { caseRow: { ...caseRow, customerid_contact: customer }, body: { id: caseId, title: 'Edit', description: 'Text' } }), 'NOT_FOUND')
  }
  noWrite(run('northwind-cases', 'get', { query: { '$filter': 'true' } }), 'VALIDATION')
  noWrite(run('northwind-cases', 'get', { query: { id: `${caseId}' or true` } }), 'VALIDATION')
})
test('case pagination accepts only an opaque token and rebuilds ownership filters', () => {
  const first = run('northwind-cases', 'get', { list: () => response({ value: [caseRow], '@odata.nextLink': 'https://org.example/api/data/v9.2/incidents?$skiptoken=next%26%24filter%3Dtrue' }) })
  const next = run('northwind-cases', 'get', { query: { cursor: first.result.data.cursor } })
  assert.equal(next.result.status, 'success')
  assert.ok(next.calls[0].options.includes(`customerid_contact/contactid eq ${contact}`))
  assert.ok(next.calls[0].options.includes('$skiptoken=next%26%24filter%3Dtrue'))
  noWrite(run('northwind-cases', 'get', { query: { cursor: encodeURIComponent(JSON.stringify({ v: 1, owner: foreign, token: 'next' })) } }), 'VALIDATION')
})
test('case creation sets Web origin, binds the session customer, validates product and enforces the exact field limit', () => {
  const impact = 'I have a question', maximum = 2000 - `\n\nBusiness impact: ${impact}`.length
  const accepted = run('northwind-cases', 'post', { body: { description: 'x'.repeat(maximum), impact, productId } })
  assert.equal(accepted.result.status, 'success')
  const payload = accepted.calls.find(call => call.method === 'create').body
  assert.equal(payload.caseorigincode, 3)
  assert.equal(payload.description.length, 2000)
  assert.equal(payload['customerid_contact@odata.bind'], `/contacts(${contact})`)
  assert.equal(payload['productid@odata.bind'], `/products(${productId})`)
  assert.equal(payload.title.length, 200)
  const withoutProduct = run('northwind-cases', 'post', { body: { description: 'Text', impact } })
  assert.equal(withoutProduct.result.status, 'success')
  assert.equal(withoutProduct.calls.find(call => call.method === 'create').body.caseorigincode, 3)
  noWrite(run('northwind-cases', 'post', { body: { description: 'Text', impact, caseorigincode: 1 } }), 'VALIDATION')
  for (const key of ['ownerid', 'customerid', 'contactId', 'statecode', 'statuscode', 'prioritycode']) {
    noWrite(run('northwind-cases', 'post', { body: { description: 'Text', impact, [key]: foreign } }), 'VALIDATION')
  }
  noWrite(run('northwind-cases', 'post', { body: { description: 'x'.repeat(maximum + 1), impact } }), 'VALIDATION')
  noWrite(run('northwind-cases', 'post', { inactiveProduct: true, body: { description: 'Text', impact, productId } }), 'VALIDATION')
})
test('only active cases can be edited and writes never accept lifecycle changes', () => {
  const body = { id: caseId, title: 'Revised', description: 'x'.repeat(2000) }
  const accepted = run('northwind-cases', 'patch', { body })
  assert.equal(accepted.result.data.description.length, 2000)
  assert.deepEqual(Object.keys(accepted.calls.find(call => call.method === 'update').body).sort(), ['description', 'title'])
  noWrite(run('northwind-cases', 'patch', { body: { ...body, description: 'x'.repeat(2001) } }), 'VALIDATION')
  for (const state of [1, 2]) noWrite(run('northwind-cases', 'patch', { body, caseRow: { ...caseRow, statecode: state } }), 'FORBIDDEN')
  noWrite(run('northwind-cases', 'patch', { body: { ...body, statecode: 1 } }), 'VALIDATION')
  noWrite(run('northwind-cases', 'patch', { body: { ...body, caseorigincode: 3 } }), 'VALIDATION')
})
test('knowledge returns only the latest eligible published version, independent of a newer draft', () => {
  const latest = run('northwind-knowledge', 'get')
  assert.equal(latest.result.data.items[0].id, articleId)
  publicationQueries(latest.calls)
  assert.ok(latest.calls.some(call => call.options.includes('$top=1')))
  const older = run('northwind-knowledge', 'get', { latest: foreign })
  assert.deepEqual(older.result.data.items, [])
  assert.equal(run('northwind-knowledge', 'get', { query: { id: articleId }, latest: foreign }).result.code, 'NOT_FOUND')
  noWrite(run('northwind-knowledge', 'get', { language: '' }), 'CONFIGURATION')
  for (const change of [{ statecode: 0 }, { isinternal: true }, { isrootarticle: true }, { _languagelocaleid_value: foreign }, { publishon: '2999-01-01' }, { expirationdate: '2020-01-01' }]) {
    assert.equal(run('northwind-knowledge', 'get', { article: { ...article, ...change } }).result.code, 'NOT_FOUND')
  }
})
test('knowledge continuation is rebuilt with publication and language restrictions', () => {
  const first = run('northwind-knowledge', 'get', { list: (_entity, options) => response(options.includes('$top=1')
    ? { value: [{ knowledgearticleid: articleId }] }
    : { value: [article], '@odata.nextLink': 'https://org.example/knowledgearticles?$skiptoken=next' }) })
  const next = run('northwind-knowledge', 'get', { query: { cursor: first.result.data.cursor } })
  assert.equal(next.result.status, 'success')
  publicationQueries(next.calls)
  assert.match(next.calls[0].options, /\$skiptoken=next/)
  noWrite(run('northwind-knowledge', 'get', { query: { cursor: encodeURIComponent(JSON.stringify({ v: 1, language: foreign, token: 'next' })) } }), 'VALIDATION')
})
test('activity requires the personal case and explicit portal markers; internal records fail closed', () => {
  const own = run('northwind-case-activity', 'get', { query: { caseId } })
  assert.equal(own.result.data.comments[0].id, fileId)
  assert.equal(own.result.data.documents[0].size, pdf.length)
  for (const entity of ['adx_portalcomments', 'annotations']) {
    const call = own.calls.find(call => call.entity === entity)
    assert.match(call.options, /\*WEB\*/)
    assert.ok(call.options.includes(caseId))
    assert.equal(call.skipCache, true)
  }
  noWrite(run('northwind-case-activity', 'get', { query: { caseId }, caseRow: { ...caseRow, customerid_contact: { contactid: foreign } } }), 'NOT_FOUND')
  noWrite(run('northwind-case-activity', 'get', { query: { caseId }, note: { ...note, notetext: 'Internal CRM note' } }), 'NOT_FOUND')
  noWrite(run('northwind-case-activity', 'get', { query: { caseId }, comment: { ...comment, subject: 'Internal CRM conversation' } }), 'NOT_FOUND')
  noWrite(run('northwind-case-activity', 'get', { query: { caseId, documentId: fileId }, note: { ...note, _objectid_value: foreign } }), 'NOT_FOUND')
})
test('activity continuation retains the parent/visibility filter and rejects repeated cursors', () => {
  let notes = 0
  const repeated = run('northwind-case-activity', 'get', { query: { caseId }, list: (entity, options) => {
    if (entity === 'incidents') return response({ value: [caseRow] })
    if (entity === 'adx_portalcomments') return response({ value: [] })
    notes++
    assert.ok(options.includes(`_objectid_value eq ${caseId}`))
    assert.ok(options.includes("startswith(notetext,'*WEB*')"))
    return response({ value: [], '@odata.nextLink': 'https://org.example/annotations?$skiptoken=repeat' })
  } })
  assert.equal(repeated.result.status, 'error')
  assert.equal(notes, 2)
})
test('published support responses retain personal-case isolation and customer replies cannot forge support authorship', () => {
  const published = { ...comment, subject: '*WEB* AI-assisted support response', description: 'Approved response for this customer.', adx_portalcommentdirectioncode: 2 }
  const own = run('northwind-case-activity', 'get', { query: { caseId }, comment: published })
  assert.deepEqual(own.result.data.comments, [{ id: fileId, body: published.description, created: now, author: 'Support' }])
  const foreignCustomer = run('northwind-case-activity', 'get', { query: { caseId }, user: { contactid: foreign }, comment: published })
  noWrite(foreignCustomer, 'NOT_FOUND')
  assert.equal(foreignCustomer.calls.some(call => call.entity === 'adx_portalcomments'), false)
  noWrite(run('northwind-case-activity', 'get', { query: { caseId }, comment: { ...published, _regardingobjectid_value: foreign } }), 'NOT_FOUND')
  noWrite(run('northwind-case-activity', 'post', { body: { kind: 'comment', caseId, body: 'Pretend support response', adx_portalcommentdirectioncode: 2 } }), 'VALIDATION')
})
test('comment creation binds the authorized case and marks it for portal publication', () => {
  const body = { kind: 'comment', caseId, body: 'Reply from customer' }
  const saved = run('northwind-case-activity', 'post', { body })
  assert.equal(saved.result.data.id, fileId)
  const payload = saved.calls.find(call => call.method === 'create').body
  assert.equal(payload['regardingobjectid_incident_adx_portalcomment@odata.bind'], `/incidents(${caseId})`)
  assert.equal(payload.adx_portalcommentdirectioncode, 1)
  assert.match(payload.subject, /^\*WEB\*/)
  noWrite(run('northwind-case-activity', 'post', { body: { ...body, author: foreign } }), 'VALIDATION')
  noWrite(run('northwind-case-activity', 'post', { body, caseRow: { ...caseRow, statecode: 1 } }), 'FORBIDDEN')
  noWrite(run('northwind-case-activity', 'post', { body, caseRow: { ...caseRow, customerid_contact: { contactid: foreign } } }), 'NOT_FOUND')
})
test('a customer reply or document returns a Waiting for Details case to In Progress, and only that status', () => {
  const comment = { kind: 'comment', caseId, body: 'Here is the serial number.' }
  const document = { caseId, kind: 'document', name: 'sample.pdf', type: 'application/pdf', content: pdf.toString('base64') }
  for (const body of [comment, document]) {
    const moved = run('northwind-case-activity', 'post', { body, caseRow: { ...caseRow, statuscode: 3 } })
    assert.equal(moved.result.status, 'success')
    assert.equal(moved.result.data.statusChanged, true)
    const writes = moved.calls.filter(call => ['create', 'update'].includes(call.method))
    assert.deepEqual(writes.map(call => call.method), ['create', 'update'])
    assert.deepEqual(writes[1], { method: 'update', entity: 'incidents', id: caseId, body: { statuscode: 1 } })
  }
  for (const statuscode of [1, 2, 4]) {
    const kept = run('northwind-case-activity', 'post', { body: comment, caseRow: { ...caseRow, statuscode } })
    assert.equal(kept.result.data.statusChanged, false)
    assert.equal(kept.calls.some(call => call.method === 'update'), false)
  }
  let reads = 0
  const changedMeanwhile = run('northwind-case-activity', 'post', { body: comment, caseRow: { ...caseRow, statuscode: 3 }, list: (entity) => {
    assert.equal(entity, 'incidents')
    return response({ value: [{ ...caseRow, statuscode: reads++ === 0 ? 3 : 4 }] })
  } })
  assert.equal(changedMeanwhile.result.data.statusChanged, false)
  assert.equal(changedMeanwhile.calls.some(call => call.method === 'update'), false)
  const failed = run('northwind-case-activity', 'post', { body: comment, caseRow: { ...caseRow, statuscode: 3 }, statusUpdateFailure: true })
  assert.equal(failed.result.status, 'success')
  assert.equal(failed.result.data.id, fileId)
  assert.equal(failed.result.data.statusChanged, false)
  assert.ok(failed.logs.includes('northwind-case-activity POST status change failed'))
})
test('file upload accepts exactly 5 MiB of valid bytes and rejects one byte beyond it', () => {
  const bytes = Buffer.alloc(5 * 1024 * 1024)
  bytes.set(pdf)
  const body = { caseId, kind: 'document', name: 'sample.pdf', type: 'application/pdf', content: bytes.toString('base64') }
  const saved = run('northwind-case-activity', 'post', { body })
  assert.equal(saved.result.status, 'success')
  const payload = saved.calls.find(call => call.method === 'create').body
  assert.deepEqual(Buffer.from(payload.documentbody, 'base64'), bytes)
  assert.equal(payload['objectid_incident@odata.bind'], `/incidents(${caseId})`)
  assert.match(payload.notetext, /^\*WEB\*/)
  noWrite(run('northwind-case-activity', 'post', { body: { ...body, content: Buffer.concat([bytes, Buffer.from([0])]).toString('base64') } }), 'VALIDATION')
  const downloaded = run('northwind-case-activity', 'get', { query: { caseId, documentId: fileId }, note: { ...note, filesize: bytes.length, documentbody: body.content } })
  assert.equal(downloaded.result.data.content, body.content)
  assert.equal(run('northwind-case-activity', 'get', { query: { caseId, documentId: fileId }, note: { ...note, filesize: bytes.length + 1, documentbody: body.content } }).result.status, 'error')
})
test('file validation rejects unsafe names, malformed base64 and mismatched signatures/types', () => {
  const body = { caseId, kind: 'document', name: 'sample.pdf', type: 'application/pdf', content: pdf.toString('base64') }
  for (const change of [
    { name: '../sample.pdf' }, { name: 'sample.svg' }, { name: 'sample.pdf ' }, { name: 'x'.repeat(256) + '.pdf' },
    { type: 'image/png' }, { content: '' }, { content: 'AAAA====' }, { content: '%%%%' }, { content: '=AAA' },
    { content: Buffer.from('not a PDF').toString('base64') }, { content: 'JVBERi1=' }, { contactId: foreign },
  ]) noWrite(run('northwind-case-activity', 'post', { body: { ...body, ...change } }), 'VALIDATION')
  for (const [name, type, bytes] of [['sample.png', 'image/png', [137, 80, 78, 71, 13, 10, 26, 10]], ['sample.jpeg', 'image/jpeg', [255, 216, 255, 0]]]) {
    assert.equal(run('northwind-case-activity', 'post', { body: { ...body, name, type, content: Buffer.from(bytes).toString('base64') } }).result.status, 'success')
  }
})
test('downloads reauthorize case, note marker and actual bytes, not just metadata', () => {
  const query = { caseId, documentId: fileId }
  assert.equal(run('northwind-case-activity', 'get', { query }).result.data.content, pdf.toString('base64'))
  for (const change of [{ notetext: 'internal' }, { filesize: pdf.length + 1 }, { documentbody: 'AAAA' }, { annotationid: foreign }, { _objectid_value: foreign }]) {
    assert.equal(run('northwind-case-activity', 'get', { query, note: { ...note, ...change } }).result.status, 'error')
  }
})
test('feedback binds the session author and validates publication again before the write', () => {
  const saved = run('northwind-feedback', 'post', { body: { kind: 'article', articleId, helpful: true } })
  assert.equal(saved.result.status, 'success')
  publicationQueries(saved.calls)
  const write = saved.calls.find(call => call.method === 'create')
  assert.equal(write.entity, 'feedback')
  assert.equal(write.body['CreatedByContact@odata.bind'], `/contacts(${contact})`)
  assert.equal(write.body['KnowledgeArticleId@odata.bind'], `/knowledgearticles(${articleId})`)
  assert.equal(write.body.rating, 1)
  noWrite(run('northwind-feedback', 'post', { body: { kind: 'article', articleId, helpful: false }, article: { ...article, isinternal: true } }), 'NOT_FOUND')
  noWrite(run('northwind-feedback', 'post', { body: { kind: 'article', articleId, helpful: true }, latest: foreign }), 'NOT_FOUND')
  const request = run('northwind-feedback', 'post', { body: { kind: 'contact', message: 'x'.repeat(2000) } })
  assert.equal(request.result.status, 'success')
  assert.equal(request.calls.filter(call => call.method === 'create').length, 1)
  assert.equal(request.calls.at(-1).body['ContactId@odata.bind'], `/contacts(${contact})`)
  noWrite(run('northwind-feedback', 'post', { body: { kind: 'contact', message: 'x'.repeat(2001) } }), 'VALIDATION')
  noWrite(run('northwind-feedback', 'post', { body: { kind: 'contact', message: 'Question', createdbycontact: foreign } }), 'VALIDATION')
})
test('connector failures and missing create IDs never become success confirmations', () => {
  for (const [name, method, body] of [
    ['northwind-profile', 'patch', { firstName: 'Ada', lastName: 'Customer', phone: '' }],
    ['northwind-cases', 'post', { description: 'Help', impact: 'I have a question' }],
    ['northwind-cases', 'patch', { id: caseId, title: 'Help', description: 'Text' }],
    ['northwind-case-activity', 'post', { caseId, kind: 'comment', body: 'Reply' }],
    ['northwind-feedback', 'post', { kind: 'contact', message: 'Help' }],
  ]) assert.equal(run(name, method, { body, writeFailure: true }).result.status, 'error')
  assert.equal(run('northwind-feedback', 'post', { body: { kind: 'contact', message: 'Help' }, headers: {} }).result.status, 'error')
  assert.equal(run('northwind-case-activity', 'post', { body: { caseId, kind: 'comment', body: 'Reply' }, headers: {} }).result.status, 'error')
})
