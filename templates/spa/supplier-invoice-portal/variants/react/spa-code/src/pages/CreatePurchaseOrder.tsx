import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Send, X, AlertTriangle } from 'lucide-react'
import { useCreatePOAction } from '../data/purchaseOrderProvider'
import ActionDialog from '../components/ActionDialog'
import usePageTitle from '../hooks/usePageTitle'
import { useAuthorization } from '../hooks/useAuthorization'

export default function CreatePurchaseOrder() {
  usePageTitle('Create Purchase Order')
  const navigate = useNavigate()
  const { isReviewer } = useAuthorization()
  const { submit, isSubmitting, error } = useCreatePOAction()

  const [form, setForm] = useState({
    poNumber: '',
    totalAmount: '',
    deliveryDate: '',
    description: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [shakeKey, setShakeKey] = useState(0)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  const isDirty =
    form.poNumber !== '' ||
    form.totalAmount !== '' ||
    form.deliveryDate !== '' ||
    form.description !== ''

  // Guard: only reviewers can create POs
  if (!isReviewer) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <AlertTriangle size={48} color="var(--color-error)" aria-hidden="true" style={{ marginBottom: 12 }} />
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: 8 }}>Access Denied</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
          Only reviewers can create purchase orders.
        </p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">
          Back to Dashboard
        </button>
      </div>
    )
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.poNumber.trim()) errs.poNumber = 'PO Number is required'
    if (!form.totalAmount || Number(form.totalAmount) <= 0) errs.totalAmount = 'Enter a valid amount'
    return errs
  }

  function validateField(field: string) {
    const fieldErrors: Record<string, string> = {}
    if (field === 'poNumber' && !form.poNumber.trim()) {
      fieldErrors.poNumber = 'PO Number is required'
    }
    if (field === 'totalAmount' && form.totalAmount !== '' && Number(form.totalAmount) <= 0) {
      fieldErrors.totalAmount = 'Enter a valid amount'
    }
    setErrors((prev) => {
      const next = { ...prev }
      if (fieldErrors[field]) {
        next[field] = fieldErrors[field]
      } else {
        delete next[field]
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      setShakeKey((k) => k + 1)
      const firstErrorField = Object.keys(errs)[0]
      const el = document.getElementById(firstErrorField)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus()
      return
    }

    const success = await submit({
      poNumber: form.poNumber.trim(),
      description: form.description.trim(),
      totalAmount: parseFloat(form.totalAmount),
      deliveryDate: form.deliveryDate || '',
    })

    if (success) {
      navigate('/purchase-orders')
    }
  }

  function handleCancel() {
    if (isDirty) {
      setShowDiscardDialog(true)
    } else {
      navigate('/purchase-orders')
    }
  }

  const inputClassName = (field: string) => errors[field] ? 'field-shake' : ''

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--radius)',
    border: `1px solid ${errors[field] ? 'var(--color-error)' : 'var(--color-border)'}`,
    fontSize: '0.938rem',
    fontFamily: 'var(--font-body)',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  })

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="animate-in" style={{ marginBottom: 16 }}>
        <ol style={{ listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
          <li>
            <Link to="/dashboard" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Dashboard</Link>
          </li>
          <li style={{ color: 'var(--color-text-muted)' }} aria-hidden="true">/</li>
          <li>
            <Link to="/purchase-orders" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Purchase Orders</Link>
          </li>
          <li style={{ color: 'var(--color-text-muted)' }} aria-hidden="true">/</li>
          <li style={{ color: 'var(--color-text)', fontWeight: 500 }} aria-current="page">Create</li>
        </ol>
      </nav>

      <div className="animate-in">
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          Create Purchase Order
        </h1>
        <p
          style={{
            fontSize: '0.925rem',
            color: 'var(--color-text-muted)',
            marginBottom: 28,
          }}
        >
          Fill in the details to create a new purchase order.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="animate-in animate-in-2"
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: 32,
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
        }}
      >
        {/* PO Number */}
        <div>
          <label
            htmlFor="poNumber"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 500,
              marginBottom: 6,
            }}
          >
            PO Number <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <input
            key={errors.poNumber ? `po-${shakeKey}` : 'po'}
            id="poNumber"
            type="text"
            placeholder="e.g. PO-2026-015"
            value={form.poNumber}
            onChange={(e) => {
              setForm(prev => ({ ...prev, poNumber: e.target.value }))
              if (errors.poNumber && e.target.value.trim()) {
                setErrors((prev) => { const next = { ...prev }; delete next.poNumber; return next })
              }
            }}
            onBlur={() => validateField('poNumber')}
            aria-required="true"
            aria-invalid={!!errors.poNumber}
            aria-describedby={errors.poNumber ? 'poNumber-error' : undefined}
            className={inputClassName('poNumber')}
            style={inputStyle('poNumber')}
          />
          {errors.poNumber && (
            <p
              id="poNumber-error"
              role="alert"
              style={{ color: 'var(--color-error)', fontSize: '0.8rem', marginTop: 4 }}
            >
              {errors.poNumber}
            </p>
          )}
        </div>

        {/* Total Amount */}
        <div>
          <label
            htmlFor="totalAmount"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 500,
              marginBottom: 6,
            }}
          >
            Total Amount (USD) <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
                fontSize: '0.938rem',
              }}
            >
              $
            </span>
            <input
              key={errors.totalAmount ? `amt-${shakeKey}` : 'amt'}
              id="totalAmount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={form.totalAmount}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value
                if (v.startsWith('-')) (e.target as HTMLInputElement).value = v.replace(/-/g, '')
              }}
              onChange={(e) => {
                setForm(prev => ({ ...prev, totalAmount: e.target.value }))
                if (errors.totalAmount && Number(e.target.value) > 0) {
                  setErrors((prev) => { const next = { ...prev }; delete next.totalAmount; return next })
                }
              }}
              onBlur={() => validateField('totalAmount')}
              aria-required="true"
              aria-invalid={!!errors.totalAmount}
              aria-describedby={errors.totalAmount ? 'totalAmount-error' : undefined}
              className={inputClassName('totalAmount')}
              style={{ ...inputStyle('totalAmount'), paddingLeft: 30 }}
            />
          </div>
          {errors.totalAmount && (
            <p
              id="totalAmount-error"
              role="alert"
              style={{ color: 'var(--color-error)', fontSize: '0.8rem', marginTop: 4 }}
            >
              {errors.totalAmount}
            </p>
          )}
        </div>

        {/* Delivery Date */}
        <div>
          <label
            htmlFor="deliveryDate"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 500,
              marginBottom: 6,
            }}
          >
            Delivery Date
          </label>
          <input
            id="deliveryDate"
            type="date"
            value={form.deliveryDate}
            onChange={(e) => setForm(prev => ({ ...prev, deliveryDate: e.target.value }))}
            style={inputStyle('deliveryDate')}
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 500,
              marginBottom: 6,
            }}
          >
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            placeholder="Describe what this purchase order covers..."
            value={form.description}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
            style={{ ...inputStyle('description'), resize: 'vertical' }}
          />
        </div>

        {error && (
          <div style={{ color: 'var(--color-error)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} aria-hidden="true" /> {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? (
              <><span className="btn-spinner" aria-hidden="true" /> Creating...</>
            ) : (
              <><Send size={16} aria-hidden="true" /> Create Purchase Order</>
            )}
          </button>
          <button type="button" onClick={handleCancel} className="btn-secondary">
            <X size={16} aria-hidden="true" /> Cancel
          </button>
        </div>
      </form>

      {showDiscardDialog && (
        <ActionDialog
          open={true}
          title="Discard changes?"
          description="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
          confirmLabel="Discard"
          confirmVariant="danger"
          onConfirm={async () => { navigate('/purchase-orders') }}
          onCancel={() => setShowDiscardDialog(false)}
        />
      )}
    </div>
  )
}
