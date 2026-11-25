import { useMemo, useState } from "react";
import PowerPagesBadge from "./components/PowerPagesBadge";
import { useOpportunities } from "./shared/hooks/useOpportunities";
import type { Opportunity } from "./types/opportunity";

function OpportunityCard({
  opportunity,
}: {
  opportunity: Opportunity;
}) {
  const organization = opportunity.organization;

  return (
    <article className="opportunity-card">
      <div className={`card-ribbon tone-${opportunity.tone}`} aria-hidden="true">
        <span dir="auto">{organization?.initials}</span>
      </div>
      <div className="card-body">
        <div className="card-topline">
          <span><bdi>{opportunity.category}</bdi></span>
          {opportunity.featured && <span className="featured-label">Featured</span>}
        </div>
        <h3 dir="auto">{opportunity.title}</h3>
        <p dir="auto">{opportunity.summary}</p>
        <dl>
          <div><dt>Where</dt><dd><bdi>{opportunity.location}</bdi></dd></div>
          <div><dt>Time</dt><dd><bdi>{opportunity.commitment}</bdi></dd></div>
        </dl>
        {organization && (
          <div className="organization-line">
            <span className="organization-mark" aria-hidden="true" dir="auto">{organization.initials}</span>
            <bdi>{organization.name}</bdi>
          </div>
        )}
      </div>
    </article>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const uiDirection = document.documentElement.dir === "rtl" ? "rtl" : "ltr";
  const {
    items: opportunities,
    totalCount,
    isLoading: opportunitiesAreLoading,
    error: opportunitiesError,
    isPermissionError: opportunityPermissionError,
  } = useOpportunities();
  const categories = useMemo(
    () => Array.from(new Set(
      opportunities
        .map((opportunity) => opportunity.category)
        .filter(Boolean),
    )).sort((first, second) =>
      first.localeCompare(second, document.documentElement.lang || undefined)),
    [opportunities],
  );
  const selectedCategory =
    category === "all" || categories.includes(category) ? category : "all";
  const organizationCount = useMemo(
    () => new Set(
      opportunities
        .map((opportunity) =>
          opportunity.organization?.id || opportunity.organizationId)
        .filter(Boolean),
    ).size,
    [opportunities],
  );
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(document.documentElement.lang || undefined),
    [],
  );
  const formatCount = (value: number) => numberFormatter.format(value);
  const heroCount = (value: number) => {
    if (opportunitiesAreLoading) return "…";
    if (opportunitiesError) return "—";
    return formatCount(value);
  };
  const visibleOpportunities = useMemo(() => opportunities.filter((opportunity) => {
    const searchText = `${opportunity.title} ${opportunity.summary} ${opportunity.location} ${opportunity.organization?.name ?? ""}`
      .toLowerCase();
    return searchText.includes(query.trim().toLowerCase()) &&
      (selectedCategory === "all" || opportunity.category === selectedCategory);
  }), [opportunities, query, selectedCategory]);

  return (
    <>
      <a className="skip-link" href="#opportunities">Skip to opportunities</a>
      <header className="site-header">
        <a className="brand" href="#top">
          <span className="brand-symbol" aria-hidden="true">VH</span>
          <span>Volunteer Hub</span>
        </a>
        <a className="header-link" href="#opportunities">Find an opportunity</a>
      </header>
      <main id="top">
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <p className="eyebrow">Small actions, shared momentum</p>
            <h1 id="hero-heading">Your time can move a neighborhood forward</h1>
            <p>
              Explore volunteer opportunities in a welcoming, accessible community directory.
            </p>
            <a className="primary-action" href="#opportunities">Explore opportunities</a>
            <ul className="hero-proof" aria-label="Directory summary">
              <li><strong>{heroCount(totalCount)}</strong><span>available opportunities</span></li>
              <li><strong>{heroCount(organizationCount)}</strong><span>participating organizations</span></li>
              <li><strong>{heroCount(categories.length)}</strong><span>community focus areas</span></li>
            </ul>
          </div>
          <div className="hero-art" aria-hidden="true">
            <span className="sun-shape"></span>
            <span className="path-shape"></span>
            <span className="people-shape people-one"></span>
            <span className="people-shape people-two"></span>
            <p>Together<br />starts here.</p>
          </div>
        </section>

        <section className="promise-band" aria-label="Volunteer Hub promise">
          <p>Clear expectations.</p>
          <p>Current opportunities.</p>
          <p>Real patterns to customize.</p>
        </section>

        <section className="catalog" id="opportunities" aria-labelledby="opportunities-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Opportunity finder</p>
              <h2 id="opportunities-heading">Choose where your time fits</h2>
            </div>
            <p>Search by activity, place, or organization.</p>
          </div>

          <div className="filters">
            <div>
              <label htmlFor="opportunity-search">Search opportunities</label>
              <input
                id="opportunity-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                dir={query.length > 0 ? "auto" : uiDirection}
                placeholder="Try garden, library, or online"
              />
            </div>
            <div>
              <label htmlFor="category-filter">Focus area</label>
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="all">All focus areas</option>
                {categories.map((item) => (
                  <option value={item} key={item} dir="auto">{item}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="results-heading">
            <h2>Available opportunities</h2>
            <p aria-live="polite">
              {opportunitiesAreLoading
                ? "Loading opportunities"
                : opportunitiesError
                  ? "Opportunity count unavailable"
                  : `${formatCount(visibleOpportunities.length)} opportunities`}
            </p>
          </div>

          {opportunitiesAreLoading ? (
            <div className="empty-state" role="status" aria-live="polite">
              <h3>Loading opportunities</h3>
              <p>Opportunity and organization details are being retrieved.</p>
            </div>
          ) : opportunitiesError ? (
            <div className="empty-state" role="alert">
              <h3>Opportunities could not be loaded</h3>
              <p>
                {opportunityPermissionError
                  ? "You do not have permission to view the opportunity catalog. Contact your administrator."
                  : "Dataverse returned an error while retrieving the opportunity catalog. Please try again later."}
              </p>
            </div>
          ) : visibleOpportunities.length > 0 ? (
            <div className="opportunity-grid">
              {visibleOpportunities.map((opportunity) => (
                <OpportunityCard
                  opportunity={opportunity}
                  key={opportunity.id}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No opportunities found</h3>
              <p>Try a broader search phrase or select all focus areas.</p>
            </div>
          )}
        </section>

        <section className="closing-panel" aria-labelledby="closing-heading">
          <p className="eyebrow">A reusable starting point</p>
          <h2 id="closing-heading">Make every invitation easier to understand</h2>
          <p>
            Keep your organizations, schedules, and participation requirements clear while
            preserving the accessible catalog pattern.
          </p>
        </section>
      </main>
      <footer className="site-footer">
        <div>
          <p className="footer-title">Volunteer Hub</p>
          <p>Community content delivered through a Power Pages opportunity directory.</p>
        </div>
        <PowerPagesBadge />
      </footer>
    </>
  );
}
