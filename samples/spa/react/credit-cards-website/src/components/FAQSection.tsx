import React from 'react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface FAQSectionProps {
  faqs: FAQ[];
}

const FAQSection: React.FC<FAQSectionProps> = ({ faqs }) => {
  const [openFAQ, setOpenFAQ] = React.useState<string | null>(null);

  const toggleFAQ = (id: string): void => {
    setOpenFAQ(openFAQ === id ? null : id);
  };

  return (
    <div className="py-2 space-y-4">      { faqs.length === 0 ? (
      <div className="text-center p-8 bg-gray-50 dark:!bg-gray-700 rounded-lg">
        <p className="text-gray-500 dark:text-gray-300 text-lg">No FAQs found matching your search.</p>
      </div>
    ) : (
      faqs.map((faq) => (
        <div
          key={ faq.id }
          className={ `rounded-lg border ${openFAQ === faq.id
              ? 'border-indigo-300 dark:border-indigo-500 shadow-md bg-indigo-50 dark:!bg-indigo-900/30'
              : 'border-gray-200 dark:border-gray-700'
            }` }
        >            <div
          className="flex justify-between items-center !p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg"
          onClick={ () => toggleFAQ(faq.id) }
          onKeyDown={ (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleFAQ(faq.id);
            }
          } }
          role="button"
          tabIndex={ 0 }
        >              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{ faq.question }</h3>
            <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:!bg-indigo-900/50 rounded-full h-8 w-8 flex items-center justify-center">
              { openFAQ === faq.id ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 10a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 0 1 1 1v3h3a1 1 0 1 1 0 2h-3v3a1 1 0 1 1-2 0v-3H6a1 1 0 1 1 0-2h3V6a1 1 0 0 1 1-1z" clipRule="evenodd" />
                </svg>
              ) }
            </span>
          </div>            { openFAQ === faq.id && (
            <div
              id={ `faq-answer-${faq.id}` }
              className="px-5 pb-5 pt-0 animate-slide-down"
            >
              <div className="border-t border-gray-200 pt-4">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{ faq.answer }</p>
              </div>
            </div>
          ) }
        </div>
      ))
    ) }
    </div>
  );
};

export default FAQSection;
