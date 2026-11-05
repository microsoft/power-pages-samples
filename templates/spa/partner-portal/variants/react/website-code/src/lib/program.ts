/** Illustrative prototype estimate, not a production service-level commitment. */
export const APPLICATION_REVIEW_TIME = '5 business days'

/* Partner program content shared by Program home, Program details and FAQs. */

export const TIERS = ['Registered', 'Silver', 'Gold', 'Specialist'] as const

export type TierCell = string | boolean

export interface TierRow {
  label: string
  desc?: string
  values: TierCell[]
}

export const CRITERIA: TierRow[] = [
  { label: 'Certified staff', values: ['None required', '2 certified individuals', '5 certified individuals', '3 certified in one solution area'] },
  { label: 'Annual revenue with Zava', values: ['No minimum', '$250,000+', '$1,000,000+', '$500,000+ in the specialization'] },
  { label: 'Customer satisfaction (CSAT)', values: ['Not measured', '4.0 / 5 or higher', '4.3 / 5 or higher', '4.5 / 5 or higher'] },
]

export const TIER_BENEFITS: TierRow[] = [
  {
    label: 'Distributed opportunities',
    desc: 'Qualified opportunities routed to you by territory and competency.',
    values: [false, true, 'Priority routing', 'Priority in specialization'],
  },
  {
    label: 'Deal registration protection (180 days)',
    desc: 'Protects the opportunities you source while you work them.',
    values: [true, true, true, true],
  },
  {
    label: 'Co-marketing funds',
    desc: 'Funding for joint campaigns, events and customer workshops.',
    values: [false, 'Up to $10,000', 'Up to $50,000', 'Up to $30,000'],
  },
  {
    label: 'Technical enablement and training',
    desc: 'Learning paths, workshops and certification vouchers.',
    values: ['Self-paced', 'Self-paced + workshops', 'Dedicated enablement plan', 'Specialist bootcamps'],
  },
  {
    label: 'Partner support',
    desc: 'Help from the Zava channel team.',
    values: [
      'Self-service FAQs',
      'Standard partner support',
      'Priority partner support',
      'Priority + specialist engineers',
    ],
  },
]

export const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is the Zava Partner Program?',
    a: 'The Zava Partner Program helps solution providers grow with Zava. Partners receive distributed opportunities, protect the deals they source through deal registration, and access co-marketing funds, technical enablement and partner support. The program has four tiers: Registered, Silver, Gold and Specialist.',
  },
  {
    q: 'How do I become a partner?',
    a: 'Sign in or create a portal account, then complete Register to be a partner from your profile. Your application moves from Submitted to Under review and is then approved or rejected. When approved, your organization becomes a partner account and you are assigned the Partner Admin role.',
  },
  {
    q: 'How are tiers determined?',
    a: 'Tiers are based on the number of certified staff, annual revenue with Zava and customer satisfaction (CSAT). Zava reviews tier eligibility annually; Specialist recognizes depth in a single solution area.',
  },
  {
    q: 'What is deal registration and how long is a deal protected?',
    a: 'Deal registration protects opportunities you source. Register a partner-created In Progress opportunity with a reason for registering. Registrations move New → Under Review → Approved, and an approved registration protects the deal for 180 days.',
  },
  {
    q: 'What happens when my deal registration is expiring?',
    a: 'Approved registrations become Expiring near the end of the protection period. Use Extend on the opportunity and give a renewal reason: the current registration is closed and a renewal request is created with status New. Registrations are also closed when the related opportunity closes.',
  },
  {
    q: 'What are distributed opportunities?',
    a: 'Zava distributes qualified opportunities to partners based on territory and competency. They appear under Distributed opportunities with status Delivered. Partner Admins and Partner Managers can accept them, which moves them to Managed opportunities, or decline them.',
  },
  {
    q: 'Can I give back an opportunity I have accepted?',
    a: 'Yes. If you can’t pursue an accepted opportunity, choose Return. The partner association is removed and Zava can redistribute it. Return isn’t available for partner-created or collaborative opportunities.',
  },
  {
    q: 'What can each partner role do?',
    a: 'Partner Admin has full administration, including Manage access to invite colleagues and assign roles. Partner Manager works distributed and managed opportunities, customers and the parent account. Partner Seller works assigned and collaborative opportunities, with read-only customer accounts.',
  },
]
