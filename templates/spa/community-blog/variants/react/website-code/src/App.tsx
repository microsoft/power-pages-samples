import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useParams } from "react-router-dom";
import PowerPagesBadge from "./components/PowerPagesBadge";
import { authors, categories, getAuthor, getCategory, posts, type Post } from "./data";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric"
});

function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title === "Community Blog" ? title : `${title} - Community Blog`;
  }, [title]);
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}

function PostCard({ post }: { post: Post }) {
  const author = getAuthor(post.authorId);
  const category = getCategory(post.categoryId);
  return (
    <article className="post-card">
      <Link className={`post-art tone-${post.tone}`} to={`/articles/${post.slug}`} aria-label={`Read ${post.title}`}>
        <span aria-hidden="true">{category?.name.slice(0, 1)}</span>
      </Link>
      <div className="post-card-body">
        <p className="post-kicker">{category?.name}</p>
        <h3><Link to={`/articles/${post.slug}`}>{post.title}</Link></h3>
        <p>{post.excerpt}</p>
        <div className="post-meta">
          <span>{author?.name}</span>
          <span>{post.readMinutes} min read</span>
        </div>
      </div>
    </article>
  );
}

function HomePage() {
  useDocumentTitle("Community Blog");
  const featured = posts[0];
  const featuredAuthor = getAuthor(featured.authorId);
  const featuredCategory = getCategory(featured.categoryId);
  return (
    <>
      <section className="editorial-hero" aria-labelledby="home-heading">
        <div className="hero-copy">
          <p className="eyebrow">Independent ideas for practical work</p>
          <h1 id="home-heading">Notes for people building clearer communities</h1>
          <p className="hero-deck">
            Thoughtful essays on accessible design, useful systems, and the small choices that help people participate.
          </p>
          <Link className="text-link" to={`/articles/${featured.slug}`}>Read the featured story <span aria-hidden="true">-&gt;</span></Link>
        </div>
        <article className="featured-story">
          <div className="issue-mark" aria-hidden="true"><span>Issue</span><strong>04</strong></div>
          <div>
            <p className="post-kicker">{featuredCategory?.name}</p>
            <h2><Link to={`/articles/${featured.slug}`}>{featured.title}</Link></h2>
            <p>{featured.excerpt}</p>
            <div className="post-meta">
              <span>By {featuredAuthor?.name}</span>
              <span>{featured.readMinutes} min read</span>
            </div>
          </div>
        </article>
      </section>
      <section className="manifesto-band" aria-label="Publication promise">
        <p>One considered idea at a time.</p>
        <p>Fictional editorial content, ready to replace with your organization's voice.</p>
      </section>
      <section className="content-shell" aria-labelledby="recent-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Latest dispatches</p>
            <h2 id="recent-heading">Recent stories</h2>
          </div>
          <Link className="text-link" to="/articles">Browse all articles</Link>
        </div>
        <div className="post-grid">
          {posts.slice(1, 5).map((post) => <PostCard post={post} key={post.id} />)}
        </div>
      </section>
    </>
  );
}

