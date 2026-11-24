import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/theme.css'
import { SupportProvider } from './SupportContext'

// Power Pages injects page copy into the body rather than the document head.
const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"]')
if (favicon) document.head.append(favicon)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SupportProvider><App /></SupportProvider>
    </BrowserRouter>
  </StrictMode>,
)
