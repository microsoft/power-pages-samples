import React from 'react';
import EmblaCarouselReact  from 'embla-carousel-react';

const EligibilityCarousel = () => {
  const carouselItems = [
    {
      title: 'Low Minimum Investment',
      description: 'Start investing with as little as $500.',
      imagePath: 'assets/investment-strategies.jpg',
    },
    {
      title: 'Exclusive Opportunities',
      description: 'Access private equity and hedge fund opportunities.',
      imagePath: 'assets/market-trends.jpg',
    },
    {
      title: 'Expert Insights',
      description: 'Receive guidance from seasoned financial advisors.',
      imagePath: 'assets/expert-insights.jpg',
    },
    {
      title: 'Regulatory Compliance',
      description: 'Ensure that your investments comply with regulations.',
      imagePath: 'assets/risk-management.jpg',
    },
  ];

  return (
    <div className="relative w-full py-12">
      <div className="h-[300px] overflow-hidden rounded-2xl shadow-md">
        <EmblaCarouselReact>
          {carouselItems.map((item, index) => (
            <div
              className="min-w-full flex flex-col items-center justify-center bg-gray-100 transition-transform duration-300"
              key={index}
            >
              <img
                src={item.imagePath}
                alt={item.title}
                className="w-40 h-40 object-cover rounded-full mb-6 border border-gray-300 shadow-sm"
              />
              <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
              <p className="text-gray-600 mt-3">{item.description}</p>
            </div>
          ))}
        </EmblaCarouselReact>
      </div>
    </div>
  );
};

export default EligibilityCarousel;