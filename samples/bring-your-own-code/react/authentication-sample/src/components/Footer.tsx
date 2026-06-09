import { Link } from 'react-router-dom'
import { site } from '../data/site'

export default function Footer() {
  return (
    <>
      <style>{footerCSS}</style>
      <footer className="footer">
        <div className="footer-inner container">
          <div className="footer-grid">
            <div className="footer-brand">
              <span className="eyebrow">Smokehouse · Est. 2014</span>
              <h3 className="footer-heading">
                Patiently smoked.<br />
                <span className="display-italic">Always worth the wait.</span>
              </h3>
              <p className="footer-blurb">
                Five locations across the city. One philosophy: take your time, build it by hand, never cut a corner.
              </p>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">Explore</h4>
              <ul>
                {site.nav.map(n => (
                  <li key={n.href}><Link to={n.href}>{n.label}</Link></li>
                ))}
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">Visit</h4>
              <address className="footer-address">
                {site.hq.line1}<br />
                {site.hq.line2}<br />
                <a href={`tel:${site.hq.phone.replace(/\D/g, '')}`}>{site.hq.phone}</a><br />
                <a href={`mailto:${site.hq.email}`}>{site.hq.email}</a>
              </address>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">Follow</h4>
              <ul>
                {site.social.map(s => (
                  <li key={s.label}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${site.name} on ${s.label}`}>
                      {s.label} <span className="footer-social-handle">{s.handle}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="footer-bar">
            <span>© {new Date().getFullYear()} {site.name}. Made with smoke and patience.</span>
            <span className="footer-bar-meta">Brooklyn · New York · Chicago · Austin · Los Angeles</span>
          </div>
        </div>
      </footer>
    </>
  )
}

const footerCSS = `
.footer {
  position: relative;
  background:
    radial-gradient(ellipse 900px 400px at 20% 100%, rgba(201, 137, 61, 0.08), transparent 60%),
    linear-gradient(180deg, transparent, var(--color-bg-2) 30%);
  padding: 96px 0 0;
  border-top: 1px solid var(--color-border);
  margin-top: 80px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr 1fr 1fr;
  gap: 48px;
  padding-bottom: 64px;
}

.footer-brand .eyebrow { display: inline-block; margin-bottom: 18px; }
.footer-heading {
  font-family: var(--font-display);
  font-size: clamp(28px, 3vw, 38px);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: var(--color-text);
  margin: 0 0 20px;
}
.footer-blurb {
  color: var(--color-text-muted);
  max-width: 36ch;
  font-size: 16px;
  line-height: 1.6;
}

.footer-col-title {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--color-primary);
  margin: 0 0 18px;
}
.footer-col ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.footer-col a {
  color: var(--color-text-muted);
  font-size: 15px;
  transition: color 0.2s ease, transform 0.2s ease;
  display: inline-block;
}
.footer-col a:hover {
  color: var(--color-secondary);
  transform: translateX(3px);
}
.footer-social-handle {
  display: block;
  font-size: 12px;
  color: var(--color-text-subtle);
  letter-spacing: 0.04em;
  margin-top: 2px;
}

.footer-address {
  font-style: normal;
  color: var(--color-text-muted);
  font-size: 15px;
  line-height: 1.8;
}
.footer-address a { color: var(--color-text-muted); }
.footer-address a:hover { color: var(--color-secondary); }

.footer-bar {
  border-top: 1px solid var(--color-border);
  padding: 24px 0 32px;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: var(--color-text-subtle);
  letter-spacing: 0.04em;
}
.footer-bar-meta { font-style: italic; font-family: var(--font-display); }

@media (max-width: 920px) {
  .footer-grid { grid-template-columns: 1fr 1fr; gap: 40px; }
  .footer-brand { grid-column: 1 / -1; }
}
@media (max-width: 540px) {
  .footer-grid { grid-template-columns: 1fr; gap: 36px; padding-bottom: 48px; }
  .footer { padding-top: 72px; margin-top: 56px; }
  .footer-bar { flex-direction: column; }
}
`
