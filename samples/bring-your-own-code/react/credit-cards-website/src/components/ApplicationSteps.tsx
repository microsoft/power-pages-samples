import React from 'react';

type ApplicationStepsProps = {
  currentStatus?: string;
};

const ApplicationSteps: React.FC<ApplicationStepsProps> = ({ currentStatus }) => {
  const steps = [
    {
      number: 1,
      status: 'submitted',
      title: 'Application Submitted',
      description: 'Your application has been received and is awaiting review.',
    },
    {
      number: 2,
      status: 'in progress',
      title: 'Application Review',
      description: 'Our team is reviewing your application and verifying the provided details.',
    },
    {
      number: 3,
      status: 'approved',
      title: 'Application Approved',
      description: 'Congratulations! Your application has been approved.',
    },
  ];

  // Map the status to determine the current step
  const getCurrentStep = (status: string | undefined) => {
    if (!status) return 1;

    const statusMap: Record<string, number> = {
      'submitted': 1,
      'in progress': 2,
      'approved': 3,
      'rejected': 2 // Rejection happens at the review stage
    };

    // For backward compatibility with existing code
    const legacyStatusMap: Record<string, number> = {
      'Pending': 2,
      'Approved': 3,
      'Rejected': 2
    };

    return statusMap[status.toLowerCase()] ||
      legacyStatusMap[status] ||
      1;
  };

  const currentStep = getCurrentStep(currentStatus);
  const isApproved = currentStatus?.toLowerCase() === 'approved';

  return (<div className="mt-6">
    <h3 className="text-lg font-semibold mb-4 dark:text-white">Steps in the Application Process</h3>
    <ul className="space-y-4">
      { steps.map((step) => {
        const isCompleted = currentStep > step.number;
        const isCurrent = currentStep === step.number;
        const isRejected = currentStatus?.toLowerCase() === 'rejected' && step.number === 2;
        // Special case: When the application is approved, the last step should be green
        const isApprovedFinalStep = isApproved && step.number === 3;

        return (
          <li
            key={ step.number }
            className={ `p-4 rounded-lg shadow-md ${isRejected ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
              isApprovedFinalStep || isCompleted ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                isCurrent ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' :
                  'bg-white dark:bg-gray-800'
              }` }
          >              <div className="flex items-center">
              <div className={ `flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mr-3 ${isRejected ? 'bg-red-500 text-white' :
                isApprovedFinalStep || isCompleted ? 'bg-green-500 text-white' :
                  isCurrent ? 'bg-blue-500 text-white' :
                    'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                }` }>
                { isApprovedFinalStep || isCompleted ? '✓' : step.number }
              </div>
              <div>
                <h4 className={ `text-md font-bold mb-1 ${isRejected ? 'text-red-700 dark:text-red-400' :
                  isApprovedFinalStep || isCompleted ? 'text-green-700 dark:text-green-400' :
                    isCurrent ? 'text-blue-700 dark:text-blue-400' :
                      'text-gray-700 dark:text-gray-300'
                  }` }>
                  { isRejected ? 'Application Rejected' : step.title }
                </h4>
                <p className="text-gray-700 dark:text-gray-300">
                  { isRejected ? 'Your application was reviewed but could not be approved.' : step.description }
                </p>
              </div>
            </div>
          </li>
        );
      }) }
    </ul>
  </div>
  );
};

export default ApplicationSteps;
