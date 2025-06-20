import React, { useState, useEffect } from 'react';
import ApplicationForm from '../components/ApplicationForm';
import EligibilityInfo from '../components/EligibilityInfo';
import ApplyCardBenefits from '../components/ApplyCardBenefits';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ExtendedWindow from '@/ExtendedWindow';

const Application: React.FC = () => {
  useDocumentTitle('Card Application');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [token, setToken] = useState<string>("");
  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    email: ""
  });
  const extWindow = window as unknown as ExtendedWindow;
  const tenantId = extWindow.Microsoft?.Dynamic365?.Portal?.tenant ?? "";

  useEffect(() => {
    // Get user data from Dynamics 365 Portal
    const extWindow = window as unknown as ExtendedWindow;
    const portalUsername = extWindow.Microsoft?.Dynamic365?.Portal?.User?.userName ?? "";
    const firstName = extWindow.Microsoft?.Dynamic365?.Portal?.User?.firstName ?? "";
    const lastName = extWindow.Microsoft?.Dynamic365?.Portal?.User?.lastName ?? "";
    const email = extWindow.Microsoft?.Dynamic365?.Portal?.User?.email ?? "";

    setIsAuthenticated(portalUsername !== "");
    setUserData({
      firstName,
      lastName,
      email
    });

    // Get token for sign-in if needed
    const getToken = async () => {
      try {
        if (typeof window !== "undefined" && extWindow.shell?.getTokenDeferred) {
          const token = await extWindow.shell.getTokenDeferred();
          setToken(token);
        }
      } catch (error) {
        console.error('Error fetching token:', error);
      }
    };
    getToken();
  }, []);

  return (<div className="max-w-screen-lg mx-auto p-6">
    <h1 className="text-4xl font-extrabold text-center mb-8 text-gray-900 dark:text-gray-100">
      Apply for a Card
    </h1>      {/* Application Form - Enhanced Styling */ }
    <section className="bg-gray-100 dark:bg-gray-800 p-10 rounded-xl shadow-lg dark:shadow-gray-900/50 max-w-3xl mx-auto w-full mb-8 border dark:border-gray-700">
      <h2 className="text-2xl font-bold text-center mb-4 text-gray-900 dark:text-gray-100">
        Application Form
      </h2>        { isAuthenticated ? (
        <ApplicationForm userData={ userData } />
      ) : (
        <div className="text-center py-6">
          <p className="text-lg mb-4 text-gray-800 dark:text-gray-200">Please sign in to access the application form.</p>
          <form action="/Account/Login/ExternalLogin" method="post" className="flex justify-center">
              <input name="__RequestVerificationToken" type="hidden" value={ token } />
              <button
                name="provider"
                type="submit"
                className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                value={ `https://login.windows.net/${tenantId}/` }
              >
                Sign In
              </button>
            </form>
        </div>
      ) }
    </section>      {/* Side by side sections for eligibility info and benefits */ }
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <section className="">
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
