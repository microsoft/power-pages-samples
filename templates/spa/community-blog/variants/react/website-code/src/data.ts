export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
};

export type Author = {
  id: string;
  name: string;
  slug: string;
  role: string;
  bio: string;
  initials: string;
};

export type Post = {
  id: string;
  authorId: string;
  categoryId: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedOn: string;
  readMinutes: number;
  featured: boolean;
  tone: "clay" | "olive" | "ink" | "gold";
  body: string[];
};

export const categories: Category[] = [
  {
    id: "design",
    name: "Design systems",
    slug: "design-systems",
    description: "Patterns and practices for clear, consistent digital services."
  },
  {
    id: "accessibility",
    name: "Accessibility",
    slug: "accessibility",
    description: "Practical guidance for inclusive content and experiences."
  },
  {
    id: "community",
    name: "Community",
    slug: "community",
    description: "Stories about participation, trust, and shared spaces."
  },
  {
    id: "field-notes",
    name: "Field notes",
    slug: "field-notes",
    description: "Short observations and lessons from work in progress."
  }
];

export const authors: Author[] = [
  {
    id: "maya",
    name: "Maya Chen",
    slug: "maya-chen",
    role: "Design systems editor",
    bio: "Maya writes about making complex services easier to understand and use.",
    initials: "MC"
  },
  {
    id: "julian",
    name: "Julian Brooks",
    slug: "julian-brooks",
    role: "Community correspondent",
    bio: "Julian documents the people and small decisions that strengthen local communities.",
    initials: "JB"
  },
  {
    id: "amina",
    name: "Amina Yusuf",
    slug: "amina-yusuf",
    role: "Accessibility editor",
    bio: "Amina shares practical approaches to inclusive content, research, and digital publishing.",
    initials: "AY"
  }
];

export const posts: Post[] = [
  {
    id: "readable-guides",
    authorId: "maya",
    categoryId: "design",
    title: "Designing guides people can actually read",
    slug: "designing-readable-guides",
    excerpt: "A practical method for turning dense service knowledge into calm, useful guidance.",
    publishedOn: "2026-10-03T09:00:00Z",
    readMinutes: 6,
    featured: true,
    tone: "clay",
    body: [
      "Readable guidance begins with a clear promise. Name the job a reader is trying to finish before offering background or detail.",
      "Use headings as a map. A reader should be able to scan the page, understand the sequence, and find the point where their situation changes.",
      "Examples should answer the question directly before adding nuance. The goal is not to remove complexity, but to reveal it at the moment it becomes useful."
    ]
  },
  {
    id: "task-review",
    authorId: "amina",
    categoryId: "accessibility",
    title: "A better accessibility review starts with the task",
    slug: "accessibility-review-starts-with-task",
    excerpt: "Why reviewing the complete reader journey catches problems that isolated components miss.",
    publishedOn: "2026-10-08T09:00:00Z",
    readMinutes: 5,
    featured: true,
    tone: "olive",
    body: [
      "Start with the task a reader needs to complete and follow it from entry to outcome.",
      "Keyboard order, clear labels, useful errors, and readable content work together. A component can pass alone while the full journey remains confusing."
    ]
  },
  {
    id: "welcoming-event",
    authorId: "julian",
    categoryId: "community",
    title: "The quiet infrastructure of a welcoming event",
    slug: "welcoming-event-infrastructure",
    excerpt: "Small operational choices can make participation feel considered rather than improvised.",
    publishedOn: "2026-10-12T09:00:00Z",
    readMinutes: 4,
    featured: false,
    tone: "gold",
    body: [
      "A welcoming event is built before anyone arrives. Share the schedule early and explain what support is available.",
      "These details turn an invitation into a practical path to participation."
    ]
  },
  {
    id: "tokens",
    authorId: "maya",
    categoryId: "design",
    title: "Tokens are decisions, not just variables",
    slug: "tokens-are-decisions",
    excerpt: "A useful token system records why a visual choice exists and where it should change.",
    publishedOn: "2026-10-18T09:00:00Z",
    readMinutes: 7,
    featured: false,
    tone: "ink",
    body: [
      "A token earns its place when it communicates a reusable decision.",
      "Name roles rather than colors, document contrast expectations, and keep the number of exceptions small."
    ]
  },
  {
    id: "alternative-text",
    authorId: "amina",
    categoryId: "accessibility",
    title: "Writing useful alternative text",
    slug: "writing-useful-alternative-text",
    excerpt: "Describe the information an image contributes, not every visible detail.",
    publishedOn: "2026-10-22T09:00:00Z",
    readMinutes: 4,
    featured: false,
    tone: "clay",
    body: [
      "Alternative text should preserve the reason an image is present.",
      "Describe the relevant information in the surrounding context and leave decorative images empty."
    ]
  },
  {
    id: "listening-sessions",
    authorId: "julian",
    categoryId: "community",
    title: "Listening sessions need a visible next step",
    slug: "listening-sessions-next-step",
    excerpt: "Closing the feedback loop is part of the session, not a follow-up detail.",
    publishedOn: "2026-10-27T09:00:00Z",
    readMinutes: 5,
    featured: false,
    tone: "olive",
    body: [
      "People need to know what happens after they share their experience.",
      "Explain how notes will be used, when an update will appear, and what cannot change."
    ]
  },
  {
    id: "first-screen",
    authorId: "maya",
    categoryId: "field-notes",
    title: "Field note: start the critique at the first screen",
    slug: "field-note-first-screen",
    excerpt: "If the first screen is unclear, polishing the rest cannot repair the experience.",
    publishedOn: "2026-11-02T09:00:00Z",
    readMinutes: 3,
    featured: false,
    tone: "gold",
    body: [
      "Review the first screen before refining the complete page.",
      "It should identify the offering, orient the reader, provide honest proof, and make the next action obvious."
    ]
  },
  {
    id: "narrow-widths",
    authorId: "amina",
    categoryId: "field-notes",
    title: "Field note: test the words at narrow widths",
    slug: "field-note-narrow-widths",
    excerpt: "Content expansion and small screens reveal assumptions hidden by spacious layouts.",
    publishedOn: "2026-11-08T09:00:00Z",
    readMinutes: 3,
    featured: false,
    tone: "ink",
    body: [
      "Test real headings, labels, and errors at narrow widths.",
      "A resilient layout treats longer wording as normal rather than exceptional."
    ]
  }
];

export function getAuthor(authorId: string) {
  return authors.find((author) => author.id === authorId);
}

export function getCategory(categoryId: string) {
  return categories.find((category) => category.id === categoryId);
}
