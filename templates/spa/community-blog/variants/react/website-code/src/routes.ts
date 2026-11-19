export const routes = [
  {
    "id": "home",
    "path": "/",
    "displayName": "Home",
    "summary": "Introduce the publication with a featured story and recent editorial picks."
  },
  {
    "id": "articles",
    "path": "/articles",
    "displayName": "Articles",
    "summary": "Browse and filter all published articles by topic or search term."
  },
  {
    "id": "article",
    "path": "/articles/designing-readable-guides",
    "displayName": "Article",
    "summary": "Read a complete long-form article with author and topic context."
  },
  {
    "id": "authors",
    "path": "/authors",
    "displayName": "Authors",
    "summary": "Meet the contributors behind the publication."
  },
  {
    "id": "author",
    "path": "/authors/maya-chen",
    "displayName": "Author profile",
    "summary": "Explore an author biography and their published work."
  }
] as const;

export type TemplateRoute = (typeof routes)[number];
