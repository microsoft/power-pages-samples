import { useEffect } from 'react'
import { site } from '../data/site'
import ContactForm from '../components/ContactForm'

export default function Contact() {
  useEffect(() => { document.title = `Contact — ${site.name}` }, [])

  return (
    <>
      <style>{contactPageCSS}</style>

      <section className="contact-hero">
        <div className="container contact-hero-inner">
          <span className="eyebrow rise d-1">Say hello</span>
          <h1 className="rise d-2">
            Catering, franchise,<br />
            <span className="display-italic">or just a kind word.</span>
          </h1>
          <p className="lede rise d-3">
            Whether you&rsquo;re feeding fifteen people at the office, opening a Smoking Burgers in a new city,
            or want to tell us the brisket changed your week — we read every note.
          </p>
        </div>
      </section>

      <section className="contact-body">
        <div className="container contact-grid">
          <div className="contact-form-wrap">
            <ContactForm />
          </div>

          <aside className="contact-aside">
            <div className="contact-aside-card surface">
              <h3 className="contact-aside-title">Reach us directly</h3>
              <ul className="contact-aside-list">
                <li>
                  <span className="contact-aside-label">Email</span>
                  <a href={`mailto:${site.hq.email}`}>{site.hq.email}</a>
                </li>
                <li>
                  <span className="contact-aside-label">Flagship phone</span>
                  <a href={`tel:${site.hq.phone.replace(/\D/g, '')}`}>{site.hq.phone}</a>
                </li>
                <li>
                  <span className="contact-aside-label">Flagship address</span>
                  <address className="contact-aside-address">
                    {site.hq.line1}<br />
                    {site.hq.line2}
                  </address>
                </li>
              </ul>
            </div>

            <div className="contact-aside-card surface">
              <h3 className="contact-aside-title">Inquiry hints</h3>
              <dl className="contact-aside-hints">
                <div>
                  <dt>Catering</dt>
                  <dd>Office lunches, weddings, neighbourhood blocks. Min. 15 people, 72 hours notice.</dd>
                </div>
                <div>
                  <dt>Franchise</dt>
                  <dd>We&rsquo;re open to talking in select markets. Please include city, capital, and timeline.</dd>
                </div>
                <div>
                  <dt>Feedback</dt>
                  <dd>Bad meal? Great server? We genuinely read these and pass them to the right kitchen.</dd>
                </div>
              </dl>
            </div>

            <div className="contact-aside-card contact-social-card">
              <h3 className="contact-aside-title">Or come find us</h3>
              <ul className="contact-social-list">
                {site.social.map(s => (
                  <li key={s.label}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer">
                      <span>{s.label}</span>
                      <span className="contact-social-handle">{s.handle}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}

const contactPageCSS = `
.contact-hero {
  padding: 180px 0 64px;
  border-bottom: 1px solid var(--color-border);
  background:
    radial-gradient(ellipse 900px 600px at 0% 100%, rgba(201, 137, 61, 0.10), transparent 60%),
    radial-gradient(ellipse 700px 500px at 100% 0%, rgba(168, 52, 28, 0.08), transparent 60%);
}
.contact-hero-inner { max-width: 880px; display: flex; flex-direction: column; gap: 22px; }

.contact-body { padding: 80px 0 112px; }
.contact-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 64px;
  align-items: start;
}
.contact-form-wrap { max-width: 640px; }

.contact-aside {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.contact-aside-card {
  padding: 28px 28px 30px;
}
.contact-aside-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--color-text);
}

.contact-aside-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.contact-aside-list li { display: flex; flex-direction: column; gap: 4px; }
.contact-aside-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--color-text-subtle);
}
.contact-aside-list a {
  color: var(--color-text);
  font-size: 16px;
}
.contact-aside-list a:hover { color: var(--color-secondary); }
.contact-aside-address {
  color: var(--color-text);
  font-style: normal;
  font-size: 16px;
  line-height: 1.6;
}

.contact-aside-hints {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 0;
}
.contact-aside-hints div { display: flex; flex-direction: column; gap: 4px; }
.contact-aside-hints dt {
  font-family: var(--font-display);
  font-style: italic;
  color: var(--color-primary);
  font-size: 16px;
  font-weight: 500;
  margin: 0;
}
.contact-aside-hints dd {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 15px;
  line-height: 1.55;
}

.contact-social-card { border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: linear-gradient(180deg, var(--color-surface), var(--color-surface-2)); }
.contact-social-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.contact-social-list a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 16px;
  font-weight: 500;
  transition: color 0.2s ease, padding 0.25s var(--ease-cinematic);
}
.contact-social-list li:last-child a { border-bottom: none; }
.contact-social-list a:hover { color: var(--color-secondary); padding-left: 6px; }
.contact-social-handle { color: var(--color-text-subtle); font-size: 14px; font-weight: 400; }

@media (max-width: 980px) {
  .contact-grid { grid-template-columns: 1fr; gap: 48px; }
  .contact-form-wrap { max-width: none; }
}
`
