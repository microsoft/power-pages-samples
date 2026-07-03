import React from "react";

const ApplyCardBenefits: React.FC = () => {
  const benefits = [
    "Choose from exclusive rewards programs tailored to your lifestyle.",
    "Enjoy cashback on everyday spending and save more.",
    "Access premium travel benefits like lounge access and free miles.",
    "Experience secure and seamless payments with advanced technology.",
    "Build your credit history and improve your financial opportunities.",
  ];

  return (<div className="relative bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-950 p-8 rounded-2xl shadow-lg ring-1 ring-blue-200 dark:ring-blue-800">
    <h2 className="text-3xl font-extrabold mb-5 text-blue-900 dark:text-blue-200 text-center">
      Why Apply for a Card?
    </h2>
    <ul className="space-y-3">
      { benefits.map((benefit, index) => (
        <li
          key={ index }
          className="flex items-start gap-3 text-gray-800 dark:text-gray-200 text-lg animate-fade-stream"
          style={ { animationDelay: `${index * 1.5}s` } }
        >
          <span className="text-blue-600 dark:text-blue-400 text-xl">✔️</span>
          { benefit }
        </li>
      )) }
    </ul>
  </div>
  );
};

export default ApplyCardBenefits;
