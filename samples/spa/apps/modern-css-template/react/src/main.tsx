import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/theme.css'
import { SupportProvider } from './SupportContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SupportProvider><App /></SupportProvider>
    </BrowserRouter>
  </StrictMode>,
)
