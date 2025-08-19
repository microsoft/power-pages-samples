import React from 'react';
import { useTranslation } from 'react-i18next';

const About: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="main-content">
      <div className="container">
        <div className="about-section">
          <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', textAlign: 'center' }}>
            {t('about.title')}
          </h1>
          
          <p style={{ fontSize: '1.1rem', marginBottom: '2rem', lineHeight: '1.8' }}>
            {t('about.description')}
          </p>

          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#333' }}>
            {t('about.skills')}
          </h2>
          
          <ul style={{ marginBottom: '2rem', fontSize: '1.1rem' }}>
            {(t('about.skillsList', { returnObjects: true }) as string[]).map((skill: string, index: number) => (
              <li key={index} style={{ marginBottom: '0.5rem' }}>
                {skill}
              </li>
            ))}
          </ul>

          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#333' }}>
            {t('about.contact')}
          </h2>
          
          <p style={{ fontSize: '1.1rem', lineHeight: '1.8' }}>
            {t('about.contactDescription')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
