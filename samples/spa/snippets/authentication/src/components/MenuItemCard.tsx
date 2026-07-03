import { type MenuItem } from '../data/menu'

export default function MenuItemCard({ item }: { item: MenuItem }) {
  return (
    <>
      <style>{menuItemCSS}</style>
      <article className="menu-card">
        <div className="menu-card-media">
          <img src={item.image} alt={`${item.name} — ${item.category}`} loading="lazy" />
          {item.tag && <span className="menu-card-tag">{item.tag}</span>}
        </div>
        <div className="menu-card-body">
          <header className="menu-card-head">
            <h3 className="menu-card-name">{item.name}</h3>
            <span className="menu-card-price">{item.price}</span>
          </header>
          <p className="menu-card-desc">{item.description}</p>
        </div>
      </article>
    </>
  )
}

const menuItemCSS = `
.menu-card {
  background: linear-gradient(180deg, var(--color-surface) 0%, var(--color-surface-2) 100%);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.45s var(--ease-cinematic),
              box-shadow 0.45s var(--ease-cinematic),
              border-color 0.45s var(--ease-out);
}
.menu-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-lift);
  border-color: var(--color-primary);
}
.menu-card-media {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--color-bg-2);
}
.menu-card-media img {
  width: 100%; height: 100%; object-fit: cover;
  transition: transform 0.9s var(--ease-cinematic), filter 0.6s var(--ease-out);
  filter: saturate(0.95) contrast(1.05);
}
.menu-card:hover .menu-card-media img { transform: scale(1.06); filter: saturate(1.05) contrast(1.08); }
.menu-card-tag {
  position: absolute;
  top: 14px; left: 14px;
  background: rgba(14, 11, 10, 0.78);
  backdrop-filter: blur(6px);
  border: 1px solid var(--color-border-hot);
  color: var(--color-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 6px 10px;
  border-radius: 999px;
}

.menu-card-body { padding: 24px 22px 26px; display: flex; flex-direction: column; gap: 12px; flex: 1; }
.menu-card-head { display: flex; align-items: baseline; gap: 16px; justify-content: space-between; }
.menu-card-name {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: -0.005em;
  line-height: 1.15;
  margin: 0;
}
.menu-card-price {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--color-primary);
  font-size: 22px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.menu-card-desc {
  color: var(--color-text-muted);
  font-size: 15px;
  line-height: 1.55;
}
`
