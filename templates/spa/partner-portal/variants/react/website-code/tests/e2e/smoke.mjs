// Access matrix: every in-scope route x every role -> expected h1, "Access denied", or redirect to /login.
import { assert, expectH1, ROLES, waitForUrl } from './lib.mjs'

// Outcome codes: OK = page renders its h1; DENIED = in-place "Access denied"; SIGNIN = redirect to
// /login?ReturnUrl=<encoded path+query>; NF = "Page not found".
const OK = 'ok'
const DENIED = 'denied'
const SIGNIN = 'signin'
const NF = 'notfound'

const HOME_H1 = {
  anonymous: 'Grow together with the Zava partner network',
  'non-partner': 'Apply to become a Zava partner',
  'partner-admin': 'Welcome back, Avery',
  'partner-manager': 'Welcome back, Jordan',
  'partner-seller': 'Welcome back, Sam',
  'partner-technician': 'Welcome back, Marco',
}

// Columns:            anonymous  non-partner  admin  manager  seller  technician
// "PARTNER" routes are the Account Manager (sales) workspace: the Partner Technician is denied all of them.
const PUBLIC = [OK, OK, OK, OK, OK, OK]
const SIGNED_IN = [SIGNIN, OK, OK, OK, OK, OK]
const PARTNER = [SIGNIN, DENIED, OK, OK, OK, DENIED]
const ADMIN_MANAGER = [SIGNIN, DENIED, OK, OK, DENIED, DENIED]
const ADMIN_ONLY = [SIGNIN, DENIED, OK, DENIED, DENIED, DENIED]
const NON_PARTNER_ONLY = [SIGNIN, OK, DENIED, DENIED, DENIED, DENIED]
const TECHNICIAN_ONLY = [SIGNIN, DENIED, DENIED, DENIED, DENIED, OK]
const NOT_FOUND = [NF, NF, NF, NF, NF, NF]
const DENIED_ALL = [DENIED, DENIED, DENIED, DENIED, DENIED, DENIED]

export const MATRIX = [
  // Public
  { path: '/', h1: HOME_H1, access: PUBLIC },
  { path: '/login', h1: 'Sign in', access: PUBLIC },
  { path: '/registration', h1: 'Create an account', access: PUBLIC },
  { path: '/forgot-password', h1: 'Reset your password', access: PUBLIC },
  { path: '/redeem-invitation?invitation=NWP-3T8H-6R1Z', h1: 'Redeem invitation', access: PUBLIC },
  { path: '/reset-password?UserId=u-1&Code=abc', h1: 'Choose a new password', access: PUBLIC },
  { path: '/external-login-confirmation', h1: 'Finish creating your account', access: PUBLIC },
  { path: '/partner-program/', h1: 'Grow your business with Zava.', access: PUBLIC },
  { path: '/partner-program/partner-program-details/', h1: 'Program details', access: PUBLIC },
  { path: '/partner-program/become-a-partner/', h1: 'Become a partner', access: PUBLIC },
  { path: '/partner-program/partner-program-FAQs/', h1: 'Frequently asked questions', access: PUBLIC },
  { path: '/sitemap/', h1: 'Sitemap', access: PUBLIC },
  // Account security (any signed-in user)
  { path: '/Account/Manage/SetPassword', h1: 'Set password', access: SIGNED_IN },
  { path: '/Account/Manage/ChangePassword', h1: 'Change password', access: SIGNED_IN },
  { path: '/Account/Manage/ChangeEmail', h1: 'Change email', access: SIGNED_IN },
  { path: '/Account/Manage/ChangePhoneNumber', h1: 'Change phone number', access: SIGNED_IN },
  { path: '/Account/Manage/ChangeLogin', h1: 'External sign-in providers', access: SIGNED_IN },
  // Customers (sellers: no create)
  { path: '/customers/', h1: 'Customers', access: PARTNER },
  { path: '/customers/customer-accounts/', h1: 'Customer accounts', access: PARTNER },
  { path: '/customers/customer-accounts/create-customer-account/', h1: 'Create customer account', access: ADMIN_MANAGER },
  { path: '/customers/customer-accounts/edit-customer-account/?id=acc-adventure', h1: 'Adventure Works Cycles', access: PARTNER },
  { path: '/customers/customer-contacts/', h1: 'Customer contacts', access: PARTNER },
  { path: '/customers/customer-contacts/create-customer-contact-form/', h1: 'Create customer contact', access: ADMIN_MANAGER },
  { path: '/customers/customer-contacts/edit-customer-contact/?id=c-adv-1', h1: 'Linda Mitchell', access: PARTNER },
  // Opportunities (sellers: no distributed)
  { path: '/opportunities/', h1: 'Opportunities', access: PARTNER },
  { path: '/opportunities/distributed-opportunities/', h1: 'Distributed opportunities', access: ADMIN_MANAGER },
  { path: '/opportunities/distributed-opportunities/opportunity-summary/?id=opp-2401', h1: 'Fleet telematics rollout', access: ADMIN_MANAGER },
  { path: '/opportunities/managed-opportunities/', h1: 'Managed opportunities', access: PARTNER },
  { path: '/opportunities/managed-opportunities/create-opportunity/', h1: 'Create opportunity', access: PARTNER },
  { path: '/opportunities/managed-opportunities/opportunity-details/?id=opp-2404', h1: 'Cloud migration – phase 1', access: PARTNER },
  { path: '/opportunities/managed-opportunities/opportunity-details-shared/?id=opp-2501', h1: 'Crew scheduling optimisation', access: PARTNER },
  // Profile
  { path: '/profile/', h1: 'Profile', access: SIGNED_IN },
  { path: '/profile/manage-access/', h1: 'Manage access', access: ADMIN_ONLY },
  { path: '/profile/manage-access/edit-partner-contact/?id=c-sam', h1: 'Sam Rivera', access: ADMIN_ONLY },
  { path: '/profile/parent-account/', h1: 'Parent account', access: PARTNER },
  { path: '/profile/register-to-be-a-partner/', h1: 'Register to be a partner', access: NON_PARTNER_ONLY },
  // Technician workspace (Partner Technician web role only)
  { path: '/work-orders/', h1: 'Work orders', access: TECHNICIAN_ONLY },
  { path: '/work-orders/work-order-details/?id=wo-204', h1: 'WO-00123 · High-temperature alarm on CU-204', access: TECHNICIAN_ONLY },
  // Utility pages
  { path: '/access-denied/', h1: 'Access denied', access: DENIED_ALL },
  { path: '/this-page-does-not-exist/', access: NOT_FOUND },
  // Removed features must stay unavailable for every role.
  { path: '/support/', access: NOT_FOUND },
  { path: '/support/create-case/', access: NOT_FOUND },
  { path: '/support/edit-case/?id=case-1002', access: NOT_FOUND },
  { path: '/support/case/?id=case-1002', access: NOT_FOUND },
  { path: '/profile/myportal/', access: NOT_FOUND },
  { path: '/forums/', access: NOT_FOUND },
  { path: '/forums/general-discussion', access: NOT_FOUND },
  { path: '/forums/general-discussion/t-1', access: NOT_FOUND },
  { path: '/knowledgebase/', access: NOT_FOUND },
  { path: '/knowledgebase/article/?id=kb-1', access: NOT_FOUND },
  { path: '/search/', access: NOT_FOUND },
  { path: '/poll-archives/', access: NOT_FOUND },
  { path: '/contact-us/', access: NOT_FOUND },
  { path: '/public-profile/', access: NOT_FOUND },
  { path: '/public-profile/c-avery/forum-posts', access: NOT_FOUND },
]

