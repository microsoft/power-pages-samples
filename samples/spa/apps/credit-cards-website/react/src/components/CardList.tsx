import React from 'react';

interface Card {
  id: string;
  name: string;
  features: string[];
  category: string[];
  image: string;
  eligibility: {
    minimumIncome: number;
    creditScore: number;
  };
}

interface CardListProps {
  cards: Card[];
  className?: string;
  isCarousel?: boolean;
}

const CardList: React.FC<CardListProps> = ({ cards, className = "", isCarousel = false }) => {
  return (
    <div className={ `flex ${isCarousel ? '' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'} ${className}` }>
      { cards.map((card) => (<div
        key={ card.id }
        className="bg-white dark:!bg-gray-800 border dark:!border-gray-700 rounded-lg shadow-lg transform transition duration-300 hover:-translate-y-2 hover:shadow-2xl dark:hover:shadow-blue-900/20 w-80 flex-shrink-0"
      >
        <img
          src={ card.image }
          alt={ card.name }
          className="w-full h-48 object-cover rounded-t-lg"
        />
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-2 text-indigo-700 dark:text-indigo-300">{ card.name }</h2>
          <ul className="space-y-2 mb-4">
            { card.features.map((feature, index) => (
              <li key={ index } className="text-gray-600 dark:text-gray-300 text-sm flex items-center">
                <span className="mr-2 text-blue-400 dark:text-blue-300">✔</span> { feature }
              </li>
            )) }
          </ul>
          <div className="text-gray-500 dark:text-gray-400 text-xs">Categories: { card.category.join(', ') }</div>
          <div className="text-gray-500 dark:text-gray-400 text-xs mt-2">Minimum Income: ${ card.eligibility.minimumIncome }</div>
          <div className="text-gray-500 dark:text-gray-400 text-xs">Credit Score: { card.eligibility.creditScore }</div>
        </div>
      </div>
      )) }
    </div>
  );
};

export default CardList;
