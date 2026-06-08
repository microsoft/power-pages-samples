import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'

interface RequireAuthProps {
  children: ReactNode
  fallback?: ReactNode
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return null
  if (!isAuthenticated) return <>{fallback}</>
  return <>{children}</>
}
