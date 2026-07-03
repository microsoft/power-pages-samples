import { useEffect } from 'react'
import { offers } from '../data/offers'
import { site } from '../data/site'
import OfferCard from '../components/OfferCard'

export default function Offers() {
  useEffect(() => { document.title = `Offers — ${site.name}` }, [])

  return (
    <>
      <style>{offersPageCSS}</style>

      <section className="offers-hero">
        <div className="container offers-hero-inner">
          <span className="eyebrow rise d-1">Offers &amp; happenings</span>
          <h1 className="rise d-2">
            We don&rsquo;t do flash sales.<br />
            <span className="display-italic">We do good reasons to come in.</span>
          </h1>
          <p className="lede rise d-3">
            A handful of recurring offers, a quiet member perk, and a Sunday tasting series.
            All available at every branch unless noted otherwise — no codes, no app, just walk in.
          </p>
        </div>
      </section>

      <section className="offers-grid-section">
        <div className="container">
          <div className="offers-grid">
            {offers.map(o => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </div>
        </div>
      </section>

      <section className="offers-cta">
        <div className="container offers-cta-inner">
          <span className="eyebrow">The Ember List</span>
          <h2 className="offers-cta-title">
            Sign up once.<br />
            <span className="display-italic">A free burger every birthday.</span>
          </h2>
          <p className="lede">
            One email, twice a quarter at most: a new signature, an early seat at Smoke School, and a free
            signature burger every year on your birthday. We never share your address. Ever.
          </p>
          <a href="/contact" className="btn btn-primary">Get in touch to join</a>
        </div>
      </section>
    </>
  )
}

const offersPageCSS = `
.offers-hero {
  padding: 180px 0 80px;
  border-bottom: 1px solid var(--color-border);
  background:
    radial-gradient(ellipse 900px 600px at 20% 80%, rgba(168, 52, 28, 0.10), transparent 60%),
    radial-gradient(ellipse 700px 500px at 100% 0%, rgba(232, 184, 108, 0.08), transparent 60%);
}
.offers-hero-inner { max-width: 940px; display: flex; flex-direction: column; gap: 24px; }

.offers-grid-section { padding: 80px 0; }
.offers-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}

.offers-cta {
  padding: 96px 0 128px;
  position: relative;
  border-top: 1px solid var(--color-border);
  background:
    radial-gradient(ellipse 900px 500px at 50% 0%, rgba(201, 137, 61, 0.12), transparent 60%);
}
.offers-cta-inner {
  max-width: 720px;
  margin: 0 auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 22px;
  align-items: center;
}
.offers-cta-title {
  font-family: var(--font-display);
  font-size: clamp(36px, 5vw, 56px);
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: -0.015em;
  margin: 8px 0;
}
.offers-cta .lede { text-align: center; margin: 0 auto; }
`
