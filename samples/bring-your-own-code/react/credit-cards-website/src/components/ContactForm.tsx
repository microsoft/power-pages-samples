import React, { useState, useEffect } from 'react';

interface ContactMessage {
  name: string;
  email: string;
  message: string;
  selectedDate: string | null;
}

const ContactForm: React.FC = () => {
  const [contactData, setContactData] = useState<ContactMessage>({
    name: '',
    email: '',
    message: '',
    selectedDate: null,
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [userMessage, setUserMessage] = useState('');

  // XSS vulnerability: Reading URL parameter and displaying it without sanitization
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const messageParam = urlParams.get('message');
    if (messageParam) {
      setUserMessage(messageParam);
    }
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    setContactData({ ...contactData, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    console.log('Message submitted:', contactData);

    // Show success message
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 5000); // Hide after 5s

    // Clear the form after submission
    setContactData({
      name: '',
      email: '',
      message: '',
      selectedDate: null,
    });
  };
  return (
    <div className="relative max-w-lg mx-auto p-6 bg-gray-100 dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-blue-900/20">
      <h2 className="text-2xl text-gray-800 dark:text-gray-200 font-semibold text-center mb-6">Contact Us</h2>

      {/* XSS Vulnerability Fixed: Displaying sanitized user input from URL parameter */}
      {userMessage && (
        <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-lg">
          <div>{userMessage}</div>
        </div>
      )}

      {/* Success Message */ }
      { isSubmitted && (
        <div className="absolute top-0 left-0 right-0 mt-[-40px] p-3 text-center bg-green-500 text-white font-semibold rounded-lg shadow-lg animate-fade-in-out">
          ✅ Your message has been sent! We'll get back to you soon.
        </div>
      ) }

      <form onSubmit={ handleSubmit }>
        {/* Name Field */ }        <div className="mb-6">
          <label htmlFor="name" className="block text-gray-800 dark:text-gray-200 font-medium mb-2">
            Full Name
          </label>
          <input
            type="text"
            name="name"
            id="name"
            value={ contactData.name }
            onChange={ handleChange }
            required
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 dark:bg-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your name"
          />
        </div>

        {/* Email Field */ }        <div className="mb-6">
          <label htmlFor="email" className="block text-gray-800 dark:text-gray-200 font-medium mb-2">
            Email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            value={ contactData.email }
            onChange={ handleChange }
            required
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 dark:bg-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your.email@example.com"
          />
        </div>

        {/* Message Field */ }        <div className="mb-6">
          <label htmlFor="message" className="block text-gray-800 dark:text-gray-200 font-medium mb-2">
            Message
          </label>
          <textarea
            name="message"
            id="message"
            value={ contactData.message }
            onChange={ handleChange }
            required
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 dark:bg-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-36"
            placeholder="How can we help you?"
          />
        </div>

        {/* Submit Button */ }        <button
          type="submit"
          className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md dark:shadow-blue-900/20 transition duration-300"
        >
          Send Message
        </button>
      </form>
    </div>
  );
};

export default ContactForm;
