import React, { useState, useEffect } from "react";
import CompareCards from "../components/CompareCards";
import cardsData from "../data/cardsData.json";
import { searchCards } from "../utils/filterUtils";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const CardComparison: React.FC = () => {
  useDocumentTitle('Card Comparison');
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCards, setFilteredCards] = useState(cardsData);
  const [selectedCategory, setSelectedCategory] = useState("");

  // Get unique primary categories from `type`
  const primaryCategories = [...new Set(cardsData.map((card) => card.type))];

  useEffect(() => {
    let results = searchCards(cardsData, searchQuery);
    if (selectedCategory) {
      results = results.filter((card) => card.type === selectedCategory);
    }
    setFilteredCards(results);
  }, [searchQuery, selectedCategory]);

  const toggleCardSelection = (cardId: string): void => {
    setSelectedCards((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  const selectedCardDetails = cardsData.filter((card) => selectedCards.includes(card.id));

  return (
    <div className="container mx-auto my-6 p-4">
      <div className="comparison-container">
        <h1 className="comparison-heading">
          Compare Cards
        </h1>

        {/* Description */ }
        <p className="comparison-text text-center">
          Choose cards from the list below and compare their features, eligibility requirements, and more.
          Use the search and filters to refine your options based on your needs.
        </p>

        {/* Search & Category Filter */ }
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">          <input
          type="text"
          placeholder="Search cards..."
          value={ searchQuery }
          onChange={ (e) => setSearchQuery(e.target.value) }
          className="border px-4 py-2 rounded-lg shadow-sm w-full sm:w-1/3 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
          aria-label="Search for cards"
        />          <select
          value={ selectedCategory }
          onChange={ (e) => setSelectedCategory(e.target.value) }
          className="border px-4 py-2 rounded-lg shadow-sm w-full sm:w-1/3 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          aria-label="Filter by primary category"
        >            <option value="" className="dark:bg-gray-700">All Categories</option>
            { primaryCategories.map((category) => (
              <option key={ category } value={ category } className="dark:bg-gray-700">
                { category }
              </option>
            )) }
          </select>
        </div>

        {/* Category Description */ }
        { selectedCategory && (
          <div className="mb-6 text-center">
            <p className="comparison-text">
              You are currently viewing cards from the <strong>{ selectedCategory }</strong> category.
              Explore different options to find the best card suited to your needs.
            </p>
          </div>
        ) }        {/* Cards Grid */ }
        { selectedCategory ? (          // Standard grid layout when a category is selected
          <div className="card-grid-container">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
              { filteredCards.map((card) => (
                <div
                  key={ card.id }
                  className={ `border dark:!border-gray-700 p-4 rounded-lg shadow-md transition-all duration-300 cursor-pointer ${selectedCards.includes(card.id)
                    ? "bg-blue-100 dark:!bg-blue-900 ring-2 ring-blue-500 dark:ring-blue-400"
                    : "hover:shadow-lg bg-white dark:!bg-gray-800"
                    }` }
                  onClick={ () => toggleCardSelection(card.id) }
                  tabIndex={ 0 }
                  role="button"
                  aria-pressed={ selectedCards.includes(card.id) }
                  onKeyDown={ (e) => e.key === "Enter" && toggleCardSelection(card.id) }
                >
                  <img
                    src={ card.image }
                    alt={ card.name }
                    className="w-full h-40 object-cover rounded-lg mb-2"
                  />
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{ card.name }</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{ card.type }</p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">
                    { card.features?.join(', ') || 'Features not specified' }
                  </p>
                </div>
              )) }
            </div>
          </div>
        ) : (
          // Grouped display when "All Categories" is selected
          <div className="space-y-10">
            { primaryCategories.map((category) => {
              const categoryCards = filteredCards.filter((card) => card.type === category);
              return categoryCards.length > 0 ? (
                <div key={ category } className="card-grid-container mb-8">
                  <h2 className="category-heading border-b-2 pb-2">
                    { category }
                  </h2>
                  <p className="comparison-text">
                    Cards in the <strong>{ category }</strong> category offer specific benefits tailored to users
                    who need particular features such as rewards, low-interest rates, or premium services.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    { categoryCards.map((card) => (<div
                      key={ card.id } className={ `border dark:!border-gray-700 p-4 rounded-lg shadow-md transition-all duration-300 cursor-pointer ${selectedCards.includes(card.id)
                        ? "bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500 dark:ring-blue-400"
                        : "hover:shadow-lg bg-white dark:!bg-gray-800"
                        }` }
                      onClick={ () => toggleCardSelection(card.id) }
                      tabIndex={ 0 }
                      role="button"
                      aria-pressed={ selectedCards.includes(card.id) }
                      onKeyDown={ (e) => e.key === "Enter" && toggleCardSelection(card.id) }
                    >
                      <img
                        src={ card.image }
                        alt={ card.name }
                        className="w-full h-40 object-cover rounded-lg mb-2"
                      />
                      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{ card.name }</h2>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">{ card.type }</p>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">
                        { card.features?.join(', ') || 'Features not specified' }
                      </p>
                    </div>
                    )) }
                  </div>
                </div>
              ) : null;
            }) }
          </div>
        ) }

        {/* Selected Cards Section */ }
        { selectedCards.length > 0 && (
          <div className="mt-8">
            <h2 className="category-heading text-center">
              Selected Cards ({ selectedCards.length })
            </h2>
            <p className="comparison-text text-center">
              Here are the cards you selected for comparison. Review their details below and make the best choice
              for your needs based on the features and eligibility criteria.
            </p>
            <CompareCards selectedCards={ selectedCardDetails } />
          </div>
        ) }
      </div>
    </div>
  );
};

export default CardComparison;
