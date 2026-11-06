import { useEffect } from 'react'
export function usePageTitle(page: string) {
  useEffect(() => { document.title = page ? `${page} - Northwind Customer Support` : 'Northwind Customer Support' }, [page])
}
