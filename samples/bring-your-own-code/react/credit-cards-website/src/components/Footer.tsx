import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-lg dark:from-gray-900 dark:to-indigo-950">
      <div className="container mx-auto py-10 px-6 text-center">
        <p className="text-2xl font-bold mb-2 text-white">WoodGrove Bank</p>
        <p className="text-base tracking-wide mt-2 text-white">&copy; 2025 WoodGrove Bank. All rights reserved.</p>
        <div className="mt-8 flex justify-center space-x-8">
          <a href="#" aria-label="Facebook" className="hover:opacity-80 transition-opacity duration-300 bg-white p-2 rounded-full dark:bg-gray-800">
            <img src="/assets/facebook_icon.jpg" alt="Facebook" className="h-8 w-8 object-contain" />
          </a>
          <a href="#" aria-label="Twitter" className="hover:opacity-80 transition-opacity duration-300 bg-white p-2 rounded-full dark:bg-gray-800">
            <img src="/assets/twitter_icon.jpg" alt="Twitter" className="h-8 w-8 object-contain" />
          </a>
          <a href="#" aria-label="Instagram" className="hover:opacity-80 transition-opacity duration-300 bg-white p-2 rounded-full dark:bg-gray-800">
            <img src="/assets/instagram_icon.png" alt="Instagram" className="h-8 w-8 object-contain" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
