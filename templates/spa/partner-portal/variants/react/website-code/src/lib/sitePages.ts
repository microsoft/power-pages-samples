import type { Role } from '../data/types'
import { can, type Capability } from './access'

export interface SitePage {
  title: string
  path: string
  description: string
  cap?: Capability
  /** Only shown when the visitor is NOT signed in (sign-in/registration pages). */
  anonymousOnly?: boolean
  /** Sitemap section heading for a top-level page (defaults to the page title). */
  group?: string
  children?: SitePage[]
}

/** Portal page tree used by the role-aware sitemap. */
export const SITE_PAGES: SitePage[] = [
  { title: 'Home', path: '/', description: 'Zava Partner Portal home page and partner dashboard.' },
  {
    title: 'Partner program',
    path: '/partner-program/',
    description: 'Overview of the Zava Partner Program.', group: 'Partner program',
    children: [
      { title: 'Program details', path: '/partner-program/partner-program-details/', description: 'Partner tiers, criteria, benefits and responsibilities.' },
      { title: 'Become a partner', path: '/partner-program/become-a-partner/', description: 'How to apply to the partner program.' },
      { title: 'Frequently asked questions', path: '/partner-program/partner-program-FAQs/', description: 'Answers about deal registration, distributed opportunities and partner roles.' },
    ],
  },
  {
    title: 'Opportunities',
    path: '/opportunities/',
    description: 'Distributed and managed opportunities.',
    cap: 'opportunities',
    children: [
      { title: 'Distributed opportunities', path: '/opportunities/distributed-opportunities/', description: 'Opportunities distributed to your organization by Zava.', cap: 'distributed' },
      {
        title: 'Managed opportunities',
        path: '/opportunities/managed-opportunities/',
        description: 'Opportunities your organization is working.',
        cap: 'opportunities',
        children: [{ title: 'Create opportunity', path: '/opportunities/managed-opportunities/create-opportunity/', description: 'Register a new partner-created opportunity.', cap: 'opportunities' }],
      },
    ],
  },
  {
    title: 'Customers',
    path: '/customers/',
    description: 'Customer accounts and contacts managed by your organization.',
    cap: 'customers',
    children: [
      {
        title: 'Customer accounts',
        path: '/customers/customer-accounts/',
        description: 'Customer accounts managed by your organization.',
        cap: 'customers',
        children: [{ title: 'Create customer account', path: '/customers/customer-accounts/create-customer-account/', description: 'Add a customer account.', cap: 'customer-account:create' }],
      },
      {
        title: 'Customer contacts',
        path: '/customers/customer-contacts/',
        description: 'Contacts at your customer accounts.',
        cap: 'customers',
        children: [{ title: 'Create customer contact', path: '/customers/customer-contacts/create-customer-contact-form/', description: 'Add a customer contact.', cap: 'customer-contact:create' }],
      },
    ],
  },
  {
    title: 'Profile',
    path: '/profile/',
    description: 'Your profile, preferences and security settings.', group: 'Your account',
    cap: 'signed-in',
    children: [
      { title: 'Manage access', path: '/profile/manage-access/', description: 'Invite partner contacts and assign roles.', cap: 'manage-access' },
      { title: 'Parent account', path: '/profile/parent-account/', description: 'Your partner account and partner contacts.', cap: 'parent-account' },
      { title: 'Register to be a partner', path: '/profile/register-to-be-a-partner/', description: 'Apply to become a Zava partner.', cap: 'register-partner' },
    ],
  },
  { title: 'Sitemap', path: '/sitemap/', description: 'All pages available to you.' },
  { title: 'Sign in', path: '/login', description: 'Sign in to the partner portal.', anonymousOnly: true },
  { title: 'Create an account', path: '/registration', description: 'Create a portal account.', anonymousOnly: true },
]

/** Prunes the tree to pages the role can read. */
export function visiblePages(role: Role, pages: SitePage[] = SITE_PAGES): SitePage[] {
  return pages
    .filter(p => (!p.cap || can(role, p.cap)) && (!p.anonymousOnly || role === 'anonymous'))
    .map(p => ({ ...p, children: p.children ? visiblePages(role, p.children) : undefined }))
}
