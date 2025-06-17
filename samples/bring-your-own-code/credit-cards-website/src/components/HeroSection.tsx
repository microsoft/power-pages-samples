import React, { useState } from 'react';

const testimonials = [
  {
    id: 1,
    img: '/assets/user_testimonial_1.png',
    text: 'This card has completely revolutionized how I manage my expenses. Highly recommended!',
    name: 'Sarah Adams',
  },
  {
    id: 2,
    img: '/assets/user_testimonial_2.png',
    text: 'A seamless experience from application to utilization. Love the cashback rewards!',
    name: 'James Monroe',
  },
  {
    id: 3,
    img: '/assets/user_testimonial_3.png',
    text: 'Traveling has never been easier with the amazing rewards and global acceptance.',
    name: 'Linda Johnson',
  },
  {
    id: 4,
    img: '/assets/user_testimonial_4.png',
    text: 'Fantastic customer service and the best credit card perks I have ever seen!',
    name: 'Michael Carter',
  },
  {
    id: 5,
    img: '/assets/user_testimonial_5.png',
    text: 'Using this card has made budgeting and tracking my expenses so much simpler.',
    name: 'Emily Watson',
  },
  {
    id: 6,
    img: '/assets/user_testimonial_6.png',
    text: 'Highly secure and easy to use. I feel safe making transactions anywhere!',
    name: 'Daniel Reed',
  },
];

const HeroSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  return (
    <section className="bg-blue-50 py-16 relative">
      <div className="container mx-auto px-4">
        <h2 className="text-center text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-900 text-transparent bg-clip-text mb-8">
          Hear From Our Happy Users
        </h2>
        <div className="relative max-w-xl mx-auto">
          <button
            className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-indigo-600 text-white p-2 rounded-full shadow-md"
            onClick={handlePrev}
          >
            &#8592;
          </button>
          <div className="p-6 bg-white rounded-lg shadow-lg text-center">
            <div className="flex justify-center mb-4">
              <img
                src={testimonials[currentIndex].img}
                alt={`${testimonials[currentIndex].name}'s testimonial`}
                className="rounded-full h-16 w-16"
              />
            </div>
            <p className="text-gray-700 mb-4">{testimonials[currentIndex].text}</p>
            <p className="text-sm text-indigo-500 font-semibold">- {testimonials[currentIndex].name}</p>
          </div>
          <button
            className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-indigo-600 text-white p-2 rounded-full shadow-md"
            onClick={handleNext}
          >
            &#8594;
          </button>
        </div>
        <div className="flex justify-center mt-4 space-x-2">
          {testimonials.map((_, index) => (
            <button
              title="Next"
              key={index}
              className={`w-3 h-3 rounded-full ${currentIndex === index ? 'bg-indigo-600' : 'bg-gray-300'}`}
              onClick={() => setCurrentIndex(index)}
            ></button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
