import {
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import {
  Button as FluentButton,
  Checkbox as FluentCheckbox,
  Field,
  Input,
  Link,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Select as FluentSelect,
  Textarea,
  makeStyles,
  mergeClasses,
  tokens,
  type InputProps,
  type SelectProps,
  type TextareaProps,
} from '@fluentui/react-components'
import { Add20Regular, Edit20Regular } from '@fluentui/react-icons'
import type { Address } from '../data/types'
import { FormPanel } from './FormPanel'

const useStyles = makeStyles({
  full: { width: '100%', minWidth: 0, maxWidth: '100%' },
  mono: { fontFamily: tokens.fontFamilyMonospace },
  small: { fontSize: tokens.fontSizeBase200 },
  fieldRoot: {
    alignSelf: 'start',
    minWidth: 0,
    // Keep instructions between the label and control rather than below the input.
    '& > .fui-Field__label': { order: -2 },
    '& > .fui-Field__hint': { order: -1 },
  },
  label: { fontWeight: tokens.fontWeightSemibold },
  hint: { marginTop: 0, marginBottom: tokens.spacingVerticalXS, color: tokens.colorNeutralForeground2 },
  invertedLabel: { color: tokens.colorNeutralForegroundOnBrand },
  optional: { fontWeight: tokens.fontWeightRegular, color: tokens.colorNeutralForeground2 },
  optionalInverted: { fontWeight: tokens.fontWeightRegular, color: 'inherit' },
  requiredNote: {
    display: 'block',
    margin: `0 0 ${tokens.spacingVerticalL}`,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    color: tokens.colorNeutralForeground2,
  },
  fieldset: { border: 'none', margin: `0 0 ${tokens.spacingVerticalXXL}`, padding: 0, minWidth: 0 },
  legend: {
    padding: 0,
    marginBottom: tokens.spacingVerticalM,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  sectionGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    columnGap: tokens.spacingHorizontalXL,
    rowGap: tokens.spacingVerticalL,
    alignItems: 'start',
    maxWidth: '40rem',
  },
  sectionGrid2: {
    '@media (min-width: 640px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
  },
  summaryList: {
    margin: `${tokens.spacingVerticalXS} 0 0`,
    paddingInlineStart: tokens.spacingHorizontalXL,
    listStyleType: 'disc',
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalXS,
  },
  /* Linked errors must be ≥24px tall targets (WCAG 2.2 target-size) when several stack. */
  summaryLink: { display: 'inline-block', minHeight: '24px', paddingTop: '2px', paddingBottom: '2px' },
  summary: {
    marginBottom: tokens.spacingVerticalL,
    scrollMarginTop: '6rem',
    ':focus-visible': { outline: `${tokens.strokeWidthThick} solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' },
  },
  roList: { display: 'grid', rowGap: tokens.spacingVerticalL, margin: 0, padding: 0 },
  roItem: { margin: 0, minWidth: 0 },
  roLabel: {
    margin: 0,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  roValue: {
    margin: `${tokens.spacingVerticalXXS} 0 0`,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    color: tokens.colorNeutralForeground1,
    overflowWrap: 'anywhere',
  },
  roHint: {
    margin: `${tokens.spacingVerticalXXS} 0 0`,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    color: tokens.colorNeutralForeground2,
  },
  address: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: tokens.spacingHorizontalS, width: '100%' },
  addressBox: {
    flexGrow: 1,
    flexBasis: '14rem',
    minWidth: 0,
    boxSizing: 'border-box',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    fontFamily: tokens.fontFamilyBase,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    textAlign: 'start',
    cursor: 'pointer',
    ':hover': { border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1Hover}` },
    ':focus-visible': { outline: `${tokens.strokeWidthThick} solid ${tokens.colorStrokeFocus2}`, outlineOffset: '1px' },
  },
  addressText: { display: 'block', overflowWrap: 'anywhere' },
  addressEmpty: { color: tokens.colorNeutralForeground2 },
  addressReadOnly: { color: tokens.colorNeutralForeground1, fontSize: tokens.fontSizeBase300, lineHeight: tokens.lineHeightBase300 },
  addressReminder: {
    flexBasis: '100%',
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    color: tokens.colorNeutralForeground2,
  },
})

/**
 * Layout owns the column width. Keep typography utilities Fluent-compatible and allow
 * explicit caller Fluent classes for compound rows such as an invitation link with a Copy button.
 */
function useControlClasses(className: string | undefined) {
  const styles = useStyles()
  const cls = className ?? ''
  return mergeClasses(styles.full, /(^|\s)font-mono(\s|$)/.test(cls) && styles.mono, /(^|\s)text-xs(\s|$)/.test(cls) && styles.small, cls)
}

export function FormField({
  id,
  label,
  required,
  optional,
  readOnly,
  hint,
  error,
  children,
  className = '',
  inverted,
}: {
  id: string
  label: string
  required?: boolean
  /** Appends a muted " (optional)" to the label. */
  optional?: boolean
  /** Signals a read-only/disabled control: hides the required asterisk. Disabled/readOnly children are detected too. */
  readOnly?: boolean
  /** Format/help text shown between the label and the control. */
  hint?: string
  /** `true` shows "<label> is a required field."; a string shows that specific message under the field. */
  error?: boolean | string
  children: ReactNode
  className?: string
  /** Light label text for fields placed on the navy/brand hero. */
  inverted?: boolean
}) {
  const styles = useStyles()
  const isInverted = inverted || className.includes('[&_label]:text-white')
  const childProps = isValidElement(children) ? (children.props as { disabled?: boolean; readOnly?: boolean }) : {}
  const locked = readOnly || childProps.disabled === true || childProps.readOnly === true
  const message = typeof error === 'string' ? error || undefined : error ? `${label} is a required field.` : undefined
  return (
    <Field
      className={mergeClasses(styles.fieldRoot, className)}
      label={{
        children: optional ? (
          <>
            {label}
            <span className={isInverted ? styles.optionalInverted : styles.optional}> (optional)</span>
          </>
        ) : (
          label
        ),
        htmlFor: id,
        className: mergeClasses(styles.label, isInverted && styles.invertedLabel),
      }}
      required={required && !locked}
      hint={hint ? { children: hint, className: styles.hint } : undefined}
      validationState={message ? 'error' : 'none'}
      validationMessage={message}
    >
      {children}
    </Field>
  )
}

/** Short legend for forms that mark required fields with an asterisk. */
export function RequiredNote({ className }: { className?: string }) {
  const styles = useStyles()
  return <p className={mergeClasses(styles.requiredNote, className)}>Fields marked * are required</p>
}

function isEmptyValue(value: ReactNode) {
  return value === undefined || value === null || value === false || (typeof value === 'string' && value.trim() === '')
}

function EmptyValue() {
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr-only">Not provided</span>
    </>
  )
}

