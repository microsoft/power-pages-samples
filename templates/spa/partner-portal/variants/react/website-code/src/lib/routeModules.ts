import { lazy, type ComponentType } from 'react'

const preloaders = new Map<string, () => Promise<unknown>>()

function normalizePath(path: string) {
  return path.replace(/\/+$/, '').toLowerCase() || '/'
}

function routeModule<Props extends object>(
  paths: readonly string[],
  importModule: () => Promise<{ default: ComponentType<Props> }>,
) {
  let pending: ReturnType<typeof importModule> | undefined
  const load = () => {
    pending ??= importModule().catch(error => {
      pending = undefined
      throw error
    })
    return pending
  }
  for (const path of paths) preloaders.set(normalizePath(path), load)
  return Object.assign(lazy(load), { paths })
}

export const Home = routeModule(['/'], () => import('../pages/Home'))
export const NotFound = routeModule(['/page-not-found'], () => import('../pages/NotFound'))
export const SignIn = routeModule(['/login'], () => import('../pages/account/SignIn'))
export const RegisterAccount = routeModule(['/registration'], () => import('../pages/account/RegisterAccount'))
export const ForgotPassword = routeModule(['/forgot-password'], () => import('../pages/account/ForgotPassword'))
export const RedeemInvitation = routeModule(['/redeem-invitation'], () => import('../pages/account/RedeemInvitation'))
export const ResetPassword = routeModule(['/reset-password'], () => import('../pages/account/ResetPassword'))
export const ExternalLoginConfirmation = routeModule(['/external-login-confirmation'], () => import('../pages/account/ExternalLoginConfirmation'))
export const ManageSecurity = routeModule([
  '/Account/Manage/SetPassword',
  '/Account/Manage/ChangePassword',
  '/Account/Manage/ChangeEmail',
  '/Account/Manage/ChangePhoneNumber',
  '/Account/Manage/ChangeLogin',
], () => import('../pages/account/ManageSecurity'))
export const ProgramHome = routeModule(['/partner-program'], () => import('../pages/program/ProgramHome'))
export const ProgramDetails = routeModule(['/partner-program/partner-program-details'], () => import('../pages/program/ProgramDetails'))
export const BecomePartner = routeModule(['/partner-program/become-a-partner'], () => import('../pages/program/BecomePartner'))
export const ProgramFAQs = routeModule(['/partner-program/partner-program-FAQs'], () => import('../pages/program/ProgramFAQs'))
export const Sitemap = routeModule(['/sitemap'], () => import('../pages/Sitemap'))
export const CustomersHome = routeModule(['/customers'], () => import('../pages/customers/CustomersHome'))
export const CustomerAccounts = routeModule(['/customers/customer-accounts'], () => import('../pages/customers/CustomerAccounts'))
export const CustomerAccountForm = routeModule([
  '/customers/customer-accounts/create-customer-account',
  '/customers/customer-accounts/edit-customer-account',
], () => import('../pages/customers/CustomerAccountForm'))
export const CustomerContacts = routeModule(['/customers/customer-contacts'], () => import('../pages/customers/CustomerContacts'))
export const CustomerContactForm = routeModule([
  '/customers/customer-contacts/create-customer-contact-form',
  '/customers/customer-contacts/edit-customer-contact',
], () => import('../pages/customers/CustomerContactForm'))
export const OpportunitiesHome = routeModule(['/opportunities'], () => import('../pages/opportunities/OpportunitiesHome'))
export const DistributedOpportunities = routeModule(['/opportunities/distributed-opportunities'], () => import('../pages/opportunities/DistributedOpportunities'))
export const OpportunitySummary = routeModule(['/opportunities/distributed-opportunities/opportunity-summary'], () => import('../pages/opportunities/OpportunitySummary'))
export const ManagedOpportunities = routeModule(['/opportunities/managed-opportunities'], () => import('../pages/opportunities/ManagedOpportunities'))
export const CreateOpportunity = routeModule(['/opportunities/managed-opportunities/create-opportunity'], () => import('../pages/opportunities/CreateOpportunity'))
export const OpportunityDetails = routeModule([
  '/opportunities/managed-opportunities/opportunity-details',
  '/opportunities/managed-opportunities/opportunity-details-shared',
], () => import('../pages/opportunities/OpportunityDetails'))
export const Profile = routeModule(['/profile'], () => import('../pages/profile/Profile'))
export const ManageAccess = routeModule(['/profile/manage-access'], () => import('../pages/profile/ManageAccess'))
export const EditPartnerContact = routeModule(['/profile/manage-access/edit-partner-contact'], () => import('../pages/profile/EditPartnerContact'))
export const ParentAccount = routeModule(['/profile/parent-account'], () => import('../pages/profile/ParentAccount'))
export const RegisterToBePartner = routeModule(['/profile/register-to-be-a-partner'], () => import('../pages/profile/RegisterToBePartner'))

/** Loads screen code only; redirects, external URLs and unknown routes are not speculative destinations. */
export async function preloadRoute(to: string): Promise<void> {
  if (!to.startsWith('/') || to.startsWith('//')) return
  const path = normalizePath(to.split(/[?#]/)[0])
  const load = preloaders.get(path)
  if (!load) return
  try {
    await load()
  } catch (error) {
    console.warn(`Route preloading failed for ${path}:`, error)
  }
}
