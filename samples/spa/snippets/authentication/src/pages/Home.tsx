import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { site } from '../data/site'
import { menuItems } from '../data/menu'
import { branches } from '../data/branches'
import MenuItemCard from '../components/MenuItemCard'

const featured = menuItems.filter(i => ['ember-king', 'smoked-shorthorn', 'the-stoker'].includes(i.id))

export default function Home() {
  useEffect(() => { document.title = `${site.name} — ${site.tagline}` }, [])

  return (
    <>
      <style>{homeCSS}</style>

      {/* Hero */}
      <section className="hero" aria-label="Smoking Burgers — slow-smoked, hand-built, unapologetically gourmet">
        <div className="hero-image" aria-hidden="true">
          <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=2000&h=1400&fit=crop" alt="" />
        </div>
        <div className="hero-veil" aria-hidden="true" />
        <div className="hero-ember" aria-hidden="true" />

        <div className="container hero-content">
          <span className="eyebrow rise d-1">Smokehouse · Brooklyn · Est. 2014</span>
          <h1 className="hero-headline rise d-2">
            Slow-smoked.<br />
            Hand-built.<br />
            <span className="display-italic">Unapologetically gourmet.</span>
          </h1>
          <p className="lede rise d-3">
            Five locations. One kitchen philosophy: take your time, build it by hand,
            never cut a corner. Burgers worth the wait — and the trip.
          </p>
          <div className="hero-cta rise d-4">
            <Link to="/menu" className="btn btn-primary">See the menu</Link>
            <Link to="/branches" className="btn btn-ghost">Find a branch</Link>
          </div>

          <div className="hero-stats rise d-5" role="list">
            <div role="listitem" className="hero-stat">
              <span className="hero-stat-figure">12<span className="hero-stat-unit">hr</span></span>
              <span className="hero-stat-label">Hickory smoke on every brisket</span>
            </div>
            <div role="listitem" className="hero-stat">
              <span className="hero-stat-figure">5</span>
              <span className="hero-stat-label">Locations across the country</span>
            </div>
            <div role="listitem" className="hero-stat">
              <span className="hero-stat-figure">10<span className="hero-stat-unit">yr</span></span>
              <span className="hero-stat-label">Building it the slow way</span>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="philosophy">
        <div className="container philosophy-grid">
          <div>
            <span className="eyebrow">Our philosophy</span>
            <h2 className="philosophy-headline">
              We are <span className="display-italic">unreasonable</span><br />
              about a few things.
            </h2>
            <span className="divider-rule" aria-hidden="true" />
          </div>

          <div className="philosophy-points">
            <article className="philosophy-point">
              <span className="philosophy-num">01</span>
              <h3>Patience over speed</h3>
              <p>Briskets smoke for twelve hours. Onions caramelise for an hour. Pickles brine for a week. There is no fast burger.</p>
            </article>
            <article className="philosophy-point">
              <span className="philosophy-num">02</span>
              <h3>Real fire</h3>
              <p>Hardwood embers, not gas. Apple, hickory and oak. Every kitchen is built around the smokers — never the other way around.</p>
            </article>
            <article className="philosophy-point">
              <span className="philosophy-num">03</span>
              <h3>Built by hand</h3>
              <p>Brioche from a Brooklyn bakery, sauces from our pastry team, meat ground every morning. We never compromise the parts you don&rsquo;t see.</p>
            </article>
            <article className="philosophy-point">
              <span className="philosophy-num">04</span>
              <h3>Small menu, deep menu</h3>
              <p>Six signatures, never seven. We commit to making each one impossible to ignore — then we leave it alone.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Featured menu */}
      <section className="featured">
        <div className="container">
          <header className="section-head">
            <span className="eyebrow">A taste of the menu</span>
            <h2>Three to start, then go anywhere.</h2>
            <p className="lede">
              A burnt-copper crowd-pleaser, a quiet dry-aged classic, and the one that comes with a heat warning.
              The full menu has six signatures — plus sides, smoke and dessert.
            </p>
          </header>

          <div className="featured-grid">
            {featured.map(item => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>

          <div className="featured-cta">
            <Link to="/menu" className="btn btn-primary">See the whole menu</Link>
          </div>
        </div>
      </section>

      {/* Branches teaser */}
      <section className="branches-teaser">
        <div className="branches-teaser-bg" aria-hidden="true">
          <img src="https://images.unsplash.com/photo-1559339352-11d035aa65de?w=2000&h=1200&fit=crop" alt="" />
        </div>
        <div className="branches-teaser-veil" aria-hidden="true" />
        <div className="container branches-teaser-inner">
          <span className="eyebrow">Find your fire</span>
          <h2 className="branches-teaser-headline">
            Five rooms.<br />
            <span className="display-italic">One philosophy.</span>
          </h2>
          <p className="lede">
            Brooklyn, Lower East Side, Chicago West Loop, East Austin, LA Arts District. Each room is built around its own smokers
            — find the one closest to you.
          </p>
          <ul className="branches-teaser-list" aria-label="Our locations">
            {branches.map(b => (
              <li key={b.id}>
                <span className="branches-teaser-city">{b.city}</span>
                <span className="branches-teaser-neighborhood">{b.neighborhood}</span>
              </li>
            ))}
          </ul>
          <Link to="/branches" className="btn btn-ghost">See all branches</Link>
        </div>
      </section>
    </>
  )
}

const homeCSS = `
/* ---------- Hero ---------- */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: flex-end;
  padding: 180px 0 96px;
  overflow: hidden;
  isolation: isolate;
}
.hero-image {
  position: absolute; inset: 0;
  z-index: -3;
}
.hero-image img {
  width: 100%; height: 100%; object-fit: cover;
  filter: saturate(0.85) contrast(1.08) brightness(0.55);
  animation: heroDrift 22s var(--ease-out) infinite alternate;
}
@keyframes heroDrift {
  0% { transform: scale(1.04) translate(0, 0); }
  100% { transform: scale(1.12) translate(-1.5%, -1%); }
}
.hero-veil {
  position: absolute; inset: 0; z-index: -2;
  background:
    linear-gradient(180deg, rgba(14, 11, 10, 0.65) 0%, rgba(14, 11, 10, 0.35) 35%, rgba(14, 11, 10, 0.92) 100%),
    linear-gradient(90deg, rgba(14, 11, 10, 0.55) 0%, transparent 60%);
}
.hero-ember {
  position: absolute;
  z-index: -1;
  inset: 0;
  background:
    radial-gradient(ellipse 800px 600px at 15% 75%, rgba(201, 137, 61, 0.18), transparent 60%),
    radial-gradient(ellipse 700px 500px at 85% 25%, rgba(168, 52, 28, 0.10), transparent 60%);
  animation: emberPulse 8s var(--ease-out) infinite alternate;
}
@keyframes emberPulse {
  0%   { opacity: 0.7; }
  100% { opacity: 1; }
}
.hero-content {
  position: relative;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.hero-headline {
  font-family: var(--font-display);
  font-size: clamp(56px, 9vw, 124px);
  font-weight: 700;
  line-height: 0.98;
  letter-spacing: -0.025em;
  margin: 0;
  text-shadow: 0 4px 30px rgba(0, 0, 0, 0.45);
}
.hero-cta { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 12px; }
.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  padding-top: 40px;
  margin-top: 32px;
  border-top: 1px solid var(--color-border-hot);
  max-width: 720px;
}
.hero-stat { display: flex; flex-direction: column; gap: 6px; }
.hero-stat-figure {
  font-family: var(--font-display);
  font-size: clamp(34px, 4vw, 48px);
  font-weight: 700;
  color: var(--color-secondary);
  letter-spacing: -0.02em;
  line-height: 1;
}
.hero-stat-unit {
  font-size: 0.5em;
  font-weight: 400;
  color: var(--color-text-muted);
  margin-left: 4px;
  font-style: italic;
}
.hero-stat-label {
  font-size: 13px;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  text-transform: uppercase;
  line-height: 1.4;
}

/* ---------- Philosophy ---------- */
.philosophy { background: linear-gradient(180deg, var(--color-bg-2) 0%, var(--color-bg) 100%); }
.philosophy-grid {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 80px;
  align-items: start;
}
.philosophy-headline {
  font-family: var(--font-display);
  font-size: clamp(40px, 5vw, 64px);
  font-weight: 600;
  line-height: 1.04;
  margin: 18px 0 28px;
  letter-spacing: -0.015em;
}
.philosophy-points {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 56px 48px;
}
.philosophy-point {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 18px;
  border-top: 1px solid var(--color-border);
}
.philosophy-num {
  font-family: var(--font-display);
  font-style: italic;
  color: var(--color-primary);
  font-size: 18px;
  letter-spacing: 0.1em;
  font-weight: 400;
}
.philosophy-point h3 {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.005em;
  margin: 0;
}
.philosophy-point p {
  color: var(--color-text-muted);
  font-size: 16px;
  line-height: 1.65;
  margin: 0;
}

/* ---------- Featured ---------- */
.featured-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
}
.featured-cta {
  margin-top: 56px;
  display: flex;
  justify-content: center;
}

/* ---------- Branches teaser ---------- */
.branches-teaser {
  position: relative;
  padding: 128px 0;
  overflow: hidden;
  isolation: isolate;
  border-top: 1px solid var(--color-border);
}
.branches-teaser-bg {
  position: absolute; inset: 0; z-index: -2;
}
.branches-teaser-bg img {
  width: 100%; height: 100%; object-fit: cover;
  filter: saturate(0.7) contrast(1.05) brightness(0.45);
}
.branches-teaser-veil {
  position: absolute; inset: 0; z-index: -1;
  background:
    linear-gradient(180deg, rgba(14, 11, 10, 0.88) 0%, rgba(14, 11, 10, 0.7) 50%, rgba(14, 11, 10, 0.95) 100%),
    radial-gradient(ellipse 900px 500px at 70% 30%, rgba(201, 137, 61, 0.14), transparent 60%);
}
.branches-teaser-inner {
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.branches-teaser-headline {
  font-family: var(--font-display);
  font-size: clamp(40px, 5.5vw, 72px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
  margin: 8px 0 4px;
}
.branches-teaser-list {
  list-style: none;
  margin: 12px 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px 36px;
}
.branches-teaser-list li {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: rgba(14, 11, 10, 0.5);
  backdrop-filter: blur(8px);
}
.branches-teaser-city {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--color-primary);
}
.branches-teaser-neighborhood {
  font-family: var(--font-display);
  font-size: 18px;
  color: var(--color-text);
  font-weight: 500;
}

@media (max-width: 980px) {
  .philosophy-grid { grid-template-columns: 1fr; gap: 48px; }
  .featured-grid { grid-template-columns: 1fr 1fr; }
  .branches-teaser-list { grid-template-columns: 1fr; gap: 12px; }
}
@media (max-width: 640px) {
  .hero { padding: 140px 0 80px; min-height: 92vh; }
  .hero-stats { grid-template-columns: 1fr; gap: 18px; padding-top: 28px; margin-top: 20px; }
  .philosophy-points { grid-template-columns: 1fr; gap: 36px; }
  .featured-grid { grid-template-columns: 1fr; }
}
`
