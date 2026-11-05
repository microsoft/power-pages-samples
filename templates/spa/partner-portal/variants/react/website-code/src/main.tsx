import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { FluentProvider } from '@fluentui/react-components'
import { appRoutes } from './App'
import { contosoTheme } from './theme/fluentTheme'
import './styles/theme.css'

const router = createBrowserRouter(appRoutes)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FluentProvider theme={contosoTheme} style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }}>
      <RouterProvider router={router} />
    </FluentProvider>
  </StrictMode>,
)
