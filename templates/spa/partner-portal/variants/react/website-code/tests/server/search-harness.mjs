import { readFileSync } from 'node:fs'
import { Script } from 'node:vm'

const script = new Script(readFileSync(new URL('../../.powerpages-site/server-logic/global-search/global-search.js', import.meta.url), 'utf8') + '\nget()')
export const PARTNER_ID = '00000000-0000-0000-0000-000000000001'
export const CONTACT_ID = '00000000-0000-0000-0000-000000000002'
export const opportunity = {
  opportunityid: '00000000-0000-0000-0000-000000000003',
  name: 'Dynamics 365 Sales rollout',
  statecode: 0,
  statuscode: 100000003,
  estimatedvalue: 25000,
  description: 'x'.repeat(220) + ' needle in the description',
  customerid_account: { accountid: 'customer', name: 'Woodgrove Bank' },
  adx_TerritoryId: { name: 'Pacific Northwest' },
  msa_partneroppid: { firstname: 'Avery', lastname: 'Chen' },
}
export const account = {
  accountid: 'customer',
  name: 'Woodgrove Bank',
  address1_city: 'Seattle',
  address1_stateorprovince: 'Washington',
  primarycontactid: { fullname: 'Morgan Lee' },
}
export const contact = {
  contactid: 'customer-contact',
  fullname: 'Morgan Lee',
  emailaddress1: 'morgan@example.test',
  parentcustomerid_account: { name: 'Woodgrove Bank' },
}

export function runSearch({
  q = 'rollout',
  types,
  top,
  role = 'Partner Admin',
  rows = { opportunities: [opportunity], accounts: [account], contacts: [contact], adx_dealregistrationrequests: [] },
  fail,
  nextLink,
  debug,
  user = { contactid: CONTACT_ID, Roles: [role] },
} = {}) {
  const calls = []
  const logs = []
  const response = body => JSON.stringify({ StatusCode: 200, IsSuccessStatusCode: true, Body: JSON.stringify(body) })
  const result = script.runInNewContext({
    Server: {
      Context: { QueryParameters: { q, types, top, debug } },
      User: user,
      Logger: Object.fromEntries(['Log', 'Warn', 'Error'].map(level => [level, message => logs.push({ level, message })])),
      Connector: {
        Dataverse: {
          RetrieveRecord(set, id, query) {
            calls.push({ set, id, query })
            return response({ contactid: CONTACT_ID, _parentcustomerid_value: PARTNER_ID })
          },
          RetrieveMultipleRecords(set, query) {
            calls.push({ set, query })
            if (set === fail?.set) return JSON.stringify({ StatusCode: fail.status, Body: JSON.stringify({ error: { message: 'Simulated read failure' } }) })
            return response({ value: rows[set] ?? [], ...(set === nextLink ? { '@odata.nextLink': 'https://example.test/continuation' } : {}) })
          },
        },
      },
    },
  })
  return { result: JSON.parse(result), calls, logs }
}
