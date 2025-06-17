import React from 'react';

interface Card {
  id: string;
  name: string;
  features: string[];
  image: string;
  eligibility: {
    minimumIncome: number;
    creditScore: number;
  };
}

interface CompareCardsProps {
  selectedCards: Card[];
}

const CompareCards: React.FC<CompareCardsProps> = ({ selectedCards }) => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {selectedCards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {selectedCards.map((card) => (
            <div
              key={card.id}
              className="relative border rounded-xl shadow-lg overflow-hidden hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-in-out transform"
            >
              <img
                src={card.image}
                alt={card.name}
                className="w-full h-48 object-cover rounded-t-xl"
              />
              <div className="p-6 bg-white space-y-4">
                <h2 className="text-2xl font-semibold text-gray-800">{card.name}</h2>
                <ul className="space-y-2">
                  {card.features.map((feature, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        className="w-4 h-4 text-green-500 mr-2"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between text-sm text-gray-500">
                  <p>Min Income: ${card.eligibility.minimumIncome}</p>
                  <p>Credit Score: {card.eligibility.creditScore}</p>
                </div>
              </div>
              <div className="absolute top-0 right-0 p-2 text-xs text-white bg-blue-600 rounded-bl-lg">
                Featured
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No cards selected for comparison.</p>
      )}
    </div>
  );
};

export default CompareCards;
