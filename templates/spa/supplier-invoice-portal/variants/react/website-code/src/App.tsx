import { lazy, Suspense } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { LogIn, ArrowLeft, Lock } from 'lucide-react'
import Layout from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import DevRoleSwitcher from './components/DevRoleSwitcher'
import { login } from './services/authService'

const Home = lazy(() => import('./pages/Home'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const SubmitInvoice = lazy(() => import('./pages/SubmitInvoice'))
const InvoiceList = lazy(() => import('./pages/InvoiceList'))
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetail'))
const EditInvoice = lazy(() => import('./pages/EditInvoice'))
const ReviewQueue = lazy(() => import('./pages/ReviewQueue'))
const PurchaseOrderList = lazy(() => import('./pages/PurchaseOrderList'))
const PurchaseOrderDetail = lazy(() => import('./pages/PurchaseOrderDetail'))
const CreatePurchaseOrder = lazy(() => import('./pages/CreatePurchaseOrder'))
const Profile = lazy(() => import('./pages/Profile'))
const ReviewerHelp = lazy(() => import('./pages/ReviewerHelp'))
const NotFound = lazy(() => import('./pages/NotFound'))

function SignInPrompt() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', maxWidth: 440, margin: '0 auto' }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--color-primary-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}
      >
        <Lock size={28} color="var(--color-primary)" aria-hidden="true" />
      </div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: 8 }}>
        Sign in required
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: 28 }}>
        Please sign in with your organization account to access the Supplier Invoice Portal.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => login()} className="btn-primary">
          <LogIn size={16} aria-hidden="true" /> Sign In
        </button>
        <Link to="/" className="btn-secondary">
          <ArrowLeft size={16} aria-hidden="true" /> Back to Home
        </Link>
      </div>
    </div>
  )
}

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
      <div
        style={{
          width: 32,
          height: 32,
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
    </div>
  )
}

export default function App() {
  return (
    <>
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<RequireAuth fallback={<SignInPrompt />}><Dashboard /></RequireAuth>} />
            <Route path="/invoices/new" element={<RequireAuth fallback={<SignInPrompt />}><SubmitInvoice /></RequireAuth>} />
            <Route path="/invoices" element={<RequireAuth fallback={<SignInPrompt />}><InvoiceList /></RequireAuth>} />
            <Route path="/invoices/:id" element={<RequireAuth fallback={<SignInPrompt />}><InvoiceDetail /></RequireAuth>} />
            <Route path="/invoices/:id/edit" element={<RequireAuth fallback={<SignInPrompt />}><EditInvoice /></RequireAuth>} />
            <Route path="/review" element={<RequireAuth fallback={<SignInPrompt />}><ReviewQueue /></RequireAuth>} />
            <Route path="/reviewer-help" element={<RequireAuth fallback={<SignInPrompt />}><ReviewerHelp /></RequireAuth>} />
            <Route path="/purchase-orders" element={<RequireAuth fallback={<SignInPrompt />}><PurchaseOrderList /></RequireAuth>} />
            <Route path="/purchase-orders/new" element={<RequireAuth fallback={<SignInPrompt />}><CreatePurchaseOrder /></RequireAuth>} />
            <Route path="/purchase-orders/:id" element={<RequireAuth fallback={<SignInPrompt />}><PurchaseOrderDetail /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth fallback={<SignInPrompt />}><Profile /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Layout>
      <DevRoleSwitcher />
    </>
  )
}
