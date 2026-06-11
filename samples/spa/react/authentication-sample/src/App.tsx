import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Menu from './pages/Menu'
import Offers from './pages/Offers'
import Branches from './pages/Branches'
import Contact from './pages/Contact'
import Login from './pages/Login'
import Registration from './pages/Registration'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import RedeemInvitation from './pages/RedeemInvitation'
import Profile from './pages/Profile'
import Terms from './pages/Terms'
import ExternalLoginConfirmation from './pages/ExternalLoginConfirmation'
import { RequireAuth } from './components/RequireAuth'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/branches" element={<Branches />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registration" element={<Registration />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/redeem-invitation" element={<RedeemInvitation />} />
        <Route
          path="/user-profile"
          element={
            <RequireAuth fallback={<Navigate to="/login" replace />}>
              <Profile />
            </RequireAuth>
          }
        />
        <Route path="/terms" element={<Terms />} />
        <Route path="/external-login-confirmation" element={<ExternalLoginConfirmation />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
