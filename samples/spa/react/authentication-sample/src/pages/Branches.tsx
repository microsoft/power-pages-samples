import { useEffect } from 'react'
import { branches } from '../data/branches'
import { site } from '../data/site'
import BranchCard from '../components/BranchCard'

export default function Branches() {
  useEffect(() => { document.title = `Branches — ${site.name}` }, [])

  return (
    <>
      <style>{branchesPageCSS}</style>

      <section className="branches-hero">
        <div className="container branches-hero-inner">
          <span className="eyebrow rise d-1">Find your fire</span>
          <h1 className="rise d-2">
            Five rooms.<br />
            <span className="display-italic">Each one its own.</span>
          </h1>
          <p className="lede rise d-3">
            Same philosophy, different rooms. A flagship Brooklyn smokehouse, a cocktail-first late-night room
            on the Lower East Side, a converted Chicago warehouse, an Austin patio, and a quiet LA loft.
          </p>
          <dl className="branches-stats rise d-4">
            <div>
              <dt>Branches</dt>
              <dd>{branches.length}</dd>
            </div>
            <div>
              <dt>Cities</dt>
              <dd>{new Set(branches.map(b => b.city)).size}</dd>
            </div>
            <div>
              <dt>Open late</dt>
              <dd>Every night</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="branches-list">
        <div className="container">
          <div className="branches-stack">
            {branches.map(b => (
              <BranchCard key={b.id} branch={b} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

const branchesPageCSS = `
.branches-hero {
  padding: 180px 0 80px;
  border-bottom: 1px solid var(--color-border);
  background:
    radial-gradient(ellipse 900px 600px at 100% 100%, rgba(232, 184, 108, 0.10), transparent 60%),
    radial-gradient(ellipse 700px 500px at 0% 0%, rgba(168, 52, 28, 0.08), transparent 60%);
}
.branches-hero-inner { max-width: 940px; display: flex; flex-direction: column; gap: 24px; }

.branches-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  padding-top: 28px;
  margin: 24px 0 0;
  border-top: 1px solid var(--color-border-hot);
  max-width: 620px;
}
.branches-stats div { display: flex; flex-direction: column; gap: 6px; }
.branches-stats dt {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--color-text-subtle);
  margin: 0;
}
.branches-stats dd {
  font-family: var(--font-display);
  font-size: clamp(28px, 3.6vw, 42px);
  font-weight: 700;
  color: var(--color-secondary);
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1;
}

.branches-list { padding: 80px 0 96px; }
.branches-stack {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

@media (max-width: 620px) {
  .branches-stats { grid-template-columns: 1fr; gap: 20px; }
}
`
