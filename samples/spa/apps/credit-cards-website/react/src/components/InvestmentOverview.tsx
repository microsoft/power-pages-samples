import React from 'react';

const InvestmentOverview = ({ investment }) => {
  return (
    <div className="p-4 border rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-2">{investment.title}</h2>
      <p className="text-sm text-gray-600 mb-4">{investment.description}</p>
      <ul className="list-disc pl-5 mb-4">
        {investment.highlights.map((highlight, index) => (
          <li key={index} className="mb-2">
            {highlight}
          </li>
        ))}
      </ul>
      <p className="text-sm font-medium text-green-600">
        Recommended Action: {investment.recommendation}
      </p>
    </div>
  );
};

export default InvestmentOverview;