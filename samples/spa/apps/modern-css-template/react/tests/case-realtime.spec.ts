import { test as base, expect, type Page } from '@playwright/test'
import type { CaseDto } from '../src/services/supportApi'

const contactId = '11111111-1111-4111-8111-111111111111'
const caseId = '22222222-2222-4222-8222-222222222222'
const secondId = '33333333-3333-4333-8333-333333333333'
const createdId = '44444444-4444-4444-8444-444444444444'
const initialTime = '2026-10-23T10:00:00Z'
const updatedTime = '2026-10-23T11:00:00Z'
const newestTime = '2026-10-23T12:00:00Z'
const original: CaseDto = { id: caseId, number: 'CAS-1001', title: 'Gateway request', description: 'Original request details.', state: 0, status: 1, created: initialTime, updated: initialTime }
type SdkMode = 'ready' | 'absent' | 'off' | 'delayed' | 'throw' | 'reject' | 'legacy'
type TestSdk = {
  tables: string[][]; unsubscribed: number; registrations: number
  announcements: string[]; conflicts: string[]
  ready: () => void; emit: (count?: number, table?: string) => void; stale: () => void
}
declare global { interface Window { caseRealtimeTest: TestSdk } }

const test = base.extend<{ errors: string[] }>({
  errors: [async ({ page }, use) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    // Browser tests are wholly local; fonts and other remote resources are not needed.
    await page.route(/^https?:\/\/(?!127\.0\.0\.1:)/, route => route.abort())
    await use(errors)
    expect(errors).toEqual([])
  }, { auto: true }],
})

async function sdk(page: Page, mode: SdkMode = 'ready') {
  await page.addInitScript(mode => {
    const callbacks: (() => void)[] = [], active = new Map<() => void, string[]>(), old: (() => void)[] = []
    const state: TestSdk = {
      tables: [], unsubscribed: 0, registrations: 0, announcements: [], conflicts: [],
      ready: () => callbacks.forEach(callback => callback()),
      emit: (count = 1, table = 'incident') => { for (let i = 0; i < count; i++) active.forEach((tables, callback) => { if (tables.includes(table)) callback() }) },
      stale: () => old.forEach(callback => callback()),
    }
    window.caseRealtimeTest = state
    if (mode === 'absent') return
    const subscribe = (tables: string[], callback: (payload?: object) => void) => {
      if (mode === 'throw') throw new Error('Test realtime subscription failed.')
      state.tables.push(tables)
      const notify = () => callback({ table: tables[0], ...(tables[0] === 'incident' ? { id: 'UNTRUSTED-EVENT-ID' } : {}), title: 'UNTRUSTED EVENT CONTENT', type: 'resync' })
      active.set(notify, tables); old.push(notify)
      return { unsubscribe: () => { state.unsubscribed++; active.delete(notify) } }
    }
    // Current Client API shape; 'legacy' keeps the earlier $pages.realtime.subscribe shape covered.
    const pages = mode === 'off' ? {} : mode === 'legacy' ? { realtime: { subscribe } } : { data: { subscribeToChanges: subscribe } }
    Object.assign(window, { Microsoft: { PowerPages: {
      onPagesClientApiReady: (callback: (value: typeof pages) => void) => {
        state.registrations++
        if (mode === 'reject') return Promise.reject(new Error('Test readiness failed.'))
        callbacks.push(() => callback(pages))
        if (mode !== 'delayed') callback(pages)
      },
    } } })
  }, mode)
}

function gate() {
  let release!: () => void
  const promise = new Promise<void>(resolve => { release = resolve })
  return { promise, release }
}

async function mockSupport(page: Page, mode: SdkMode = 'ready') {
  await sdk(page, mode)
  const model = {
    contact: contactId, reads: 0, completedReads: 0, activityReads: 0, writes: 0,
    activeActivityReads: 0, maxActivityReads: 0,
    records: [{ ...original }, { ...original, id: secondId, number: 'CAS-1002', title: 'Second page request' }],
    comments: [] as { id: string; body: string; created: string; author: string }[],
    commentsByCase: {} as Record<string, { id: string; body: string; created: string; author: string }[]>,
    failure: 0, activityFailure: 0, foreign: false,
    activityFailures: {} as Record<string, number>,
    activityNotFound: new Set<string>(),
    activityOffline: new Set<string>(),
    readGate: undefined as ReturnType<typeof gate> | undefined,
    writeGate: undefined as ReturnType<typeof gate> | undefined,
    activityGate: undefined as ReturnType<typeof gate> | undefined,
    calls: [] as { path: string; query: string; method: string }[],
  }
  await page.route('**/_layout/tokenhtml', route => route.fulfill({ contentType: 'text/html', body: '<input name="__RequestVerificationToken" value="test-token">' }))
  await page.route('**/_api/**', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method()
    model.calls.push({ path: url.pathname, query: url.search, method })
    expect(request.headers().__requestverificationtoken).toBe('test-token')
    const success = (data: unknown) => route.fulfill({ json: { success: true, data: JSON.stringify({ status: 'success', data }) } })
    const encode = (record: CaseDto) => ({
      incidentid: record.id, ticketnumber: record.number, title: record.title, description: record.description,
      statecode: record.state, statuscode: record.status, createdon: record.created, modifiedon: record.updated,
      _customerid_value: model.foreign ? secondId : model.contact,
    })
    if (url.pathname === '/_api/serverlogics/northwind-profile') return success({
      id: model.contact, firstName: 'Ada', lastName: 'Customer', email: 'ada@example.test', phone: '', address: '', account: null,
    })
    if (url.pathname === '/_api/serverlogics/northwind-knowledge') return success({ items: [], cursor: null })
    if (['/_api/products', '/_api/categories'].includes(url.pathname)) return route.fulfill({ json: { value: [] } })
    if (url.pathname === '/_api/incidents' && method === 'POST') {
      const body = request.postDataJSON()
      model.records.push({ ...original, id: createdId, number: 'CAS-1003', title: body.title, description: body.description, updated: newestTime })
      return route.fulfill({ status: 204, headers: { entityid: createdId } })
    }
    if (url.pathname === `/_api/incidents(${createdId})`) return route.fulfill({ json: encode(model.records.find(item => item.id === createdId)!) })
    if (url.pathname === '/_api/incidents') {
      const second = url.searchParams.has('$skiptoken')
      if (!second) {
        expect(url.searchParams.get('$filter')).toBe(`_customerid_value eq ${model.contact}`)
        model.reads++
      }
      const failure = model.failure
      const value = structuredClone(second ? model.records.slice(1) : model.records.slice(0, 1)).map(encode)
      const held = !second ? model.readGate : undefined
      if (held) { model.readGate = undefined; await held.promise }
      if (failure) return route.fulfill({ status: failure, json: { error: 'Test read failed' } })
      if (second) model.completedReads++
      return route.fulfill({ json: { value, ...(!second ? { '@odata.nextLink': '/_api/incidents?$skiptoken=page-two' } : {}) } })
    }
    if (url.pathname === '/_api/serverlogics/northwind-cases' && method === 'PATCH') {
      model.writes++
      const body = request.postDataJSON()
      const saved = { ...original, title: body.title, description: body.description, updated: newestTime }
      if (model.writeGate) await model.writeGate.promise
      model.records = model.records.map(item => item.id === saved.id ? saved : item)
      return success(saved)
    }
    if (url.pathname === '/_api/serverlogics/northwind-case-activity') {
      expect(method).toBe('GET')
      const id = url.searchParams.get('caseId')!
      expect(model.records.map(item => item.id)).toContain(id)
      model.activityReads++
      model.activeActivityReads++
      model.maxActivityReads = Math.max(model.maxActivityReads, model.activeActivityReads)
      const comments = structuredClone(model.commentsByCase[id] ?? model.comments)
      const held = model.activityGate
      try {
        if (held) { model.activityGate = undefined; await held.promise }
        if (model.activityOffline.has(id)) return await route.abort('internetdisconnected')
        if (model.activityNotFound.has(id)) return await route.fulfill({
          status: 200, json: { success: true, data: JSON.stringify({ status: 'error', code: 'NOT_FOUND', message: 'Case not found.' }) },
        })
        const failure = model.activityFailures[id] ?? model.activityFailure
        if (failure) return await route.fulfill({ status: failure, json: { error: 'Test activity access denied' } })
        return await success({ comments, documents: [] })
      } finally { model.activeActivityReads-- }
    }
    throw new Error(`Unexpected endpoint ${method} ${url.pathname}`)
  })
  return model
}
type Model = Awaited<ReturnType<typeof mockSupport>>

