import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthButton } from './AuthButton';
import ExtendedWindow from '../ExtendedWindow';
import ThemeToggle from './ThemeToggle';

const Header: React.FC = () => {
  const [isReviewer, setIsReviewer] = useState(false);

  useEffect(() => {
    const checkUserRole = () => {
      const extWindow = window as unknown as ExtendedWindow;
      const userRoles = extWindow.Microsoft?.Dynamic365?.Portal?.User?.userRoles || [];
      setIsReviewer(Array.isArray(userRoles) && userRoles.includes("Credit Card Application Reviewer"));
    };

    checkUserRole();
  }, []);

  return (
    <header className="bg-gradient-to-bl from-indigo-900 to-blue-700 text-white shadow-lg sticky top-0 z-50 dark:from-gray-900 dark:to-indigo-950">
      <div className="container mx-auto flex items-center justify-between py-6 px-4">
        <div className="flex items-center space-x-3">
          <img src="/assets/Woodgrovebank_Logo.png" alt="Company Logo" className="h-12" />
          <span className="text-xl font-semibold">WoodGrove Bank</span>
        </div>
        <div className="flex items-center space-x-6">
          <nav className="flex space-x-6 font-medium text-lg">
            <Link to="/" className="hover:underline !text-gray-200 transition duration-300">Home</Link>
            <Link to="/comparison" className="hover:underline !text-gray-200 transition duration-300">Comparison</Link>
            <Link to="/application" className="hover:underline !text-gray-200 transition duration-300">Apply</Link>
            <Link to="/application-status" className="hover:underline !text-gray-200 transition duration-300">Application Status</Link>
            { isReviewer && (
              <Link to="/applications" className="hover:underline !text-gray-200 transition duration-300">Review Applications</Link>
            ) }
            <Link to="/faqs" className="hover:underline !text-gray-200 transition duration-300">FAQs</Link>
            <Link to="/contact" className="hover:underline !text-gray-200 transition duration-300">Contact</Link>
          </nav>
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
