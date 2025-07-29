import React from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../types';

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value;
    i18n.changeLanguage(newLanguage);
  };

  return (
    <div className="language-selector">
      <select
        value={i18n.language}
        onChange={handleLanguageChange}
        aria-label="Select language"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
