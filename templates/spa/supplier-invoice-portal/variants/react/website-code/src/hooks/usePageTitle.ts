import { useEffect } from 'react'

const BASE_TITLE = 'Supplier Invoice Portal'

export default function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE_TITLE}` : BASE_TITLE
    return () => {
      document.title = BASE_TITLE
    }
  }, [title])
}
