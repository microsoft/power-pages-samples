import { useState, type FormEvent } from 'react'
import { Avatar, Body1, Caption1, Text, makeStyles, tokens } from '@fluentui/react-components'
import { Add20Regular } from '@fluentui/react-icons'
import { useApp } from '../store/AppStore'
import { addComment } from '../services/actions'
import type { Comment } from '../data/types'
import { formatDateTime, fullName, newId, nowIso } from '../lib/format'
import { Button, Panel } from './ui'
import { FormField, TextArea } from './forms'
import { InlineFeedback } from './InlineFeedback'
import { useInlineFeedback } from '../hooks/useInlineFeedback'
import { usePendingAction } from '../hooks/usePendingAction'

const useStyles = makeStyles({
  composer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: tokens.spacingVerticalS,
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalXL}`,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  field: { alignSelf: 'stretch' },
  empty: {
    display: 'block',
    margin: 0,
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalXL}`,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
  },
  list: { listStyleType: 'none', margin: 0, padding: 0 },
  item: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalXL}`,
    ':not(:first-child)': { borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}` },
  },
  body: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  meta: { color: tokens.colorNeutralForeground2 },
  text: { whiteSpace: 'pre-line', overflowWrap: 'anywhere' },
})

/** Notes timeline with an inline "Add note" composer, shared by opportunity and partner-contact screens. */
export function Comments({
  regardingType,
  regardingId,
  canAdd = true,
  title = 'Notes',
  onChange,
}: {
  regardingType: Comment['regardingType']
  regardingId: string
  canAdd?: boolean
  title?: string
  /** Live mode: reloads the screen after a note is added. */
  onChange?: () => Promise<void>
}) {
  const styles = useStyles()
  const { db, session, perform } = useApp()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | undefined>()
  // Cleared as soon as the user starts the next note.
  const added = useInlineFeedback(text)
  const adding = usePendingAction()
  const fieldId = `note-${regardingType}-${regardingId}`
  const items = db.comments
    .filter(c => c.regardingType === regardingType && c.regardingId === regardingId)
    .sort((a, b) => b.createdOn.localeCompare(a.createdOn))

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    event?.stopPropagation()
    return adding.run(async () => {
      if (!text.trim()) {
        setError('Enter a note before adding it.')
        document.getElementById(fieldId)?.focus()
        return
      }
      const value = text.trim()
      const ok = await perform({
        mock: d => {
          d.comments.push({ id: newId('cm'), regardingType, regardingId, text: value, authorName: fullName(session.contact), createdOn: nowIso() })
        },
        live: () => addComment(regardingType, regardingId, value),
        refresh: onChange,
      })
      if (!ok) return
      added.show('Note added.', 'success', { watch: '' })
      setText('')
      setError(undefined)
    })
  }

  return (
    <Panel title={title} bodyClassName="p-0">
      {canAdd && (
        // Not a <form>: Comments is often rendered inside a page form, and nested forms are invalid.
        <div className={styles.composer} role="group" aria-label="Add a note">
          <FormField id={fieldId} label="New note" error={error} className={styles.field}>
            <TextArea
              id={fieldId}
              rows={3}
              value={text}
              onChange={e => {
                setText(e.target.value)
                if (error && e.target.value.trim()) setError(undefined)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void submit()
              }}
              aria-invalid={!!error}
            />
          </FormField>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Button icon={<Add20Regular />} pending={adding.pending} pendingLabel="Adding…" onClick={() => void submit()}>
              Add note
            </Button>
            <InlineFeedback feedback={added.feedback} />
          </div>
        </div>
      )}
      {items.length === 0 ? (
        <p className={styles.empty}>No notes yet. Add context your team should know.</p>
      ) : (
        <ol className={styles.list} aria-label={title}>
          {items.map(c => (
            <li key={c.id} className={styles.item}>
              <Avatar name={c.authorName} color="colorful" size={32} aria-hidden="true" />
              <div className={styles.body}>
                <Caption1 className={styles.meta}>
                  <Text weight="semibold" size={200}>
                    {c.authorName}
                  </Text>{' '}
                  · {formatDateTime(c.createdOn)}
                </Caption1>
                <Body1 as="p" className={styles.text}>
                  {c.text}
                </Body1>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
