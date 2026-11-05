import { readFileSync } from 'node:fs'
import { Script } from 'node:vm'

export const ID = {
  me: '00000000-0000-0000-0000-000000000001',
  partner: '00000000-0000-0000-0000-000000000002',
  customer: '00000000-0000-0000-0000-000000000003',
  record: '00000000-0000-0000-0000-000000000004',
  other: '00000000-0000-0000-0000-000000000005',
}
export const keys = {
  accounts: 'accountid',
  contacts: 'contactid',
  opportunities: 'opportunityid',
  opportunityproducts: 'opportunityproductid',
  adx_dealregistrationrequests: 'adx_dealregistrationrequestid',
  adx_portalcomments: 'activityid',
  territories: 'territoryid',
  adx_invitations: 'adx_invitationid',
}
export const endpoints = [
  'contact-directory',
  'partner-dashboard',
  'opportunity-list',
  'opportunity-workspace',
  'customer-account-workspace',
  'partner-team',
  'assistant',
  'global-search',
  'contact-actions',
  'customer-account-create',
  'opportunity-create',
]
const posts = new Set(['assistant', 'contact-actions', 'customer-account-create', 'opportunity-create'])
const scripts = new Map(
  endpoints.map(name => [
    name,
    new Script(
      readFileSync(new URL(`../../.powerpages-site/server-logic/${name}/${name}.js`, import.meta.url), 'utf8') + `\n${posts.has(name) ? 'post' : 'get'}()`,
      { filename: name + '.js' },
    ),
  ]),
)
export const wrap = body => ({ StatusCode: 200, IsSuccessStatusCode: true, ServerError: false, Body: JSON.stringify(body) })
export const opportunityFields = {
  name: 'New opportunity',
  estimatedvalue: 50,
  estimatedclosedate: '2026-11-10',
  'customerid_account@odata.bind': `/accounts(${ID.customer})`,
}
export function row(set, id = ID.record) {
  return {
    [keys[set]]: id,
    name: 'Sample',
    firstname: 'Avery',
    lastname: 'Chen',
    fullname: 'Avery Chen',
    statecode: 0,
    statuscode: 1,
    adx_partnercreated: true,
    estimatedvalue: 10,
    estimatedclosedate: '2026-11-10',
    customerid_account: { accountid: ID.customer, name: 'Customer' },
  }
}

export function runEndpoint(name, options = {}) {
  const calls = []
  const logs = []
  const body =
    options.body === undefined
      ? name === 'assistant'
        ? { message: 'Show my open pipeline' }
        : name === 'contact-actions'
          ? { action: 'create', fields: { lastname: 'Chen' }, parentAccountId: ID.partner }
          : name === 'opportunity-create'
            ? { fields: opportunityFields }
            : { fields: { name: 'New account' } }
      : options.body
  const query =
    options.query ?? (name === 'contact-directory' ? { scope: 'accounts' } : name === 'global-search' ? { q: 'Sample', types: 'opp' } : { id: ID.record })
  function invoke(method, set, id, query, payload, skipCache) {
    const call = { method, set, id, query, payload, skipCache }
    calls.push(call)
    const override = options.respond?.(call, calls)
    if (override !== undefined) return override
    if (method === 'CreateRecord') return { StatusCode: 204, Body: '', Headers: { entityid: ID.record } }
    if (method === 'UpdateRecord') return { StatusCode: 204, Body: '' }
    let value
    if (method === 'RetrieveMultipleRecords') value = { value: options.rows?.[set] ?? [] }
    else if (set === 'contacts')
      value = {
        contactid: id,
        statecode: 0,
        adx_partnercontactrole: options.roleCode ?? 756150000,
        _parentcustomerid_value: ID.partner,
        ...options.contact,
      }
    else if (set === 'accounts') value = { accountid: id, accountclassificationcode: 1, _msa_managingpartnerid_value: ID.partner }
    else value = row(set, id)
    return options.encode ? options.encode(value) : wrap(value)
  }
  const output = scripts.get(name).runInNewContext(
    {
      Server: {
        User: options.user === undefined ? { contactid: ID.me, Roles: options.roles ?? ['Partner Admin'] } : options.user,
        Context: { QueryParameters: query, Body: options.rawBody ?? JSON.stringify(body), ActivityId: 'test-correlation' },
        Logger: Object.fromEntries(['Log', 'Warn', 'Error'].map(level => [level, message => logs.push({ level, message })])),
        Connector: {
          Dataverse: {
            RetrieveRecord: (set, id, query, skipCache) => invoke('RetrieveRecord', set, id, query, undefined, skipCache),
            RetrieveMultipleRecords: (set, query) => invoke('RetrieveMultipleRecords', set, undefined, query),
            CreateRecord: (set, payload) => invoke('CreateRecord', set, undefined, undefined, JSON.parse(payload)),
            UpdateRecord: (set, id, payload) => invoke('UpdateRecord', set, id, undefined, JSON.parse(payload)),
          },
        },
      },
    },
    { timeout: 5000 },
  )
  return { result: JSON.parse(output), calls, logs }
}
