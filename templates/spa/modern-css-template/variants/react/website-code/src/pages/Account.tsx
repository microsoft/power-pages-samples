import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { errorMessage, useSupport } from '../SupportContext'
import { supportApi } from '../services/supportApi'
import { formatDate, formatNumber } from '../data'
import Field from '../components/Field'
import { usePageTitle } from '../usePageTitle'

const preferenceLabels = [
  ['Case status and lifecycle updates', 'Changes to status, ownership, progress and resolution.'],
  ['Replies from support', 'Messages and information requests from the service team.'],
  ['Service and response alerts', 'Response targets, delays and service-impact notices.'],
  ['Recommended support guidance', 'Relevant knowledge and prevention recommendations.'],
]
export default function Account() {
  const { isDemo } = useSupport()
  return isDemo ? <DemoAccount /> : <ConnectedAccount />
}

function ConnectedAccount() {
  usePageTitle('Account & support')
  const { profileData, saveProfile, mutate, preferences, setPreferences } = useSupport()
  const [params] = useSearchParams()
  const [firstName, setFirstName] = useState(profileData?.firstName ?? '')
  const [lastName, setLastName] = useState(profileData?.lastName ?? '')
  const [phone, setPhone] = useState(profileData?.phone ?? '')
  const [message, setMessage] = useState(params.get('context') ?? '')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [profileStatus, setProfileStatus] = useState('')
  const [profileError, setProfileError] = useState('')
  const [contactStatus, setContactStatus] = useState('')
  const [contactError, setContactError] = useState('')
  useEffect(() => { setMessage(params.get('context') ?? ''); setContactStatus(''); setContactError('') }, [params])
  async function submitProfile(event: FormEvent) {
    event.preventDefault(); setSaving(true); setProfileStatus(''); setProfileError('')
    try { await saveProfile({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() }); setProfileStatus('Your profile was saved to Dataverse.') }
    catch (error) { setProfileError(errorMessage(error)) }
    finally { setSaving(false) }
  }
  async function submitContact(event: FormEvent) {
    event.preventDefault(); setSending(true); setContactStatus(''); setContactError('')
    try {
      await mutate(() => supportApi.contact(message.trim()))
      setContactStatus('Your contact request was saved. This does not send email, start chat or book a callback.')
      setMessage('')
    } catch (error) { setContactError(errorMessage(error)) }
    finally { setSending(false) }
  }
  return <>
    <header className="page-header"><div><span className="eyebrow">Account & support</span><h1>Your profile and support options</h1><p>Manage your contact details and save a support-contact request.</p></div><a className="button secondary" href="#contact-support">Contact support</a></header>
    <div className="stack">
      <section className="panel"><h2>Your organization</h2><p><bdi>{profileData?.account?.name ?? 'No related organization is assigned.'}</bdi></p><p className="muted">Organization membership is managed by your administrator. It does not grant access to other contacts' cases.</p></section>
      <section className="panel"><h2>Your profile</h2><p className="muted">Only your name and phone can be changed here. Sign-in identity and account relationships cannot be edited.</p>
        <form className="form-grid" onSubmit={submitProfile}>
          <Field id="profile-first-name" label="First name" value={firstName} onChange={value => { setFirstName(value); setProfileStatus('') }} maxLength={50} autoComplete="given-name" />
          <Field id="profile-last-name" label="Last name" value={lastName} onChange={value => { setLastName(value); setProfileStatus('') }} maxLength={50} required autoComplete="family-name" />
          <Field id="profile-phone" label="Phone" type="tel" value={phone} onChange={value => { setPhone(value); setProfileStatus('') }} maxLength={50} autoComplete="tel" />
          <div><strong>Email</strong><p><bdi>{profileData?.email || 'No email address is recorded.'}</bdi></p></div>
          <div className="full"><strong>Recorded address</strong><p dir="auto">{profileData?.address || 'No address is recorded.'}</p></div>
          <div className="full"><button className="button secondary" disabled={saving} type="submit">{saving ? 'Saving...' : 'Save profile'}</button><p role="status">{profileStatus}</p><p className="error" role="alert">{profileError}</p></div>
        </form>
      </section>
      <details className="panel" id="notification-preferences"><summary>Notification preferences (local only)</summary><p>These choices and in-app notifications last until reload. Case updates require the Power Pages realtime service. Turning notifications off does not stop case data from refreshing. Email and device notifications are not sent.</p>
        {preferenceLabels.map(([label], index) => <label className="preference" key={label}><input type="checkbox" checked={index < 2 && preferences[index]} disabled={index > 1} onChange={event => { const checked = event.target.checked; setPreferences(items => items.map((value, position) => position === index ? checked : value)) }} /><span><strong>{label}{index > 1 && ' (not connected)'}</strong><small>{index === 0 ? 'Notify me in this tab when an existing personal case changes. Open the case to review its current details and conversation.' : index === 1 ? 'Notify me when a customer-visible Support portal comment is added or edited. Customer replies do not create these alerts.' : 'This notification category is not available.'}</small></span></label>)}
      </details>
      <section className="panel"><h2>Coverage, equipment and orders</h2><p>Not connected. The supplied core service model does not establish your equipment ownership, coverage, contractual response targets or orders.</p></section>
      <section className="panel" id="contact-support" tabIndex={-1}><h2>Contact support</h2><p className="muted">Save a request linked to your signed-in contact. Email delivery, live chat and callback scheduling are not configured.</p>
        <form className="stack" onSubmit={submitContact}><Field id="support-message" label="Message" value={message} onChange={value => { setMessage(value); setContactStatus('') }} multiline required maxLength={2000} hint="Up to 2,000 characters. Do not include passwords, payment-card details or identity documents." />
          <button className="button" type="submit" disabled={sending || !message.trim()}>{sending ? 'Saving...' : 'Save contact request'}</button><p className="error" role="alert">{contactError}</p><p role="status">{contactStatus}</p>
        </form>
      </section>
    </div>
  </>
}