export const tests = ROLES.flatMap((role, col) =>
  MATRIX.map(route => {
    const outcome = route.access[col]
    const expected = typeof route.h1 === 'object' ? route.h1[role] : route.h1
    const describe = { [OK]: `"${expected}"`, [DENIED]: 'Access denied', [SIGNIN]: 'redirect to login', [NF]: 'Page not found' }[outcome]
    return {
      name: `${role.padEnd(15)} ${route.path} -> ${describe}`,
      role,
      async run({ page, goto, baseUrl }) {
        await goto(route.path)
        if (outcome === SIGNIN) {
          const returnUrl = encodeURIComponent(route.path)
          await waitForUrl(page, u => u.pathname === '/login', `/login?ReturnUrl=${returnUrl}`)
          const actual = new URL(page.url())
          assert.equal(actual.search, `?ReturnUrl=${returnUrl}`, `ReturnUrl mismatch for ${route.path}`)
          await expectH1(page, 'Sign in')
          return
        }
        const h1 = { [OK]: expected, [DENIED]: 'Access denied', [NF]: 'Page not found' }[outcome]
        await expectH1(page, h1)
        // No redirect for anything other than SIGNIN.
        const actual = new URL(page.url())
        const want = new URL(route.path, baseUrl)
        assert.equal(actual.pathname + actual.search, want.pathname + want.search, `unexpected redirect from ${route.path}`)
      },
    }
  }),
)

// Server-reserved auth paths forward to the SPA pages with their query string. On Power Pages the
// Code-Site-Shell-Header web template does this; the dev server mirrors it with SPA redirects.
const LEGACY_AUTH = [
  ['/SignIn?ReturnUrl=%2Fcustomers%2F', '/login?ReturnUrl=%2Fcustomers%2F', 'Sign in'],
  ['/Register?invitation=NWP-3T8H-6R1Z', '/redeem-invitation?invitation=NWP-3T8H-6R1Z', 'Redeem invitation'],
  ['/Account/Login/Register', '/registration', 'Create an account'],
  ['/Account/Login/ForgotPassword', '/forgot-password', 'Reset your password'],
  ['/Account/Login/ResetPassword?UserId=u-1&Code=abc', '/reset-password?UserId=u-1&Code=abc', 'Choose a new password'],
]

tests.push(
  ...LEGACY_AUTH.map(([from, to, h1]) => ({
    name: `anonymous       ${from} -> ${to}`,
    role: 'anonymous',
    async run({ page, goto }) {
      await goto(from)
      await expectH1(page, h1)
      const actual = new URL(page.url())
      assert.equal(actual.pathname + actual.search, to)
    },
  })),
)
