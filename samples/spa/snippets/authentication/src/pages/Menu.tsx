import { useEffect } from 'react'
import { categories, menuItems } from '../data/menu'
import { site } from '../data/site'
import MenuItemCard from '../components/MenuItemCard'

export default function Menu() {
  useEffect(() => { document.title = `Menu — ${site.name}` }, [])

  return (
    <>
      <style>{menuPageCSS}</style>

      <section className="menu-hero">
        <div className="container menu-hero-inner">
          <span className="eyebrow rise d-1">The full menu</span>
          <h1 className="rise d-2">
            Six signatures.<br />
            <span className="display-italic">Plus the things you order with them.</span>
          </h1>
          <p className="lede rise d-3">
            All burgers are served with house pickles and a side of charred-onion aioli. The kitchen is happy to swap proteins,
            adjust heat, or build a plant-based version of any burger on request.
          </p>

          <nav className="menu-jump rise d-4" aria-label="Menu sections">
            {categories.map(cat => (
              <a key={cat} href={`#${slugify(cat)}`} className="menu-jump-link">
                {cat}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {categories.map(category => {
        const items = menuItems.filter(i => i.category === category)
        return (
          <section
            key={category}
            id={slugify(category)}
            className="menu-section"
            aria-labelledby={`heading-${slugify(category)}`}
          >
            <div className="container">
              <header className="section-head menu-section-head">
                <span className="eyebrow">{category}</span>
                <h2 id={`heading-${slugify(category)}`}>
                  {category === 'Signature Burgers' && <>The signatures.</>}
                  {category === 'Sides' && <>The supporting cast.</>}
                  {category === 'Drinks' && <>Something to drink it with.</>}
                  {category === 'Desserts' && <>Why not finish slowly, too.</>}
                </h2>
                <span className="divider-rule" aria-hidden="true" />
              </header>
              <div className={`menu-grid ${category === 'Signature Burgers' ? 'menu-grid-3' : 'menu-grid-2'}`}>
                {items.map(item => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </section>
        )
      })}
    </>
  )
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const menuPageCSS = `
.menu-hero {
  padding: 180px 0 64px;
  position: relative;
  border-bottom: 1px solid var(--color-border);
  background:
    radial-gradient(ellipse 900px 600px at 80% 100%, rgba(201, 137, 61, 0.10), transparent 60%),
    radial-gradient(ellipse 700px 500px at 0% 20%, rgba(168, 52, 28, 0.08), transparent 60%);
}
.menu-hero-inner { max-width: 940px; display: flex; flex-direction: column; gap: 24px; }

.menu-jump {
  margin-top: 24px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.menu-jump-link {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  padding: 10px 16px;
  border: 1px solid var(--color-border-hot);
  border-radius: 999px;
  text-decoration: none;
  transition: color 0.25s var(--ease-out), background 0.25s var(--ease-out), transform 0.25s var(--ease-cinematic);
}
.menu-jump-link:hover {
  color: var(--color-secondary);
  background: var(--color-surface-2);
  transform: translateY(-1px);
}

.menu-section { padding: 80px 0; border-bottom: 1px solid var(--color-border); }
.menu-section:last-of-type { border-bottom: none; }
.menu-section:nth-of-type(even) { background: linear-gradient(180deg, var(--color-bg) 0%, var(--color-bg-2) 100%); }

.menu-section-head { max-width: none; flex-direction: column; gap: 12px; }

.menu-grid { display: grid; gap: 28px; }
.menu-grid-3 { grid-template-columns: repeat(3, 1fr); }
.menu-grid-2 { grid-template-columns: repeat(2, 1fr); }

@media (max-width: 980px) {
  .menu-grid-3 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 620px) {
  .menu-hero { padding: 140px 0 48px; }
  .menu-grid-3, .menu-grid-2 { grid-template-columns: 1fr; }
}
`
