import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { validateAssignments } from '../scripts/validate-assignments.mjs'

const seed = JSON.parse(readFileSync(new URL('../../../../seed-data/data.json', import.meta.url), 'utf8'))
const supplier = '60a29644-9d11-f111-8406-000d3a5bf33c'
const reviewer = 'af95fa50-9d11-f111-8406-000d3a36e41e'
const roles = { suppliers: [supplier], reviewers: [reviewer] }
const clone = () => structuredClone(seed)

test('fresh seed has one Supplier company, its binding membership, and two Reviewer assignments', () => {
  assert.deepEqual(validateAssignments(seed, roles), { errors: [], warnings: [] })
  assert.equal(seed.tables.contacts.records[1]['spnvc_account_contact@odata.bind'].length, 2)
})

test('two Supplier Contacts can share one company and a dual-role Contact can review other companies', () => {
  const data = clone()
  const company = data.tables.contacts.records[0]['parentcustomerid_account@odata.bind']
  data.tables.contacts.records[1]['parentcustomerid_account@odata.bind'] = company
  assert.deepEqual(validateAssignments(data, { suppliers: [supplier, reviewer], reviewers: [reviewer] }).errors, [])
})

test('invalid Company Name, invalid category/state and missing binding membership fail configuration checks', () => {
  for (const modify of [
    data => { delete data.tables.contacts.records[0]['parentcustomerid_account@odata.bind'] },
    data => { data.tables.contacts.records[0]['parentcustomerid_account@odata.bind'] = `/contacts(${supplier})` },
    data => { data.tables.contacts.records[0]['spnvc_account_contact@odata.bind'] = [] },
    data => { data.tables.suppliers.records[1].accountcategorycode = 2 },
    data => { data.tables.suppliers.records[1].statecode = 1 },
    data => { data.tables.contacts.records[0]['spnvc_account_contact@odata.bind'].push('/accounts(952a3168-d926-f111-8341-000d3a58de60)') },
  ]) {
    const data = clone()
    modify(data)
    assert.ok(validateAssignments(data, roles).errors.length > 0)
  }
})

test('revoked Reviewer assignment is not replaced by its Company Name or all Accounts', () => {
  const data = clone()
  data.tables.contacts.records[1]['spnvc_account_contact@odata.bind'] = []
  data.tables.contacts.records[1]['parentcustomerid_account@odata.bind'] = '/accounts(d9250f46-d926-f111-8341-000d3a36e41e)'
  const result = validateAssignments(data, roles)
  assert.deepEqual(result.errors, [])
  assert.match(result.warnings[0], /no assignments/)
})

test('existing active memberships diagnose Standard and unset Category before hidden-grid troubleshooting', () => {
  const data = clone()
  const assigned = data.tables.contacts.records[1]['spnvc_account_contact@odata.bind']
    .map(bind => /^\/accounts\(([^)]+)\)$/.exec(bind)[1])
  const accounts = assigned.map(id => data.tables.suppliers.records.find(account => account.accountid === id))
  accounts[0].accountcategorycode = 2
  accounts[1].accountcategorycode = null
  const roles = { reviewers: [reviewer] }
  const result = validateAssignments(data, roles)
  assert.equal(result.errors.length, 2)
  assert.ok(result.errors.some(error => error.includes(accounts[0].accountid) && error.includes('Standard (2)')))
  assert.ok(result.errors.some(error => error.includes(accounts[1].accountid) && error.includes('not set')))
  for (const error of result.errors) {
    assert.match(error, /Supplier \(132140000\)/)
    assert.match(error, /hidden from the Active supplier accounts view/)
    assert.doesNotMatch(error, /state must be Active/)
  }
  assert.deepEqual(data.tables.contacts.records[1]['spnvc_account_contact@odata.bind'],
    seed.tables.contacts.records[1]['spnvc_account_contact@odata.bind'], 'diagnosis must never alter associations')
  for (const account of accounts) account.accountcategorycode = 132140000
  assert.deepEqual(validateAssignments(data, roles).errors, [])
})

test('Company Name diagnostics distinguish Category from inactive Account state without changing affiliation', () => {
  const data = clone()
  const company = data.tables.contacts.records[0]['parentcustomerid_account@odata.bind']
  const id = /^\/accounts\(([^)]+)\)$/.exec(company)[1]
  const account = data.tables.suppliers.records.find(account => account.accountid === id)
  account.accountcategorycode = 2
  let errors = validateAssignments(data, { suppliers: [supplier] }).errors
  assert.ok(errors.some(error => error.includes('Company Name') && error.includes('Category is Standard (2)')))
  assert.ok(errors.every(error => !error.includes('state must be Active')))
  account.accountcategorycode = 132140000
  account.statecode = 1
  errors = validateAssignments(data, { suppliers: [supplier] }).errors
  assert.ok(errors.some(error => error.includes('Company Name') && error.includes('state must be Active (0); actual state is 1')))
  assert.ok(errors.every(error => !error.includes('Category is')))
  assert.equal(data.tables.contacts.records[0]['parentcustomerid_account@odata.bind'], company)
})
