import React, { useState, useRef } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import ExtendedWindow from "@/ExtendedWindow";

interface UserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface ApplicationFormProps {
  userData?: UserData;
}

const cardTypes = [
  "Travel Rewards Credit Card",
  "Student Credit Card",
  "Luxury Perks Credit Card",
  "Online Shopping Credit Card",
  "Cashback Debit Card",
  "Simple Budget Debit Card",
  "Travel Debit Card",
  "Senior Citizen Debit Card",
  "Everyday Prepaid Card",
  "Gift Prepaid Card",
  "Travel Prepaid Card",
  "Virtual Prepaid Card",
  "Basic Secured Credit Card",
  "Secured Rewards Card",
  "Startup Corporate Card",
  "Enterprise Corporate Card",
];

const stepSchemas = [
  z.object({
    FirstName: z.string().min(1, "First name is required"),
    LastName: z.string().min(1, "Last name is required"),
    Email: z.string().email("Invalid email address"),
    Phone: z.string().min(10, "Invalid phone number"),
  }), z.object({
    AnnualIncome: z.coerce.number().min(1, "Annual income is required").positive("Income must be positive"),
  }), z.object({
    CardType: z.string().min(1, "Please select a card type"),
  }),
];

// Define a more specific type for FormData based on our schema
type FormData = {
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Phone?: string;
  AnnualIncome?: number;
  CardType?: string;
  [key: string]: string | number | undefined;
};

