import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

const script = readFileSync(new URL('../.powerpages-site/server-logic/dashboard-aggregates/dashboard-aggregates.js', import.meta.url), 'utf8')

test('dashboard counts and amounts use scoped FetchXML aggregation through the connector', () => {
  const queries = []
  const context = vm.createContext({
    Server: {
      Logger: { Log() {}, Error() {} },
      Context: { QueryParameters: { stat: 'invoice-status-counts' } },
      Connector: { Dataverse: { RetrieveMultipleRecords(entitySet, query) {
        const xml = new URLSearchParams(query).get('fetchXml')
        assert.ok(xml.includes('<fetch aggregate="true">'))
        queries.push({ entitySet, xml })
        const value = xml.includes('alias="statusValue"')
          ? [{ statusValue: 2, recordcount: 3 }]
          : [xml.includes('aggregate="sum"') ? { total: 60 } : { avg: 20 }]
        return JSON.stringify({ IsSuccessStatusCode: true, StatusCode: 200, Body: JSON.stringify({ value }) })
      } } },
    },
  })
  vm.runInContext(script, context)
  assert.deepEqual(JSON.parse(context.get()).counts, [{ statusValue: 2, count: 3 }])
  context.Server.Context.QueryParameters.stat = 'po-status-counts'
  assert.deepEqual(JSON.parse(context.get()).counts, [{ statusValue: 2, count: 3 }])
  context.Server.Context.QueryParameters.stat = 'invoice-amount-stats'
  assert.deepEqual(JSON.parse(context.get()).stats, { total: 60, avg: 20 })
  assert.equal(queries[1].entitySet, 'spnvc_purchaseorders')
  assert.ok(queries.every(query => !query.xml.includes('contactid')),
    'table permissions, not a caller-supplied contact, provide authorization')
})
