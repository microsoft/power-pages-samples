import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { BlogPost } from '../types';

// Sample blog posts data (same as in other components)
const samplePosts: BlogPost[] = [
  {
    id: '1',
    title: 'Getting Started with React Internationalization',
    excerpt: 'Learn how to implement i18n in React applications using react-i18next for better user experience across different languages.',
    content: `# Getting Started with React Internationalization

Internationalization (i18n) is crucial for reaching a global audience. In this post, we'll explore how to implement localization in React applications using react-i18next.

## What is Internationalization?

Internationalization is the process of designing applications to support multiple languages and regions without requiring engineering changes to the source code.

## Setting up react-i18next

First, install the required packages:

\`\`\`bash
npm install react-i18next i18next
\`\`\`

Then configure your i18n instance and add translation files for each supported language.

## Best Practices

1. Keep translation keys organized and hierarchical
2. Use interpolation for dynamic content
3. Consider pluralization rules for different languages
4. Test your application in all supported languages

This approach ensures your application can seamlessly switch between languages while maintaining functionality and user experience.`,
    author: 'Jane Developer',
    publishedDate: '2025-01-15',
    readingTime: 5,
    category: 'Development'
  },
  {
    id: '2',
    title: 'Building Responsive Web Applications',
    excerpt: 'Explore modern techniques for creating responsive web applications that work seamlessly across all devices and screen sizes.',
    content: `# Building Responsive Web Applications

In today's multi-device world, creating responsive web applications is essential. This post covers modern techniques and best practices.

## Mobile-First Approach

Starting with mobile designs and progressively enhancing for larger screens ensures better performance and user experience.

## CSS Grid and Flexbox

Modern CSS layout methods provide powerful tools for creating flexible, responsive layouts:

- **CSS Grid**: Perfect for two-dimensional layouts
- **Flexbox**: Ideal for one-dimensional layouts and component alignment

## Media Queries

Use media queries strategically to adapt your design for different screen sizes:

\`\`\`css
@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }
}
\`\`\`

## Testing Across Devices

Always test your applications on real devices and various screen sizes to ensure optimal user experience.`,
    author: 'John Designer',
    publishedDate: '2025-01-10',
    readingTime: 7,
    category: 'Design'
  },
  {
    id: '3',
    title: 'Modern JavaScript Features You Should Know',
    excerpt: 'Discover the latest JavaScript features that can improve your code quality and development productivity.',
    content: `# Modern JavaScript Features You Should Know

JavaScript continues to evolve with new features that make development more efficient and code more readable.

## Optional Chaining

Optional chaining allows you to safely access nested object properties:

\`\`\`javascript
const user = {
  profile: {
    name: 'Alice'
  }
};

// Safe access
const name = user?.profile?.name;
\`\`\`

## Nullish Coalescing

The nullish coalescing operator provides a way to handle null or undefined values:

\`\`\`javascript
const username = user.name ?? 'Anonymous';
\`\`\`

## Dynamic Imports

Load modules dynamically for better performance:

\`\`\`javascript
const module = await import('./myModule.js');
\`\`\`

## Array Methods

New array methods like \`at()\` and \`findLast()\` provide more intuitive ways to work with arrays.

These features help write cleaner, more maintainable code while improving application performance.`,
    author: 'Alex Coder',
    publishedDate: '2025-01-05',
    readingTime: 6,
    category: 'JavaScript'
  }
];

const BlogPost: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [post, setPost] = useState<BlogPost | null>(null);

  useEffect(() => {
    // Find the post by ID
    const foundPost = samplePosts.find(p => p.id === id);
    setPost(foundPost || null);
  }, [id]);

  if (!post) {
    return (
      <div className="main-content">
        <div className="container">
          <div className="blog-post">
            <h1>{t('common.notFound')}</h1>
            <Link to="/blog" className="btn back-btn">
              {t('blog.backToBlog')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="container">
        <Link to="/blog" className="btn back-btn">
          {t('blog.backToBlog')}
        </Link>
        
        <article className="blog-post">
          <header className="blog-post-header">
            <h1 className="blog-post-title">{post.title}</h1>
            <div className="blog-post-meta">
              <span>{t('home.publishedOn')} {post.publishedDate}</span>
              <span> • </span>
              <span>{t('blog.readingTime', { minutes: post.readingTime })}</span>
              <span> • </span>
              <span>{t('blog.category')}: {post.category}</span>
            </div>
          </header>
          
          <div className="blog-post-content">
            {post.content.split('\n').map((paragraph, index) => {
              if (paragraph.startsWith('# ')) {
                return <h1 key={index}>{paragraph.substring(2)}</h1>;
              } else if (paragraph.startsWith('## ')) {
                return <h2 key={index}>{paragraph.substring(3)}</h2>;
              } else if (paragraph.startsWith('```')) {
                return <pre key={index}><code>{paragraph}</code></pre>;
              } else if (paragraph.trim() === '') {
                return <br key={index} />;
              } else {
                return <p key={index}>{paragraph}</p>;
              }
            })}
          </div>
        </article>
      </div>
    </div>
  );
};

export default BlogPost;
