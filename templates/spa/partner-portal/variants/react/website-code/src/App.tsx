import { Suspense, useLayoutEffect, useRef, type ReactNode } from 'react'
import { createRoutesFromElements, Navigate, Outlet, Route, useLocation } from 'react-router-dom'
import Layout, { Container } from './components/Layout'
import { AccessDeniedContent, RequireAccess } from './components/RequireAccess'
import { PageSkeleton, skeletonVariantForPath } from './components/skeletons'
import { can, isPartnerOrgRole, type Capability } from './lib/access'
import { AppProvider, useApp } from './store/AppStore'
import { UnsavedChangesProvider } from './components/UnsavedChanges'
import { RootError, RouteError } from './components/RouteError'
import { M3_DURATION, M3_EASING } from './lib/motion'

import {
  Home, NotFound, SignIn, RegisterAccount, ForgotPassword, RedeemInvitation, ResetPassword,
  ExternalLoginConfirmation, ManageSecurity, ProgramHome, ProgramDetails, BecomePartner, ProgramFAQs,
  Sitemap, CustomersHome, CustomerAccounts, CustomerAccountForm, CustomerContacts, CustomerContactForm,
  OpportunitiesHome, DistributedOpportunities, OpportunitySummary, ManagedOpportunities, CreateOpportunity,
  OpportunityDetails, Profile, ManageAccess, EditPartnerContact, ParentAccount, RegisterToBePartner, WorkOrders, WorkOrderDetails,
} from './lib/routeModules'

const gate = (cap: Capability, el: ReactNode) => <RequireAccess cap={cap}>{el}</RequireAccess>

/** Forwards a legacy/server auth path to its SPA route, keeping the query string. */
function LegacyRedirect({ to }: { to: string }) {
  const { search } = useLocation()
  return <Navigate to={`${to}${search}`} replace />
}

// The skeleton's opacity when its route's content replaced it. Content continues the fade from there, so a load
// finishing mid-fade never dips back to blank (the skeleton → content double fade read as a flicker).
let skeletonHandoff: { path: string; opacity: number; at: number } | null = null

function RouteSkeleton() {
  const { pathname } = useLocation()
  const { session } = useApp()
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    // Layout cleanup runs while the skeleton is still in the document (mutation phase of the commit that swaps
    // in the content), so its animated opacity is readable; the content's layout effect then runs in that commit.
    return () => {
      skeletonHandoff = { path: pathname, opacity: el?.isConnected ? Number(getComputedStyle(el).opacity) : 0, at: performance.now() }
    }
  }, [pathname])
  return (
    <div ref={ref} className="skeleton-enter">
      <PageSkeleton variant={skeletonVariantForPath(pathname, isPartnerOrgRole(session.role), can(session.role, 'work-orders'))} />
    </div>
  )
}

/**
 * Page navigation rises in (M3 fade through). Content replacing a visible skeleton only fades, from the skeleton's
 * opacity (capped so it still visibly fades in), so the layout the skeleton promised does not jump. Fast loads
 * never showed the skeleton and rise in. Decided in a layout effect: before paint, after the skeleton's cleanup.
 */
function RouteContent({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Only a handoff from this commit counts; an older record for the same path is stale.
    const fresh = skeletonHandoff?.path === pathname && performance.now() - skeletonHandoff.at < 100
    const from = fresh ? Math.min(skeletonHandoff!.opacity, 0.5) : 0
    const animation = from > 0.05
      ? el.animate([{ opacity: from }, { opacity: 1 }], { duration: M3_DURATION.short4, easing: M3_EASING.standard })
      : el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: M3_DURATION.medium1, easing: M3_EASING.emphasized })
    return () => animation.cancel()
  }, [pathname])
  return <div ref={ref} data-route-content="">{children}</div>
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<RouteSkeleton />}>
        <RouteContent>
          <Outlet />
        </RouteContent>
      </Suspense>
    </Layout>
  )
}

