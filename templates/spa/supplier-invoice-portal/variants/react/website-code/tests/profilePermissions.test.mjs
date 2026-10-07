import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { test } from 'node:test'
import { read, field, values, records, contactGraph, siteRoleIds, canAccess } from './profilePermissionModel.mjs'

const site = new URL('../.powerpages-site/', import.meta.url)
const roles = ['997e7996-e241-4117-9c09-28e90a1fcdbc', 'c8031dd9-b8d4-435a-87df-3b90748d2fc4']
const authenticatedRole = '2ab5e3ba-0309-f111-8406-6045bd04a357'
const mutable = ['firstname', 'lastname', 'emailaddress1', 'telephone1', 'jobtitle']
const canWrite = (graph, actor, row, name, allowed) => canAccess(graph, actor, row, 'write', name, allowed)

test('Contact primitive writes remain Self-only; business association flags are separately scoped', () => {
  const permissions = readdirSync(new URL('table-permissions/', site))
    .map(file => read(`table-permissions/${file}`))
  const contacts = permissions.filter(yaml => field(yaml, 'entitylogicalname') === 'contact')
  assert.equal(contacts.length, 2, 'only the existing business Self grant and the onboarding Self grant are allowed')
  const contact = contacts.find(yaml => field(yaml, 'id') === '8ffb8cc4-2d4e-4b09-ad60-1f9026a88230')
  assert.equal(field(contact, 'scope'), '756150004')
  assert.equal(field(contact, 'write'), 'true')
  assert.deepEqual([...contact.matchAll(/^- ([0-9a-f-]{36})$/gm)].map(match => match[1]).sort(), roles.toSorted())
  for (const privilege of ['create', 'delete', 'appendto']) assert.equal(field(contact, privilege), 'false')
  assert.equal(field(contact, 'append'), 'true', 'business records may reference only the Self Contact')
  const graph = contactGraph()
  const allowed = field(read('site-settings/Webapi-contact-fields.sitesetting.yml'), 'value').split(',')
  const authenticated = contacts.find(yaml => values(yaml, 'adx_entitypermission_webrole').includes(authenticatedRole))
  for (const privilege of ['create', 'delete', 'append', 'appendto']) assert.equal(field(authenticated, privilege), 'false')
  for (const privilege of ['read', 'write']) assert.equal(field(authenticated, privilege), 'true')
  assert.equal(field(authenticated, 'scope'), '756150004')
  assert.deepEqual(values(authenticated, 'adx_entitypermission_webrole'), [authenticatedRole])
  for (const actorRoles of [roles.slice(0, 1), roles.slice(1), roles, [authenticatedRole], [], ['anonymous-only']]) {
    const actor = { roles: actorRoles, contactId: 'self-contact' }
    for (const row of ['self-contact', 'other-contact']) {
      assert.equal(canWrite(graph, actor, row, 'emailaddress1', allowed),
        actorRoles.some(role => [...roles, authenticatedRole].includes(role)) && row === actor.contactId)
    }
  }
  for (const yaml of permissions.filter(yaml => field(yaml, 'entitylogicalname') === 'account')) {
    for (const privilege of ['write', 'create', 'delete', 'appendto']) assert.equal(field(yaml, privilege), 'false')
    assert.equal(field(yaml, 'append'), 'true')
    assert.equal(field(yaml, 'scope'), '756150001', 'Account read remains membership scoped')
    assert.equal(field(yaml, 'contactrelationship'), 'spnvc_account_contact')
  }
})

test('exactly four scoped association grants enable referenced Append without primary AppendTo', () => {
  const expected = [
    ['Account---Supplier-Binding', 'account', '756150001', [roles[0]]],
    ['Account---Reviewer-Assignments', 'account', '756150001', [roles[1]]],
    ['Contact---Read', 'contact', '756150004', roles],
    ['Purchase-Order---Read', 'spnvc_purchaseorder', '756150002', [roles[0]]],
  ]
  for (const [name, table, scope, grants] of expected) {
    const yaml = read(`table-permissions/${name}.tablepermission.yml`)
    assert.equal(field(yaml, 'entitylogicalname'), table)
    assert.equal(field(yaml, 'scope'), scope)
    assert.deepEqual(values(yaml, 'adx_entitypermission_webrole').toSorted(), grants.toSorted())
    assert.equal(field(yaml, 'append'), 'true', `${name} needs scoped referenced-record Append`)
    assert.equal(field(yaml, 'appendto'), 'false', `${name} must not grant primary-record AppendTo`)
    assert.equal(field(yaml, 'read'), 'true')
    assert.equal(field(yaml, 'write'), table === 'contact' ? 'true' : 'false')
    for (const privilege of ['create', 'delete']) assert.equal(field(yaml, privilege), 'false')
  }
  for (const yaml of records('.tablepermission.yml').filter(yaml =>
    ['account', 'contact'].includes(field(yaml, 'entitylogicalname')))) {
    assert.equal(field(yaml, 'appendto'), 'false',
      'no additive exported root grant may restore AppendTo; native $ref denial remains a separate gate')
  }
  const reviewerPo = read('table-permissions/Purchase-Order---Reviewer-Access.tablepermission.yml')
  for (const privilege of ['read', 'write', 'create', 'append', 'appendto']) {
    assert.equal(field(reviewerPo, privilege), 'true')
  }
})

