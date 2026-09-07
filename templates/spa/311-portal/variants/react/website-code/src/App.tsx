import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import Layout from './components/Layout'
import AuthGate from './components/AuthGate'
import { useI18n } from './i18n'
import Home from './pages/Home'
import Services from './pages/Services'
import ServiceDetail from './pages/ServiceDetail'
import CreateRequest from './pages/CreateRequest'
import Track from './pages/Track'
import RequestMap from './pages/RequestMap'
import Knowledge from './pages/Knowledge'
import ArticleDetail from './pages/ArticleDetail'
import Contact from './pages/Contact'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Registration from './pages/Registration'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import RedeemInvitation from './pages/RedeemInvitation'
import ExternalLoginConfirmation from './pages/ExternalLoginConfirmation'
import UserProfile from './pages/UserProfile'

function formatPathSegment(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const segment = decodeURIComponent(segments[segments.length - 1] ?? '')
  return segment
    .split('-')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function ScrollToTop() {
  const { pathname } = useLocation()
  const isInitialRender = useRef(true)

  useEffect(() => {
    window.scrollTo(0, 0)
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }
    document.getElementById('main-content')?.focus()
  }, [pathname])
  return null
}

export default function App() {
  const { t } = useI18n()
  const { pathname } = useLocation()

  useEffect(() => {
    const pageTitle =
      pathname === '/' ? t('home.title')
        : pathname === '/services' ? t('services.title')
          : pathname.startsWith('/services/') ? formatPathSegment(pathname)
            : pathname.startsWith('/request/new/') ? t('createRequest.newRequest')
              : pathname === '/track' ? t('track.title')
                : pathname === '/requests/map' ? t('requestMap.title')
                  : pathname === '/knowledge' ? t('knowledge.title')
                    : pathname.startsWith('/knowledge/') ? formatPathSegment(pathname)
                      : pathname === '/contact' ? t('contact.title')
                        : pathname === '/login' ? t('common.signIn')
                          : pathname === '/registration' ? t('register.title')
                            : pathname === '/forgot-password' ? t('forgotPassword.title')
                              : pathname === '/reset-password' ? t('resetPassword.title')
                                : pathname === '/redeem-invitation' ? t('redeemInvitation.title')
                                  : pathname === '/external-login-confirmation' ? t('externalConfirm.title')
                                    : pathname === '/user-profile' ? t('userProfile.title')
                                      : pathname === '/admin' ? t('nav.admin')
                                        : 'Zava 311 Portal'

    document.title = `${pageTitle} - Zava 311 Portal`
  }, [pathname, t])

  return (
    <Layout>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/services/:slug" element={<ServiceDetail />} />
        <Route path="/request/new/:slug" element={
          <AuthGate message={t('auth.signInToSubmit')}>
            <CreateRequest />
          </AuthGate>
        } />
        <Route path="/track" element={
          <AuthGate message={t('auth.signInToTrack')}>
            <Track />
          </AuthGate>
        } />
        <Route path="/requests/map" element={<RequestMap />} />
        <Route path="/knowledge" element={<Knowledge />} />
        <Route path="/knowledge/:slug" element={<ArticleDetail />} />
        <Route path="/contact" element={<Contact />} />

        {/* Auth. These replace the server-rendered Power Pages pages; the
            Code-Site-Shell-Header web template rewrites the server URLs here. */}
        <Route path="/login" element={<Login />} />
        <Route path="/registration" element={<Registration />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/redeem-invitation" element={<RedeemInvitation />} />
        <Route path="/external-login-confirmation" element={<ExternalLoginConfirmation />} />

        {/* Not /profile — that path is reserved by the Power Pages server for its
            own legacy profile page. */}
        <Route path="/user-profile" element={<UserProfile />} />

        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Layout>
  )
}