const MultiStepForm: React.FC<ApplicationFormProps> = ({ userData }) => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    FirstName: userData?.firstName || "",
    LastName: userData?.lastName || "",
    Email: userData?.email || "",
    Phone: userData?.phone || "",
  }); const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  // Keep error message state for logging purposes
  const [, setErrorMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(stepSchemas[Math.min(step, stepSchemas.length - 1)]),
    defaultValues: {
      FirstName: userData?.firstName || "",
      LastName: userData?.lastName || "",
      Email: userData?.email || "",
      Phone: userData?.phone || "",
    }
  });

  React.useEffect(() => {
    const extWindow = window as unknown as ExtendedWindow;

    const getToken = async () => {
      try {
        if (typeof window !== "undefined" && extWindow.shell?.getTokenDeferred) {
          const token = await extWindow.shell.getTokenDeferred();
          setToken(token);
        }
      } catch (error) {
        console.error('Error fetching token:', error);
      }
    };
    getToken();
  }, []);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    const updatedFormData = { ...formData, ...data };

    if (step < stepSchemas.length - 1) {
      setFormData(updatedFormData);
      setStep(step + 1);
    } else {
      setLoading(true);
      try {
        const apiData = Object.entries(updatedFormData).reduce((acc, [key, value]) => {
          acc[`sample_${key.toLowerCase()}`] = value;
          return acc;
        }, {} as Record<string, string | number | undefined>);

        console.log("Submitting application with data:", apiData);

        // Make the API call
        const response = await fetch('/_api/sample_creditcardapplications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            '__RequestVerificationToken': token,
          },
          body: JSON.stringify(apiData)
        });

        // Check for 204 status code (successful submission with no content)
        if (response.status === 204) {
          // Get the Location header to find the newly created resource
          const locationHeader = response.headers.get('Location');

          if (locationHeader) {
            // Extract the path from the location header by removing domain
            const locationPath = locationHeader.includes('://')
              ? '/' + locationHeader.split('/').slice(3).join('/')
              : locationHeader;

            console.log("Location header found:", locationPath);

            try {
              // Call the API to get the application details
              const detailsResponse = await fetch(locationPath, {
                headers: {
                  'Accept': 'application/json',
                  '__RequestVerificationToken': token,
                }
              });

              if (!detailsResponse.ok) {
                throw new Error(`Failed to retrieve application details: ${detailsResponse.status}`);
              }

              // Check if the response has content before parsing JSON
              const contentType = detailsResponse.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                const text = await detailsResponse.text();
                if (text) {
                  const applicationDetails = JSON.parse(text);
                  setApplicationId(applicationDetails.sample_id);
                } else {
                  console.warn("Details response body was empty");
                }
              } else {
                console.warn("Details response was not JSON");
              }
            } catch (detailsError) {
              console.error("Error retrieving application details:", detailsError);
              // Don't throw here, just log the error - we still want to show success since the POST succeeded
            }
          } else {
            console.warn("Location header not found in response");
          }

          toast.success("Application submitted successfully!");
          setSubmitted(true);
        } else if (!response.ok) {
          // For non-204 error responses
          let errorData = "";
          try {
            // Try to get the response as text first
            errorData = await response.text();
          } catch (textError) {
            console.error("Error reading error response as text:", textError);
          }
          throw new Error(`Failed to submit application: ${response.status} ${response.statusText}. ${errorData}`);
        } else {
          // Handle any other successful status codes (though we expect 204)
          toast.success("Application submitted successfully!");
          setSubmitted(true);
        }
      } catch (error) {
        console.error("Error submitting application:", error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to submit application';
        // Store error message for debugging but don't show in UI
        setErrorMessage(errorMsg);
        toast.error("Failed to submit application. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  // New function to copy the application ID to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      toast.success("Application ID copied to clipboard!");

      // Reset the success message after 3 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast.error("Failed to copy application ID");
    }
  };
  return (
    <div className="max-w-xl mx-auto p-6 bg-white dark:!bg-gray-800 shadow-lg dark:shadow-gray-900/50 rounded-lg relative overflow-hidden border dark:!border-gray-700">
      { submitted ? (
        <div className="text-center relative">
          <motion.h2
            initial={ { scale: 0, opacity: 0 } }
            animate={ { scale: 1.2, opacity: 1 } }
            transition={ { duration: 0.5 } }
            className="text-3xl font-bold text-blue-500 dark:text-blue-400"
          >
            🎉 Congratulations! 🎉
          </motion.h2>
          <motion.p
            initial={ { opacity: 0 } }
            animate={ { opacity: 1 } }
            transition={ { delay: 0.3, duration: 1 } }
            className="text-lg text-green-700 dark:text-green-400 mt-2"
          >
            Your application has been successfully submitted!
          </motion.p>
          { applicationId && (
            <motion.div
              initial={ { opacity: 0 } }
              animate={ { opacity: 1 } }
              transition={ { delay: 0.6, duration: 1 } }
              className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg"
            >              <p className="text-md dark:text-gray-200">Your application ID is:</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-400 mt-2">{ applicationId }</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                Please save this ID to check your application status later.
              </p>
              <motion.button
                initial={ { opacity: 0, y: 10 } }
                animate={ { opacity: 1, y: 0 } }
                transition={ { delay: 0.9, duration: 0.5 } } onClick={ () => applicationId && copyToClipboard(applicationId) }
                className="mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition duration-200 flex items-center mx-auto"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={ 2 }
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                  />
                </svg>
                { copySuccess ? "Copied!" : "Copy Application ID" }
              </motion.button>
            </motion.div>
          ) }        </div>) : step < stepSchemas.length ? (<>            <div className="relative mb-6">
            <div className="absolute top-0 left-0 w-full h-2 bg-gray-300 dark:!bg-gray-600 rounded-full">
              <div className={ `h-2 bg-blue-600 rounded-full transition-all ${step === 0 ? 'w-1/3' : step === 1 ? 'w-2/3' : 'w-full'
                }` }></div>
            </div>
          </div>

            <form className="space-y-6" onSubmit={ handleSubmit(onSubmit) }>
              { Object.keys(stepSchemas[step].shape).map((key) => (
                <div key={ key } className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{ key.replace(/([A-Z])/g, " $1").trim() }</label>
                  { key === "CardType" ? (
                    <select { ...register(key) } className={ `w-full px-4 py-2 border rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 ease-in-out ${errors[key] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} dark:bg-gray-700 dark:text-gray-100` }>                      <option value="" className="dark:bg-gray-800">Select a card type</option>
                      { cardTypes.map((card) => (
                        <option key={ card } value={ card } className="dark:bg-gray-800">{ card }</option>
                      )) }
                    </select>
                  ) : (
                    <input
                      { ...register(key) }
                      className={ `w-full px-4 py-2 border rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 ease-in-out ${errors[key] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} dark:bg-gray-700 dark:text-gray-100` }
                    />
                  ) }
                  { errors[key] && <span className="text-sm text-red-500 mt-1">{ errors[key]?.message as string }</span> }
                </div>
              )) }

              <div className="flex justify-between mt-4">
                { step > 0 && (
                  <button
                    type="button"
                    className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition duration-200"
                    onClick={ () => setStep(step - 1) }
                    disabled={ loading }
                  >
                    Previous
                  </button>
                ) }                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition duration-200 disabled:bg-blue-400 dark:disabled:bg-blue-500"
                  disabled={ loading }
                >
                  { loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    step === stepSchemas.length - 1 ? "Submit Application" : "Next"
                  ) }
                </button>
              </div>
            </form>
          </>
          ) : null }
    </div>
  );
};

export default MultiStepForm;