export const appRoutes = createRoutesFromElements(
  <Route
    element={
      <AppProvider>
        <UnsavedChangesProvider>
          <App />
        </UnsavedChangesProvider>
      </AppProvider>
    }
    errorElement={<RootError />}
  >
    {/* Pathless boundary: a failed screen (render error or chunk load) renders inside the shell. */}
    <Route errorElement={<RouteError />}>
          <Route path={Home.paths[0]} element={<Home />} />

          <Route path={SignIn.paths[0]} element={<SignIn />} />
          <Route path={RegisterAccount.paths[0]} element={<RegisterAccount />} />
          <Route path={RedeemInvitation.paths[0]} element={<RedeemInvitation />} />
          <Route path={ForgotPassword.paths[0]} element={<ForgotPassword />} />
          <Route path={ResetPassword.paths[0]} element={<ResetPassword />} />
          <Route path={ExternalLoginConfirmation.paths[0]} element={<ExternalLoginConfirmation />} />
          {/* Server-reserved auth paths: Power Pages serves these itself (the shell header redirects back);
              on the dev server they forward to the SPA pages with the query string intact. */}
          <Route path="/SignIn" element={<LegacyRedirect to="/login" />} />
          <Route path="/Register" element={<LegacyRedirect to="/redeem-invitation" />} />
          <Route path="/Account/Login/Register" element={<LegacyRedirect to="/registration" />} />
          <Route path="/Account/Login/ForgotPassword" element={<LegacyRedirect to="/forgot-password" />} />
          <Route path="/Account/Login/ResetPassword" element={<LegacyRedirect to="/reset-password" />} />
          <Route path="/Account/Login/RedeemInvitation" element={<LegacyRedirect to="/redeem-invitation" />} />
          <Route path={ManageSecurity.paths[0]} element={gate('signed-in', <ManageSecurity mode="set-password" />)} />
          <Route path={ManageSecurity.paths[1]} element={gate('signed-in', <ManageSecurity mode="change-password" />)} />
          <Route path={ManageSecurity.paths[2]} element={gate('signed-in', <ManageSecurity mode="change-email" />)} />
          <Route path={ManageSecurity.paths[3]} element={gate('signed-in', <ManageSecurity mode="change-phone" />)} />
          <Route path={ManageSecurity.paths[4]} element={gate('signed-in', <ManageSecurity mode="change-login" />)} />

          <Route path={ProgramHome.paths[0]} element={<ProgramHome />} />
          <Route path={ProgramDetails.paths[0]} element={<ProgramDetails />} />
          <Route path={BecomePartner.paths[0]} element={<BecomePartner />} />
          <Route path={ProgramFAQs.paths[0]} element={<ProgramFAQs />} />

          <Route path={Sitemap.paths[0]} element={<Sitemap />} />

          <Route path={CustomersHome.paths[0]} element={gate('customers', <CustomersHome />)} />
          <Route path={CustomerAccounts.paths[0]} element={gate('customers', <CustomerAccounts />)} />
          <Route path={CustomerAccountForm.paths[0]} element={gate('customer-account:create', <CustomerAccountForm mode="create" />)} />
          <Route path={CustomerAccountForm.paths[1]} element={gate('customers', <CustomerAccountForm mode="edit" />)} />
          <Route path={CustomerContacts.paths[0]} element={gate('customers', <CustomerContacts />)} />
          <Route path={CustomerContactForm.paths[0]} element={gate('customer-contact:create', <CustomerContactForm mode="create" />)} />
          <Route path={CustomerContactForm.paths[1]} element={gate('customers', <CustomerContactForm mode="edit" />)} />

          <Route path={OpportunitiesHome.paths[0]} element={gate('opportunities', <OpportunitiesHome />)} />
          <Route path={DistributedOpportunities.paths[0]} element={gate('distributed', <DistributedOpportunities />)} />
          <Route path={OpportunitySummary.paths[0]} element={gate('distributed', <OpportunitySummary />)} />
          <Route path={ManagedOpportunities.paths[0]} element={gate('opportunities', <ManagedOpportunities />)} />
          <Route path={CreateOpportunity.paths[0]} element={gate('opportunities', <CreateOpportunity />)} />
          <Route path={OpportunityDetails.paths[0]} element={gate('opportunities', <OpportunityDetails shared={false} />)} />
          <Route path={OpportunityDetails.paths[1]} element={gate('opportunities', <OpportunityDetails shared />)} />

          <Route path={Profile.paths[0]} element={gate('signed-in', <Profile />)} />
          <Route path={ManageAccess.paths[0]} element={gate('manage-access', <ManageAccess />)} />
          <Route path={EditPartnerContact.paths[0]} element={gate('manage-access', <EditPartnerContact />)} />
          <Route path={ParentAccount.paths[0]} element={gate('parent-account', <ParentAccount />)} />
          <Route path={RegisterToBePartner.paths[0]} element={gate('register-partner', <RegisterToBePartner />)} />

          {/* Technician workspace (Partner Technician web role only). */}
          <Route path={WorkOrders.paths[0]} element={gate('work-orders', <WorkOrders />)} />
          <Route path={WorkOrderDetails.paths[0]} element={gate('work-orders', <WorkOrderDetails />)} />

          <Route
            path="/access-denied"
            element={
              <Container>
                <AccessDeniedContent />
              </Container>
            }
          />
          <Route path={NotFound.paths[0]} element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
    </Route>
  </Route>,
)
