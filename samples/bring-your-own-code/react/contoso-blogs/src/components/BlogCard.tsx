import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BlogPost } from '../types';

interface BlogCardProps {
  post: BlogPost;
}

const BlogCard: React.FC<BlogCardProps> = ({ post }) => {
  const { t } = useTranslation();

  return (
    <Link to={`/blog/${post.id}`} className="blog-card">
      <div className="blog-card-image">
        📝
      </div>
      <div className="blog-card-content">
        <h3 className="blog-card-title">{post.title}</h3>
        <p className="blog-card-excerpt">{post.excerpt}</p>
        <div className="blog-card-meta">
          <span>{t('home.publishedOn')} {post.publishedDate}</span>
          <span>{t('blog.readingTime', { minutes: post.readingTime })}</span>
        </div>
      </div>
    </Link>
  );
};

export default BlogCard;
