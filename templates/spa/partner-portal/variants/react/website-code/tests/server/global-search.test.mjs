import assert from 'node:assert/strict'
import test from 'node:test'
import { account, contact, opportunity, PARTNER_ID, runSearch } from './search-harness.mjs'

test('literal, reordered and cross-field terms match full fields before snippets are shortened', () => {
  for (const [q, score] of [
    ['Dynamics 365 Sales rollout', 120],
    ['rollout sales', 80],
    ['rollout Woodgrove', 20],
    ['needle', 50],
    ['Avery Chen', 50],
    ['Northwest', 50],
    ['Accepted', 50],
  ]) {
    const { result } = runSearch({ q, types: 'opp' })
    assert.equal(result.status, 'success', q)
    assert.equal(result.hits.length, 1, q)
    assert.equal(result.hits[0].score, score, q)
    assert.deepEqual(
      result.items,
      result.hits.map(hit => hit.item),
      'old clients can still read items',
    )
    if (q === 'needle') {
      assert.match(result.hits[0].field.value, /needle/)
      assert.ok(result.hits[0].item.fields.Description.length <= 200)
    }
  }
})

test('related account/contact names, state and role labels are searchable independently of selected types', () => {
  const fixtures = [
    ['Woodgrove', 'contact', { contacts: [contact] }],
    ['Washington', 'account', { accounts: [account] }],
    ['Morgan Lee', 'account', { accounts: [account] }],
    ['Partner Seller', 'partner', { contacts: [{ ...contact, adx_partnercontactrole: 756150002 }] }],
  ]
  for (const [q, types, rows] of fixtures) {
    const { result } = runSearch({ q, types, rows })
    assert.equal(result.hits.length, 1, `${types}: ${q}`)
    assert.equal(result.hits[0].item.type, types)
  }
})

test('registration failure is explicit partial success; authentication and core read failures remain fatal even in debug', () => {
  const { result, logs } = runSearch({ types: 'opp', fail: { set: 'adx_dealregistrationrequests', status: 403 } })
  assert.equal(result.status, 'partial')
  assert.equal(result.hits[0].item.id, opportunity.opportunityid)
  assert.match(result.message, /Registration details are unavailable/)
  assert.ok(logs.some(log => log.level === 'Error'))
  for (const fail of [
    { set: 'opportunities', status: 403 },
    { set: 'adx_dealregistrationrequests', status: 401 },
  ]) {
    const failed = runSearch({ types: 'opp', fail, debug: '1' }).result
    assert.equal(failed.status, 'error')
    assert.equal(failed.hits, undefined)
    assert.equal(failed.debug.httpStatus, fail.status)
  }
  assert.equal(runSearch({ user: null }).result.status, 'error')
})

test('latest registration contributes search fields without truncating to the result count', () => {
  const regs = Array.from({ length: 25 }, (_, i) => ({
    _adx_opportunityid_value: i === 24 ? opportunity.opportunityid : `other-${i}`,
    statuscode: 100000010,
  }))
  regs.push({ _adx_opportunityid_value: opportunity.opportunityid, statuscode: 100000002 })
  const { result } = runSearch({ q: 'Expiring', types: 'opp', top: '1', rows: { opportunities: [opportunity], adx_dealregistrationrequests: regs } })
  assert.equal(result.status, 'success')
  assert.equal(result.hits[0].item.registrationStatus, 'Expiring')
})

test('candidate overflow, continuation and output limits never masquerade as exhaustive results', () => {
  const rows = { accounts: Array.from({ length: 501 }, (_, i) => ({ accountid: String(i), name: `Account ${i}` })) }
  const capped = runSearch({ q: 'Account 500', types: 'account', rows }).result
  assert.equal(capped.status, 'partial')
  assert.deepEqual(capped.hits, [])
  assert.match(capped.message, /500 accessible records/)
  const continued = runSearch({ q: 'Woodgrove', types: 'account', nextLink: 'accounts' }).result
  assert.equal(continued.status, 'partial')
  assert.equal(continued.hits.length, 1)
  const ranked = runSearch({
    q: 'Bank',
    types: 'account',
    top: '1',
    rows: {
      accounts: [
        { ...account, name: 'A Bank' },
        { ...account, accountid: 'best', name: 'Bank' },
      ],
    },
  }).result
  assert.equal(ranked.status, 'partial')
  assert.equal(ranked.hits[0].item.id, 'best')
  assert.match(ranked.message, /top 1 matches/)
})

test('existing partner filters and Admin-only contact reads are preserved for every role', () => {
  for (const role of ['Partner Admin', 'Partner Manager', 'Partner Seller']) {
    const { calls } = runSearch({ role })
    const queries = calls.filter(call => !call.id).map(call => ({ ...call, decoded: decodeURIComponent(call.query) }))
    const partnerReads = queries.filter(call => call.set === 'contacts' && !call.decoded.includes('_msa_managingpartnerid_value'))
    assert.equal(partnerReads.length, role === 'Partner Admin' ? 1 : 0)
    assert.ok(
      queries.some(
        call => call.set === 'accounts' && call.decoded.includes(`_msa_managingpartnerid_value eq ${PARTNER_ID} and accountclassificationcode eq 1`),
      ),
    )
    assert.ok(queries.some(call => call.set === 'contacts' && call.decoded.includes('adx_partnercontactrole eq null')))
    assert.ok(queries.some(call => call.set === 'opportunities' && call.decoded.includes('adx_partnercollaboration ne true')))
    assert.ok(queries.every(call => call.query.includes('$top=501')))
  }
})
