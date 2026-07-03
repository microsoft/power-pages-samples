import React from 'react';
import ApplicationForm from '../components/ApplicationForm';
import EligibilityInfo from '../components/EligibilityInfo';
import ApplyCardBenefits from '../components/ApplyCardBenefits';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuth } from '../context/AuthContext';

const Application: React.FC = () => {
  useDocumentTitle('Card Application');
  const { isAuthenticated, user, login } = useAuth();
  const userData = {
    firstName: user?.name?.split(' ')[0] || user?.givenName || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || user?.familyName || '',
    email: user?.username || user?.email || ''
  };

  return (
    <div className="max-w-screen-lg mx-auto p-6">
      <h1 className="text-4xl font-extrabold text-center mb-8 text-gray-900 dark:text-gray-100">
        Apply for a Card
      </h1>
      {/* Application Form */ }
      <section className="bg-gray-100 dark:bg-gray-800 p-10 rounded-xl shadow-lg dark:shadow-gray-900/50 max-w-3xl mx-auto w-full mb-8 border dark:border-gray-700">
        <h2 className="text-2xl font-bold text-center mb-4 text-gray-900 dark:text-gray-100">
          Application Form
        </h2>
        { isAuthenticated ? (
          <ApplicationForm userData={ userData } />
        ) : (
          <div className="text-center py-6">
            <p className="text-lg mb-4 text-gray-800 dark:text-gray-200">Please sign in to access the application form.</p>
            <button
              type="button"
              onClick={ login }
              className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
          </div>
        ) }
      </section>
      {/* Side by side sections for eligibility info and benefits */ }
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <section>
          <EligibilityInfo />
        </section>
        <section className="dark:bg-gray-800 dark:border dark:border-gray-700 rounded-xl">
          <ApplyCardBenefits />
        </section>
      </div>
    </div>
  );
};

export default Application;
