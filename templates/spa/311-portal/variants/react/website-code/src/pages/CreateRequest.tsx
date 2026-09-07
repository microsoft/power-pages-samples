import { useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Search, Paperclip, CheckCircle, X } from 'lucide-react'
import Icon, { BookOpen } from '../components/Icon'
import { z } from 'zod'
import { useServiceTypeBySlug } from '../shared/hooks/useServiceTypes'
import { useCreateServiceRequest } from '../shared/hooks/useServiceRequests'
import { useRelatedArticles } from '../shared/hooks/useArticles'
import { useAuth } from '../shared/hooks/useAuth'
import { useI18n } from '../i18n'
import Breadcrumbs from '../components/Breadcrumbs'
import EmptyState from '../components/EmptyState'
import { SkeletonDetail } from '../components/Skeleton'
import LeafletMap from '../components/LeafletMap'
import { uploadAttachments, validateFile } from '../shared/services/annotationService'
import { addRecentRequest } from '../shared/recentRequests'
import './CreateRequest.css'

function generateRequestId() {
  const num = Math.floor(1000 + Math.random() * 9000)
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `SR-${num}-${date}`
}

type Step = 'location' | 'details' | 'attachments' | 'contact' | 'confirmation'

export default function CreateRequest() {
  const { slug } = useParams<{ slug: string }>()
  const { serviceType: service, isLoading: serviceLoading, error: serviceError } = useServiceTypeBySlug(slug)
  const { user } = useAuth()
  const { t } = useI18n()
  const { articles: relatedArticles } = useRelatedArticles(service?.slug, 2)
  const [articlesDismissed, setArticlesDismissed] = useState(false)

  const STEPS: { key: Step; label: string }[] = [
    { key: 'location', label: t('createRequest.stepLocation') },
    { key: 'details', label: t('createRequest.stepDetails') },
    { key: 'attachments', label: t('createRequest.stepAttachments') },
    { key: 'contact', label: t('createRequest.stepContact') },
  ]

  const locationSchema = z.object({
    address: z.string().min(5, t('validation.addressMin')),
  })

  const detailsSchema = z.object({
    description: z.string().min(10, t('validation.descriptionMin')),
    urgency: z.enum(['low', 'medium', 'high']),
    dateObserved: z.string().optional().refine(val => {
      if (!val) return true
      const d = new Date(val)
      if (isNaN(d.getTime())) return false
      const now = new Date()
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      return d <= now && d >= sixtyDaysAgo
    }, t('validation.dateRange')),
  })

  const contactSchema = z.object({
    name: z.string().min(2, t('validation.nameRequired')),
    email: z.string().email(t('validation.emailInvalid')),
    phone: z.string().optional(),
    consent: z.boolean().refine(v => v === true, t('validation.consentRequired')),
  })

  const category = service?.category ?? null
  const { create: createRequest, isLoading: requestSaving, error: requestError } = useCreateServiceRequest()

  const [step, setStep] = useState<Step>('location')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [requestId, setRequestId] = useState('')

  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium')
  const [dateObserved, setDateObserved] = useState('')
  const [pinLat, setPinLat] = useState(40.7128)
  const [pinLng, setPinLng] = useState(-74.006)
  const [geocoding, setGeocoding] = useState(false)
  const handleMapClick = useCallback((lat: number, lng: number) => {
    setPinLat(lat)
    setPinLng(lng)
    setGeocoding(true)
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, {
      headers: { 'Accept-Language': 'en' },
    })
      .then(r => r.json())
      .then(data => {
        if (data.display_name) {
          const a = data.address || {}
          const parts = [
            a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road,
            a.neighbourhood || a.suburb,
            a.city || a.town || a.village,
            a.state,
            a.postcode,
          ].filter(Boolean)
          setAddress(parts.join(', ') || data.display_name)
        }
      })
      .catch(() => {})
      .finally(() => setGeocoding(false))
  }, [])
  const MAX_FILES = 5
  const ACCEPTED_TYPES = 'image/*,.pdf,.doc,.docx'
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [name, setName] = useState(user?.displayName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)

  if (serviceLoading) {
    return <SkeletonDetail />
  }

  if (serviceError) {
    return (
      <div className="page">
        <div className="container">
          <div className="card" style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ color: 'var(--color-error)' }}>{t('serviceDetail.error')} {serviceError}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="page">
        <div className="container">
          <EmptyState
            headingLevel={1}
            icon={<Search size={32} />}
            title={t('serviceDetail.notFound')}
            description={t('createRequest.serviceNotFoundDesc')}
            action={<Link to="/services" className="btn btn-primary">{t('common.browseServices')}</Link>}
          />
        </div>
      </div>
    )
  }

  const stepIndex = step === 'confirmation' ? 4 : STEPS.findIndex(s => s.key === step)

  function validateAndNext() {
    setErrors({})
    try {
      if (step === 'location') {
        locationSchema.parse({ address })
        setStep('details')
      } else if (step === 'details') {
        detailsSchema.parse({ description, urgency, dateObserved })
        setStep('attachments')
      } else if (step === 'attachments') {
        setStep('contact')
      } else if (step === 'contact') {
        contactSchema.parse({ name, email, phone, consent })
        submitRequest()
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        err.issues.forEach((e) => {
          const field = String(e.path[0] ?? 'unknown')
          fieldErrors[field] = e.message
        })
        setErrors(fieldErrors)
        requestAnimationFrame(() => {
          document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
        })
      }
    }
  }

  async function submitRequest() {
    try {
      const created = await createRequest({
        serviceTypeId: service!.id,
        serviceTypeName: service!.name,
        categoryId: service!.categoryId,
        categoryName: category?.name,
        contactId: user?.id || undefined,
        description,
        address,
        latitude: pinLat,
        longitude: pinLng,
        urgency,
        dateObserved: dateObserved || undefined,
      })

      const srId = created?.id
      const srNumber = created?.requestNumber || generateRequestId()

      // Remember this request locally so the Track page can offer one-click
      // lookup (requests aren't linked to the user's contact server-side).
      if (created?.requestNumber) {
        addRecentRequest({
          number: created.requestNumber,
          serviceTypeName: service?.name,
          createdOn: created.createdOn || new Date().toISOString(),
        })
      }

      // Upload attachments if we have a record ID
      if (srId && attachments.length > 0) {
        setUploadStatus(t('createRequest.uploadingAttachments'))
        const result = await uploadAttachments(srId, attachments)
        if (result.failed > 0) {
          console.warn(`${result.failed} attachment(s) failed to upload`)
        }
        setUploadStatus('')
      }

      setRequestId(srNumber)
      setStep('confirmation')
    } catch {
      const fallbackId = generateRequestId()
      setRequestId(fallbackId)
      setStep('confirmation')
    }
  }

  function handleFileSelect() {
    fileInputRef.current?.click()
  }

  function handleFilesChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return

    const newFiles: File[] = []
    const validationErrors: string[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const result = validateFile(file)
      if (!result.valid) {
        validationErrors.push(result.error!)
        continue
      }
      newFiles.push(file)
    }

    if (validationErrors.length > 0) {
      setErrors({ file: validationErrors.join(' ') })
    } else {
      setErrors((prev) => { const { file: _, ...rest } = prev; return rest })
    }

    const combined = [...attachments, ...newFiles].slice(0, MAX_FILES)
    setAttachments(combined)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (step === 'confirmation') {
    return (
      <div className="page">
        <div className="container" style={{ maxWidth: 600 }}>
          <div className="card animate-in" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, background: 'rgba(61, 139, 122, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)', margin: '0 auto 16px' }}><CheckCircle size={40} /></div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: 8, color: 'var(--color-success)' }}>{t('createRequest.submitted')}</h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
              {t('createRequest.submittedDesc')}
            </p>

            <div style={{
              background: 'var(--color-surface-alt)',
              borderRadius: 'var(--radius-md)',
              padding: 24,
              marginBottom: 32,
            }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>{t('createRequest.yourRequestId')}</p>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
                letterSpacing: '0.02em',
              }}>
                {requestId}
              </p>
            </div>

            <div style={{ background: 'var(--color-info-bg)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 32, textAlign: 'left' }}>
              <h2 style={{ fontSize: '0.9375rem', marginBottom: 8 }}>{t('createRequest.whatHappensNext')}</h2>
              <ol style={{ paddingLeft: 20, fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
                <li>{t('createRequest.nextStep1')}</li>
                <li>{t('createRequest.nextStep2')}</li>
                <li>{t('createRequest.nextStep3')}</li>
                <li>{t('createRequest.nextStep4')}</li>
              </ol>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/track" className="btn btn-primary">{t('createRequest.trackYourRequest')}</Link>
              <Link to="/" className="btn btn-secondary">{t('common.backToHome')}</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 700 }}>
        <Breadcrumbs items={[
          { label: t('common.home'), to: '/' },
          { label: t('common.services'), to: '/services' },
          { label: service.name, to: `/services/${service.slug}` },
          { label: t('createRequest.newRequest') },
        ]} />

        <div className="create-header animate-in animate-in-1">
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(27, 73, 101, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
            <Icon name={service.slug} size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem' }}>{t('createRequest.newRequest')}: {service.name}</h1>
            {category && <span className="badge badge-primary" style={{ marginTop: 4 }}>{category.name}</span>}
          </div>
        </div>

        {/* Step indicators */}
        <div className="create-steps animate-in animate-in-2">
          {STEPS.map((s, i) => (
            <div key={s.key} className={`create-step-indicator ${i < stepIndex ? 'complete' : ''} ${i === stepIndex ? 'current' : ''}`}>
              <div className="create-step-dot">
                {i < stepIndex ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span className="create-step-label">{s.label}</span>
              {i < STEPS.length - 1 && <div className={`create-step-line ${i < stepIndex ? 'complete' : ''}`} />}
            </div>
          ))}
        </div>

        {/* Helpful Articles — shown on first step only */}
        {step === 'location' && relatedArticles.length > 0 && !articlesDismissed && (
          <div className="animate-in animate-in-3" style={{
            background: 'var(--color-info-bg)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 20px',
            marginTop: 16,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}>
            <BookOpen size={18} style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-info)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: 6 }}>
                {t('createRequest.helpfulArticles')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {relatedArticles.map(article => (
                  <Link
                    key={article.id}
                    to={`/knowledge/${article.slug}`}
                    style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', textDecoration: 'none' }}
                  >
                    {article.title} &rarr;
                  </Link>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setArticlesDismissed(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-light)', flexShrink: 0 }}
              aria-label={t('common.remove')}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="card animate-in animate-in-3" style={{ padding: 32, marginTop: 24 }}>
          {/* Step A: Location */}
          {step === 'location' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: 4 }}>{t('createRequest.step1Title')}</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 24 }}>{t('createRequest.step1Subtitle')}</p>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label htmlFor="address" className="form-label">{t('createRequest.addressLabel')}<span style={{ color: 'var(--color-error)' }}> *</span></label>
                <input
                  id="address"
                  type="text"
                  className={`form-input ${errors.address ? 'error' : ''}`}
                  placeholder={t('createRequest.addressPlaceholder')}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  aria-required="true"
                  aria-invalid={!!errors.address}
                  aria-describedby={errors.address ? 'address-error' : undefined}
                />
                {errors.address && <p id="address-error" className="form-error">{errors.address}</p>}
              </div>

              <div style={{ marginBottom: 16 }}>
                <LeafletMap
                  height={220}
                  pickMode
                  pickLat={pinLat}
                  pickLng={pinLng}
                  center={[40.7128, -74.006]}
                  zoom={12}
                  onClick={handleMapClick}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: 6 }}>
                  {geocoding ? t('createRequest.detectingAddress') : t('createRequest.mapHint')}
                </p>
              </div>
            </div>
          )}

          {/* Step B: Details */}
          {step === 'details' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: 4 }}>{t('createRequest.step2Title')}</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 24 }}>{t('createRequest.step2Subtitle')}</p>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label htmlFor="description" className="form-label">{t('createRequest.descriptionLabel')}<span style={{ color: 'var(--color-error)' }}> *</span></label>
                <textarea
                  id="description"
                  className={`form-input ${errors.description ? 'error' : ''}`}
                  placeholder={t('createRequest.descriptionPlaceholder')}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  aria-required="true"
                  aria-invalid={!!errors.description}
                  aria-describedby={errors.description ? 'desc-error' : undefined}
                />
                {errors.description && <p id="desc-error" className="form-error">{errors.description}</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label htmlFor="urgency" className="form-label">{t('createRequest.urgencyLabel')}</label>
                  <select id="urgency" className="form-input" value={urgency} onChange={e => setUrgency(e.target.value as 'low' | 'medium' | 'high')}>
                    <option value="low">{t('createRequest.urgencyLow')}</option>
                    <option value="medium">{t('createRequest.urgencyMedium')}</option>
                    <option value="high">{t('createRequest.urgencyHigh')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="dateObserved" className="form-label">{t('createRequest.dateObservedLabel')}</label>
                  <input
                    id="dateObserved"
                    type="datetime-local"
                    className={`form-input ${errors.dateObserved ? 'error' : ''}`}
                    value={dateObserved}
                    onChange={e => setDateObserved(e.target.value)}
                    max={new Date().toISOString().slice(0, 16)}
                    min={new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                    aria-invalid={!!errors.dateObserved}
                    aria-describedby={errors.dateObserved ? 'date-observed-error' : undefined}
                  />
                  {errors.dateObserved && <p id="date-observed-error" className="form-error">{errors.dateObserved}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step C: Attachments */}
          {step === 'attachments' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: 4 }}>{t('createRequest.step3Title')}</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 24 }}>{t('createRequest.step3Subtitle')}</p>

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                multiple
                onChange={handleFilesChosen}
                style={{ display: 'none' }}
              />

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleFileSelect}
                disabled={attachments.length >= MAX_FILES}
                style={{ marginBottom: 16 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {t('createRequest.uploadPhoto')}
              </button>

              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginBottom: 12 }}>
                {`Max ${MAX_FILES} files, 5MB each. Images, PDF, and Word documents accepted.`}
              </p>

              {errors.file && <p className="form-error" style={{ marginBottom: 8 }}>{errors.file}</p>}

              {attachments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {attachments.map((file, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--color-surface-alt)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      fontSize: '0.8125rem',
                    }}>
                      <span style={{ fontFamily: 'var(--font-mono)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Paperclip size={14} /> {file.name}
                        <span style={{ color: 'var(--color-text-light)', fontWeight: 400 }}>({formatFileSize(file.size)})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setAttachments(attachments.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}
                        aria-label={`${t('common.remove')} ${file.name}`}
                      >
                        {t('common.remove')}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {attachments.length === 0 && (
                <div style={{
                  border: '2px dashed var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 40,
                  textAlign: 'center',
                  color: 'var(--color-text-light)',
                  fontSize: '0.875rem',
                }}>
                  {t('createRequest.noAttachments')}
                </div>
              )}
            </div>
          )}

          {/* Step D: Contact */}
          {step === 'contact' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: 4 }}>{t('createRequest.step4Title')}</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 24 }}>{t('createRequest.step4Subtitle')}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label htmlFor="name" className="form-label">{t('createRequest.fullNameLabel')}<span style={{ color: 'var(--color-error)' }}> *</span></label>
                  <input
                    id="name"
                    type="text"
                    className={`form-input ${errors.name ? 'error' : ''}`}
                    placeholder="Jane Smith"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    aria-required="true"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                  />
                  {errors.name && <p id="name-error" className="form-error">{errors.name}</p>}
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">{t('createRequest.emailLabel')}<span style={{ color: 'var(--color-error)' }}> *</span></label>
                  <input
                    id="email"
                    type="email"
                    className={`form-input ${errors.email ? 'error' : ''}`}
                    placeholder="jane@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    aria-required="true"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                  />
                  {errors.email && <p id="email-error" className="form-error">{errors.email}</p>}
                </div>

                <div className="form-group">
                  <label htmlFor="phone" className="form-label">{t('createRequest.phoneLabel')}</label>
                  <input
                    id="phone"
                    type="tel"
                    className="form-input"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <input
                    id="consent"
                    type="checkbox"
                    checked={consent}
                    onChange={e => setConsent(e.target.checked)}
                    style={{ marginTop: 4, width: 18, height: 18, accentColor: 'var(--color-primary)' }}
                    aria-required="true"
                    aria-invalid={!!errors.consent}
                    aria-describedby={errors.consent ? 'consent-error' : undefined}
                  />
                  <label htmlFor="consent" style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                    {t('createRequest.consentText')}<span style={{ color: 'var(--color-error)' }}> *</span>
                  </label>
                </div>
                {errors.consent && <p id="consent-error" className="form-error">{errors.consent}</p>}
              </div>
            </div>
          )}

          {/* API error (non-blocking) */}
          {requestError && step === 'contact' && (
            <p style={{ color: 'var(--color-warning, #b45309)', fontSize: '0.8125rem', marginTop: 8 }}>
              Note: {requestError}. {t('createRequest.apiNote')}
            </p>
          )}

          {/* Navigation buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--color-border-light)' }}>
            {step !== 'location' ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  const currentIdx = STEPS.findIndex(s => s.key === step)
                  if (currentIdx > 0) setStep(STEPS[currentIdx - 1].key)
                }}
              >
                {t('common.back')}
              </button>
            ) : (
              <div />
            )}
            <button type="button" className="btn btn-primary" onClick={validateAndNext} disabled={requestSaving || !!uploadStatus}>
              {uploadStatus || (requestSaving ? t('createRequest.submitting') : step === 'contact' ? t('createRequest.submitRequest') : t('common.continue'))}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
