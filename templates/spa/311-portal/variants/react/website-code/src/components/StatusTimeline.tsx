import type { RequestStatus } from '../types/serviceRequest'
import type { StatusUpdate } from '../types/statusUpdate'
import { useI18n } from '../i18n'
import './StatusTimeline.css'

const STATUS_ORDER: RequestStatus[] = ['submitted', 'reviewed', 'assigned', 'in-progress', 'resolved', 'closed']

const STATUS_LABEL_KEYS: Record<RequestStatus, string> = {
  'submitted': 'status.submitted',
  'reviewed': 'status.reviewed',
  'assigned': 'status.assigned',
  'in-progress': 'status.inProgress',
  'resolved': 'status.resolved',
  'closed': 'status.closed',
}

interface Props {
  timeline: StatusUpdate[]
  currentStatus: RequestStatus
}

export default function StatusTimeline({ timeline, currentStatus }: Props) {
  const { t, language } = useI18n()
  const currentIndex = STATUS_ORDER.indexOf(currentStatus)
  const timelineMap = new Map(timeline.map(t => [t.status, t]))

  const dateLocale = language === 'fr' ? 'fr-CA' : 'en-US'

  return (
    <div className="status-timeline" role="list" aria-label={t('track.statusTimeline')}>
      {STATUS_ORDER.map((status, index) => {
        const entry = timelineMap.get(status)
        const isComplete = index <= currentIndex && entry
        const isCurrent = status === currentStatus
        const isPending = index > currentIndex

        return (
          <div
            key={status}
            className={`timeline-step ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''} ${isPending ? 'pending' : ''}`}
            role="listitem"
          >
            <div className="timeline-indicator">
              <div className="timeline-dot">
                {isComplete && !isCurrent && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {isCurrent && <div className="timeline-dot-pulse" />}
              </div>
              {index < STATUS_ORDER.length - 1 && (
                <div className={`timeline-line ${isComplete && !isCurrent ? 'complete' : ''}`} />
              )}
            </div>
            <div className="timeline-content">
              <span className="timeline-label">{t(STATUS_LABEL_KEYS[status])}</span>
              {entry && (
                <>
                  <span className="timeline-date">
                    {new Date(entry.date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <p className="timeline-note">{entry.note}</p>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
