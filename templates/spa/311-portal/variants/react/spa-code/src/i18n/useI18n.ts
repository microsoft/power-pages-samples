import { useContext } from 'react'
import { I18nContext } from './I18nContext'

export function useI18n() {
  return useContext(I18nContext)
}