async function start(page: Page, model: Model, path = '/cases') {
  await page.goto(`${path}?data=dataverse`)
  await expect(page.locator('h1')).not.toHaveText('Loading your support workspace')
  await expect.poll(() => model.completedReads).toBe(2)
  await expect(page.locator('#notification-dialog .dialog-body > .muted')).toContainText('In-app updates for your personal cases are enabled')
  await expect.poll(() => model.activeActivityReads).toBe(0)
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()
}
async function invalidate(page: Page, model: Model, count = 1, table = 'incident') {
  const next = model.completedReads + 1
  const nextActivities = model.activityReads + model.records.length
  const response = page.waitForResponse(response => response.url().includes('/_api/incidents?$skiptoken=page-two'))
  await page.evaluate(({ count, table }) => window.caseRealtimeTest.emit(count, table), { count, table })
  await response
  await expect.poll(() => model.completedReads).toBe(next)
  if (table === 'adx_portalcomment') {
    await expect.poll(() => model.activityReads).toBeGreaterThanOrEqual(nextActivities)
    await expect.poll(() => model.activeActivityReads).toBe(0)
  }
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
}
async function bell(page: Page) {
  await page.getByRole('button', { name: /^Notifications,/ }).click()
  return page.getByRole('dialog', { name: 'Notifications', exact: true })
}
async function navigate(page: Page, name: string) {
  if (await page.getByRole('button', { name: 'Open navigation' }).isVisible()) await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.locator('.primary-nav:visible').getByRole('link', { name, exact: true }).click()
}
async function accessibilityNode(page: Page, selector: string) {
  const session = await page.context().newCDPSession(page)
  try {
    const { root } = await session.send('DOM.getDocument')
    const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector })
    const { nodes } = await session.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false })
    return nodes[0]
  } finally { await session.detach() }
}

test('earlier $pages.realtime.subscribe builds still register both case and portal-comment consumers', async ({ page }) => {
  const model = await mockSupport(page, 'legacy')
  await start(page, model)
  expect(await page.evaluate(() => window.caseRealtimeTest.tables)).toEqual([['incident'], ['adx_portalcomment']])
  expect(await page.evaluate(() => window.caseRealtimeTest.registrations)).toBe(1)
})

