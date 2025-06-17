import React from 'react';

type Offer = {
  id: string;
  title: string;
  description: string;
  validity: string;
};

type LatestOffersProps = {
  offers: Offer[];
};

const LatestOffers: React.FC<LatestOffersProps> = ({ offers }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {offers.map((offer) => (
        <div
          key={offer.id}
          className="p-6 border border-purple-300 rounded-lg shadow-md bg-white hover:shadow-lg transition-shadow duration-300"
        >
          <h3 className="text-xl font-bold text-purple-600 mb-2">{offer.title}</h3>
          <p className="text-gray-700 mb-4">{offer.description}</p>
          <p className="text-sm text-gray-500">Valid until: {offer.validity}</p>
        </div>
      ))}
    </div>
  );
};

export default LatestOffers;