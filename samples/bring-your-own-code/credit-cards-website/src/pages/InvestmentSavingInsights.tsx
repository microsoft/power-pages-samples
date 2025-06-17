import React from 'react';
import InvestmentOverview from '../components/InvestmentOverview';
import investmentData from '../data/investmentData.json';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const InvestmentSavingInsights = () => {
  useDocumentTitle('Investment & Saving Insights');
  return (
    <div className="p-6 md:p-10">
      <h1 className="text-3xl font-bold mb-4">Investment & Saving Insights</h1>
      <p className="text-lg mb-6">
        Explore key insights into investments and savings tailored to help you make informed
        financial decisions.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        { investmentData.map((investment) => (
          <InvestmentOverview key={ investment.id } investment={ investment } />
        )) }
      </div>
    </div>);
};

export default InvestmentSavingInsights;
