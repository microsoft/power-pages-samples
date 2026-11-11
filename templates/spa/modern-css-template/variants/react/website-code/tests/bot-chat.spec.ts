import { test, expect, type Page } from '@playwright/test'

const base = 'https://111111111111411181111111111111.11.environment.api.powerplatform.com'
const tokenPath = '/powervirtualagents/botsbyschema/test_support_bot/directline/token'
const sdkUrl = '/webchat-4.18.0.js'
const authUrl = 'https://token.botframework.com/test-exchange?expiry=123'
type Action = { type: string; payload?: Record<string, unknown> }

async function mockSdk(page: Page) {
  await page.addInitScript(() => {
    if (!location.pathname.endsWith('/bot-chat.html')) return
    type Store = { dispatch: (action: Action) => unknown }
    type Middleware = (store: Store) => (next: Store['dispatch']) => Store['dispatch']
    const received: Action[] = []
    let dispatch: Store['dispatch'] = () => undefined
    const sdk = {
      createStore(_initial: unknown, middleware: Middleware) {
        dispatch = middleware({ dispatch: action => dispatch(action) })(action => { received.push(action) })
        return { dispatch }
      },
      createDirectLine(options: Record<string, unknown>) {
        Object.assign(window, { botOptions: options })
        return { end: () => { Object.assign(window, { botEnded: true }) } }
      },
      renderWebChat() { dispatch({ type: 'DIRECT_LINE/CONNECT_FULFILLED' }) },
    }
    Object.assign(window, { botReceived: received, dispatchBot: (action: Action) => dispatch(action) })
    const append = Element.prototype.append
    Element.prototype.append = function (...nodes: (Node | string)[]) {
      for (const node of nodes) {
        if (node instanceof HTMLScriptElement && node.src.endsWith('/webchat-4.18.0.js')) {
          Object.assign(window, { botSdkIntegrity: node.integrity, botSdkUrl: node.src, WebChat: sdk })
          queueMicrotask(() => node.dispatchEvent(new Event('load')))
        } else append.call(this, node)
      }
    }
  })
}
async function mockEndpoints(page: Page, tokenStatus = 200) {
  const calls: { url: string; method: string; body: string | null; csrf?: string }[] = []
  await page.route(`${base}/**`, route => {
    const request = route.request(), url = new URL(request.url())
    calls.push({ url: request.url(), method: request.method(), body: request.postData() })
    if (url.pathname.endsWith('/regionalchannelsettings')) return route.fulfill({ json: { channelUrlsById: { directline: 'https://europe.directline.botframework.com/' } } })
    expect(url.pathname).toBe(tokenPath)
    expect(url.searchParams.get('api-version')).toBe('2022-03-01-preview')
    return route.fulfill({ status: tokenStatus, json: tokenStatus === 200 ? { token: 'test-directline-token', conversationId: 'test-conversation' } : { error: 'Unavailable' } })
  })
  await page.route('**/_layout/tokenhtml', route => route.fulfill({ contentType: 'text/html', body: '<input name="__RequestVerificationToken" value="bot-csrf">' }))
  await page.route('**/_services/auth/portalusertoken', route => {
    const request = route.request()
    calls.push({ url: request.url(), method: request.method(), body: request.postData(), csrf: request.headers().__requestverificationtoken })
    return route.fulfill({ contentType: 'application/jwt', body: 'header.payload.signature' })
  })
  await page.route('https://token.botframework.com/**', route => {
    const request = route.request()
    calls.push({ url: request.url(), method: request.method(), body: request.postData() })
    return route.fulfill({ status: 200, body: '' })
  })
  return calls
}

test('bot uses regional token flow, start event, portal authentication and user messages', async ({ page }) => {
  await mockSdk(page)
  const calls = await mockEndpoints(page)
  await page.goto('/bot-chat.html')
  await expect(page.locator('#bot-status')).toBeHidden()
  const read = () => page.evaluate(() => {
    const state = window as Window & {
      botOptions: Record<string, unknown>; botReceived: Action[]; botSdkIntegrity: string; botSdkUrl: string
    }
    return { options: state.botOptions, received: state.botReceived, integrity: state.botSdkIntegrity, url: state.botSdkUrl }
  })
  const state = await read()
  expect(state.options).toEqual({ token: 'test-directline-token', domain: 'https://europe.directline.botframework.com/v3/directline' })
  expect(state.received).toContainEqual({ type: 'WEB_CHAT/SEND_EVENT', payload: { name: 'startConversation', value: { locale: 'en' } } })
  expect(new URL(state.url).pathname).toBe(sdkUrl)
  expect(state.integrity).toBe('sha384-YCF4860lf811lnrrIBL4pfZ+UqiNit+8lXEhSY3R+dSc+C1rg6UnEQR5avdOTbj0')
  await page.evaluate(authUrl => {
    const state = window as Window & { dispatchBot: (action: Action) => unknown }
    const activity = { type: 'message', attachments: [{ contentType: 'application/vnd.microsoft.card.oauth', content: { tokenPostResource: { sasUrl: authUrl } } }] }
    state.dispatchBot({ type: 'DIRECT_LINE/INCOMING_ACTIVITY', payload: { activity } })
    state.dispatchBot({ type: 'DIRECT_LINE/INCOMING_ACTIVITY', payload: { activity } })
    state.dispatchBot({ type: 'DIRECT_LINE/POST_ACTIVITY', payload: { activity: { type: 'event', name: 'startConversation', channelData: { existing: true } } } })
    window.postMessage({ source: 'northwind-assistant', question: 'Help with my case', send: true }, location.origin)
    window.postMessage({ source: 'northwind-assistant', question: 'Review before sending', send: false }, location.origin)
  }, authUrl)
  await expect.poll(() => calls.filter(call => call.url === authUrl).length).toBe(1)
  expect(calls.find(call => call.url.endsWith('/portalusertoken'))).toMatchObject({ method: 'POST', csrf: 'bot-csrf' })
  expect(calls.find(call => call.url === authUrl)).toMatchObject({ method: 'POST', body: '{"token":"header.payload.signature"}' })
  await expect.poll(async () => (await read()).received.some(action => action.type === 'WEB_CHAT/SEND_MESSAGE')).toBe(true)
  expect((await read()).received).toContainEqual({ type: 'WEB_CHAT/SET_SEND_BOX', payload: { text: 'Review before sending' } })
  expect((await read()).received).toContainEqual({
    type: 'DIRECT_LINE/POST_ACTIVITY',
    payload: { activity: { type: 'event', name: 'startConversation', channelData: { existing: true, cci_webchat_client: 'msportals', postBack: true } } },
  })
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 })
})

