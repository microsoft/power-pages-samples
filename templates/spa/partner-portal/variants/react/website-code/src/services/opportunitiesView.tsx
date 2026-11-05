import { ArrowClockwise20Regular } from '@fluentui/react-icons'
import { Container } from '../components/Layout'
import { Alert, Button } from '../components/ui'
import type { LiveLoad } from './useLiveLoad'

/** Live-mode load failure for the opportunity screens: the error plus "Try again". */
export function OpportunityLoadError({ load }: { load: Pick<LiveLoad<unknown>, 'error' | 'reload'> }) {
  return (
    <Container>
      <div className="flex flex-col items-start gap-4">
        <Alert tone="error">{load.error ?? 'The data could not be loaded.'}</Alert>
        <Button icon={<ArrowClockwise20Regular />} onClick={() => void load.reload()}>
          Try again
        </Button>
      </div>
    </Container>
  )
}
