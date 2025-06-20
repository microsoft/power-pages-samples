/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import CardList from "../components/CardList";
import HeroSection from "../components/HeroSection";
import LatestOffers from "../components/LatestOffers";
import latestOffersData from "../data/latestOffersData.json";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const cardTypes = [
  "All",
  "Credit Card",
  "Debit Card",
  "Prepaid Card",
  "Secured Credit Card",
  "Corporate Expense Card",
];

const Home: React.FC = () => {
  useDocumentTitle('Home');
  const [selectedType, setSelectedType] = useState<string>("All");
  const [cardsData, setCardsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  //Create FetchXML query to get all cards from Dataverse
  const fetchCards = async () => {
    try {
      const response = await fetch("/_api/sample_creditcards?$select=sample_id,sample_name,sample_type,sample_features,sample_image,sample_category,sample_minimumincome,sample_creditscore");

      if (response.status === 403) {
        setIsUnauthorized(true);
        return [];
      }

      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      const data = await response.json();
      const cards = data.value;
      const returnData = [];

      //loop through the cards and get the name and id of each card
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const cardName = card.sample_name;
        const cardId = card.sample_id;
        const features = card.sample_features?.split(',').map((feature: string) => feature.trim()) ?? [];
        const type = card.sample_type;
        const image = card.sample_image;
        const category = card.sample_category?.split(',').map((cat: string) => cat.trim()) ?? [];
        const minimumIncome = card.sample_minimumincome;
        const creditScore = card.sample_creditscore;
        returnData.push({ name: cardName, id: cardId, features, type, image, category, eligibility: { minimumIncome, creditScore } });
      }

      return returnData;
    } catch (error) {
      console.error('Error fetching cards:', error);
      throw error;
    }
  };

  React.useEffect(() => {
    const loadCards = async () => {
      try {
        setIsLoading(true);
        setIsUnauthorized(false);
        const cards = await fetchCards();
        setCardsData(cards);
      } catch (error) {
        console.error('Error fetching cards:', error);
        // You might want to show an error state here
      } finally {
        setIsLoading(false);
      }
    };
    loadCards();
  }, []);

  // Filter cards based on selected type
  const filteredCards =
    selectedType === "All"
      ? cardsData
      : cardsData.filter((card) => card.type === selectedType);
  return (
    <div className="container mx-auto my-4 px-4 lg:px-8">      <h1 className="text-5xl font-extrabold text-center mb-8 bg-gradient-to-r from-blue-600 to-indigo-900 dark:from-gray-800 dark:to-gray-900 text-white p-4 rounded-lg shadow-lg animate-fade-in glass dark:border dark:border-gray-700">
      WoodGrove Bank Credit Cards
    </h1>
      <p className="text-center mb-8 text-gray-800 dark:text-gray-200 text-lg animate-fade-in delay-200 glass p-4 rounded-lg">
        Discover our diverse range of financial cards tailored for your needs.
      </p>

      {/* Hero Section */ }
      <div className="glass rounded-xl overflow-hidden">
        <HeroSection />
      </div>

      {/* 🔥 Stylish Pill Tabs for Navigation */ }      <div className="flex overflow-x-auto space-x-4 mb-8 scrollbar-hide p-2 border-b border-gray-300 dark:border-gray-700 justify-center glass rounded-full my-4">
        { cardTypes.map((type) => (
          <button
            key={ type }
            className={ `relative px-6 py-2 rounded-full text-sm font-semibold transition-transform duration-300 ease-in-out transform hover:scale-105 focus:outline-none ${selectedType === type
              ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg border border-indigo-400"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              }` }
            onClick={ () => setSelectedType(type) }
          >
            { selectedType === type && (
              <span className="absolute inset-0 animate-pulse bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full blur-md opacity-50"></span>
            ) }
            <span className="relative">{ type }</span>
          </button>
        )) }
      </div>      {/* Card Section */ }
      <section className="mb-12 glass p-6 rounded-xl dark:border dark:border-gray-700">        <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-4 animate-slide-in-left">
        { selectedType === "All" ? "All Cards" : selectedType }
      </h2>
        { isLoading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredCards.length > 0 ? (
          <div className="overflow-hidden relative">
            <div className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-8 py-4">              { filteredCards.map((card, index) => (<div key={ index } className={ `min-w-[300px] snap-center flex-shrink-0 transform transition-transform duration-500 ease-in-out hover:scale-110 hover:rotate-3 hover:shadow-2xl dark:hover:shadow-indigo-900/40 shadow-md dark:shadow-gray-900/30 rounded-xl p-4 hover:-translate-y-2 hover:ring-2 hover:ring-indigo-500 dark:hover:ring-indigo-400 hover:ring-offset-2 dark:hover:ring-offset-gray-800 animate-pop ${index % 2 === 0
              ? "bg-gradient-to-br from-white to-gray-100 dark:from-gray-900 dark:to-gray-800"
              : "bg-gradient-to-br from-indigo-100 to-blue-200 dark:from-blue-900 dark:to-indigo-950"
              }` }
            >
              <CardList cards={ [card] } isCarousel={ true } />
            </div>
            )) }
            </div>
          </div>
        ) : isUnauthorized ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Access Denied!</strong>
            <span className="block sm:inline"> You don't have permission to view this content. Please contact your administrator for access.</span>
          </div>) : (
          <p className="text-center text-gray-600 dark:text-gray-400 animate-fade-in">No cards available.</p>
        ) }
      </section>      {/* Latest Offers Section */ }
      <section className="mb-12 glass p-6 rounded-xl dark:border dark:border-gray-700">
        <h2 className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-4 animate-slide-in-right">Latest Offers</h2>
        <LatestOffers offers={ latestOffersData } />
      </section>
    </div>
  );
};

export default Home;