test('unpublished bot shows a setup error without starting a conversation', async ({ page }) => {
  await mockSdk(page)
  await mockEndpoints(page, 404)
  await page.goto('/bot-chat.html')
  await expect(page.getByRole('alert')).toContainText('publish the support agent')
  expect(await page.evaluate(() => 'botOptions' in window)).toBe(false)
})

test('an untrusted OAuth card cannot receive the portal identity token', async ({ page }) => {
  await mockSdk(page)
  const calls = await mockEndpoints(page)
  await page.goto('/bot-chat.html')
  await expect(page.locator('#bot-status')).toBeHidden()
  await page.evaluate(() => {
    const state = window as Window & { dispatchBot: (action: Action) => unknown }
    state.dispatchBot({ type: 'DIRECT_LINE/INCOMING_ACTIVITY', payload: { activity: {
      attachments: [{ contentType: 'application/vnd.microsoft.card.oauth', content: { tokenPostResource: { sasUrl: 'https://untrusted.invalid/steal' } } }],
    } } })
  })
  await expect(page.getByRole('alert')).toContainText('invalid response')
  expect(calls.some(call => call.url.endsWith('/portalusertoken'))).toBe(false)
  expect(await page.evaluate(() => (window as Window & { botEnded?: boolean }).botEnded)).toBe(true)
})

test('blocked SDK shows an explicit error before requesting any bot token', async ({ page }) => {
  const calls = await mockEndpoints(page)
  await page.route(`**${sdkUrl}`, route => route.abort('blockedbyclient'))
  await page.goto('/bot-chat.html')
  await expect(page.getByRole('alert')).toContainText('could not load from this site')
  expect(calls).toEqual([])
})

test('invalid regional domain and expired connection show explicit errors', async ({ page }) => {
  await mockSdk(page)
  const calls = await mockEndpoints(page)
  await page.route(`${base}/powervirtualagents/regionalchannelsettings?**`, route => route.fulfill({
    json: { channelUrlsById: { directline: 'https://untrusted.invalid/' } },
  }))
  await page.goto('/bot-chat.html')
  await expect(page.getByRole('alert')).toContainText('invalid response')
  expect(calls).toEqual([])
  await page.unroute(`${base}/powervirtualagents/regionalchannelsettings?**`)
  await page.reload()
  await expect(page.locator('#bot-status')).toBeHidden()
  await page.evaluate(() => (window as Window & { dispatchBot: (action: Action) => unknown }).dispatchBot({ type: 'DIRECT_LINE/EXPIRED_TOKEN' }))
  await expect(page.getByRole('alert')).toContainText('connection ended')
})

test('self-hosted SDK connects under a same-origin-only script policy', async ({ page }) => {
  const errors: string[] = []
  const externalScripts: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => {
    if (request.resourceType() === 'script' && new URL(request.url()).origin !== new URL(page.url()).origin) externalScripts.push(request.url())
  })
  await mockEndpoints(page)
  await page.route('**/bot-chat.html', async route => {
    const response = await route.fetch()
    await route.fulfill({ response, headers: { ...response.headers(), 'Content-Security-Policy': "script-src 'self' 'unsafe-eval'" } })
  })
  const activities: Record<string, unknown>[] = []
  await page.route('https://europe.directline.botframework.com/**', route => {
    if (route.request().url().endsWith('/activities') && route.request().method() === 'POST') {
      activities.push(route.request().postDataJSON())
      return route.fulfill({ json: { id: `sent-${activities.length}` } })
    }
    return route.fulfill({ json: {
      conversationId: 'test-conversation', token: 'test-directline-token', expires_in: 3600,
      streamUrl: 'wss://europe.directline.botframework.com/test',
    } })
  })
  await page.routeWebSocket('wss://europe.directline.botframework.com/test', socket => socket.send(JSON.stringify({ activities: [], watermark: '0' })))
  await page.goto('/bot-chat.html')
  await expect(page.locator('#bot-status')).toBeHidden({ timeout: 15000 })
  await page.getByRole('textbox').fill('Help with my support issue')
  await page.getByRole('textbox').press('Enter')
  await expect.poll(() => activities.some(activity => activity.type === 'message' && activity.text === 'Help with my support issue')).toBe(true)
  expect(errors).toEqual([])
  expect(externalScripts).toEqual([])
})
