import { type Offer } from '../data/offers'

export default function OfferCard({ offer }: { offer: Offer }) {
  return (
    <>
      <style>{offerCSS}</style>
      <article className="offer-card">
        <div className="offer-media">
          <img src={offer.image} alt={`${offer.title} — ${offer.subtitle}`} loading="lazy" />
          <span className="offer-badge">{offer.badge}</span>
        </div>
        <div className="offer-body">
          <h3 className="offer-title">{offer.title}</h3>
          <p className="offer-subtitle"><span className="display-italic">{offer.subtitle}</span></p>
          <p className="offer-desc">{offer.description}</p>
          <p className="offer-validity">
            <span aria-hidden="true" className="offer-validity-dot" />
            {offer.validity}
          </p>
        </div>
      </article>
    </>
  )
}

const offerCSS = `
.offer-card {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  background: linear-gradient(180deg, var(--color-surface), var(--color-surface-2));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: transform 0.5s var(--ease-cinematic), box-shadow 0.5s var(--ease-cinematic), border-color 0.4s var(--ease-out);
}
.offer-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lift);
  border-color: var(--color-primary);
}

.offer-media {
  position: relative;
  min-height: 320px;
  overflow: hidden;
  background: var(--color-bg-2);
}
.offer-media img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  transition: transform 1s var(--ease-cinematic), filter 0.6s var(--ease-out);
  filter: saturate(0.92) contrast(1.08) brightness(0.92);
}
.offer-card:hover .offer-media img { transform: scale(1.06); filter: saturate(1.05) contrast(1.1) brightness(0.96); }
.offer-media::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(14, 11, 10, 0.45) 0%, transparent 35%, rgba(14, 11, 10, 0.55) 100%);
  pointer-events: none;
}
.offer-badge {
  position: absolute;
  top: 18px; left: 18px;
  background: linear-gradient(135deg, var(--color-primary), #B27530);
  color: #1A1207;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  padding: 8px 14px;
  border-radius: 999px;
  z-index: 2;
  box-shadow: 0 6px 20px -6px var(--color-primary-glow);
}

.offer-body {
  padding: 36px 36px 36px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  justify-content: center;
}
.offer-title {
  font-family: var(--font-display);
  font-size: clamp(26px, 2.6vw, 34px);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.12;
  color: var(--color-text);
  margin: 0;
}
.offer-subtitle {
  font-size: 18px;
  line-height: 1.45;
  color: var(--color-secondary);
  margin: 0;
}
.offer-desc {
  color: var(--color-text-muted);
  font-size: 15px;
  line-height: 1.65;
  margin: 0;
}
.offer-validity {
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-subtle);
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
}
.offer-validity-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 12px var(--color-primary-glow);
}

@media (max-width: 720px) {
  .offer-card { grid-template-columns: 1fr; }
  .offer-media { min-height: 220px; }
  .offer-body { padding: 28px 26px; }
}
`
