
import React, { useState } from 'react';
import { checkEligibility } from '../utils/eligibilityUtils';

const EligibilityForm = () => {
  const [formData, setFormData] = useState({
    income: '',
    creditScore: '',
  });

  const [result, setResult] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const eligibilityResult = checkEligibility(formData);
    setResult(eligibilityResult);
  };

  return (
    <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="income" className="block text-sm font-medium text-gray-700">
            Annual Income ($):
          </label>
          <input
            type="number"
            id="income"
            name="income"
            value={formData.income}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="creditScore" className="block text-sm font-medium text-gray-700">
            Credit Score:
          </label>
          <input
            type="number"
            id="creditScore"
            name="creditScore"
            value={formData.creditScore}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
        >
          Check Eligibility
        </button>
      </form>
      {result && (
        <div className="mt-4 p-4 rounded bg-green-100 text-green-800">
          {result}
        </div>
      )}
    </div>
  );
};

export default EligibilityForm;