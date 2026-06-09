import { type Branch } from '../data/branches'

export default function BranchCard({ branch }: { branch: Branch }) {
  return (
    <>
      <style>{branchCSS}</style>
      <article className="branch-card">
        <div className="branch-media">
          <img src={branch.image} alt={`Smoking Burgers — ${branch.neighborhood}, ${branch.city}`} loading="lazy" />
          <div className="branch-media-overlay">
            <span className="branch-city">{branch.city}</span>
            <span className="branch-neighborhood">{branch.neighborhood}</span>
          </div>
        </div>
        <div className="branch-body">
          <p className="branch-note"><span className="display-italic">{branch.note}</span></p>
          <dl className="branch-details">
            <div className="branch-detail-row">
              <dt>Address</dt>
              <dd>{branch.address}</dd>
            </div>
            <div className="branch-detail-row">
              <dt>Hours</dt>
              <dd>
                {branch.hours}<br />
                {branch.weekendHours}
              </dd>
            </div>
            <div className="branch-detail-row">
              <dt>Phone</dt>
              <dd><a href={`tel:${branch.phone.replace(/\D/g, '')}`}>{branch.phone}</a></dd>
            </div>
          </dl>
          <a
            className="branch-directions"
            href={branch.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Get directions to ${branch.neighborhood}, ${branch.city} (opens in new tab)`}
          >
            Get directions
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
              <path d="M3 8 H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M9 4 L13 8 L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </article>
    </>
  )
}

const branchCSS = `
.branch-card {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  background: linear-gradient(180deg, var(--color-surface), var(--color-surface-2));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: transform 0.5s var(--ease-cinematic), box-shadow 0.5s var(--ease-cinematic), border-color 0.4s var(--ease-out);
}
.branch-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lift);
  border-color: var(--color-primary);
}

.branch-media {
  position: relative;
  min-height: 360px;
  overflow: hidden;
  background: var(--color-bg-2);
}
.branch-media img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  transition: transform 1s var(--ease-cinematic), filter 0.6s var(--ease-out);
  filter: saturate(0.95) contrast(1.05) brightness(0.92);
}
.branch-card:hover .branch-media img { transform: scale(1.05); filter: saturate(1.05) contrast(1.08) brightness(0.96); }
.branch-media::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(14, 11, 10, 0.78) 100%);
  pointer-events: none;
}
.branch-media-overlay {
  position: absolute;
  bottom: 22px; left: 24px;
  z-index: 2;
  color: var(--color-text);
  display: flex;
  flex-direction: column;
}
.branch-city {
  font-family: var(--font-body);
  font-size: 12px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--color-secondary);
  font-weight: 600;
}
.branch-neighborhood {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.1;
  margin-top: 4px;
}

.branch-body {
  padding: 32px 32px 32px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.branch-note {
  color: var(--color-text);
  font-size: 17px;
  line-height: 1.5;
  margin: 0;
}

.branch-details {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
}
.branch-detail-row {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 14px;
  align-items: start;
}
.branch-detail-row dt {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--color-text-subtle);
  padding-top: 3px;
  margin: 0;
}
.branch-detail-row dd {
  margin: 0;
  font-size: 15px;
  color: var(--color-text-muted);
  line-height: 1.55;
}
.branch-detail-row dd a { color: var(--color-text-muted); }
.branch-detail-row dd a:hover { color: var(--color-secondary); }

.branch-directions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  align-self: flex-start;
  color: var(--color-primary);
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 12px 20px;
  border: 1px solid var(--color-border-hot);
  border-radius: 999px;
  text-decoration: none;
  transition: background 0.3s var(--ease-out), color 0.3s var(--ease-out), border-color 0.3s var(--ease-out), transform 0.3s var(--ease-cinematic);
}
.branch-directions:hover {
  background: var(--color-primary);
  color: #1A1207;
  border-color: var(--color-primary);
  transform: translateY(-2px);
}
.branch-directions svg { transition: transform 0.3s var(--ease-cinematic); }
.branch-directions:hover svg { transform: translateX(3px); }

@media (max-width: 820px) {
  .branch-card { grid-template-columns: 1fr; }
  .branch-media { min-height: 260px; }
  .branch-body { padding: 26px 24px; }
}
@media (max-width: 480px) {
  .branch-detail-row { grid-template-columns: 1fr; gap: 4px; }
}
`
