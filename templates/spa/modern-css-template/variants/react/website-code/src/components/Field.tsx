import { useSyncExternalStore, type HTMLInputTypeAttribute } from 'react'

function subscribeDirection(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] })
  return () => observer.disconnect()
}
export function useUiDirection() {
  return useSyncExternalStore(subscribeDirection, () => document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr')
}
type FieldProps = {
  id: string; label: string; value: string; onChange: (value: string) => void
  type?: HTMLInputTypeAttribute; multiline?: boolean; required?: boolean; hint?: string; placeholder?: string
  maxLength?: number; autoComplete?: string; hideLabel?: boolean
}
export default function Field({ id, label, value, onChange, type = 'text', multiline, required, hint, placeholder, maxLength = 4000, autoComplete, hideLabel }: FieldProps) {
  const uiDirection = useUiDirection()
  const dir = value.length ? 'auto' : uiDirection
  const shared = { id, name: id, value, required, placeholder, maxLength, 'aria-describedby': hint ? `${id}-hint` : undefined }
  return <div className="field" data-bidi-id={id}>
    <label htmlFor={id} className={hideLabel ? 'sr-only' : undefined}>{label}</label>
    {multiline
      ? <textarea {...shared} {...{ dirname: `${id}.dir` }} dir={dir} onChange={event => onChange(event.target.value)} rows={4} />
      : type === 'email' || type === 'tel' || type === 'datetime-local'
        ? (
          /* bidi-fixed: Email, telephone and ISO date-time controls preserve machine value order; verify=ltr,rtl */
          <input {...shared} type={type} dir="ltr" autoComplete={autoComplete} onChange={event => onChange(event.target.value)} />
        )
        : <input {...shared} {...{ dirname: `${id}.dir` }} type={type} dir={dir} autoComplete={autoComplete} onChange={event => onChange(event.target.value)} />}
    {hint && <small id={`${id}-hint`}>{hint}</small>}
  </div>
}
