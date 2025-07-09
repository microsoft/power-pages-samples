import React from "react";

const EligibilityInfo: React.FC = () => {
  const eligibilityCriteria = [
    "Must be a resident of the country to apply for a card.",
    "A minimum age of 18 years is required.",
    "Valid income proof and employment details must be furnished.",
    "Credit score must meet the minimum requirements (typically 650+).",
    "Ensure no negative credit history to qualify.",
  ];

  return (<div className="relative bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 p-8 rounded-2xl shadow-lg ring-1 ring-gray-200 dark:ring-gray-700">
    <h2 className="text-3xl font-extrabold mb-5 text-gray-900 dark:text-gray-100 text-center">
      Eligibility Information
    </h2>
    <ul className="space-y-3">
      { eligibilityCriteria.map((criteria, index) => (
        <li
          key={ index }
          className="flex items-start gap-3 text-gray-800 dark:text-gray-200 text-lg animate-fade-stream"
          style={ { animationDelay: `${index * 1.5}s` } }
        >
          <span className="text-green-600 dark:text-green-400 text-xl">✔️</span>
          { criteria }
        </li>
      )) }
    </ul>
  </div>
  );
};

export default EligibilityInfo;
