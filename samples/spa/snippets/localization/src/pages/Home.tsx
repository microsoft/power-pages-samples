import React from 'react';
import { useTranslation } from 'react-i18next';
import BlogCard from '../components/BlogCard';
import { BlogPost } from '../types';

// Sample blog posts data
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

const Home: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="main-content">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#333' }}>
            {t('home.welcome')}
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#666', maxWidth: '600px', margin: '0 auto' }}>
            {t('home.description')}
          </p>
        </div>

        <section>
          <h2 style={{ fontSize: '2rem', marginBottom: '2rem', color: '#333' }}>
            {t('home.latestPosts')}
          </h2>
          <div className="blog-grid">
            {samplePosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
