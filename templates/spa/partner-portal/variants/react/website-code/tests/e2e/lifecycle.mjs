import { assert } from './lib.mjs'
import { opportunity, runSearch } from '../server/search-harness.mjs'
import { ID, runEndpoint } from '../server/endpoint-harness.mjs'

async function openHarness(page, baseUrl, notes) {
  if (!(await (await fetch(baseUrl)).text()).includes('/@vite/client')) {
    notes.push('Hook lifecycle harness requires Vite source modules; run --only lifecycle against the dev server.')
    return false
  }
  await page.route('**/src/main.tsx*', route =>
    route.fulfill({
      contentType: 'application/javascript',
      body: '',
    }),
  )
  await page.goto('/')
  await page.evaluate(async () => {
    const refresh = (await import('/@react-refresh')).default
    refresh.injectIntoGlobalHook(window)
    window.$RefreshReg$ = () => {}
    window.$RefreshSig$ = () => type => type
    window.__vite_plugin_react_preamble_installed__ = true
    window.IS_REACT_ACT_ENVIRONMENT = true
    window.Microsoft = { Dynamic365: { Portal: { User: { userName: 'test', contactId: 'test' } } } }
    const React = (await import('/node_modules/.vite/deps/react.js')).default
    const { createRoot } = (await import('/node_modules/.vite/deps/react-dom_client.js')).default
    window.harness = { React, root: createRoot(document.getElementById('root')) }
  })
  return true
}

