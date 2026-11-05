import type { Role } from '../data/types'
import { PARTNER_ROLES } from './access'
import { FAQS } from './program'
import { formatCurrency, formatDate } from './format'
import { daysFromToday, rankItems, type SearchItem } from './search'

/**
 * Partner assistant answer model. The live `assistant` server logic returns this shape; mock mode and
 * program FAQ answers build it client-side. Answers are structured (no HTML) and cite records by index.
 */
export interface AnswerPart {
  text: string
  strong?: boolean
  /** 1-based index into `citations`. */
  cite?: number
}
export type AnswerBlock = { kind: 'p'; parts: AnswerPart[] } | { kind: 'ol' | 'ul'; items: AnswerPart[][] }

export interface AssistantAnswer {
  intent: string
  blocks: AnswerBlock[]
  citations: SearchItem[]
  followUps: string[]
}

export const STARTERS: Record<'partner' | 'seller' | 'visitor', { q: string; hint: string }[]> = {
  partner: [
    { q: 'Which deals need my attention this week?', hint: 'Expiring leads and registrations' },
    { q: 'Show my open pipeline by customer', hint: 'Open opportunities and totals' },
    { q: 'Which opportunities close next?', hint: 'Upcoming close dates' },
    { q: 'How long is a deal protected?', hint: 'Deal registration rules' },
  ],
  seller: [
    { q: 'Which of my opportunities close next?', hint: 'Your upcoming close dates' },
    { q: 'Show my open pipeline by customer', hint: 'Open opportunities and totals' },
    { q: 'Which deals need my attention this week?', hint: 'Expiring registrations' },
    { q: 'How long is a deal protected?', hint: 'Deal registration rules' },
  ],
  visitor: [
    { q: 'How do I become a partner?', hint: 'Steps and review time' },
    { q: 'How are tiers determined?', hint: 'Registered to Specialist' },
    { q: 'What are distributed opportunities?', hint: 'Leads from Zava' },
    { q: 'How long is a deal protected?', hint: 'Deal registration rules' },
  ],
}

export function startersFor(role: Role) {
  if (role === 'partner-seller') return STARTERS.seller
  return PARTNER_ROLES.includes(role) ? STARTERS.partner : STARTERS.visitor
}

const FAQ_ITEM = (i: number): SearchItem => ({ type: 'page', id: `faq:${i}`, title: FAQS[i].q, path: '/partner-program/partner-program-FAQs/', faq: true, fields: {} })

const FAQ_INTENTS: [RegExp, RegExp][] = [
  [/tier/, /tiers determined/i],
  [/become|join|apply/, /become a partner/i],
  [/protect|how long|deal registration|register a deal/, /deal registration/i],
  [/expiring|extend/, /expiring/i],
  [/what are distributed|distributed opportunit(y|ies)\?/, /distributed opportunities/i],
  [/what is the (zava )?partner program|about the program/, /What is the Zava Partner Program/i],
]

/** Program questions are answered from static FAQ content for everyone (no record access needed). */
export function faqAnswer(message: string, role: Role): AssistantAnswer | null {
  const text = message.toLowerCase()
  if (/\bmy\b|which|pipeline|summari/.test(text)) return null
  const match = FAQ_INTENTS.find(([re]) => re.test(text))
  if (!match) return null
  const i = FAQS.findIndex(f => match[1].test(f.q))
  if (i < 0) return null
  return {
    intent: 'faq',
    blocks: [{ kind: 'p', parts: [{ text: FAQS[i].a + ' ' }, { text: '', cite: 1 }] }],
    citations: [FAQ_ITEM(i)],
    followUps: startersFor(role).map(s => s.q).filter(q => q.toLowerCase() !== text).slice(0, 2),
  }
}

