import { Inbox } from 'lucide-react'

interface Props {
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  headingLevel?: 1 | 2
}

export default function EmptyState({ icon, title, description, action, headingLevel = 2 }: Props) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'

  return (
    <div style={{
      textAlign: 'center',
      padding: '64px 24px',
      color: 'var(--color-text-muted)',
    }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(27, 73, 101, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-light)', margin: '0 auto 16px' }}>
        {icon || <Inbox size={32} />}
      </div>
      <Heading style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '1.25rem',
        fontWeight: 600,
        color: 'var(--color-text)',
        marginBottom: 8,
      }}>
        {title}
      </Heading>
      <p style={{
        fontSize: '0.9375rem',
        maxWidth: 400,
        margin: '0 auto 24px',
        lineHeight: 1.6,
      }}>
        {description}
      </p>
      {action}
    </div>
  )
}
