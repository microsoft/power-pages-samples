import { authenticateBot, botEnvironmentBase, connectBot } from './services/botApi'
import './styles/bot-chat.css'

type Action = { type: string; payload?: Record<string, unknown> }
type Store = { dispatch: (action: Action) => unknown }
type Middleware = (store: Store) => (next: Store['dispatch']) => Store['dispatch']
type DirectLine = { end: () => void }
type WebChat = {
  createStore: (initial: Record<string, unknown>, middleware: Middleware) => Store
  createDirectLine: (options: Pick<Awaited<ReturnType<typeof connectBot>>, 'token' | 'domain'>) => DirectLine
  renderWebChat: (options: { directLine: DirectLine; store: Store; locale: string; styleOptions: Record<string, string | number | boolean> }, container: HTMLElement) => void
}

const sdkUrl = '/webchat-4.18.0.js'
const sdkIntegrity = 'sha384-YCF4860lf811lnrrIBL4pfZ+UqiNit+8lXEhSY3R+dSc+C1rg6UnEQR5avdOTbj0'
const status = document.getElementById('bot-status')!
const container = document.getElementById('webchat')!
const controller = new AbortController()
let directLine: DirectLine | undefined
let store: Store | undefined
let connected = false
const authentication = new Map<string, Promise<void>>()

function notify(type: 'ready' | 'error') {
  window.parent.postMessage({ source: 'northwind-bot', type }, window.location.origin)
}
function failed(error: unknown) {
  if (controller.signal.aborted) return
  status.textContent = error instanceof Error ? error.message : 'The assistant could not connect. Contact support.'
  status.setAttribute('role', 'alert')
  status.tabIndex = 0
  status.hidden = false
  connected = false
  directLine?.end()
  notify('error')
}
function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}
const middleware: Middleware = ({ dispatch }) => next => action => {
  if (action.type === 'DIRECT_LINE/CONNECT_FULFILLED' && !connected) {
    connected = true
    dispatch({ type: 'WEB_CHAT/SEND_EVENT', payload: { name: 'startConversation', value: { locale: document.documentElement.lang } } })
    status.hidden = true
    notify('ready')
  } else if (action.type === 'DIRECT_LINE/INCOMING_ACTIVITY') {
    const activity = object(action.payload?.activity)
    const attachments = activity?.attachments
    if (Array.isArray(attachments)) {
      const card = attachments.map(object).find(item => item?.contentType === 'application/vnd.microsoft.card.oauth')
      if (card) {
        const sasUrl = object(object(card.content)?.tokenPostResource)?.sasUrl
        if (typeof sasUrl !== 'string') { failed(new Error('The assistant authentication request is invalid. Contact support.')); return }
        let exchange = authentication.get(sasUrl)
        if (!exchange) {
          exchange = authenticateBot(sasUrl, controller.signal)
          authentication.set(sasUrl, exchange)
        }
        void exchange.then(() => {
          if (controller.signal.aborted) return
          const remaining = attachments.filter(item => object(item)?.contentType !== 'application/vnd.microsoft.card.oauth')
          if (remaining.length || activity?.text) next({ ...action, payload: { ...action.payload, activity: { ...activity, attachments: remaining } } })
        }).catch(failed)
        return
      }
    }
  } else if (action.type === 'DIRECT_LINE/POST_ACTIVITY') {
    const activity = object(action.payload?.activity)
    if (activity) action = { ...action, payload: { ...action.payload, activity: { ...activity, channelData: {
      ...object(activity.channelData), cci_webchat_client: 'msportals',
      ...(activity.type === 'event' && activity.name === 'startConversation' ? { postBack: true } : {}),
    } } } }
  } else if (['DIRECT_LINE/CONNECT_REJECTED', 'DIRECT_LINE/EXPIRED_TOKEN'].includes(action.type)) {
    failed(new Error('The assistant connection ended. Start a new conversation or contact support.'))
  }
  return next(action)
}
function loadSdk(): Promise<WebChat> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = sdkUrl
    script.integrity = sdkIntegrity
    script.onload = () => {
      const sdk = (window as Window & { WebChat?: WebChat }).WebChat
      if (sdk && typeof sdk.createStore === 'function' && typeof sdk.createDirectLine === 'function' && typeof sdk.renderWebChat === 'function') resolve(sdk)
      else reject(new Error('The assistant client could not load. Contact the site administrator.'))
    }
    script.onerror = () => reject(new Error('The assistant client could not load from this site. Contact the site administrator.'))
    document.head.append(script)
  })
}
window.addEventListener('message', event => {
  if (event.origin !== window.location.origin || event.source !== window.parent || !connected || !store) return
  const data = object(event.data)
  if (data?.source !== 'northwind-assistant' || typeof data.question !== 'string' || !data.question.trim()) return
  if (data.send === true) store.dispatch({ type: 'WEB_CHAT/SEND_MESSAGE', payload: { text: data.question.trim() } })
  else store.dispatch({ type: 'WEB_CHAT/SET_SEND_BOX', payload: { text: data.question } })
})
window.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    event.preventDefault()
    window.parent.postMessage({ source: 'northwind-bot', type: 'minimize' }, window.location.origin)
  }
})
window.addEventListener('pagehide', () => { controller.abort(); directLine?.end(); authentication.clear() })
async function start() {
  botEnvironmentBase()
  // The SDK owns a separate React runtime; removing this iframe also tears down every SDK timer.
  const sdk = await loadSdk()
  const connection = await connectBot(controller.signal)
  if (controller.signal.aborted) return
  store = sdk.createStore({}, middleware)
  // Direct Line refreshes its token against this regional domain automatically.
  directLine = sdk.createDirectLine({ token: connection.token, domain: connection.domain })
  sdk.renderWebChat({
    directLine, store, locale: document.documentElement.lang,
    styleOptions: {
      accent: '#4030a8', backgroundColor: '#ffffff', bubbleBackground: '#f1f0ff',
      bubbleFromUserBackground: '#4030a8', bubbleFromUserTextColor: '#ffffff', bubbleTextColor: '#181936',
      primaryFont: 'Inter, sans-serif', hideUploadButton: true,
      sendBoxButtonColor: '#4030a8', sendBoxPlaceholder: 'Ask about your support needs...',
    },
  }, container)
}
void start().catch(failed)
