import React, { useState } from 'react';
import ContactForm from '../components/ContactForm';
import { format } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const Contact: React.FC = () => {
  useDocumentTitle('Contact Us');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  return (
    <div className="relative">
      {/* Semi-transparent overlay for background image */ }
      <div className="absolute inset-0 bg-black opacity-50 z-0"></div>

      <div className="container mx-auto my-6 px-4 relative z-10">
        <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
          <h1 className="text-3xl font-bold text-center mb-6 text-primary">Contact Us</h1>

          <p className="text-center mb-8 text-lg text-gray-700 font-medium">
            Have questions about your credit or debit card account? We're here to help! Whether you're inquiring about card activation, payments, or any of our services, reach out to us using the form below. We'll be happy to assist you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Form Section */ }
          <div className="p-6 border rounded-xl shadow-lg bg-white">
            <h2 className="text-xl font-semibold mb-4 text-center">Get In Touch</h2>
            <ContactForm />
          </div>

          {/* Calendar Section */ }
          <div className="p-6 border rounded-xl shadow-lg bg-white">
            <h2 className="text-xl font-semibold mb-4 text-center">Schedule a Consultation</h2>
            <div className="flex justify-center">
              <DayPicker
                mode="single"
                selected={ selectedDate }
                onSelect={ setSelectedDate }
                fromDate={ new Date() } // Prevents past dates selection
                className="rounded-lg shadow-md"
              />
            </div>

            { selectedDate && (
              <div className="mt-4 text-center text-green-600 font-medium">
                Selected Date: { format(selectedDate, 'dd MMM yyyy') }
              </div>
            ) }
          </div>
        </div>

        {/* Additional Context Section with Images */ }
        <div className="mt-12 text-center bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-primary">Why Choose Our Cards?</h2>
          <p className="text-lg text-gray-700 mb-6 font-medium">
            Our credit and debit cards come with a range of benefits designed to make your financial experience easier and more rewarding. From secure transactions to personalized rewards, we offer the services you need to manage your money with ease and confidence.
          </p>

          {/* Image Gallery */ }
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <img
              src="/assets/contact-1.jpg"
              alt="Card Example 1"
              className="w-full h-64 object-cover rounded-lg shadow-md"
            />
            <img
              src="/assets/contact-2.jpg"
              alt="Card Example 2"
              className="w-full h-64 object-cover rounded-lg shadow-md"
            />
            <img
              src="/assets/contact-3.jpg"
              alt="Card Example 3"
              className="w-full h-64 object-cover rounded-lg shadow-md"
            />
          </div>

          <p className="mt-6 text-lg text-gray-700 font-medium">
            Ready to get started with your new card or have questions about your account? We're here to help. Don't hesitate to reach out to our team!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Contact;