test('no-column Contact exposure contains only five editable fields and three read-only properties', () => {
  const allowed = field(read('site-settings/Webapi-contact-fields.sitesetting.yml'), 'value').split(',')
  assert.deepEqual(allowed.toSorted(), ['contactid', 'fullname', '_parentcustomerid_value', ...mutable].toSorted())
  const viewSettings = records('.sitesetting.yml').filter(yaml =>
    field(yaml, 'name')?.toLowerCase() === 'webapi/contact/usefieldsfromview')
  for (const setting of viewSettings) {
    assert.equal(field(setting, 'value')?.toLowerCase(), 'false',
      'view-derived fields must not expand the no-column Contact exposure')
  }
  assert.equal(records('.columnpermission.yml').length, 0, 'preserve the user removal of column guards')
  assert.equal(records('.columnpermissionprofile.yml').length, 0)
  const graph = contactGraph()
  const protectedFields = [
    'parentcustomerid', '_parentcustomerid_value', 'parentcustomerid@odata.bind',
    'parentcustomerid_account@odata.bind', 'parentcustomerid_contact@odata.bind',
    'contactid', 'fullname', 'ownerid', 'owningbusinessunit', 'statecode', 'statuscode',
    'spnvc_account_contact', 'adx_identity_username', 'adx_identity_passwordhash', 'adx_identity_securitystamp',
    'adx_identity_emailaddress1confirmed', 'adx_identity_logonenabled', 'adx_webrole',
  ]
  for (const actorRoles of [roles.slice(0, 1), roles.slice(1), roles, [authenticatedRole]]) {
    const actor = { roles: [...actorRoles, authenticatedRole], contactId: 'self-contact' }
    assert.equal(canAccess(graph, actor, actor.contactId, 'read', '_parentcustomerid_value', allowed), true,
      'lookup reads need the literal OData property in the API field allowlist')
    for (const name of mutable) assert.equal(canWrite(graph, actor, actor.contactId, name, allowed), true)
    for (const name of protectedFields) {
      assert.equal(canWrite(graph, actor, actor.contactId, name, allowed), false,
        `${name} is not an exposed writable property in the source/primitive model`)
    }
    assert.equal(canWrite(graph, actor, actor.contactId, 'parentcustomerid', [...allowed, 'parentcustomerid']), true,
      'Self access alone is not a field guard; adding a mutable field widens the source exposure')
  }
  const accountFields = field(read('site-settings/Webapi-account-fields.sitesetting.yml'), 'value')
  assert.equal(accountFields, 'accountid,name,accountcategorycode,statecode')
})

test('the automatic Authenticated Users role enables only own Contact profile, never business data', () => {
  const defaultRoles = siteRoleIds([], true)
  assert.deepEqual(defaultRoles, [authenticatedRole])
  const actor = { roles: defaultRoles, contactId: 'onboarding-contact' }
  const graph = contactGraph()
  const allowed = field(read('site-settings/Webapi-contact-fields.sitesetting.yml'), 'value').split(',')
  for (const operation of ['read', 'write']) {
    for (const name of mutable) {
      assert.equal(canAccess(graph, actor, actor.contactId, operation, name, allowed), true)
      assert.equal(canAccess(graph, actor, 'another-contact', operation, name, allowed), false)
    }
  }
  for (const yaml of records('.tablepermission.yml').filter(yaml => field(yaml, 'entitylogicalname') !== 'contact')) {
    assert.equal(values(yaml, 'adx_entitypermission_webrole').includes(authenticatedRole), false,
      'onboarding must not add Account, Invoice, PO, comment or attachment grants')
  }
  const anonymous = { roles: siteRoleIds([], false), contactId: 'anonymous' }
  for (const operation of ['read', 'write']) {
    assert.equal(canAccess(graph, anonymous, actor.contactId, operation, 'emailaddress1', allowed), false)
  }
})
