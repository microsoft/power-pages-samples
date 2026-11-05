const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { parse } = require('yaml')
const root = path.resolve(__dirname, '..', '.powerpages-site')
const role = 'ba9c8c1a-db48-46e3-b1b9-325702839728'
const anonymousRole = '4ab91fb9-b350-4de5-81ed-8f1f00b09852'
const homeId = '07ade775-23f7-40be-887a-5005ee0caafe'
const genericMarkerId = 'a1f157fa-b5ab-40d6-bde4-c81ab9c51c53'
const genericMarkerName = 'knowledgearticle_SearchResultPage'
function parseRecord(content) {
  const record = parse(content)
  assert.ok(record && typeof record === 'object' && !Array.isArray(record), 'Metadata must be a YAML mapping.')
  const values = Object.fromEntries(Object.entries(record).map(([key, value]) => [
    key, typeof value === 'boolean' || typeof value === 'number' ? String(value) : value,
  ]))
  return { ...values, content }
}
function readRecords(directory) {
  return fs.readdirSync(path.join(root, directory)).filter(name => name.endsWith('.yml'))
    .map(name => parseRecord(fs.readFileSync(path.join(root, directory, name), 'utf8')))
}
function caseInsensitive(value) {
  assert.equal(typeof value, 'string')
  return value.toLowerCase()
}
function assertKnowledgeMarkers(markers) {
  const generic = markers.filter(marker => caseInsensitive(marker.name) === caseInsensitive(genericMarkerName))
  assert.equal(generic.length, 1, 'Exactly one generic Search Summary marker must target SPA Home.')
  assert.equal(caseInsensitive(generic[0].id), genericMarkerId)
  assert.equal(caseInsensitive(generic[0].pageid), homeId)
  for (const marker of markers.filter(marker => caseInsensitive(marker.name) === 'knowledge article')) {
    assert.notEqual(caseInsensitive(marker.pageid), homeId, 'The reserved Knowledge Article marker must not invoke native article handling on SPA Home.')
  }
}
test('nine authenticated table permissions plus one anonymous read-only published-knowledge permission, with no deletes', () => {
  const permissions = readRecords('table-permissions')
  assert.equal(permissions.length, 10)
  const roles = permission => [...permission.content.matchAll(/^\s*-\s*([0-9a-f-]{36})\s*$/gm)].map(match => match[1])
  const anonymous = permissions.filter(permission => roles(permission).includes(anonymousRole))
  assert.equal(anonymous.length, 1)
  const [publicKnowledge] = anonymous
  assert.deepEqual(roles(publicKnowledge), [anonymousRole])
  assert.equal(publicKnowledge.entitylogicalname, 'knowledgearticle')
  assert.equal(publicKnowledge.scope, '756150000')
  assert.equal(publicKnowledge.read, 'true')
  for (const right of ['write', 'create', 'delete', 'append', 'appendto']) assert.equal(publicKnowledge[right], 'false', right)
  const authenticated = permissions.filter(permission => permission !== publicKnowledge)
  for (const permission of authenticated) {
    assert.deepEqual(roles(permission), [role])
    assert.equal(permission.delete, 'false')
  }
  const byTable = Object.fromEntries(authenticated.map(permission => [permission.entitylogicalname, permission]))
  assert.equal(byTable.contact.scope, '756150004')
  assert.equal(byTable.contact.append, 'true')
  assert.equal(byTable.contact.appendto, 'true')
  assert.equal(byTable.contact.create, 'false')
  assert.equal(byTable.account.scope, '756150001')
  assert.equal(byTable.account.contactrelationship, 'contact_customer_accounts')
  assert.equal(byTable.account.write, 'false')
  assert.equal(byTable.incident.scope, '756150001')
  assert.equal(byTable.incident.contactrelationship, 'incident_customer_contacts')
  assert.equal(byTable.incident.append, 'true')
  assert.equal(byTable.incident.appendto, 'true')
  assert.equal(byTable.product.append, 'true')
  assert.equal(byTable.product.appendto, 'true')
  for (const [table, relationship] of [['annotation', 'Incident_Annotation'], ['adx_portalcomment', 'incident_adx_portalcomments']]) {
    assert.equal(byTable[table].scope, '756150003')
    assert.equal(byTable[table].parententitypermission, byTable.incident.id)
    assert.equal(byTable[table].parentrelationship, relationship)
    assert.equal(byTable[table].write, 'false')
  }
  for (const table of ['knowledgearticle', 'product', 'category']) {
    assert.equal(byTable[table].read, 'true')
    assert.equal(byTable[table].write, 'false')
    assert.equal(byTable[table].create, 'false')
  }
  assert.equal(byTable.feedback.read, 'false')
  assert.equal(byTable.feedback.write, 'false')
  assert.equal(byTable.feedback.create, 'true')
})
test('only personal-case and catalog Web APIs are enabled with exact field allowlists', () => {
  const settings = Object.fromEntries(readRecords('site-settings').map(setting => [setting.name, setting.value]))
  assert.deepEqual(Object.entries(settings).filter(([name, value]) => /^Webapi\/.+\/enabled$/.test(name) && value === 'true').map(([name]) => name).sort(), ['Webapi/category/enabled', 'Webapi/incident/enabled', 'Webapi/product/enabled'])
  assert.equal(settings['Webapi/incident/fields'], '_customerid_value,caseorigincode,createdon,customerid_contact,description,incidentid,modifiedon,productid,statecode,statuscode,ticketnumber,title')
  assert.equal(settings['Webapi/product/fields'], 'productid,name,statecode')
  assert.equal(settings['Webapi/category/fields'], 'categoryid,title')
  for (const table of ['contact', 'account', 'adx_portalcomment', 'annotation', 'knowledgearticle', 'feedback', 'email', 'activitypointer', 'incidentresolution', 'lead', 'adx_externalidentity', 'adx_setting', 'knowledgearticleincident']) {
    assert.equal(settings[`Webapi/${table}/enabled`], 'false', table)
  }
  assert.ok(!Object.entries(settings).some(([name, value]) => /^Webapi\/.+\/fields$/.test(name) && value.includes('*')))
  assert.equal(settings['Northwind/KnowledgeLanguageLocaleId'], '56940b3e-300f-4070-a559-5a6a4d11a8a3')
})
test('knowledge search retains the generic marker and prevents native article handling on SPA Home with facets disabled', () => {
  assertKnowledgeMarkers(readRecords('sitemarkers'))
  const facets = readRecords('site-settings').filter(setting => caseInsensitive(setting.name) === 'search/facetedview')
  assert.equal(facets.length, 1)
  assert.equal(caseInsensitive(facets[0].id), 'c48fefef-252b-4c87-9cf4-f44e447bfc96')
  assert.equal(caseInsensitive(facets[0].value), 'false')
})
for (const [label, name, pageid] of [
  ['plain fields', 'Knowledge Article', homeId],
  ['single-quoted name', "'Knowledge Article'", homeId],
  ['single-quoted page ID', 'Knowledge Article', `'${homeId}'`],
  ['double-quoted fields', '"Knowledge Article"', `"${homeId}"`],
  ['inline page comment', 'Knowledge Article', `${homeId} # SPA Home`],
  ['single-quoted fields with comments', "'Knowledge Article' # native handler", `'${homeId}' # SPA Home`],
  ['mixed-case name and uppercase GUID', "'kNoWlEdGe ArTiClE'", `'${homeId.toUpperCase()}' # SPA Home`],
  ['escaped quoted name', '"\\u004bnowledge Article"', homeId],
]) {
  test(`native knowledge marker cannot target SPA Home using ${label}`, () => {
    const generic = parseRecord(`id: ${genericMarkerId}\nname: ${genericMarkerName}\npageid: ${homeId}\n`)
    const reserved = parseRecord(`id: 52215b2d-e447-4920-b9d6-0f6d5b591167\nname: ${name}\npageid: ${pageid}\n`)
    assert.throws(() => assertKnowledgeMarkers([generic, reserved]), /reserved Knowledge Article marker must not invoke native article handling on SPA Home/)
  })
}
test('a reserved knowledge marker may target a dedicated native page with quoted fields and comments', () => {
  const generic = parseRecord(`id: '${genericMarkerId.toUpperCase()}' # generic marker\nname: "${genericMarkerName.toUpperCase()}"\npageid: '${homeId.toUpperCase()}' # SPA Home\n`)
  const reserved = parseRecord("id: 52215b2d-e447-4920-b9d6-0f6d5b591167\nname: 'KNOWLEDGE ARTICLE' # native handler\npageid: 'ABCDEFAB-CDEF-4ABC-8DEF-ABCDEFABCDEF' # dedicated native page\n")
  assert.doesNotThrow(() => assertKnowledgeMarkers([generic, reserved]))
})
test('case variants cannot conceal duplicate generic Search Summary markers', () => {
  const generic = parseRecord(`id: ${genericMarkerId}\nname: ${genericMarkerName}\npageid: ${homeId}\n`)
  const duplicate = parseRecord(`id: '${genericMarkerId.toUpperCase()}'\nname: '${genericMarkerName.toUpperCase()}' # equivalent name\npageid: "${homeId.toUpperCase()}"\n`)
  assert.throws(() => assertKnowledgeMarkers([generic, duplicate]), /Exactly one generic Search Summary marker/)
})
test('case Web API column permissions allow only create/read and never status or customer updates', () => {
  const directory = path.join('column-permission-profiles', 'case-api')
  assert.deepEqual(fs.readdirSync(path.join(root, 'column-permission-profiles')), ['case-api'])
  const [profile] = readRecords(directory)
  assert.equal(profile.tablename, 'incident')
  assert.match(profile.content, /adx_columnpermissionprofile_webrole:/)
  assert.deepEqual([...profile.content.matchAll(/^\s*-\s*([0-9a-f-]{36})\s*$/gm)].map(match => match[1]), [role])
  assert.deepEqual([...profile.content.matchAll(/^- (\d+)\s*$/gm)].map(match => Number(match[1])), [746610001])
  const columns = readRecords(path.join(directory, 'column-permissions'))
  assert.deepEqual(columns.map(column => column.columnname).sort(), ['caseorigincode', 'customerid_contact', 'description', 'productid', 'title'])
  for (const column of columns) {
    assert.equal(column.columnpermissionprofileid, profile.id)
    assert.deepEqual([...column.content.matchAll(/^- (\d+)\s*$/gm)].map(match => Number(match[1])), [746610000, 746610001])
    assert.ok(!column.content.includes('746610002'), 'Raw Web API updates must not bypass active-case Server Logic checks')
  }
})
test('all five handlers have matching metadata; only published knowledge also allows anonymous visitors', () => {
  const names = ['northwind-case-activity', 'northwind-cases', 'northwind-feedback', 'northwind-knowledge', 'northwind-profile']
  assert.deepEqual(fs.readdirSync(path.join(root, 'server-logic')).sort(), names)
  const ids = new Set()
  for (const name of names) {
    const records = readRecords(path.join('server-logic', name))
    assert.equal(records.length, 1)
    const record = records[0]
    assert.equal(record.name, name)
    assert.match(record.id, /^[0-9a-f-]{36}$/)
    assert.ok(!ids.has(record.id))
    ids.add(record.id)
    assert.deepEqual([...record.content.matchAll(/^\s*-\s*([0-9a-f-]{36})\s*$/gm)].map(match => match[1]), name === 'northwind-knowledge' ? [role, anonymousRole] : [role])
    assert.ok(fs.statSync(path.join(root, 'server-logic', name, `${name}.js`)).size > 0)
  }
})
