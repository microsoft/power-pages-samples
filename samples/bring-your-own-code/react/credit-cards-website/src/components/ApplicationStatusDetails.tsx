import React from 'react';

type ApplicationStatusDetailsProps = {
  status: string;
  comments?: string;
};

const ApplicationStatusDetails: React.FC<ApplicationStatusDetailsProps> = ({ status, comments }) => {
  const statusDetails = {
    submitted: 'Your application has been successfully submitted and is waiting for review.',
    'in progress': 'Your application is currently being reviewed. You will be notified once a decision is made.',
    approved: 'Congratulations! Your application has been approved. Further instructions will be communicated via email.',
    rejected: 'Unfortunately, your application has been rejected. Please see the comments below for more details.',
    // For backward compatibility with existing code
    Pending: 'Your application is currently being reviewed. You will be notified once a decision is made.',
    Approved: 'Congratulations! Your application has been approved. Further instructions will be communicated via email.',
    Rejected: 'Unfortunately, your application has been rejected. If you have any questions, please contact support.',
  };

  const statusDetail = statusDetails[status] || 'Status information is currently unavailable.';

  return (<div className="mt-6 bg-gray-100 dark:!bg-gray-700 p-4 rounded-md shadow-inner dark:shadow-gray-900/50">
    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Status Details</h3>
    <p className="text-gray-700 dark:text-gray-300">{ statusDetail }</p>

    { (status.toLowerCase() === 'rejected' || status === 'rejected') && comments && (
      <div className="mt-4 p-3 bg-red-50 dark:!bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
        <h4 className="text-md font-semibold text-red-700 dark:text-red-400 mb-1">Reason for Rejection:</h4>
        <p className="text-gray-800 dark:text-gray-300">{ comments }</p>
      </div>
    ) }
  </div>
  );
};

export default ApplicationStatusDetails;
