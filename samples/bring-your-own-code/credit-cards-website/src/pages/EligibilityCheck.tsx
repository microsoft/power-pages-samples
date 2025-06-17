import React from 'react';
import EligibilityForm from '../components/EligibilityForm';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const EligibilityCheck = () => {
  useDocumentTitle('Eligibility Check');
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-100 to-indigo-200 p-8">
      <h1 className="text-5xl font-extrabold mb-6 text-gray-900 drop-shadow-md">Check Your Eligibility</h1>
      <p className="text-lg text-gray-700 text-center mb-8 max-w-2xl">
        Find out if you qualify for exclusive investment opportunities by filling out the quick eligibility form below.
      </p>

      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-2xl border border-gray-200 transform hover:scale-105 transition duration-300">
        <EligibilityForm />
      </div>

      <div className="mt-12 max-w-4xl p-8 bg-white shadow-2xl rounded-2xl text-center border border-gray-200 transform hover:scale-105 transition duration-300">
        <h2 className="text-3xl font-semibold text-gray-900">Why Check Your Eligibility?</h2>
        <ul className="mt-6 space-y-4 text-gray-700 text-left text-lg">
          <li className="border-b pb-2 flex items-center gap-2">✅ Get personalized investment recommendations.</li>
          <li className="border-b pb-2 flex items-center gap-2">✅ Ensure compliance with financial regulations.</li>
          <li className="border-b pb-2 flex items-center gap-2">✅ Access exclusive investment opportunities.</li>
        </ul>
      </div>

      <div className="mt-12 max-w-4xl p-8 bg-gray-50 shadow-xl rounded-2xl border border-gray-200">
        <h2 className="text-3xl font-semibold text-gray-900 text-center">Common Eligibility Requirements</h2>
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="p-6 bg-white rounded-lg shadow-lg border border-gray-200 text-center transform hover:scale-105 transition duration-300">
            <h3 className="text-xl font-semibold text-gray-800">Minimum Investment</h3>
            <p className="text-gray-600 mt-2">Some investments require a minimum capital to participate.</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-lg border border-gray-200 text-center transform hover:scale-105 transition duration-300">
            <h3 className="text-xl font-semibold text-gray-800">Accredited Investor Status</h3>
            <p className="text-gray-600 mt-2">Certain investments are restricted to accredited investors.</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-lg border border-gray-200 text-center transform hover:scale-105 transition duration-300">
            <h3 className="text-xl font-semibold text-gray-800">Geographical Restrictions</h3>
            <p className="text-gray-600 mt-2">Some opportunities are limited based on location.</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-lg border border-gray-200 text-center transform hover:scale-105 transition duration-300">
            <h3 className="text-xl font-semibold text-gray-800">Financial History</h3>
            <p className="text-gray-600 mt-2">Credit scores and past investments may impact eligibility.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EligibilityCheck;
