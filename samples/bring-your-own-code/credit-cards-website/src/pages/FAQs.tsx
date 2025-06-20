import React, { useState } from 'react';
import FAQSection from '../components/FAQSection';
import faqData from '../data/faqData.json';
import { getFAQsByKeyword } from '../utils/faqUtils';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const FAQs: React.FC = () => {
  useDocumentTitle('Frequently Asked Questions');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredFAQs, setFilteredFAQs] = useState(faqData);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const keyword = event.target.value;
    setSearchTerm(keyword);
    const results = getFAQsByKeyword(faqData, keyword);
    setFilteredFAQs(results);
  };
  return (
    <div className="mx-auto my-8 px-4">
      <div className="text-center mb-12 relative py-12 bg-gradient-to-b from-gray-900/70 to-gray-900/30 rounded-xl">
        <h1 className="text-5xl font-bold text-white mb-6">Frequently Asked Questions</h1>
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-xl text-white font-medium">
            Here you'll find answers to some of the most common questions about our services and offerings. If you can't find what you're looking for, feel free to reach out to us directly.
          </p>
        </div><div className="relative mb-8 max-w-2xl mx-auto mt-8">
          <div className="absolute inset-0 bg-white rounded-xl opacity-20 blur-sm -z-10"></div>          <input
            type="text"
            placeholder="Search FAQs..."
            value={ searchTerm }
            onChange={ handleSearch }
            aria-label="Search FAQs"
            className="w-full !p-5 pl-14 border-2 border-white/40 bg-white/90 dark:!bg-gray-800/90 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-300 text-lg font-medium placeholder-gray-500 dark:placeholder-gray-400 text-gray-800 dark:text-gray-200"
          />
          <span className="absolute left-5 top-1/2 transform -translate-y-1/2 text-indigo-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M13.273 14.727a7.5 7.5 0 1 0-1.414 1.414l4.928 4.928a1 1 0 0 0 1.414-1.414l-4.928-4.928zM15 8a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" clipRule="evenodd" />
            </svg>
          </span>
        </div>      </div>      <div className="bg-white dark:!bg-gray-800 shadow-xl rounded-xl px-8 py-10 max-w-4xl mx-auto mt-10 border border-gray-100 dark:border-gray-700">
        <FAQSection faqs={ filteredFAQs } />
      </div>      <div className="mt-16 text-center bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-indigo-900 py-12 px-6 rounded-xl shadow-lg max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Still have questions?</h2>
        <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          If you didn't find the answer you're looking for, our support team is here to help! Reach out to us through our <a href="/contact" className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium">contact page</a>.
        </p>
        <img src="/assets/contact-1.jpg" alt="Support Team" className="mx-auto rounded-xl shadow-xl max-w-md w-full object-cover h-64" />
      </div>
    </div>
  );
};

export default FAQs;