function ArticlesPage() {
  useDocumentTitle("Articles");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const visiblePosts = useMemo(() => posts.filter((post) => {
    const author = getAuthor(post.authorId);
    const matchesQuery = `${post.title} ${post.excerpt} ${author?.name ?? ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    return matchesQuery && (category === "all" || post.categoryId === category);
  }), [category, query]);

  return (
    <section className="content-shell page-intro" aria-labelledby="articles-heading">
      <p className="eyebrow">The complete journal</p>
      <h1 id="articles-heading">Browse all articles</h1>
      <p>Search the archive or choose a topic. Every article and person in this template is fictional.</p>
      <div className="filters">
        <div>
          <label htmlFor="article-search">Search articles</label>
          <input
            id="article-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles, summaries, or authors"
          />
        </div>
        <div>
          <label htmlFor="topic-filter">Topic</label>
          <select id="topic-filter" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All topics</option>
            {categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
        </div>
      </div>
      <div className="results-heading">
        <h2>Stories</h2>
        <p aria-live="polite">{visiblePosts.length} articles</p>
      </div>
      {visiblePosts.length > 0 ? (
        <div className="post-grid">
          {visiblePosts.map((post) => <PostCard post={post} key={post.id} />)}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No articles found</h2>
          <p>Try a different phrase or select all topics.</p>
        </div>
      )}
    </section>
  );
}

function ArticlePage() {
  const { slug } = useParams();
  const post = posts.find((item) => item.slug === slug) ?? posts[0];
  const author = getAuthor(post.authorId);
  const category = getCategory(post.categoryId);
  useDocumentTitle(post.title);
  return (
    <article className="article-layout">
      <header className="article-header">
        <nav aria-label="Breadcrumb"><Link to="/articles">Articles</Link><span aria-hidden="true">/</span><span>{category?.name}</span></nav>
        <p className="eyebrow">{category?.name}</p>
        <h1>{post.title}</h1>
        <p className="article-deck">{post.excerpt}</p>
        <div className="article-byline">
          <Link to={`/authors/${author?.slug}`}>{author?.name}</Link>
          <span>{dateFormatter.format(new Date(post.publishedOn))}</span>
          <span>{post.readMinutes} min read</span>
        </div>
      </header>
      <div className="article-body">
        <p className="article-lede">{post.body[0]}</p>
        <h2>Make the structure visible</h2>
        {post.body.slice(1).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <blockquote>Clarity is not simplification. It is the work of showing complexity in the right order.</blockquote>
      </div>
      <aside className="author-note" aria-labelledby="article-author-heading">
        <div className="author-avatar" aria-hidden="true">{author?.initials}</div>
        <div>
          <p className="eyebrow">About the author</p>
          <h2 id="article-author-heading">{author?.name}</h2>
          <p>{author?.bio}</p>
          <Link className="text-link" to={`/authors/${author?.slug}`}>View author profile</Link>
        </div>
      </aside>
    </article>
  );
}

function AuthorsPage() {
  useDocumentTitle("Authors");
  return (
    <section className="content-shell page-intro" aria-labelledby="authors-heading">
      <p className="eyebrow">Contributors</p>
      <h1 id="authors-heading">Meet the authors</h1>
      <p>Three fictional editorial voices demonstrate how author attribution and profile pages work.</p>
      <div className="author-grid">
        {authors.map((author, index) => (
          <article className="author-card" key={author.id}>
            <div className={`author-avatar avatar-${index + 1}`} aria-hidden="true">{author.initials}</div>
            <p className="post-kicker">{author.role}</p>
            <h2><Link to={`/authors/${author.slug}`}>{author.name}</Link></h2>
            <p>{author.bio}</p>
            <Link className="text-link" to={`/authors/${author.slug}`}>Read profile</Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function AuthorPage() {
  const { slug } = useParams();
  const author = authors.find((item) => item.slug === slug) ?? authors[0];
  const authoredPosts = posts.filter((post) => post.authorId === author.id);
  useDocumentTitle(author.name);
  return (
    <section className="content-shell author-profile" aria-labelledby="author-heading">
      <div className="author-profile-intro">
        <div className="author-avatar profile-avatar" aria-hidden="true">{author.initials}</div>
        <div>
          <p className="eyebrow">{author.role}</p>
          <h1 id="author-heading">{author.name}</h1>
          <p>{author.bio}</p>
          <p className="sample-note">Fictional contributor profile for template demonstration.</p>
        </div>
      </div>
      <div className="section-heading">
        <h2>Articles by {author.name}</h2>
        <p>{authoredPosts.length} stories</p>
      </div>
      <div className="post-grid">
        {authoredPosts.map((post) => <PostCard post={post} key={post.id} />)}
      </div>
    </section>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="site-header">
        <NavLink className="brand" to="/">
          <span className="brand-mark" aria-hidden="true">CB</span>
          <span>Community Blog<span className="visually-hidden"> home</span></span>
        </NavLink>
        <nav aria-label="Primary navigation">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/articles">Articles</NavLink>
          <NavLink to="/authors">Authors</NavLink>
        </nav>
      </header>
      <main id="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/articles" element={<ArticlesPage />} />
          <Route path="/articles/:slug" element={<ArticlePage />} />
          <Route path="/authors" element={<AuthorsPage />} />
          <Route path="/authors/:slug" element={<AuthorPage />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div>
          <p className="footer-title">Community Blog</p>
          <p>Fictional editorial content for demonstrating an accessible Power Pages publication.</p>
        </div>
        <PowerPagesBadge />
      </footer>
    </>
  );
}
