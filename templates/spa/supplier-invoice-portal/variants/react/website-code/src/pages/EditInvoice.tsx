import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Save, X, FileText, AlertTriangle } from 'lucide-react'
import Toast from '../components/Toast'
import ActionDialog from '../components/ActionDialog'
import usePageTitle from '../hooks/usePageTitle'
import { useInvoiceDetail, useUpdateInvoiceAction, formatCurrency } from '../data/invoiceProvider'
import { useSupplierPOs } from '../data/purchaseOrderProvider'

export default function EditInvoice() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { invoice, isLoading: invoiceLoading } = useInvoiceDetail(id)
  usePageTitle(invoice ? `Edit ${invoice.invoiceNumber}` : 'Edit Invoice')
  const { update, isSubmitting } = useUpdateInvoiceAction()
  const { purchaseOrders: availablePOs, isLoading: posLoading } = useSupplierPOs()
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success')
  const [formInitialized, setFormInitialized] = useState(false)
  const [form, setForm] = useState({
    poNumber: '',
    selectedPOId: '',
    amount: '',
    dueDate: '',
    description: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [shakeKey, setShakeKey] = useState(0)
  const [initialForm, setInitialForm] = useState({ poNumber: '', selectedPOId: '', amount: '', dueDate: '', description: '' })

  // Pre-fill form when both invoice and PO data are loaded
  useEffect(() => {
    if (invoice && !posLoading && !formInitialized) {
      const matchedPO = availablePOs.find(p => p.poNumber === invoice.poNumber)
      const initial = {
        poNumber: invoice.poNumber || '',
        selectedPOId: matchedPO?.id || '',
        amount: invoice.amount ? String(invoice.amount) : '',
        dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : '',
        description: invoice.description || '',
      }
      setForm(initial)
      setInitialForm(initial)
      setFormInitialized(true)
    }
  }, [invoice, formInitialized, availablePOs, posLoading])

  const isDirty = formInitialized && (
    form.poNumber !== initialForm.poNumber ||
    form.selectedPOId !== initialForm.selectedPOId ||
    form.amount !== initialForm.amount ||
    form.dueDate !== initialForm.dueDate ||
    form.description !== initialForm.description
  )

  const selectedPO = availablePOs.find(p => p.id === form.selectedPOId)
  const amountExceedsBalance = selectedPO && form.amount && parseFloat(form.amount) > selectedPO.remainingAmount

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.selectedPOId) errs.poNumber = 'Please select a purchase order'
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Enter a valid amount'
    if (!form.dueDate) errs.dueDate = 'Due date is required'
    return errs
  }

  function validateField(field: string) {
    const fieldErrors: Record<string, string> = {}
    if (field === 'poNumber' && !form.selectedPOId) {
      fieldErrors.poNumber = 'Please select a purchase order'
    }
    if (field === 'amount' && form.amount !== '' && Number(form.amount) <= 0) {
      fieldErrors.amount = 'Enter a valid amount'
    }
    if (field === 'dueDate' && form.dueDate === '' && errors.dueDate) {
      fieldErrors.dueDate = 'Due date is required'
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

  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
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

    const success = await update(id, {
      poNumber: form.poNumber,
      amount: Number(form.amount),
      dueDate: form.dueDate,
      description: form.description,
    })
    if (success) {
      setToastVariant('success')
      setToastMessage('Invoice updated successfully')
      navTimerRef.current = setTimeout(() => {
        navTimerRef.current = null
        navigate(`/invoices/${id}`)
      }, 1500)
    } else {
      setToastVariant('error')
      setToastMessage('Failed to save invoice. Please try again.')
    }
  }

  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  function handleCancel() {
    if (isDirty) {
      setShowDiscardDialog(true)
    } else {
      navigate(`/invoices/${id}`)
    }
  }

  if (invoiceLoading) {
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

  if (!invoice) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <FileText size={48} color="var(--color-text-muted)" aria-hidden="true" style={{ marginBottom: 12 }} />
        <h1 style={{ fontFamily: 'var(--font-heading)', marginBottom: 12 }}>Invoice not found</h1>
        <button onClick={() => navigate('/invoices')} className="btn-primary">
          Back to Invoices
        </button>
      </div>
    )
  }

  // Only allow editing Draft or Needs Revision invoices
  const canEdit = invoice.status === 'Draft' || invoice.status === 'Needs Revision'
  if (!canEdit) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <FileText size={48} color="var(--color-text-muted)" aria-hidden="true" style={{ marginBottom: 12 }} />
        <h1 style={{ fontFamily: 'var(--font-heading)', marginBottom: 12 }}>Cannot edit this invoice</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>
          Only Draft or Needs Revision invoices can be edited.
        </p>
        <button onClick={() => navigate(`/invoices/${id}`)} className="btn-primary">
          Back to Invoice
        </button>
      </div>
    )
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
      {toastMessage && (
        <Toast message={toastMessage} variant={toastVariant} onClose={() => setToastMessage(null)} />
      )}

      <div className="animate-in">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" style={{ marginBottom: 16 }}>
          <ol style={{ listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
            <li>
              <Link to="/invoices" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
                My Invoices
              </Link>
            </li>
            <li style={{ color: 'var(--color-text-muted)' }} aria-hidden="true">/</li>
            <li>
              <Link to={`/invoices/${id}`} style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
                {invoice.invoiceNumber}
              </Link>
            </li>
            <li style={{ color: 'var(--color-text-muted)' }} aria-hidden="true">/</li>
            <li style={{ color: 'var(--color-text)', fontWeight: 500 }} aria-current="page">
              Edit
            </li>
          </ol>
        </nav>

        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          Edit {invoice.invoiceNumber}
        </h1>
        <p
          style={{
            fontSize: '0.925rem',
            color: 'var(--color-text-muted)',
            marginBottom: 28,
          }}
        >
          Update the invoice details below.
        </p>
      </div>

      {/* Revision reason banner */}
      {invoice.status === 'Needs Revision' && (() => {
        const revisionEntry = [...invoice.statusHistory].reverse().find(h =>
          h.status === 'Needs Revision' && h.note
        )
        if (!revisionEntry) return null
        return (
          <div
            className="animate-in animate-in-1"
            style={{
              background: 'var(--color-revision-light)',
              border: '1px solid var(--color-revision)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 18px',
              marginBottom: 20,
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={18} color="var(--color-revision)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-revision)', marginBottom: 4 }}>
                Revision Requested
              </div>
              <p style={{ fontSize: '0.85rem', color: '#BF360C', lineHeight: 1.5 }}>
                {revisionEntry.note}
                {revisionEntry.author && (
                  <span style={{ fontWeight: 500 }}> — {revisionEntry.author}</span>
                )}
              </p>
            </div>
          </div>
        )
      })()}

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
        {/* Invoice Number (read-only) */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 500,
              marginBottom: 6,
            }}
          >
            Invoice Number
          </label>
          <input
            type="text"
            value={invoice.invoiceNumber}
            disabled
            style={{
              ...inputStyle(''),
              background: 'var(--color-bg)',
              color: 'var(--color-text-muted)',
              cursor: 'not-allowed',
            }}
          />
        </div>

        {/* Purchase Order */}
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
            Purchase Order <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <select
            key={errors.poNumber ? `po-${shakeKey}` : 'po'}
            id="poNumber"
            value={form.selectedPOId}
            onChange={(e) => {
              const po = availablePOs.find(p => p.id === e.target.value)
              setForm(prev => ({
                ...prev,
                selectedPOId: e.target.value,
                poNumber: po?.poNumber || '',
              }))
              if (errors.poNumber && e.target.value) {
                setErrors((prev) => { const next = { ...prev }; delete next.poNumber; return next })
              }
            }}
            onBlur={() => validateField('poNumber')}
            aria-required="true"
            aria-invalid={!!errors.poNumber}
            aria-describedby={errors.poNumber ? 'poNumber-error' : undefined}
            className={inputClassName('poNumber')}
            style={{ ...inputStyle('poNumber'), cursor: 'pointer' }}
            disabled={posLoading}
          >
            <option value="">{posLoading ? 'Loading POs...' : 'Select a purchase order'}</option>
            {availablePOs.map(po => (
              <option key={po.id} value={po.id}>
                {po.poNumber} — {formatCurrency(po.remainingAmount)} remaining
              </option>
            ))}
          </select>
          {errors.poNumber && (
            <p
              id="poNumber-error"
              role="alert"
              style={{ color: 'var(--color-error)', fontSize: '0.8rem', marginTop: 4 }}
            >
              {errors.poNumber}
            </p>
          )}
          {selectedPO && (
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              {selectedPO.description} — Balance: {formatCurrency(selectedPO.remainingAmount)}
            </p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label
            htmlFor="amount"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 500,
              marginBottom: 6,
            }}
          >
            Amount (USD) <span style={{ color: 'var(--color-error)' }}>*</span>
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
              key={errors.amount ? `amt-${shakeKey}` : 'amt'}
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value
                if (v.startsWith('-')) (e.target as HTMLInputElement).value = v.replace(/-/g, '')
              }}
              onChange={(e) => {
                setForm(prev => ({ ...prev, amount: e.target.value }))
                if (errors.amount && Number(e.target.value) > 0) {
                  setErrors((prev) => { const next = { ...prev }; delete next.amount; return next })
                }
              }}
              onBlur={() => validateField('amount')}
              aria-required="true"
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? 'amount-error' : undefined}
              className={inputClassName('amount')}
              style={{ ...inputStyle('amount'), paddingLeft: 30 }}
            />
          </div>
          {errors.amount && (
            <p
              id="amount-error"
              role="alert"
              style={{ color: 'var(--color-error)', fontSize: '0.8rem', marginTop: 4 }}
            >
              {errors.amount}
            </p>
          )}
          {amountExceedsBalance && (
            <p style={{ color: 'var(--color-warning)', fontSize: '0.8rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={14} aria-hidden="true" />
              Amount exceeds remaining PO balance of {formatCurrency(selectedPO!.remainingAmount)}
            </p>
          )}
        </div>

        {/* Due Date */}
        <div>
          <label
            htmlFor="dueDate"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 500,
              marginBottom: 6,
            }}
          >
            Due Date <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <input
            key={errors.dueDate ? `dd-${shakeKey}` : 'dd'}
            id="dueDate"
            type="date"
            value={form.dueDate}
            onChange={(e) => {
              setForm(prev => ({ ...prev, dueDate: e.target.value }))
              if (errors.dueDate && e.target.value) {
                setErrors((prev) => { const next = { ...prev }; delete next.dueDate; return next })
              }
            }}
            onBlur={() => validateField('dueDate')}
            aria-required="true"
            aria-invalid={!!errors.dueDate}
            aria-describedby={errors.dueDate ? 'dueDate-error' : undefined}
            className={inputClassName('dueDate')}
            style={inputStyle('dueDate')}
          />
          {errors.dueDate && (
            <p
              id="dueDate-error"
              role="alert"
              style={{ color: 'var(--color-error)', fontSize: '0.8rem', marginTop: 4 }}
            >
              {errors.dueDate}
            </p>
          )}
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
            placeholder="Describe the goods or services..."
            value={form.description}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
            style={{ ...inputStyle('description'), resize: 'vertical' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? (
              <><span className="btn-spinner" aria-hidden="true" /> Saving...</>
            ) : (
              <><Save size={16} aria-hidden="true" /> Save Changes</>
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
          onConfirm={async () => { navigate(`/invoices/${id}`) }}
          onCancel={() => setShowDiscardDialog(false)}
        />
      )}
    </div>
  )
}