/** View-mode label/value pair for users who can't edit (instead of disabled inputs). */
export function ReadOnlyField({ label, value, hint, className }: { label: string; value?: ReactNode; hint?: ReactNode; className?: string }) {
  const styles = useStyles()
  return (
    <dl className={mergeClasses(styles.roItem, className)}>
      <dt className={styles.roLabel}>{label}</dt>
      <dd className={styles.roValue}>{isEmptyValue(value) ? <EmptyValue /> : value}</dd>
      {hint && <dd className={styles.roHint}>{hint}</dd>}
    </dl>
  )
}

/** Stacked list of read-only label/value pairs. `hideEmpty` omits items without a value instead of showing "—". */
export function FieldList({ items, hideEmpty, className }: { items: { label: string; value?: ReactNode }[]; hideEmpty?: boolean; className?: string }) {
  const styles = useStyles()
  const visible = hideEmpty ? items.filter(i => !isEmptyValue(i.value)) : items
  if (visible.length === 0) return null
  return (
    <dl className={mergeClasses(styles.roList, className)}>
      {visible.map(i => (
        <div key={i.label} className={styles.roItem}>
          <dt className={styles.roLabel}>{i.label}</dt>
          <dd className={styles.roValue}>{isEmptyValue(i.value) ? <EmptyValue /> : i.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function TextInput({
  className,
  type,
  size: _size,
  value,
  defaultValue,
  onChange,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'width'>) {
  const rootClass = useControlClasses(className)
  return (
    <Input
      {...(rest as Omit<InputProps, 'size'>)}
      className={rootClass}
      type={type as InputProps['type']}
      value={value as InputProps['value']}
      defaultValue={defaultValue as InputProps['defaultValue']}
      onChange={onChange}
    />
  )
}

export function TextArea({
  className,
  value,
  defaultValue,
  onChange,
  rows = 4,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const rootClass = useControlClasses(className)
  return (
    <Textarea
      resize="vertical"
      {...(rest as Omit<TextareaProps, 'size'>)}
      rows={rows}
      className={rootClass}
      value={value as TextareaProps['value']}
      defaultValue={defaultValue as TextareaProps['defaultValue']}
      onChange={onChange}
    />
  )
}

export function Select({
  options,
  placeholder,
  className,
  size: _size,
  value,
  defaultValue,
  onChange,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { options: (string | { value: string; label: string })[]; placeholder?: string }) {
  const rootClass = useControlClasses(className)
  return (
    <FluentSelect
      {...(props as Omit<SelectProps, 'size'>)}
      className={rootClass}
      value={value as SelectProps['value']}
      defaultValue={defaultValue as SelectProps['defaultValue']}
      onChange={onChange}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map(o => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o
        return (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        )
      })}
    </FluentSelect>
  )
}

export function Checkbox({ id, label, checked, onChange, disabled }: { id: string; label: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return <FluentCheckbox id={id} label={{ children: label }} checked={checked} disabled={disabled} onChange={(_, data) => onChange(data.checked === true)} />
}

/** A form error: plain message, or a message linked to the field with that id. */
export type FormError = string | { id?: string; message: string }

const errorMessage = (e: FormError) => (typeof e === 'string' ? e : e.message)

function focusField(event: MouseEvent<HTMLAnchorElement>, id: string) {
  const target = document.getElementById(id)
  if (!target) return
  event.preventDefault()
  target.scrollIntoView({ block: 'center' })
  target.focus({ preventScroll: true })
}

/** Error summary: "There's a problem" + each error (linked to its field when an id is given). Takes focus when errors appear. */
export function ValidationSummary({ errors, title = "There's a problem" }: { errors: FormError[]; title?: string }) {
  const styles = useStyles()
  const ref = useRef<HTMLDivElement>(null)
  const signature = errors.map(errorMessage).join('\n')
  useEffect(() => {
    const el = ref.current
    if (!signature || !el) return
    el.focus({ preventScroll: true })
    el.scrollIntoView({ block: 'start' })
  }, [signature])
  if (errors.length === 0) return null
  return (
    <MessageBar ref={ref} tabIndex={-1} intent="error" layout="multiline" role="alert" className={styles.summary}>
      <MessageBarBody>
        <MessageBarTitle>{title}</MessageBarTitle>
        <ul className={styles.summaryList}>
          {errors.map((e, i) => {
            const message = errorMessage(e)
            const id = typeof e === 'string' ? undefined : e.id
            return (
              <li key={`${i}-${message}`}>
                {id ? (
                  <Link href={`#${id}`} onClick={ev => focusField(ev, id)} className={styles.summaryLink}>
                    {message}
                  </Link>
                ) : (
                  message
                )}
              </li>
            )
          })}
        </ul>
      </MessageBarBody>
    </MessageBar>
  )
}

/** Turns `{ fieldId: message | falsy }` into linked summary errors, in key order, skipping fields without a message. */
export function fieldErrors(map: Record<string, string | false | null | undefined>): { id: string; message: string }[] {
  return Object.entries(map)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '')
    .map(([id, message]) => ({ id, message }))
}

/** Lower-cases a label for use mid-sentence, keeping acronyms such as "ZIP" or "URL". */
function labelInSentence(label: string) {
  return label
    .split(' ')
    .map(w => (w.length > 1 && /[A-Z]/.test(w) && w === w.toUpperCase() ? w : w.toLowerCase()))
    .join(' ')
}

const isBlank = (v: unknown) => v === undefined || v === null || String(v).trim() === ''

/** Instructive message for an empty required field: "Enter <label>" (or "Select <label>" for choices). */
export function requiredMessage(label: string, kind: 'enter' | 'select' = 'enter') {
  return `${kind === 'select' ? 'Select' : 'Enter'} ${labelInSentence(label)}`
}

/** Returns `{ id, message }` for empty required fields so `ValidationSummary` can link to each field. */
export function requiredFieldErrors(fields: [label: string, value: unknown, id: string][], options: { select?: string[] } = {}): { id: string; message: string }[] {
  return fields.filter(([, v]) => isBlank(v)).map(([l, , id]) => ({ id, message: requiredMessage(l, options.select?.includes(l) ? 'select' : 'enter') }))
}

/** Finds the message for a field (by id when given, otherwise by label) — pass it to `FormField error`. */
export function fieldErrorFor(errors: FormError[], label: string, id?: string): string | undefined {
  if (id) {
    const byId = errors.find(e => typeof e !== 'string' && e.id === id)
    if (byId) return errorMessage(byId)
  }
  const l = label.toLowerCase()
  const messages = errors.map(errorMessage)
  const exact = new Set([requiredMessage(label, 'enter'), requiredMessage(label, 'select')].map(m => m.toLowerCase()))
  return (
    messages.find(m => exact.has(m.toLowerCase())) ??
    messages.find(m => m.toLowerCase().startsWith(l)) ??
    messages.find(m => new RegExp(`(^|\\W)${l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\W|$)`).test(m.toLowerCase()))
  )
}

function addressLines(a?: Address): string[] {
  if (!a) return []
  const cityLine = ([a.city, a.state].filter(Boolean).join(', ') + (a.postalCode ? ` ${a.postalCode}` : '')).trim()
  return [a.line1, a.line2, a.line3, cityLine, a.country].filter((l): l is string => !!l && l.trim() !== '')
}

const sameAddress = (a: Address, b: Address) => (Object.keys({ ...a, ...b }) as (keyof Address)[]).every(k => (a[k] ?? '').trim() === (b[k] ?? '').trim())

/**
 * Address summary (multi-line, or "No address added") with a form panel: Street 1/2/3, City, State/Province,
 * ZIP/Postal code, Country/Region, Cancel / Apply address. Applying only updates the form; the page still has to save.
 */
export function AddressField({ id, value, onChange, disabled }: { id: string; value: Address; onChange: (a: Address) => void; disabled?: boolean }) {
  const styles = useStyles()
  const textId = useId()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Address>(value)
  const [applied, setApplied] = useState(false)
  const set = (k: keyof Address) => (e: ChangeEvent<HTMLInputElement>) => setDraft(d => ({ ...d, [k]: e.target.value }))
  const lines = addressLines(value)
  const empty = lines.length === 0
  const openEditor = () => {
    setDraft(value)
    setOpen(true)
  }
  const text = (
    <span id={textId} className={mergeClasses(styles.addressText, empty && styles.addressEmpty)}>
      {empty
        ? 'No address added'
        : lines.map((l, i) => (
            <span key={i} className={styles.addressText}>
              {l}
            </span>
          ))}
    </span>
  )
  if (disabled) {
    return (
      <div id={id} className={styles.addressReadOnly}>
        {text}
      </div>
    )
  }
  return (
    <div className={styles.address}>
      <button type="button" id={id} className={styles.addressBox} aria-haspopup="dialog" aria-describedby={textId} onClick={openEditor}>
        {text}
      </button>
      <FluentButton appearance="subtle" icon={empty ? <Add20Regular /> : <Edit20Regular />} aria-haspopup="dialog" onClick={openEditor}>
        {empty ? 'Add address' : 'Edit address'}
      </FluentButton>
      <div aria-live="polite" className={styles.addressReminder}>
        {applied ? 'Remember to save to keep this address' : ''}
      </div>
      <FormPanel
        open={open}
        title="Address"
        dirty={!sameAddress(draft, value)}
        onClose={() => setOpen(false)}
        submitLabel="Apply address"
        onSubmit={() => {
          if (!sameAddress(draft, value)) {
            onChange(draft)
            setApplied(true)
          }
          setOpen(false)
        }}
      >
        <p className="mb-4">Apply this address to your current form, then save the form to keep it.</p>
        <div className="grid grid-cols-1 gap-4">
          {(
            [
              ['line1', 'Street 1'],
              ['line2', 'Street 2'],
              ['line3', 'Street 3'],
              ['city', 'City'],
              ['state', 'State/Province'],
              ['postalCode', 'ZIP/Postal code'],
              ['country', 'Country/Region'],
            ] as [keyof Address, string][]
          ).map(([k, l]) => (
            <FormField key={k} id={`${id}-${k}`} label={l} optional>
              <TextInput id={`${id}-${k}`} value={draft[k] ?? ''} onChange={set(k)} />
            </FormField>
          ))}
        </div>
      </FormPanel>
    </div>
  )
}

/** Fieldset with a sentence-case legend. Single column (max ~40rem) unless `columns={2}` pairs short fields. */
export function FormSection({ title, children, columns = 1, className }: { title: string; children: ReactNode; columns?: 1 | 2; className?: string }) {
  const styles = useStyles()
  return (
    <fieldset className={mergeClasses(styles.fieldset, className)}>
      <legend className={styles.legend}>{title}</legend>
      <div className={mergeClasses(styles.sectionGrid, columns === 2 && styles.sectionGrid2)}>{children}</div>
    </fieldset>
  )
}

export const PHONE_HINT = 'For example, 416 555 0100'