export const tests = [
  {
    name: 'Server Logic: real create and workspace responses cross the live service boundary',
    role: 'partner-admin',
    async run({ page, baseUrl, notes }) {
      if (!(await openHarness(page, baseUrl, notes))) return
      let uncertainWrites = 0
      await page.route('**/_layout/tokenhtml', route => route.fulfill({ contentType: 'text/html', body: '<input value="contract-token">' }))
      await page.route('**/_api/serverlogics/**', async route => {
        const request = route.request()
        const url = new URL(request.url())
        const name = url.pathname.split('/').at(-1)
        const body = request.method() === 'POST' ? request.postDataJSON() : undefined
        if (body) assert.equal(request.headers().__requestverificationtoken, 'contract-token')
        const query = Object.fromEntries(url.searchParams)
        const { result } = runEndpoint(name, {
          body,
          query,
          respond(call) {
            if (call.method === 'CreateRecord' && call.payload.name === 'Unconfirmed') {
              uncertainWrites++
              return { StatusCode: 204, Body: '', Headers: {} }
            }
            if (name === 'opportunity-workspace' && query.id === ID.other && call.set === 'opportunityproducts') {
              return { StatusCode: 503, Body: '' }
            }
          },
        })
        await route.fulfill({ json: { Success: true, Data: JSON.stringify(result) } })
      })
      const result = await page.evaluate(async ID => {
        const { createOpportunity, createCustomerAccount, createContact } = await import('/src/services/actions.ts')
        const { loadOpportunityWorkspace } = await import('/src/services/loaders.ts')
        const me = { contactId: ID.me, partnerId: ID.partner }
        const fields = { topic: 'New opportunity', customerId: ID.customer, estCloseDate: '2026-11-10', estRevenue: 50 }
        const ids = [
          await createOpportunity(fields, me),
          await createCustomerAccount({ name: 'New account' }, ID.me),
          await createContact({ lastName: 'Chen' }, ID.partner, ID.me),
        ]
        const workspace = await loadOpportunityWorkspace(ID.record)
        const failures = []
        for (const operation of [() => createOpportunity({ ...fields, topic: 'Unconfirmed' }, me), () => loadOpportunityWorkspace(ID.other)]) {
          try {
            await operation()
            failures.push('unexpected success')
          } catch (error) {
            failures.push(error.message)
          }
        }
        return { ids, found: workspace.found, failures }
      }, ID)
      assert.deepEqual(result.ids, [ID.record, ID.record, ID.record])
      assert.equal(result.found, true)
      assert.match(result.failures[0], /Check the list before trying again/)
      assert.match(result.failures[1], /could not be loaded completely/)
      assert.equal(uncertainWrites, 1)
    },
  },
  {
    name: 'search ranking: live server scores match client ranking before description snippets',
    role: 'partner-admin',
    async run({ page, baseUrl, notes }) {
      if (!(await openHarness(page, baseUrl, notes))) return
      const item = runSearch({ q: 'rollout', types: 'opp' }).result.hits[0].item
      item.fields.Description = opportunity.description
      const queries = ['Dynamics', '365 Sales', 'rollout Sales', 'rollout Woodgrove', 'needle', 'Avery Chen', 'Northwest', 'Accepted', 'missing']
      const expected = await page.evaluate(
        async ({ item, queries }) => {
          const { rankItems } = await import('/src/lib/search.ts')
          return queries.map(q => rankItems([item], q).map(hit => ({ id: hit.item.id, score: hit.score, field: hit.field?.label })))
        },
        { item, queries },
      )
      const actual = queries.map(q => runSearch({ q, types: 'opp' }).result.hits.map(hit => ({ id: hit.item.id, score: hit.score, field: hit.field?.label })))
      assert.deepEqual(actual, expected)
    },
  },
  {
    name: 'live loader: key changes, superseded results, stale reloads and unmount in StrictMode',
    role: 'partner-admin',
    async run({ page, baseUrl, notes }) {
      if (!(await openHarness(page, baseUrl, notes))) return
      const result = await page.evaluate(async () => {
        const { React, root } = window.harness
        const { act, createElement: h, StrictMode, useLayoutEffect } = React
        const { AppContext } = await import('/src/store/AppContext.ts')
        const { useLiveLoad } = await import('/src/services/useLiveLoad.ts')
        const calls = []
        const patches = []
        const commits = []
        let current
        const applyPatch = patch => patches.push(patch)
        function Probe({ loadKey }) {
          current = useLiveLoad(
            loadKey,
            signal =>
              new Promise(resolve => {
                calls.push({ loadKey, signal, resolve })
              }),
          )
          useLayoutEffect(() => {
            commits.push({ loadKey, status: current.status, result: current.result?.name })
          })
          return null
        }
        const render = (loadKey, sessionReady = true) =>
          act(async () => {
            root.render(
              h(
                StrictMode,
                null,
                h(
                  AppContext.Provider,
                  {
                    value: { mode: 'live', sessionReady, applyPatch },
                  },
                  h(Probe, { loadKey }),
                ),
              ),
            )
          })
        const finish = (call, name) => act(async () => call.resolve({ name, patch: { name } }))
        await render('a')
        const strictReplayAborted = calls.length === 2 && calls[0].signal.aborted
        await finish(calls.at(-1), 'a')
        const obsoleteReload = current.reload
        const commitStart = commits.length
        await render('b')
        const cleanHandoff = commits.slice(commitStart).every(c => c.loadKey !== 'b' || (c.status === 'loading' && c.result === undefined))
        const beforeObsolete = calls.length
        await act(async () => obsoleteReload())
        const staleReloadIgnored = calls.length === beforeObsolete
        const oldB = calls.at(-1)
        await act(async () => {
          void current.reload()
        })
        const newB = calls.at(-1)
        const supersededAborted = oldB.signal.aborted
        await finish(newB, 'new-b')
        await finish(oldB, 'stale-b')
        await finish(calls[0], 'strict-stale')
        const lastResult = current.result?.name
        await render(null)
        const noResultWhenDisabled = current.result === undefined
        await render('c', false)
        const beforeNotReady = calls.length
        await act(async () => current.reload())
        const waitsForSession = calls.length === beforeNotReady
        await render('c')
        const pending = calls.at(-1)
        const unmountedReload = current.reload
        await act(async () => root.unmount())
        const beforeUnmountedReload = calls.length
        await act(async () => unmountedReload())
        await finish(pending, 'unmounted')
        return {
          strictReplayAborted,
          cleanHandoff,
          staleReloadIgnored,
          supersededAborted,
          lastResult,
          noResultWhenDisabled,
          waitsForSession,
          unmountAborted: pending.signal.aborted,
          unmountedReloadIgnored: calls.length === beforeUnmountedReload,
          patches: patches.map(p => p.name),
        }
      })
      assert.deepEqual(result, {
        strictReplayAborted: true,
        cleanHandoff: true,
        staleReloadIgnored: true,
        supersededAborted: true,
        lastResult: 'new-b',
        noResultWhenDisabled: true,
        waitsForSession: true,
        unmountAborted: true,
        unmountedReloadIgnored: true,
        patches: ['a', 'new-b'],
      })
    },
  },
  {
    name: 'assistant: one active reply, survives unrelated renders, cancels on clear and unmount',
    role: 'partner-admin',
    async run({ page, baseUrl, notes }) {
      if (!(await openHarness(page, baseUrl, notes))) return
      const result = await page.evaluate(async () => {
        const { React, root } = window.harness
        const { act, createElement: h, StrictMode, useState } = React
        const { useAssistantReply } = await import('/src/hooks/useAssistantReply.ts')
        const { nextTurnId } = await import('/src/lib/assistant.ts')
        const requests = []
        const originalFetch = window.fetch
        window.fetch = async (url, options) => {
          options?.signal?.throwIfAborted()
          if (url === '/_layout/tokenhtml') return { text: async () => '<input value="test-token">' }
          return new Promise((resolve, reject) => {
            const request = { signal: options.signal, resolve }
            requests.push(request)
            options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true })
          })
        }
        let changeTurns
        let current
        function Probe({ revision }) {
          const [turns, setTurns] = useState([{ id: nextTurnId(), role: 'user', text: 'Show my opportunities' }])
          changeTurns = setTurns
          current = turns
          useAssistantReply(turns, setTurns, { db: { revision }, session: { role: 'partner-admin' } })
          return null
        }
        const render = revision => act(async () => root.render(h(StrictMode, null, h(Probe, { revision }))))
        try {
          await render(0)
          const oneReply = requests.filter(r => !r.signal.aborted).length === 1 && current.length === 2
          const initial = requests.at(-1)
          const count = requests.length
          await render(1)
          const preserved = requests.length === count && !initial.signal.aborted
          await act(async () =>
            initial.resolve({
              ok: true,
              status: 200,
              headers: new Headers(),
              text: async () => JSON.stringify({ intent: 'test', blocks: [], citations: [], followUps: [] }),
            }),
          )
          const answered = current.length === 2 && current[1].answer?.intent === 'test'
          await act(async () => changeTurns(t => [...t, { id: nextTurnId(), role: 'user', text: 'Show customers' }]))
          const cleared = requests.at(-1)
          await act(async () => changeTurns(t => [...t, { id: nextTurnId(), role: 'user', text: 'Which deals are due?' }]))
          const concurrent = requests.at(-1)
          const concurrentPreserved = !cleared.signal.aborted && concurrent !== cleared && current.length === 6
          await act(async () => changeTurns([]))
          const clearAborted = cleared.signal.aborted && concurrent.signal.aborted && current.length === 0
          await act(async () => changeTurns([{ id: nextTurnId(), role: 'user', text: 'Show deals' }]))
          const unmounted = requests.at(-1)
          await act(async () => root.unmount())
          return { oneReply, preserved, answered, concurrentPreserved, clearAborted, unmountAborted: unmounted.signal.aborted }
        } finally {
          window.fetch = originalFetch
        }
      })
      assert.deepEqual(result, { oneReply: true, preserved: true, answered: true, concurrentPreserved: true, clearAborted: true, unmountAborted: true })
    },
  },
  {
    name: 'shared account requests release consumers; auth reads and keep-alive abort without false expiry',
    role: 'partner-admin',
    async run({ page, baseUrl, notes }) {
      if (!(await openHarness(page, baseUrl, notes))) return
      const result = await page.evaluate(async () => {
        const { React, root } = window.harness
        const { act, createElement: h } = React
        const { loadCustomerAccountsOnce } = await import('/src/services/customers.ts')
        const { fetchInvitationDetails, fetchExternalLoginDetails } = await import('/src/services/authService.ts')
        const { useSessionKeepAlive } = await import('/src/hooks/useSessionKeepAlive.ts')
        const requests = []
        const originalFetch = window.fetch
        const originalInterval = window.setInterval
        const originalClear = window.clearInterval
        let tick
        let timerCleared = false
        window.setInterval = callback => {
          tick = callback
          return 123
        }
        window.clearInterval = id => {
          if (id === 123) timerCleared = true
        }
        window.fetch = (url, options) =>
          new Promise((resolve, reject) => {
            options?.signal?.throwIfAborted()
            requests.push({ url, signal: options.signal, resolve })
            options.signal?.addEventListener('abort', () => reject(options.signal.reason), { once: true })
          })
        const aborts = []
        const consume = signal =>
          loadCustomerAccountsOnce('partner', signal).catch(e => {
            aborts.push(e.name)
          })
        try {
          const a = new AbortController()
          const b = new AbortController()
          const pa = consume(a.signal)
          const pb = consume(b.signal)
          const shared = requests[0]
          const deduplicated = requests.length === 1
          a.abort()
          await pa
          const survivorKept = !shared.signal.aborted
          b.abort()
          const c = new AbortController()
          const pc = consume(c.signal)
          await pb
          const pd = consume()
          const replacementShared = requests.length === 2
          requests[1].resolve(new Response(JSON.stringify({ status: 'success', accounts: [] })))
          await Promise.all([pc, pd])
          const authAbort = new AbortController()
          const invitation = fetchInvitationDetails('invite', authAbort.signal).catch(e => e.name)
          const external = fetchExternalLoginDetails(authAbort.signal).catch(e => e.name)
          authAbort.abort()
          const authResults = await Promise.all([invitation, external])
          let expired = 0
          const onSessionExpired = () => expired++
          function Probe() {
            useSessionKeepAlive({ intervalMs: 1, onSessionExpired })
            return null
          }
          await act(async () => root.render(h(Probe)))
          const beforePing = requests.length
          const ping = tick()
          await tick()
          const noOverlap = requests.length === beforePing + 1
          const pingRequest = requests.at(-1)
          await act(async () => root.unmount())
          await ping
          return {
            deduplicated,
            survivorKept,
            lastConsumerAborted: shared.signal.aborted,
            replacementShared,
            aborts,
            authResults,
            noOverlap,
            pingAborted: pingRequest.signal.aborted,
            expired,
            timerCleared,
          }
        } finally {
          window.fetch = originalFetch
          window.setInterval = originalInterval
          window.clearInterval = originalClear
        }
      })
      assert.deepEqual(result, {
        deduplicated: true,
        survivorKept: true,
        lastConsumerAborted: true,
        replacementShared: true,
        aborts: ['AbortError', 'AbortError'],
        authResults: ['AbortError', 'AbortError'],
        noOverlap: true,
        pingAborted: true,
        expired: 0,
        timerCleared: true,
      })
    },
  },
]