/** Mock-mode assistant over the session-scoped index (mirrors the `assistant` server logic intents). */
export function mockAnswer(message: string, index: SearchItem[], role: Role): AssistantAnswer {
  const citations: SearchItem[] = []
  const cite = (item: SearchItem): AnswerPart => {
    let i = citations.findIndex(c => c.id === item.id)
    if (i < 0) i = citations.push(item) - 1
    return { text: '', cite: i + 1 }
  }
  const t = (text: string, strong = false): AnswerPart => (strong ? { text, strong } : { text })
  const p = (...parts: AnswerPart[]): AnswerBlock => ({ kind: 'p', parts })
  const done = (intent: string, blocks: AnswerBlock[], followUps: string[] = []): AssistantAnswer => ({ intent, blocks, citations, followUps })
  const money = (n?: number | null) => formatCurrency(n)
  const when = (iso: string) => {
    const d = daysFromToday(iso) ?? 0
    if (d < 0) return `expired ${formatDate(iso)}`
    if (d === 0) return 'expires today'
    if (d === 1) return `expires tomorrow, ${formatDate(iso)}`
    return `expires in ${d} days, ${formatDate(iso)}`
  }
  const text = message.toLowerCase()
  const opps = index.filter(i => i.type === 'opp')
  const open = opps.filter(o => ['In Progress', 'On Hold', 'Accepted'].includes(o.status ?? ''))

  if (!PARTNER_ROLES.includes(role))
    return done('visitor', [p(t('I can answer questions about the Zava Partner Program. Opportunity and customer records become available once your organization is an approved partner.'))], startersFor(role).map(s => s.q).slice(0, 2))

  const resultsFor = /results for ["“](.+?)["”]/i.exec(message)
  const summarize = /^(summari[sz]e|tell me about|give me an overview of|overview of|who is)\b/i.test(message.trim())
  if (resultsFor || summarize) {
    const term = resultsFor ? resultsFor[1] : message.replace(/^(summari[sz]e|tell me about|give me an overview of|overview of|who is)\s+/i, '').replace(/[?."“”]/g, '').trim()
    const hits = rankItems(index, term).map(h => h.item)
    if (resultsFor) {
      if (!hits.length) return done('results', [p(t(`None of the records you can access match “${term}”.`))])
      const count = (type: SearchItem['type'], one: string, many: string) => {
        const n = hits.filter(h => h.type === type).length
        return n ? `${n} ${n === 1 ? one : many}` : ''
      }
      const counts = [count('opp', 'opportunity', 'opportunities'), count('account', 'customer account', 'customer accounts'), count('contact', 'contact', 'contacts'), count('partner', 'partner contact', 'partner contacts')].filter(Boolean)
      return done('results', [
        p(t(`“${term}” matches ${counts.join(', ')}. The most relevant:`)),
        {
          kind: 'ol',
          items: hits.slice(0, 4).map(h => [
            t(h.title, true),
            t(` — ${h.type === 'opp' ? `${h.customer}, ${money(h.revenue)}, ${h.status}` : h.type === 'account' ? `customer account${h.city ? ` in ${h.city}` : ''}` : `${h.jobTitle || 'contact'}${h.account ? ` at ${h.account}` : ''}`} `),
            cite(h),
          ]),
        },
      ])
    }
    const item = hits[0]
    if (item?.type === 'opp') {
      const what = item.distributed ? 'a distributed opportunity waiting for your response' : item.collaboration ? 'a collaborative opportunity (read-only)' : `an ${item.status?.toLowerCase()} opportunity`
      const facts: AnswerPart[][] = [[t(`Registration: ${item.registrationStatus ? `${item.registrationStatus}${item.registrationExpires ? ` (until ${formatDate(item.registrationExpires)})` : ''}` : 'Not registered'}`)]]
      if (item.fields['Partner contact']) facts.unshift([t(`Partner contact: ${item.fields['Partner contact']}`)])
      if (item.distributed && item.expiryDate) facts.push([t(`Response due: ${when(item.expiryDate)}`)])
      if (item.fields.Description) facts.push([t(item.fields.Description)])
      const blocks: AnswerBlock[] = [p(t(item.title, true), t(` is ${what} for ${item.customer}, worth ${money(item.revenue)}${item.distributed ? '' : `, closing ${formatDate(item.closeDate)}`}. `), cite(item)), { kind: 'ul', items: facts }]
      if (item.registrationStatus === 'Expiring') blocks.push(p(t('Action: ', true), t('extend the registration from the opportunity’s details page to keep protection.')))
      return done('summary', blocks, ['Which deals need my attention this week?', 'Which opportunities close next?'])
    }
    if (item?.type === 'account') {
      const accOpps = opps.filter(o => o.customer === item.title)
      const primary = index.find(i => i.type === 'contact' && i.title === item.primaryContact)
      const blocks: AnswerBlock[] = [
        p(t(item.title, true), t(` is a customer account${item.city ? ` in ${item.city}` : ''} `), cite(item), ...(primary ? [t(`. The primary contact is ${primary.title}${primary.jobTitle ? `, ${primary.jobTitle}` : ''} `), cite(primary), t('.')] : [t('.')])),
      ]
      if (accOpps.length) {
        blocks.push(p(t('Opportunities you can see:')))
        blocks.push({ kind: 'ul', items: accOpps.map(o => [t(`${o.title} — ${money(o.revenue)}, ${o.status}${o.registrationStatus === 'Expiring' ? `. Registration expiring ${formatDate(o.registrationExpires)}` : ''} `), cite(o)]) })
      } else blocks.push(p(t('No opportunities you can see for this account.')))
      return done('summary', blocks, ['Which deals need my attention this week?', 'Show my open pipeline by customer'])
    }
    if (item && (item.type === 'contact' || item.type === 'partner'))
      return done('summary', [p(t(item.title, true), t(` is ${item.jobTitle || item.partnerRole || 'a contact'}${item.account ? ` at ${item.account}` : ''}${item.email ? `. Email ${item.email}` : ''}. `), cite(item))])
    return done('none', [p(t(`I couldn’t find “${term}” among the records you can access. Try the exact name of a customer, opportunity or contact.`))])
  }

  if (/attention|this week|expir|urgent|deadline|need/.test(text)) {
    const items = [
      ...opps.filter(o => o.distributed).map(o => ({ o, due: o.expiryDate || '9999-12-31', text: ` (${o.customer}, ${money(o.revenue)}) — Distributed opportunity ${o.expiryDate ? when(o.expiryDate) : 'awaiting your response'}. ` })),
      ...opps.filter(o => o.registrationStatus === 'Expiring' && !o.collaboration).map(o => ({ o, due: o.registrationExpires || '9999-12-31', text: ` (${o.customer}, ${money(o.revenue)}) — Deal registration ${when(o.registrationExpires || '')} — extend to keep protection. ` })),
    ]
      .sort((a, b) => a.due.localeCompare(b.due))
      // Cite after sorting so source numbers follow the list order.
      .map(i => ({ parts: [t(i.o.title, true), t(i.text), cite(i.o)] }))
    if (!items.length) return done('attention', [p(t('Nothing needs your attention right now — no distributed opportunities are waiting and no registrations are expiring.'))], ['Which opportunities close next?'])
    return done(
      'attention',
      [
        p(t(`${items.length} ${items.length === 1 ? 'item needs' : 'items need'} your attention, most urgent first:`)),
        { kind: 'ol', items: items.map(i => i.parts) },
        p(t('Accept or decline distributed opportunities from their summary page; extend a registration from the opportunity’s details page.')),
      ],
      ['Which opportunities close next?', 'Show my open pipeline by customer'],
    )
  }

  if (/clos/.test(text)) {
    const next = [...open].sort((a, b) => (a.closeDate ?? '').localeCompare(b.closeDate ?? '')).slice(0, 3)
    if (!next.length) return done('close', [p(t('You have no open opportunities.'))])
    return done(
      'close',
      [p(t(`Your next ${next.length} open ${next.length === 1 ? 'opportunity' : 'opportunities'} by estimated close date:`)), { kind: 'ol', items: next.map(o => [t(o.title, true), t(` — ${formatDate(o.closeDate)}, ${money(o.revenue)}, ${o.status} `), cite(o)]) }],
      ['Which deals need my attention this week?', 'Show my open pipeline by customer'],
    )
  }

  if (/pipeline|revenue|forecast/.test(text)) {
    const rows = [...open].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))
    if (!rows.length) return done('pipeline', [p(t('You have no open opportunities.'))])
    const total = rows.reduce((s, o) => s + (o.revenue ?? 0), 0)
    return done(
      'pipeline',
      [
        p(t('Your open pipeline is '), t(money(total), true), t(` across ${rows.length} ${rows.length === 1 ? 'opportunity' : 'opportunities'}:`)),
        { kind: 'ul', items: rows.map(o => [t(`${o.customer} — ${money(o.revenue)} (${o.title}) `), cite(o)]) },
        p(t('Distributed opportunities awaiting a response aren’t included until accepted.')),
      ],
      ['Which opportunities close next?', 'Which deals need my attention this week?'],
    )
  }

  return done('unknown', [p(t('I can help with deadlines (“Which deals need my attention?”), close dates, your open pipeline, or a summary of a customer, opportunity or contact you can access.'))], ['Which deals need my attention this week?', 'Show my open pipeline by customer'])
}

let lastTurnId = 0
/** Unique id for a chat turn (user or assistant) for the lifetime of the page. */
export const nextTurnId = (): number => ++lastTurnId