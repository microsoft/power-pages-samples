import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';

const Header: React.FC = () => {
  const { t } = useTranslation();

  return (
    <header className="header">
      <div className="container">
        <nav className="nav">
          <Link to="/" className="nav-brand">
            {t('header.title')}
          </Link>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ul className="nav-links">
              <li>
                <Link to="/" className="nav-link">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link to="/blog" className="nav-link">
                  {t('nav.blog')}
                </Link>
              </li>
              <li>
                <Link to="/about" className="nav-link">
                  {t('nav.about')}
                </Link>
              </li>
            </ul>
            <LanguageSelector />
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
