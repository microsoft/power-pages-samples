import React from "react";
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const insights = [
  {
    title: "Market Trends",
    description: "Stay ahead with the latest stock market trends and analytics.",
    icon: "📈",
    image: "/assets/market-trends.jpg", // Local image in the public/assets folder
  },
  {
    title: "Investment Strategies",
    description: "Explore different strategies to maximize your portfolio returns.",
    icon: "💰",
    image: "/assets/investment-strategies.jpg", // Local image in the public/assets folder
  },
  {
    title: "Risk Management",
    description: "Learn how to balance risks and rewards for a stable portfolio.",
    icon: "⚖️",
    image: "/assets/risk-management.jpg", // Local image in the public/assets folder
  },
  {
    title: "Expert Insights",
    description: "Get valuable tips and advice from industry-leading experts.",
    icon: "💡",
    image: "/assets/expert-insights.jpg", // Local image in the public/assets folder
  },
];

const testimonials = [
  {
    name: "John Doe",
    feedback: "This platform transformed my investment decisions!",
    image: "/assets/john-doe.jpg", // Local image in the public/assets folder
  },
  {
    name: "Sarah Lee",
    feedback: "Invaluable insights that helped me grow my portfolio!",
    image: "/assets/sarah-lee.jpg", // Local image in the public/assets folder
  },
];


const InvestmentInsights: React.FC = () => {
  useDocumentTitle('Investment Insights');
  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-extrabold mb-6 text-center text-gray-800">
        Investment Insights
      </h1>
      <p className="text-lg text-gray-600 text-center mb-8 max-w-2xl mx-auto">
        Gain valuable insights and strategies to make well-informed investment decisions.
      </p>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        { insights.map((insight, index) => (
          <div key={ index } className="bg-white shadow-lg rounded-xl overflow-hidden">
            <img
              src={ insight.image }
              alt={ insight.title }
              className="w-full h-48 object-cover"
            />
            <div className="p-6 text-center">
              <div className="mb-4 text-4xl">{ insight.icon }</div>
              <h2 className="text-xl font-semibold text-gray-800">{ insight.title }</h2>
              <p className="text-gray-600 mt-2">{ insight.description }</p>
            </div>
          </div>
        )) }
      </div>

      <div className="mt-12 max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-xl">
        <h2 className="text-2xl font-semibold text-gray-800 text-center">Latest News & Updates</h2>
        <ul className="mt-4 space-y-4 text-gray-600">
          <li className="border-b pb-2">🔹 Federal Reserve announces new interest rate policies.</li>
          <li className="border-b pb-2">🔹 Tech stocks show a surprising rebound in Q1.</li>
          <li className="border-b pb-2">🔹 Real estate investment trends for 2025.</li>
        </ul>
      </div>

      <div className="mt-12 max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-xl">
        <h2 className="text-2xl font-semibold text-gray-800 text-center">Testimonials</h2>
        <div className="mt-6 space-y-6">
          { testimonials.map((testimonial, index) => (
            <div key={ index } className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg shadow-md">
              <img src={ testimonial.image } alt={ testimonial.name } className="w-12 h-12 rounded-full" />
              <div>
                <p className="text-gray-800 font-medium">{ testimonial.name }</p>
                <p className="text-gray-600">"{ testimonial.feedback }"</p>
              </div>
            </div>
          )) }
        </div>
      </div>
    </div>
  );
};

export default InvestmentInsights;
