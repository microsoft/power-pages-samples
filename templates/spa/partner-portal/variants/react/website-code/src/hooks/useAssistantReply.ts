import { useEffect, useRef } from 'react'
import { nextTurnId, type AssistantAnswer } from '../lib/assistant'
import { askAssistant, type SearchContext } from '../services/search'

export type ChatTurn = { id: number; role: 'user'; text: string } | { id: number; role: 'assistant'; answer?: AssistantAnswer; error?: string }

const FAILED = 'The assistant couldn’t answer right now. Try again.'

/** A reply belongs to a question, not to the currently visible chat surface or route. */
export function useAssistantReply(turns: ChatTurn[], setTurns: (update: (turns: ChatTurn[]) => ChatTurn[]) => void, context: SearchContext): void {
  const requests = useRef(new Map<number, AbortController>())
  const { db, session } = context

  useEffect(() => {
    const active = requests.current
    return () => {
      active.forEach(controller => controller.abort())
      active.clear()
    }
  }, [])

  useEffect(() => {
    const active = requests.current
    const ids = new Set(turns.map(turn => turn.id))
    for (const [id, controller] of active) {
      if (!ids.has(id)) {
        controller.abort()
        active.delete(id)
      }
    }
    turns.forEach((question, index) => {
      if (question.role !== 'user') return
      const reply = turns[index + 1]
      if (reply?.role !== 'assistant') {
        const replyId = nextTurnId()
        setTurns(current => {
          const at = current.findIndex(turn => turn.id === question.id)
          if (at < 0 || current[at + 1]?.role === 'assistant') return current
          return [...current.slice(0, at + 1), { id: replyId, role: 'assistant' }, ...current.slice(at + 1)]
        })
        return
      }
      if (reply.answer || reply.error || active.has(question.id)) return
      const controller = new AbortController()
      active.set(question.id, controller)
      void askAssistant(question.text, { db, session }, controller.signal)
        .then(answer => {
          if (!controller.signal.aborted) {
            setTurns(current => current.map(turn => (turn.id === reply.id ? { id: reply.id, role: 'assistant', answer } : turn)))
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setTurns(current => current.map(turn => (turn.id === reply.id ? { id: reply.id, role: 'assistant', error: FAILED } : turn)))
          }
        })
        .finally(() => {
          if (active.get(question.id) === controller) active.delete(question.id)
        })
    })
  }, [turns, db, session, setTurns])
}
