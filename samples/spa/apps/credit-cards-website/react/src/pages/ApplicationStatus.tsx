import React, { useState, useEffect } from 'react';
import ApplicationStatusDetails from '../components/ApplicationStatusDetails';
import ApplicationSteps from '../components/ApplicationSteps';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuth } from '../context/AuthContext';

interface ApplicationStatusData {
  sample_status: string;
  sample_comments?: string;
  sample_id: string;
  sample_email: string;
}

const ApplicationStatus: React.FC = () => {
  useDocumentTitle('Application Status');
  const { isAuthenticated, user, getIdToken } = useAuth();
  const [email, setEmail] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [comments, setComments] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStatus, setShowStatus] = useState(false);

  // Auto-populate email if user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // email can be in preferred_username or in idTokenClaims["emails"][0]
      const claims = user.idTokenClaims as Record<string, unknown> | undefined;
      let derivedEmail: string | undefined = undefined;
      if (claims) {
        if (typeof claims["preferred_username"] === 'string') {
          derivedEmail = claims["preferred_username"] as string;
        } else if (Array.isArray(claims["emails"]) && typeof claims["emails"][0] === 'string') {
          derivedEmail = claims["emails"][0] as string;
        }
      }
      setEmail(user.username || derivedEmail || '');
    }
  }, [isAuthenticated, user]);

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!applicationId.trim()) {
      setError('Please enter a valid Application ID.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter a valid Email Address.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);
    setComments(null);

    try {
      // Call OData API to get application status
      const idToken = await getIdToken();
      const response = await fetch(
        `/_api/sample_creditcardapplications?$filter=sample_id eq '${applicationId}' and sample_email eq '${email}'&$select=sample_status,sample_comments,sample_id,sample_email`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch application status');
      }

      const data = await response.json();

      if (data.value && data.value.length > 0) {
        const applicationData: ApplicationStatusData = data.value[0];
        setStatus(applicationData["sample_status@OData.Community.Display.V1.FormattedValue"]);
        setComments(applicationData.sample_comments || null);
        setShowStatus(true);
      } else {
        setError('No application found with the provided ID and email. Please check your information and try again.');
      }
    } catch (err) {
      console.error('Error fetching status:', err);
      setError('Failed to fetch status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (<div className="container mx-auto p-6">
    <h1 className="text-3xl font-semibold text-center mb-6 text-gray-900 dark:text-gray-100">Application Status</h1>

    <div className="max-w-lg mx-auto bg-white dark:!bg-gray-800 shadow dark:shadow-gray-900/50 rounded-md p-6 border dark:border-gray-700">
      { !showStatus ? (<form onSubmit={ handleCheckStatus }>          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Check Your Application Status</h2>
        <div className="mb-4">
          <label htmlFor="email" className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
            Email Address
            { isAuthenticated && <span className="ml-2 text-sm text-green-600 dark:text-green-400">(Auto-filled from your account)</span> }
          </label>
          <input
            type="email"
            id="email"
            value={ email }
            onChange={ (e) => setEmail(e.target.value) }
            placeholder="Enter your email"
            className={ `w-full border border-gray-300 dark:border-gray-600 rounded p-2 focus:ring focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:!bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 ${isAuthenticated ? 'bg-gray-50 dark:!bg-gray-700' : ''}` }
            required
          />
        </div>          <div className="mb-4">
          <label htmlFor="applicationId" className="block text-gray-700 dark:text-gray-300 font-medium mb-2">Application ID</label>
          <input
            type="text"
            id="applicationId"
            value={ applicationId }
            onChange={ (e) => setApplicationId(e.target.value) }
            placeholder="Enter your application ID"
            className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 focus:ring focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:!bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
            required
          />
        </div>
        { error && <p className="text-red-500 text-sm mb-4">{ error }</p> }          <button
          type="submit"
          className="w-full bg-indigo-500 dark:!bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-600 dark:hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-500"
          disabled={ loading }
        >
          { loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Checking...
            </span>
          ) : 'Check Status' }
        </button>
      </form>
      ) : (
        <div>            <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Application Status</h2>
          <p className={ `text-lg font-semibold ${status?.toLowerCase() === 'approved' ? 'text-green-600 dark:text-green-400' :
            status?.toLowerCase() === 'rejected' ? 'text-red-600 dark:text-red-400' :
              'text-yellow-600 dark:text-yellow-400'
            }` }>
            Application Status: { status }
          </p>              <button
            onClick={ () => {
              setShowStatus(false);
              // Only reset email if not authenticated
              if (!isAuthenticated) {
                setEmail('');
              }
              setApplicationId('');
              setStatus(null);
              setComments(null);
            } }
            className="w-full bg-indigo-500 dark:!bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-600 dark:hover:bg-indigo-700 mt-4"
          >
            Check Another Application
          </button>
        </div>
          { status && <ApplicationStatusDetails status={ status } comments={ comments || undefined } /> }
          { status && <ApplicationSteps currentStatus={ status } /> }
        </div>
      ) }
    </div>
  </div>
  );
};

export default ApplicationStatus;
