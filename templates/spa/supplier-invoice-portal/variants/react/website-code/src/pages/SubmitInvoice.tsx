import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Send, X, AlertTriangle } from 'lucide-react'
import FileUpload from '../components/FileUpload'
import type { UploadedFile } from '../components/FileUpload'
import ActionDialog from '../components/ActionDialog'
import usePageTitle from '../hooks/usePageTitle'
import { useCreateInvoiceAction, formatCurrency } from '../data/invoiceProvider'
import { useSupplierPOs } from '../data/purchaseOrderProvider'

export default function SubmitInvoice() {
  usePageTitle('Submit Invoice')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preSelectedPO = searchParams.get('po') || ''
  const { submit: submitInvoice, isSubmitting } = useCreateInvoiceAction()
  const { purchaseOrders: availablePOs, isLoading: posLoading } = useSupplierPOs()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [form, setForm] = useState({
    poNumber: '',
    selectedPOId: preSelectedPO,
    amount: '',
    dueDate: '',
    description: '',
  })

  // Pre-select PO from query param once POs are loaded
  useEffect(() => {
    if (preSelectedPO && availablePOs.length > 0 && !form.poNumber) {
      const po = availablePOs.find(p => p.id === preSelectedPO)
      if (po) {
        setForm(prev => ({ ...prev, selectedPOId: po.id, poNumber: po.poNumber }))
      }
    }
  }, [preSelectedPO, availablePOs, form.poNumber])

  const selectedPO = availablePOs.find(p => p.id === form.selectedPOId)
  const amountExceedsBalance = selectedPO && form.amount && parseFloat(form.amount) > selectedPO.remainingAmount
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [shakeKey, setShakeKey] = useState(0)

  const isDirty =
    form.selectedPOId !== '' ||
    form.amount !== '' ||
    form.dueDate !== '' ||
    form.description !== '' ||
    uploadedFiles.length > 0

  const handleFilesChange = useCallback((files: UploadedFile[]) => {
    setUploadedFiles(files)
  }, [])

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      setShakeKey((k) => k + 1)
      // Scroll to first error field
      const firstErrorField = Object.keys(errs)[0]
      const el = document.getElementById(firstErrorField)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus()
      return
    }

    const success = await submitInvoice({
      poNumber: form.poNumber,
      amount: Number(form.amount),
      dueDate: form.dueDate,
      description: form.description,
      files: uploadedFiles.map(f => ({ file: f.file, name: f.name, size: f.size })),
    })
    if (success) {
      navigate('/invoices', { state: { toast: 'Invoice submitted successfully' } })
    }
  }

  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  function handleCancel() {
    if (isDirty) {
      setShowDiscardDialog(true)
    } else {
      navigate('/invoices')
    }
  }

  const today = new Date().toISOString().split('T')[0]

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
      <div className="animate-in">
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          Submit New Invoice
        </h1>
        <p
          style={{
            fontSize: '0.925rem',
            color: 'var(--color-text-muted)',
            marginBottom: 28,
          }}
        >
          Fill in the details to create and submit your invoice.
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
        {/* PO Number — dropdown picker */}
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
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 6 }}>
            Must be today or a future date
          </p>
          <input
            key={errors.dueDate ? `dd-${shakeKey}` : 'dd'}
            id="dueDate"
            type="date"
            min={today}
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

        {/* File Upload */}
        <FileUpload onFilesChange={handleFilesChange} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? (
              <><span className="btn-spinner" aria-hidden="true" /> Submitting...</>
            ) : (
              <><Send size={16} aria-hidden="true" /> Submit Invoice</>
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
          onConfirm={async () => { navigate('/invoices') }}
          onCancel={() => setShowDiscardDialog(false)}
        />
      )}
    </div>
  )
}