test('personal-case invalidations paginate, deduplicate and support accessible bell actions in both directions', async ({ page }) => {
  const model = await mockSupport(page)
  await start(page, model)
  expect(await page.evaluate(() => window.caseRealtimeTest.tables)).toEqual([['incident'], ['adx_portalcomment']])
  await invalidate(page, model, 8)
  expect(await page.evaluate(() => window.caseRealtimeTest.registrations)).toBe(1)
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()
  for (const dir of ['ltr', 'rtl']) {
    await page.evaluate(dir => { document.documentElement.dir = dir }, dir)
    const label = dir === 'rtl' ? 'تحديث الطلب ABC-42 עבור הלקוח' : 'Customer update עברית ABC-42 العربية'
    model.records[1] = { ...model.records[1], title: label, updated: updatedTime }
    await invalidate(page, model, 5)
    await expect(page.locator('.case-card').filter({ hasText: label })).toBeVisible()
    await expect(page.locator('.sr-only[aria-live="polite"]')).toContainText('1 personal case update is available in Notifications.')
    const trigger = page.getByRole('button', { name: 'Notifications, 1 unread' })
    await trigger.focus(); await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Notifications', exact: true })
    await expect(dialog.locator('.notification-item')).toHaveCount(1)
    await expect(dialog.locator('h3 bdi')).toHaveText(`CAS-1002: ${label}`)
    await expect(dialog.getByText('New case update', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
    await dialog.getByRole('button', { name: 'Mark all as read' }).focus(); await page.keyboard.press('Enter')
    await expect(dialog.getByRole('heading', { name: 'Notifications', exact: true })).toBeFocused()
    await expect(dialog.getByRole('button', { name: 'Marked read' })).toBeDisabled()
    await invalidate(page, model, 4)
    await expect(dialog.getByRole('button', { name: 'Marked read' })).toBeDisabled()
    await dialog.getByRole('button', { name: 'Dismiss' }).focus(); await page.keyboard.press('Enter')
    await expect(dialog.getByRole('heading', { name: 'Notifications', exact: true })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeFocused()
    await invalidate(page, model)
    await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()
  }
  model.records[0] = { ...original, title: 'Latest personal case', updated: updatedTime }
  await invalidate(page, model)
  const dialog = await bell(page)
  await dialog.getByRole('button', { name: 'Mark read', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: 'Notifications', exact: true })).toBeFocused()
  await dialog.getByRole('link', { name: 'Open case' }).click()
  await expect(page.locator('h1')).toHaveText('Latest personal case')
  await expect(page.locator('#main-content')).toBeFocused()
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()
  await expect(page.getByText('UNTRUSTED EVENT CONTENT')).toHaveCount(0)
  expect(model.calls.some(call => call.path.includes('UNTRUSTED') || call.path.startsWith('/_api/incidents('))).toBe(false)
})

test('fresh notification preferences suppress alerts but never suppress authorized data refresh', async ({ page }) => {
  const model = await mockSupport(page)
  await start(page, model, '/account')
  await page.getByText('Notification preferences (local only)', { exact: true }).click()
  const preference = page.getByRole('checkbox', { name: /^Case status and lifecycle updates/ })
  const held = gate(); model.readGate = held
  model.records[0] = { ...original, title: 'Changed while preferences open', updated: updatedTime }
  const reads = model.reads
  await page.evaluate(() => window.caseRealtimeTest.emit())
  await expect.poll(() => model.reads).toBe(reads + 1)
  await preference.uncheck()
  held.release()
  await expect.poll(() => model.completedReads).toBe(3)
  await navigate(page, 'My cases')
  await expect(page.locator('.case-card').filter({ hasText: 'Changed while preferences open' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()
  await navigate(page, 'Account & support')
  await page.getByText('Notification preferences (local only)', { exact: true }).click()
  await preference.check()
  await expect(page.getByRole('checkbox', { name: /^Replies from support/ })).toBeEnabled()
  await invalidate(page, model)
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()
  model.records[0] = { ...model.records[0], title: 'Later update', updated: newestTime }
  await invalidate(page, model)
  await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible()
  expect(await page.evaluate(() => window.caseRealtimeTest.tables)).toEqual([['incident'], ['adx_portalcomment']])
})

test('case detail refreshes authorized activity without losing tab, focus, edit or reply drafts', async ({ page }) => {
  const model = await mockSupport(page)
  await start(page, model, `/cases/${caseId}`)
  const initialActivityReads = model.activityReads
  await invalidate(page, model, 4)
  expect(model.activityReads).toBe(initialActivityReads)
  model.records[0] = { ...original, status: 2 }
  await invalidate(page, model)
  await expect.poll(() => model.activityReads).toBe(initialActivityReads + 1)
  await page.getByLabel('Reply to support').fill('My unsent reply')
  const oldActivity = gate(); model.activityGate = oldActivity
  model.records[0] = { ...original, title: 'First remote update', updated: updatedTime }
  await invalidate(page, model)
  await expect.poll(() => model.activityReads).toBe(initialActivityReads + 2)
  model.comments = [{ id: createdId, body: 'Authorized support conversation', created: newestTime, author: 'Support' }]
  model.records[0] = { ...model.records[0], title: 'Current remote update', updated: newestTime }
  await page.getByLabel('Reply to support').focus()
  await invalidate(page, model)
  await expect(page.getByText('Authorized support conversation', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Reply to support')).toHaveValue('My unsent reply')
  await expect(page.getByLabel('Reply to support')).toBeFocused()
  oldActivity.release()
  await expect(page.getByText('Authorized support conversation', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Original request' }).click()
  await expect(page.getByLabel('Case title')).toHaveValue('Current remote update')
  await page.getByLabel('Case title').fill('My unsaved case title')
  const conflict = page.locator('#case-edit-conflict')
  await expect(conflict).toHaveAttribute('aria-live', 'polite')
  await expect(conflict).toBeEmpty()
  await page.evaluate(() => {
    const notice = document.getElementById('case-edit-conflict')!
    new MutationObserver(() => window.caseRealtimeTest.conflicts.push(notice.textContent ?? ''))
      .observe(notice, { childList: true, characterData: true, subtree: true })
  })
  model.records[0] = { ...model.records[0], title: 'Changed server title', description: 'Changed server description' }
  await invalidate(page, model)
  await expect(page.getByRole('tab', { name: 'Original request' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByLabel('Case title')).toBeFocused()
  await expect(page.getByLabel('Case title')).toHaveValue('My unsaved case title')
  await expect(page.getByText(/Your draft is preserved/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save case details' })).toHaveAttribute('aria-describedby', 'case-edit-conflict')
  const conflictNode = await accessibilityNode(page, '#case-edit-conflict')
  expect(conflictNode.ignored).toBe(false)
  expect(conflictNode.properties?.find(property => property.name === 'live')?.value.value).toBe('polite')
  await expect.poll(() => page.evaluate(() => window.caseRealtimeTest.conflicts.length)).toBe(1)
  await page.getByLabel('Case title').pressSequentially(' still editing')
  await invalidate(page, model, 4)
  expect(await page.evaluate(() => window.caseRealtimeTest.conflicts.length)).toBe(1)
  await expect(page.getByLabel('Case title')).toBeFocused()
  model.records[0] = { ...model.records[0], state: 1, status: 5 }
  await invalidate(page, model)
  await expect(page.getByRole('button', { name: 'Save case details' })).toBeDisabled()
  await expect(page.getByLabel('Case title')).toHaveValue('My unsaved case title still editing')
  await page.getByRole('tab', { name: 'Timeline' }).click()
  await expect(page.getByLabel('Reply to support')).toHaveValue('My unsent reply')
  await expect(page.getByRole('button', { name: 'Send reply' })).toBeDisabled()
})

test('portal replies notify and refresh the open conversation without a Case DTO change', async ({ page }) => {
  const model = await mockSupport(page)
  model.commentsByCase[caseId] = [{ id: createdId, body: 'Historical support reply', created: initialTime, author: 'Support' }]
  await start(page, model, `/cases/${caseId}`)
  await expect(page.getByText('Historical support reply', { exact: true })).toBeVisible()
  const unchangedCases = structuredClone(model.records)
  await page.getByLabel('Reply to support').fill('Preserve my unsent reply')
  model.commentsByCase[caseId].push({ id: secondId, body: 'New portal support response', created: updatedTime, author: 'Support' })
  await invalidate(page, model, 4, 'adx_portalcomment')
  await expect(page.getByText('New portal support response', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Reply to support')).toHaveValue('Preserve my unsent reply')
  await expect(page.getByLabel('Reply to support')).toBeFocused()
  expect(model.records).toEqual(unchangedCases)
  let dialog = await bell(page)
  await expect(dialog.locator('.notification-item')).toHaveCount(1)
  await expect(dialog.getByText('New support reply', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Mark read', exact: true }).click()
  await page.keyboard.press('Escape')
  await invalidate(page, model, 5, 'adx_portalcomment')
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()
  await page.getByRole('tab', { name: 'Original request' }).click()
  await page.getByLabel('Case title').fill('My unsaved title')
  model.commentsByCase[caseId][1].body = 'Edited portal support response'
  await invalidate(page, model, 1, 'adx_portalcomment')
  await expect(page.getByLabel('Case title')).toBeFocused()
  await expect(page.getByLabel('Case title')).toHaveValue('My unsaved title')
  await expect(page.getByRole('tab', { name: 'Original request' })).toHaveAttribute('aria-selected', 'true')
  dialog = await bell(page)
  await expect(dialog.locator('.notification-item')).toHaveCount(1)
  await dialog.getByRole('link', { name: 'Open case' }).click()
  await expect(page).toHaveURL(new RegExp(`/cases/${caseId}#case-conversation$`))
  await expect(page.getByRole('heading', { name: 'Customer conversation' })).toBeFocused()
  await expect(page.getByText('Edited portal support response', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Reply to support')).toHaveValue('Preserve my unsent reply')
  await page.getByRole('tab', { name: 'Original request' }).click()
  await expect(page.getByLabel('Case title')).toHaveValue('My unsaved title')
  expect(model.records).toEqual(unchangedCases)

  model.records[0] = { ...model.records[0], title: 'Separate case-row update', updated: newestTime }
  await invalidate(page, model)
  dialog = await bell(page)
  await expect(dialog.locator('.notification-item')).toHaveCount(2)
  await dialog.locator('.notification-item').filter({ hasText: 'New case update' }).getByRole('button', { name: 'Dismiss' }).click()
  await page.keyboard.press('Escape')
  model.commentsByCase[caseId][1].body = 'Latest support response'
  await invalidate(page, model, 1, 'adx_portalcomment')
  dialog = await bell(page)
  await expect(dialog.locator('.notification-item')).toHaveCount(1)
  await expect(dialog.getByText('New support reply', { exact: true })).toBeVisible()
  expect(model.calls.some(call => call.path.includes('adx_portalcomments') || call.path.includes('UNTRUSTED'))).toBe(false)
})

test('portal reply preferences and Customer comments update conversation data without support alerts', async ({ page }) => {
  const model = await mockSupport(page)
  await start(page, model, `/cases/${caseId}`)
  model.commentsByCase[caseId] = [{ id: createdId, body: 'A customer reply', created: updatedTime, author: 'Customer' }]
  await invalidate(page, model, 1, 'adx_portalcomment')
  await expect(page.getByText('A customer reply', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()
  await navigate(page, 'Account & support')
  await page.getByText('Notification preferences (local only)', { exact: true }).click()
  await page.getByRole('checkbox', { name: /^Replies from support/ }).uncheck()
  await expect(page.getByRole('checkbox', { name: /^Service and response alerts/ })).toBeDisabled()
  await navigate(page, 'My cases')
  await page.getByRole('link', { name: 'Open Gateway request', exact: true }).click()
  model.commentsByCase[caseId].push({ id: secondId, body: 'Support reply while disabled', created: updatedTime, author: 'Support' })
  await invalidate(page, model, 1, 'adx_portalcomment')
  await expect(page.getByText('Support reply while disabled', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()
  await navigate(page, 'Account & support')
  await page.getByText('Notification preferences (local only)', { exact: true }).click()
  await page.getByRole('checkbox', { name: /^Replies from support/ }).check()
  await invalidate(page, model, 3, 'adx_portalcomment')
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()
  model.commentsByCase[caseId][0].body = 'Edited Customer reply'
  await invalidate(page, model, 1, 'adx_portalcomment')
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()
  model.commentsByCase[caseId][1].body = 'Edited Support reply after enabling'
  await invalidate(page, model, 1, 'adx_portalcomment')
  await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible()
})

test('portal reply scan failures preserve notifications and the last successful reply baseline', async ({ page }) => {
  const model = await mockSupport(page)
  await start(page, model)
  model.commentsByCase[caseId] = [{ id: createdId, body: 'Support update to retain', created: updatedTime, author: 'Support' }]
  await invalidate(page, model, 1, 'adx_portalcomment')
  for (const changed of [false, true]) {
    model.activityFailure = 503
    await page.evaluate(() => window.caseRealtimeTest.emit(1, 'adx_portalcomment'))
    await expect(page.getByRole('alert').filter({ hasText: 'Case updates could not be refreshed' })).toBeVisible()
    await expect(page.getByRole('button', { name: `Notifications, ${changed ? 0 : 1} unread` })).toBeVisible()
    if (changed) model.commentsByCase[caseId][0].body = 'Support edit during the failed scan'
    model.activityFailure = 0
    await page.getByRole('button', { name: 'Retry case updates' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Case updates could not be refreshed' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible()
    const dialog = await bell(page)
    await expect(dialog.locator('.notification-item')).toHaveCount(1)
    await dialog.getByRole('button', { name: changed ? 'Dismiss' : 'Mark read', exact: true }).click()
    await page.keyboard.press('Escape')
  }
  await invalidate(page, model, 4, 'adx_portalcomment')
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()
})

test('portal reply NOT_FOUND after the parent list read quarantines the case until conversation access is revalidated', async ({ page }) => {
  const model = await mockSupport(page)
  await start(page, model, `/cases/${caseId}`)
  model.commentsByCase[caseId] = [{ id: createdId, body: 'Cached private Support conversation', created: updatedTime, author: 'Support' }]
  model.commentsByCase[secondId] = [{ id: createdId, body: 'Still authorized Support conversation', created: updatedTime, author: 'Support' }]
  await invalidate(page, model, 1, 'adx_portalcomment')
  await expect(page.getByText('Cached private Support conversation', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Notifications, 2 unread' })).toBeVisible()
  const reads = model.completedReads, activityReads = model.activityReads
  const denied = gate(); model.activityGate = denied
  await page.evaluate(() => window.caseRealtimeTest.emit(1, 'adx_portalcomment'))
  await expect.poll(() => model.completedReads).toBe(reads + 1)
  await expect.poll(() => model.activityReads).toBeGreaterThan(activityReads)
  // Revoke after the stale parent list included A, while its child ownership check is pending.
  model.activityNotFound.add(caseId)
  denied.release()
  await expect(page.locator('h1')).toHaveText('Case not available')
  await expect(page.getByText('Cached private Support conversation', { exact: true })).toHaveCount(0)
  await expect(page.locator('.case-hero')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible()
  await expect.poll(() => model.completedReads).toBe(reads + 2)
  await expect.poll(() => model.activeActivityReads).toBe(0)
  const dialog = await bell(page)
  await expect(dialog.locator('.notification-item')).toHaveCount(1)
  await expect(dialog.locator('h3')).toHaveText('CAS-1002: Second page request')
  await page.keyboard.press('Escape')
  await navigate(page, 'My cases')
  await expect(page.locator('.case-card')).toHaveCount(1)
  expect(model.records.map(item => item.id)).toContain(caseId)

  const repeated = gate(); model.activityGate = repeated
  await page.getByRole('button', { name: 'Retry case updates' }).click()
  await expect.poll(() => model.completedReads).toBe(reads + 3)
  await expect(page.locator('.case-card')).toHaveCount(1)
  repeated.release()
  await expect.poll(() => model.activeActivityReads).toBe(0)
  await expect(page.locator('.case-card')).toHaveCount(1)
  // Observe more than two debounce intervals: persistent NOT_FOUND must not become polling.
  await page.waitForTimeout(250)
  expect(model.completedReads).toBe(reads + 3)
  await bell(page)
  await dialog.getByRole('button', { name: 'Mark read', exact: true }).click()
  await page.keyboard.press('Escape')
  model.commentsByCase[secondId][0].body = 'Another still-authorized Support edit'
  await invalidate(page, model, 1, 'adx_portalcomment')
  await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible()
  await expect(page.locator('.case-card')).toHaveCount(1)

  model.activityNotFound.delete(caseId)
  const restored = gate(); model.activityGate = restored
  await page.getByRole('button', { name: 'Retry case updates' }).click()
  await expect.poll(() => model.completedReads).toBe(reads + 5)
  await expect(page.locator('.case-card')).toHaveCount(1)
  restored.release()
  await expect(page.locator('.case-card')).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Retry case updates' })).toHaveCount(0)
  model.commentsByCase[caseId][0].body = 'New support edit after access was restored'
  await invalidate(page, model, 1, 'adx_portalcomment')
  await expect(page.getByRole('button', { name: 'Notifications, 2 unread' })).toBeVisible()
})

for (const focusTarget of ['reply', 'header', 'dialog', 'unrelated'] as const) {
  test(`quarantined case focus recovery respects ${focusTarget} focus ownership`, async ({ page }) => {
    const model = await mockSupport(page)
    await start(page, model, `/cases/${caseId}`)
    model.commentsByCase[caseId] = [{ id: createdId, body: 'Private conversation before quarantine', created: updatedTime, author: 'Support' }]
    await invalidate(page, model, 1, 'adx_portalcomment')
    const reply = page.getByLabel('Reply to support')
    await reply.fill('Unsent draft before quarantine')
    if (focusTarget === 'dialog') await bell(page)
    const focus = focusTarget === 'reply' ? reply
      : focusTarget === 'header' ? page.getByRole('button', { name: /^Notifications,/ })
      : focusTarget === 'dialog' ? page.getByRole('button', { name: 'Close notifications' })
      : page.locator('.quick-paths').getByRole('link', { name: /^Browse articles/ })
    await focus.focus()
    const reads = model.completedReads, activityReads = model.activityReads
    const denied = gate(); model.activityGate = denied
    await page.evaluate(() => window.caseRealtimeTest.emit(1, 'adx_portalcomment'))
    await expect.poll(() => model.completedReads).toBe(reads + 1)
    await expect.poll(() => model.activityReads).toBeGreaterThan(activityReads)
    model.activityNotFound.add(caseId)
    denied.release()
    const unavailable = page.locator('h1')
    await expect(unavailable).toHaveText('Case not available')
    await expect.poll(() => model.completedReads).toBe(reads + 2)
    await expect(reply).toHaveCount(0)
    await expect(page.locator('.case-hero, .notification-item')).toHaveCount(0)
    await expect(page.getByText('Private conversation before quarantine', { exact: true })).toHaveCount(0)
    if (focusTarget === 'reply') {
      await expect(unavailable).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(page.getByRole('link', { name: 'Back to my cases', exact: true })).toBeFocused()
    } else {
      await expect(focus).toBeFocused()
      await expect(unavailable).not.toBeFocused()
    }
  })
}

test('portal reply genuine activity 503 and offline failures retain the authorized case, conversation and notification', async ({ page }) => {
  const model = await mockSupport(page)
  await start(page, model, `/cases/${caseId}`)
  model.commentsByCase[caseId] = [{ id: createdId, body: 'Keep this authorized conversation', created: updatedTime, author: 'Support' }]
  await invalidate(page, model, 1, 'adx_portalcomment')
  await expect(page.getByText('Keep this authorized conversation', { exact: true })).toBeVisible()
  for (const failure of ['503', 'offline']) {
    const reads = model.completedReads
    if (failure === '503') model.activityFailures[caseId] = 503
    else model.activityOffline.add(caseId)
    await page.evaluate(() => window.caseRealtimeTest.emit(1, 'adx_portalcomment'))
    await expect(page.getByRole('alert').filter({ hasText: 'Case updates could not be refreshed' })).toBeVisible()
    await expect(page.locator('h1')).toHaveText(original.title)
    await expect(page.getByText('Keep this authorized conversation', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible()
    model.activityFailures[caseId] = 0; model.activityOffline.clear()
    await page.getByRole('button', { name: 'Retry case updates' }).click()
    await expect(page.getByRole('button', { name: 'Retry case updates' })).toHaveCount(0)
    expect(model.completedReads).toBe(reads + 2)
    await expect(page.locator('h1')).toHaveText(original.title)
    await expect(page.getByText('Keep this authorized conversation', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible()
  }
})

test('portal reply scans prune removed cases and clear private baselines on access and identity loss', async ({ page }) => {
  const model = await mockSupport(page)
  await start(page, model)
  model.commentsByCase[caseId] = [{ id: createdId, body: 'First private support reply', created: updatedTime, author: 'Support' }]
  model.commentsByCase[secondId] = [{ id: createdId, body: 'Second private support reply', created: updatedTime, author: 'Support' }]
  await invalidate(page, model, 1, 'adx_portalcomment')
  await expect(page.getByRole('button', { name: 'Notifications, 2 unread' })).toBeVisible()
  model.records = model.records.slice(1)
  const callsBeforePrune = model.calls.length
  await invalidate(page, model, 1, 'adx_portalcomment')
  await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible()
  const activityCalls = model.calls.slice(callsBeforePrune).filter(call => call.path.endsWith('northwind-case-activity'))
  expect(activityCalls.map(call => new URLSearchParams(call.query).get('caseId'))).toEqual([secondId])
  const dialog = await bell(page)
  await expect(dialog.locator('h3')).toHaveText('CAS-1002: Second page request')
  await page.keyboard.press('Escape')
  model.activityFailure = 401
  await page.evaluate(() => window.caseRealtimeTest.emit(1, 'adx_portalcomment'))
  await expect(page.locator('h1')).toHaveText('Sign in to customer support')
  await expect(page.getByRole('button', { name: /^Notifications,/ })).toHaveCount(0)
  expect(await page.evaluate(() => window.caseRealtimeTest.unsubscribed)).toBe(2)
  model.activityFailure = 0; model.contact = createdId
  model.commentsByCase[secondId] = [{ id: createdId, body: 'New identity historical reply', created: newestTime, author: 'Support' }]
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.locator('#notification-dialog .dialog-body > .muted')).toContainText('In-app updates for your personal cases are enabled')
  const reads = model.completedReads
  await page.evaluate(() => window.caseRealtimeTest.stale())
  await expect.poll(() => model.completedReads).toBe(reads + 1)
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()
  await bell(page)
  await expect(dialog.locator('.notification-item')).toHaveCount(0)
})

test('portal reply scans bound concurrency and retain invalidations arriving during an in-flight scan', async ({ page }) => {
  const model = await mockSupport(page)
  model.records = Array.from({ length: 8 }, (_, index) => ({
    ...original, id: `77777777-7777-4777-8777-${String(index).padStart(12, '0')}`, number: `CAS-${index}`, title: `Personal case ${index}`,
  }))
  for (const record of model.records) model.commentsByCase[record.id] = [{ id: createdId, body: 'Historical reply', created: initialTime, author: 'Support' }]
  await start(page, model)
  expect(model.maxActivityReads).toBeLessThanOrEqual(3)
  const first = model.records[0].id, last = model.records[7].id
  const held = gate(); model.activityGate = held
  const before = model.activityReads, reads = model.completedReads
  model.commentsByCase[first][0].body = 'First support edit'
  await page.evaluate(() => window.caseRealtimeTest.emit(1, 'adx_portalcomment'))
  await expect.poll(() => model.activityReads).toBeGreaterThan(before)
  model.commentsByCase[last][0].body = 'Support edit received during the scan'
  await page.evaluate(() => window.caseRealtimeTest.emit(8, 'adx_portalcomment'))
  held.release()
  await expect.poll(() => model.completedReads).toBe(reads + 2)
  await expect.poll(() => model.activityReads).toBe(before + 16)
  await expect.poll(() => model.activeActivityReads).toBe(0)
  await expect(page.getByRole('button', { name: 'Notifications, 2 unread' })).toBeVisible()
  expect(model.maxActivityReads).toBeLessThanOrEqual(3)
  model.records.push({ ...original, id: caseId, title: 'Newly authorized case' })
  model.commentsByCase[caseId] = [{ id: createdId, body: 'Newly authorized historical reply', created: initialTime, author: 'Support' }]
  await invalidate(page, model, 1, 'adx_portalcomment')
  await expect(page.getByRole('button', { name: 'Notifications, 2 unread' })).toBeVisible()
  const dialog = await bell(page)
  await dialog.locator('.notification-item').filter({ hasText: 'Personal case 7' }).getByRole('link', { name: 'Open case' }).click()
  await expect(page.getByText('Support edit received during the scan', { exact: true })).toBeVisible()
})

test('portal reply listeners do not scan conversations in demo mode', async ({ page }) => {
  const model = await mockSupport(page)
  await page.goto('/cases')
  await expect(page.getByText('Demo workspace.', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.caseRealtimeTest.tables)).toEqual([])
  expect(model.calls).toEqual([])
})

test('portal reply scans retry after a local case write without losing the pending Support edit', async ({ page }) => {
  const model = await mockSupport(page)
  model.commentsByCase[caseId] = [{ id: createdId, body: 'Historical support reply', created: initialTime, author: 'Support' }]
  await start(page, model, `/cases/${caseId}`)
  await page.getByRole('tab', { name: 'Original request' }).click()
  await page.getByLabel('Case title').fill('Saved while a reply scan was pending')
  const held = gate(); model.activityGate = held
  const before = model.activityReads
  model.commentsByCase[caseId][0].body = 'First pending Support edit'
  await page.evaluate(() => window.caseRealtimeTest.emit(1, 'adx_portalcomment'))
  await expect.poll(() => model.activityReads).toBeGreaterThan(before)
  model.commentsByCase[caseId][0].body = 'Latest pending Support edit'
  await page.getByRole('button', { name: 'Save case details' }).click()
  await expect(page.locator('h1')).toHaveText('Saved while a reply scan was pending')
  await page.evaluate(() => window.caseRealtimeTest.emit(3, 'adx_portalcomment'))
  held.release()
  await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible()
  const dialog = await bell(page)
  await expect(dialog.locator('.notification-item')).toHaveCount(1)
  await expect(dialog.locator('h3')).toHaveText('CAS-1001: Saved while a reply scan was pending')
  await dialog.getByRole('link', { name: 'Open case' }).click()
  await expect(page.getByText('Latest pending Support edit', { exact: true })).toBeVisible()
  await expect(page.getByText('First pending Support edit', { exact: true })).toHaveCount(0)
  await expect(page.locator('h1')).toHaveText('Saved while a reply scan was pending')
})

test('portal reply scan results arriving after an access failure cannot resurrect private notifications', async ({ page }) => {
  const model = await mockSupport(page)
  await start(page, model)
  const held = gate(); model.activityGate = held
  model.commentsByCase[caseId] = [{ id: createdId, body: 'Do not expose this late response', created: updatedTime, author: 'Support' }]
  model.activityFailure = 403
  await page.evaluate(() => window.caseRealtimeTest.emit(1, 'adx_portalcomment'))
  await expect(page.locator('h1')).toHaveText('Support data is unavailable')
  model.activityFailure = 0
  held.release()
  await expect.poll(() => model.activeActivityReads).toBe(0)
  await expect(page.getByRole('button', { name: /^Notifications,/ })).toHaveCount(0)
  await expect(page.locator('#notification-dialog .notification-item')).toHaveCount(0)
  expect(await page.evaluate(() => window.caseRealtimeTest.unsubscribed)).toBe(2)
})

test('portal reply authorization failures are not hidden by another worker failing transiently', async ({ page }) => {
  const model = await mockSupport(page)
  await start(page, model)
  model.commentsByCase[caseId] = [{ id: createdId, body: 'Private support reply', created: updatedTime, author: 'Support' }]
  await invalidate(page, model, 1, 'adx_portalcomment')
  await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible()
  const held = gate(); model.activityGate = held
  model.activityFailures = { [caseId]: 401, [secondId]: 503 }
  await page.evaluate(() => window.caseRealtimeTest.emit(1, 'adx_portalcomment'))
  await expect(page.getByRole('alert').filter({ hasText: 'Case updates could not be refreshed' })).toBeVisible()
  held.release()
  await expect(page.locator('h1')).toHaveText('Sign in to customer support')
  await expect(page.getByRole('button', { name: /^Notifications,/ })).toHaveCount(0)
  await expect(page.locator('#notification-dialog .notification-item')).toHaveCount(0)
})

test('events during a refresh are retained and stale reads cannot overwrite a newer local save', async ({ page }) => {
  const model = await mockSupport(page)
  await start(page, model, `/cases/${caseId}`)
  await page.getByRole('tab', { name: 'Original request' }).click()
  const stale = gate(); model.readGate = stale
  const before = model.reads
  await page.evaluate(() => window.caseRealtimeTest.emit())
  await expect.poll(() => model.reads).toBe(before + 1)
  await page.getByLabel('Case title').fill('Saved local title')
  await page.getByRole('button', { name: 'Save case details' }).click()
  await expect(page.locator('h1')).toHaveText('Saved local title')
  await page.evaluate(() => window.caseRealtimeTest.emit(5))
  stale.release()
  await expect.poll(() => model.completedReads).toBe(4)
  await expect(page.locator('h1')).toHaveText('Saved local title')
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()
  const overlapping = gate(); model.readGate = overlapping
  await page.evaluate(() => window.caseRealtimeTest.emit())
  await expect.poll(() => model.reads).toBe(before + 3)
  model.records[0] = { ...model.records[0], description: 'Remote update during refresh', updated: '2026-10-23T13:00:00Z' }
  await page.evaluate(() => window.caseRealtimeTest.emit(8))
  overlapping.release()
  await expect(page.locator('.case-hero')).toContainText('Support is working on this case.')
  await expect(page.getByLabel('Case description')).toHaveValue('Remote update during refresh')
  await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible()
  expect(model.writes).toBe(1)
})

test('local creation survives an older in-flight list and does not notify about itself', async ({ page }) => {
  const model = await mockSupport(page)
  await start(page, model, '/')
  const stale = gate(); model.readGate = stale
  const before = model.reads
  await page.evaluate(() => window.caseRealtimeTest.emit())
  await expect.poll(() => model.reads).toBe(before + 1)
  await page.locator('.hero-actions').getByRole('button', { name: 'Report an issue' }).click()
  const dialog = page.getByRole('dialog', { name: 'Report an issue', exact: true })
  await dialog.getByLabel('What do you need help with?').fill('New local case')
  await dialog.getByLabel('How is this affecting you?').selectOption('I have a question')
  await dialog.getByRole('button', { name: 'Check for matches' }).click()
  await dialog.getByRole('button', { name: 'Submit case', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/cases/${createdId}$`))
  stale.release()
  await expect.poll(() => model.completedReads).toBe(4)
  await expect(page.locator('h1')).toHaveText('New local case')
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()
})

test('refresh failures are visible, retry recovers, inaccessible cases and unauthorized data leave the bell', async ({ page }) => {
  const model = await mockSupport(page)
  await start(page, model)
  model.records[0] = { ...original, title: 'Changed case', updated: updatedTime }
  await invalidate(page, model)
  await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible()
  model.records = model.records.slice(1)
  await invalidate(page, model)
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()
  await expect(page.locator('.case-card')).toHaveCount(1)
  model.failure = 503
  await page.evaluate(() => window.caseRealtimeTest.emit())
  await expect(page.getByRole('alert').filter({ hasText: 'Case updates could not be refreshed' })).toBeVisible()
  await expect(page.locator('.case-card')).toHaveCount(1)
  model.failure = 0
  await page.getByRole('button', { name: 'Retry case updates' }).click()
  await expect.poll(() => model.completedReads).toBe(5)
  await expect(page.getByRole('alert').filter({ hasText: 'Case updates could not be refreshed' })).toHaveCount(0)
  model.records[0] = { ...model.records[0], title: 'Another update', updated: newestTime }
  await invalidate(page, model)
  await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible()
  model.failure = 401
  await page.evaluate(() => window.caseRealtimeTest.emit())
  await expect(page.locator('h1')).toHaveText('Sign in to customer support')
  await expect(page.getByRole('button', { name: /^Notifications,/ })).toHaveCount(0)
  await expect(page.locator('#notification-dialog .notification-item')).toHaveCount(0)
  await expect(page.locator('#notification-dialog .dialog-body > .muted')).toContainText('until your support workspace loads')
  expect(await page.evaluate(() => window.caseRealtimeTest.unsubscribed)).toBe(2)
  model.failure = 0; model.contact = createdId
  model.records = [{ ...original, id: secondId, title: 'New identity case' }]
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.locator('.case-card')).toContainText('New identity case')
  await expect.poll(() => model.completedReads).toBe(8)
  const before = model.reads
  await page.evaluate(() => window.caseRealtimeTest.stale())
  await expect.poll(() => model.completedReads).toBe(9)
  expect(model.reads).toBe(before + 1)
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()
  model.foreign = true
  await page.evaluate(() => window.caseRealtimeTest.emit())
  await expect(page.locator('h1')).toHaveText('Support data is unavailable')
  await expect(page.getByRole('button', { name: /^Notifications,/ })).toHaveCount(0)
})

test('transient refresh failures preserve unread, read and dismissed notifications after unchanged retry', async ({ page }) => {
  const model = await mockSupport(page)
  await start(page, model)
  model.records[0] = { ...original, title: 'Keep this case update', updated: updatedTime }
  await invalidate(page, model)
  await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible()
  for (const state of ['unread', 'read', 'dismissed']) {
    const unread = state === 'unread' ? 1 : 0
    const nextRead = model.completedReads + 1
    model.failure = 503
    await page.evaluate(() => window.caseRealtimeTest.emit())
    await expect(page.getByRole('alert').filter({ hasText: 'Case updates could not be refreshed' })).toBeVisible()
    await expect(page.getByRole('button', { name: `Notifications, ${unread} unread` })).toBeVisible()
    model.failure = 0
    await page.getByRole('button', { name: 'Retry case updates' }).click()
    await expect.poll(() => model.completedReads).toBe(nextRead)
    await expect(page.getByRole('alert').filter({ hasText: 'Case updates could not be refreshed' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: `Notifications, ${unread} unread` })).toBeVisible()
    const dialog = await bell(page)
    await expect(dialog.locator('.notification-item')).toHaveCount(state === 'dismissed' ? 0 : 1)
    if (state === 'unread') {
      await expect(dialog.locator('h3')).toHaveText('CAS-1001: Keep this case update')
      await dialog.getByRole('button', { name: 'Mark read', exact: true }).click()
    } else if (state === 'read') {
      await expect(dialog.getByRole('button', { name: 'Marked read' })).toBeDisabled()
      await dialog.getByRole('button', { name: 'Dismiss' }).click()
    }
    await page.keyboard.press('Escape')
  }
})

test('notification async removals and retries recover only the focus they owned', async ({ page }) => {
  const model = await mockSupport(page)
  await start(page, model)
  model.records = model.records.map(item => ({ ...item, updated: updatedTime }))
  await invalidate(page, model)
  const dialog = await bell(page)
  const heading = dialog.getByRole('heading', { name: 'Notifications', exact: true })
  const close = dialog.getByRole('button', { name: 'Close notifications' })
  await dialog.getByRole('button', { name: 'Dismiss' }).first().focus()
  model.records = model.records.slice(1)
  await invalidate(page, model)
  await expect(heading).toBeFocused()
  await close.focus()
  model.records = []
  await invalidate(page, model)
  await expect(close).toBeFocused()
  model.failure = 503
  await page.evaluate(() => window.caseRealtimeTest.emit())
  const retry = dialog.getByRole('button', { name: 'Retry case updates' })
  await expect(retry).toBeVisible()
  await expect(close).toBeFocused()
  model.failure = 0
  const completed = model.completedReads
  await retry.focus(); await page.keyboard.press('Enter')
  await expect(heading).toBeFocused()
  await expect.poll(() => model.completedReads).toBe(completed + 1)
  await expect(heading).toBeFocused()
  await page.keyboard.press('Escape')

  model.failure = 503
  await page.evaluate(() => window.caseRealtimeTest.emit())
  const outsideRetry = page.getByRole('button', { name: 'Retry case updates' })
  await expect(outsideRetry).toBeVisible()
  await outsideRetry.focus()
  model.failure = 0
  await invalidate(page, model)
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeFocused()
  model.failure = 503
  await page.evaluate(() => window.caseRealtimeTest.emit())
  await expect(outsideRetry).toBeVisible()
  model.failure = 0
  await outsideRetry.focus(); await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeFocused()
  await expect(outsideRetry).toHaveCount(0)
})

test('the active notification dialog exposes deduplicated update and error announcements without taking focus', async ({ page }) => {
  const model = await mockSupport(page)
  await start(page, model)
  model.records[0] = { ...original, updated: updatedTime }
  await invalidate(page, model)
  const outside = page.locator('#case-updates-live')
  await expect(outside).toContainText('1 personal case update')
  const outsideNode = await accessibilityNode(page, '#case-updates-live')
  expect(outsideNode.ignored).toBe(false)
  expect(outsideNode.properties?.find(property => property.name === 'live')?.value.value).toBe('polite')
  const dialog = await bell(page)
  const live = dialog.locator('#notification-updates-live')
  const close = dialog.getByRole('button', { name: 'Close notifications' })
  await close.focus()
  await expect(live).toBeEmpty()
  await expect(outside).toHaveAttribute('aria-live', 'off')
  await expect(outside).toBeEmpty()
  await page.evaluate(() => {
    const region = document.getElementById('notification-updates-live')!
    new MutationObserver(() => window.caseRealtimeTest.announcements.push(region.textContent ?? ''))
      .observe(region, { childList: true, characterData: true, subtree: true })
  })
  model.records[1] = { ...model.records[1], updated: updatedTime }
  await invalidate(page, model)
  await expect(live).toContainText('1 personal case update')
  await expect(close).toBeFocused()
  const liveNode = await accessibilityNode(page, '#notification-updates-live')
  expect(liveNode.ignored).toBe(false)
  expect(liveNode.properties?.find(property => property.name === 'live')?.value.value).toBe('polite')
  await expect.poll(() => page.evaluate(() => window.caseRealtimeTest.announcements.length)).toBe(1)
  await invalidate(page, model, 5)
  expect(await page.evaluate(() => window.caseRealtimeTest.announcements.length)).toBe(1)
  model.failure = 503
  await page.evaluate(() => window.caseRealtimeTest.emit())
  await expect(live).toContainText('Case updates could not be refreshed.')
  await expect(close).toBeFocused()
  expect((await accessibilityNode(page, '#notification-updates-live')).ignored).toBe(false)
  model.failure = 0
  await invalidate(page, model)
  await expect(live).toContainText('In-app updates for your personal cases are enabled')
  await expect(close).toBeFocused()
  await page.keyboard.press('Escape')
  await bell(page)
  await expect(live).toBeEmpty()
  await page.keyboard.press('Escape')
  await navigate(page, 'Account & support')
  await page.getByText('Notification preferences (local only)', { exact: true }).click()
  await page.getByRole('checkbox', { name: /^Case status and lifecycle updates/ }).uncheck()
  await bell(page)
  await close.focus()
  model.records[0] = { ...model.records[0], updated: newestTime }
  await invalidate(page, model)
  await expect(live).toBeEmpty()
  await expect(close).toBeFocused()
})

test('notification text and close control reflow at 1440, 390 and 320 pixels in both directions and at 200 percent text', async ({ page }) => {
  const model = await mockSupport(page)
  await start(page, model)
  const dialog = await bell(page)
  const close = dialog.getByRole('button', { name: 'Close notifications' })
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    for (const dir of ['ltr', 'rtl']) {
      await page.evaluate(dir => { document.documentElement.dir = dir }, dir)
      for (const title of ['ABC42'.repeat(40), 'ABC42 الطلب עברית '.repeat(12).slice(0, 200)]) {
        model.records[0] = { ...model.records[0], title, updated: updatedTime }
        await invalidate(page, model)
        await expect(dialog.locator('h3 bdi')).toHaveText(`CAS-1001: ${title}`)
        for (const textSize of ['100%', '200%']) {
          await page.evaluate(size => { document.documentElement.style.fontSize = size }, textSize)
          await close.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab')
          await expect(close).toBeFocused()
          const geometry = await dialog.evaluate(element => {
            const bounds = element.getBoundingClientRect()
            const heading = element.querySelector('h2')!.getBoundingClientRect()
            const close = element.querySelector<HTMLButtonElement>('.dialog-actions button')!
            const button = close.getBoundingClientRect(), style = getComputedStyle(close)
            return {
              clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
              headingFits: heading.left >= bounds.left && heading.right <= bounds.right,
              closeFits: button.left >= bounds.left && button.right <= bounds.right && button.top >= bounds.top && button.bottom <= bounds.bottom,
              focusVisible: close.matches(':focus-visible') && style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0,
            }
          })
          expect(geometry.scrollWidth, `${width}px ${dir} ${textSize}`).toBeLessThanOrEqual(geometry.clientWidth)
          expect(geometry.headingFits).toBe(true)
          expect(geometry.closeFits).toBe(true)
          expect(geometry.focusVisible).toBe(true)
        }
      }
    }
  }
})

test('late readiness callbacks are ignored after auth cleanup and normal loading can retry safely', async ({ page }) => {
  const model = await mockSupport(page, 'delayed')
  await page.goto(`/cases?data=dataverse`)
  await expect(page.locator('.case-card')).toHaveCount(2)
  await expect.poll(() => page.evaluate(() => window.caseRealtimeTest.registrations)).toBe(1)
  model.activityFailure = 401
  await page.getByRole('link', { name: 'Open Gateway request', exact: true }).click()
  await expect(page.locator('h1')).toHaveText('Sign in to customer support')
  await page.evaluate(() => window.caseRealtimeTest.ready())
  expect(await page.evaluate(() => window.caseRealtimeTest.tables)).toEqual([])
  model.activityFailure = 0
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.locator('h1')).toHaveText('Gateway request')
  await page.evaluate(() => { window.caseRealtimeTest.ready(); window.caseRealtimeTest.ready() })
  await expect.poll(() => page.evaluate(() => window.caseRealtimeTest.tables)).toEqual([['incident'], ['adx_portalcomment']])
})

test('auth loss while a save and read are pending cannot resurrect prior private cases', async ({ page }) => {
  const model = await mockSupport(page)
  await start(page, model, `/cases/${caseId}`)
  const staleRead = gate(); model.readGate = staleRead
  const before = model.reads
  await page.evaluate(() => window.caseRealtimeTest.emit())
  await expect.poll(() => model.reads).toBe(before + 1)
  const staleWrite = gate(); model.writeGate = staleWrite
  await page.getByRole('tab', { name: 'Original request' }).click()
  await page.getByLabel('Case title').fill('Do not resurrect this case')
  await page.getByRole('button', { name: 'Save case details' }).click()
  await expect.poll(() => model.writes).toBe(1)
  await navigate(page, 'My cases')
  model.activityFailure = 401
  await page.getByRole('link', { name: 'Open Second page request', exact: true }).click()
  await expect(page.locator('h1')).toHaveText('Sign in to customer support')
  staleWrite.release(); staleRead.release()
  await expect.poll(() => model.completedReads).toBe(3)
  await expect(page.locator('h1')).toHaveText('Sign in to customer support')
  await expect(page.getByRole('button', { name: /^Notifications,/ })).toHaveCount(0)
  await expect(page.locator('#notification-dialog .notification-item')).toHaveCount(0)
  expect(await page.evaluate(() => window.caseRealtimeTest.unsubscribed)).toBe(2)
})

test('a forbidden read still clears private state when a newer local write invalidated its revision', async ({ page }) => {
  const model = await mockSupport(page)
  await start(page, model, `/cases/${caseId}`)
  const deniedRead = gate(); model.readGate = deniedRead; model.failure = 403
  const before = model.reads
  await page.evaluate(() => window.caseRealtimeTest.emit())
  await expect.poll(() => model.reads).toBe(before + 1)
  const pendingWrite = gate(); model.writeGate = pendingWrite
  await page.getByRole('tab', { name: 'Original request' }).click()
  await page.getByLabel('Case title').fill('Pending local edit')
  await page.getByRole('button', { name: 'Save case details' }).click()
  await expect.poll(() => model.writes).toBe(1)
  deniedRead.release()
  await expect(page.locator('h1')).toHaveText('Support data is unavailable')
  const writeResponse = page.waitForResponse(response => response.url().endsWith('/northwind-cases'))
  pendingWrite.release()
  await writeResponse
  await expect(page.locator('h1')).toHaveText('Support data is unavailable')
  await expect(page.getByRole('button', { name: /^Notifications,/ })).toHaveCount(0)
  await expect(page.locator('#notification-dialog .notification-item')).toHaveCount(0)
  expect(await page.evaluate(() => window.caseRealtimeTest.unsubscribed)).toBe(2)
})

for (const mode of ['absent', 'off', 'throw', 'reject'] as const) {
  test(`${mode} realtime remains optional and failures are not reported as success`, async ({ page }) => {
    const model = await mockSupport(page, mode)
    await page.goto('/cases?data=dataverse')
    await expect(page.locator('.case-card')).toHaveCount(2)
    if (mode === 'throw' || mode === 'reject') {
      await expect(page.getByRole('alert').filter({ hasText: 'Case updates could not be refreshed' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Retry case updates' })).toBeVisible()
    }
    const dialog = await bell(page)
    await expect(dialog.getByText(mode === 'throw' || mode === 'reject' ? /Case updates could not be refreshed/ : /updates are unavailable/)).toBeVisible()
    await expect(dialog.locator('.notification-item')).toHaveCount(0)
    expect(model.reads).toBe(1)
    expect(model.activityReads).toBe(0)
  })
}