function DemoAccount() {
  usePageTitle('Account & support')
  const { profile, setProfile, preferences, setPreferences } = useSupport()
  const [form, setForm] = useState(profile)
  const [profileStatus, setProfileStatus] = useState('')
  const [preferenceForm, setPreferenceForm] = useState(preferences)
  const [preferenceStatus, setPreferenceStatus] = useState('')
  const [params] = useSearchParams()
  const [message, setMessage] = useState(params.get('context') ?? '')
  const [name, setName] = useState(profile.name)
  const [email, setEmail] = useState(profile.email)
  const [channel, setChannel] = useState('Message')
  const [phone, setPhone] = useState(profile.phone)
  const [callback, setCallback] = useState('')
  const [contactStatus, setContactStatus] = useState('')
  const [contactError, setContactError] = useState('')
  useEffect(() => { setMessage(params.get('context') ?? ''); clearContactFeedback() }, [params])
  function saveProfile(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) { setProfileStatus('Enter a name before saving.'); return }
    setProfile({ ...form, name: form.name.trim() }); setProfileStatus('Profile updated for this preview only. Nothing was saved to a support account.')
  }
  function prepareContact(event: FormEvent) {
    event.preventDefault(); setContactError(''); setContactStatus('')
    if (!name.trim() || !message.trim()) { setContactError('Enter your name and a message.'); return }
    if (channel === 'Callback' && (!callback || !phone.trim() || new Date(callback).getTime() <= Date.now())) {
      setContactError('Enter a phone number and choose a future callback time.'); return
    }
    setContactStatus(`${channel} draft prepared locally. No message was delivered, live chat started, or callback booked. Connect a support backend before submitting.`)
  }
  function updateForm(key: keyof typeof form, value: string) { setForm(current => ({ ...current, [key]: value })); setProfileStatus('') }
  function clearContactFeedback() { setContactStatus(''); setContactError('') }
  return <>
    <header className="page-header"><div><span className="eyebrow">Account & support</span><h1>Your profile, coverage, and contact options</h1><p>Manage the information used in this preview and prepare a request when you need a person.</p></div><a className="button secondary" href="#contact-support">Contact support</a></header>
    <div className="stack">
      <section className="panel coverage" aria-label="Sample coverage"><div><span className="eyebrow">Sample coverage</span><h2>Business Care</h2><p>Priority support through {formatDate('2027-02-28T12:00:00-08:00')}</p></div><div className="coverage-stat"><strong>{formatNumber(7)}</strong><small>Sample cases remaining</small></div><div className="coverage-stat"><strong>{formatNumber(4)}h</strong><small>Sample response target</small></div></section>
      <section className="panel"><h2>Your profile</h2><p className="muted">Edits remain in this browser tab until reload.</p>
        <form className="form-grid" onSubmit={saveProfile}>
          <Field id="profile-name" label="Name" value={form.name} onChange={value => updateForm('name', value)} required autoComplete="name" />
          <Field id="profile-phone" label="Phone" type="tel" value={form.phone} onChange={value => updateForm('phone', value)} autoComplete="tel" />
          <Field id="profile-email" label="Email" type="email" value={form.email} onChange={value => updateForm('email', value)} required autoComplete="email" />
          <div className="field"><label htmlFor="profile-timezone">Preferred support time zone</label><select id="profile-timezone" value={form.timezone} onChange={event => updateForm('timezone', event.target.value)}><option value="America/Los_Angeles">Pacific Time (US & Canada)</option><option value="America/Chicago">Central Time (US & Canada)</option><option value="America/New_York">Eastern Time (US & Canada)</option></select><small>Case history uses Pacific Time. This preference is recorded for a future support integration.</small></div>
          <div className="full"><Field id="profile-address" label="Service address" multiline value={form.address} onChange={value => updateForm('address', value)} /></div>
          <div className="field"><label htmlFor="profile-channel">Preferred support channel</label><select id="profile-channel" value={form.channel} onChange={event => updateForm('channel', event.target.value)}><option>Chat</option><option>Phone</option><option>Email</option></select></div>
          <div className="field"><label htmlFor="content-language">Site content language</label><input id="content-language" value="English (United States)" readOnly aria-describedby="language-hint" /><small id="language-hint">This preview is single-language; changing a profile does not translate the site.</small></div>
          <div className="full"><button className="button secondary" type="submit">Save profile locally</button><p role="status">{profileStatus}</p></div>
        </form>
      </section>
      <details className="panel" id="notification-preferences"><summary>Notification preferences</summary><form onSubmit={event => { event.preventDefault(); setPreferences(preferenceForm); setPreferenceStatus('Preferences recorded for this preview only. Notification delivery is not configured.') }}>
        {preferenceLabels.map(([label, description], index) => <label className="preference" key={label}><input type="checkbox" checked={preferenceForm[index]} onChange={event => { setPreferenceForm(items => items.map((value, position) => position === index ? event.target.checked : value)); setPreferenceStatus('') }} /><span><strong>{label}</strong><small>{description}</small></span></label>)}
        <button className="button secondary" type="submit">Save preferences locally</button><p role="status">{preferenceStatus}</p>
      </form></details>
      <details className="panel" id="equipment-orders"><summary>Orders & equipment</summary><h2>Registered sample equipment</h2>{[['Edge Gateway 500', 'EG500-SEA-1048', 'Attention'], ['Climate Sensor Array', 'CSA-402-88', 'Online'], ['Field Hub Mini', 'FHM-220-17', 'Online']].map(([title, serial, state]) => <div className="record-row" key={serial}><span><strong>{title}</strong><small><bdi>{serial}</bdi> · sample warranty to {formatDate('2027-02-28T12:00:00-08:00')}</small></span><span className={`badge ${state === 'Online' ? 'resolved' : ''}`}>{state}</span></div>)}<h2>Sample orders</h2><div className="record-row"><span>Gateway mounting kit <bdi>ORD-88201</bdi></span><span className="badge progress">In transit</span></div><div className="record-row"><span>Replacement climate sensor <bdi>ORD-88017</bdi></span><span className="badge resolved">Delivered</span></div></details>
      <details className="panel" id="business-care"><summary>What Business Care includes</summary><p>The supplied demonstration plan illustrates a four-hour initial response target, specialist escalation and proactive monitoring. Actual eligibility and contractual terms must be provided by the service owner.</p></details>
      <section className="panel" id="contact-support" tabIndex={-1}><div className="support-columns">
        <div><span className="eyebrow">Keep the human option</span><h2>Contact support</h2><p className="muted">Review the context before preparing a handoff. These channels are demonstration contacts, not live endpoints.</p>
          <div className="record-row"><span><strong>Phone</strong><small><bdi>+1 206 555 0100</bdi> · demonstration number</small></span></div>
          <div className="record-row"><span><strong>Email</strong><small><bdi>support@northwind.example</bdi> · demonstration address</small></span></div>
          <button className="text-link" onClick={() => { setChannel('Chat'); clearContactFeedback(); document.getElementById('support-message')?.focus() }}>Prepare a support chat</button><br />
          <button className="text-link" onClick={() => { setChannel('Callback'); clearContactFeedback(); document.getElementById('support-message')?.focus() }}>Request a callback</button>
        </div>
        <form className="stack" onSubmit={prepareContact}><h3>Prepare a message</h3>
          <Field id="support-name" label="Your name" value={name} onChange={value => { setName(value); clearContactFeedback() }} required />
          <Field id="support-email" label="Email address" type="email" value={email} onChange={value => { setEmail(value); clearContactFeedback() }} required />
          <div className="field"><label htmlFor="support-channel">Support channel</label><select id="support-channel" value={channel} onChange={event => { setChannel(event.target.value); clearContactFeedback() }}><option>Message</option><option>Chat</option><option>Callback</option></select></div>
          {channel === 'Callback' && <><Field id="callback-time" label="Preferred callback time" type="datetime-local" value={callback} onChange={value => { setCallback(value); clearContactFeedback() }} required hint="Choose a future time in your device's local time zone." /><Field id="callback-phone" label="Callback phone number" type="tel" value={phone} onChange={value => { setPhone(value); clearContactFeedback() }} required /></>}
          <Field id="support-message" label="Message" value={message} onChange={value => { setMessage(value); clearContactFeedback() }} multiline required placeholder="Tell us what you need help with" hint="Do not include identity documents, passwords or payment-card details." />
          <button className="button" type="submit">Prepare local request</button><p className="error" role="alert">{contactError}</p><p role="status">{contactStatus}</p>
        </form>
      </div></section>
    </div>
  </>
}
