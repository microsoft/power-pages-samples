import { Container } from '../../components/Layout'
import { Alert, Button, PageHeader } from '../../components/ui'

/** Live mode: a screen loader failed. */
export function LoadError({ title, breadcrumbs, error, onRetry }: {
  title: string
  breadcrumbs: { label: string; to?: string }[]
  error?: string
  onRetry: () => void
}) {
  return (
    <Container>
      <PageHeader title={title} breadcrumbs={breadcrumbs} />
      <Alert tone="error">{error || 'The data could not be loaded.'}</Alert>
      <Button className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </Container>
  )
}
