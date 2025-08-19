import React, { useState, useEffect, useCallback } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ExtendedWindow from '../ExtendedWindow';
import { Tab } from '@headlessui/react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import { useAuth } from '../context/AuthContext';

interface Application {
    sample_creditcardapplicationid: string;
    sample_id: string;
    sample_email: string;
    sample_firstname: string;
    sample_lastname: string;
    sample_status: string;
    "sample_status@OData.Community.Display.V1.FormattedValue": string;
    sample_comments?: string;
    sample_cardtype?: string;
    createdon: string;
}

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}

const Applications: React.FC = () => {
    useDocumentTitle('Applications Review');
    const extWindow = window as unknown as ExtendedWindow;
    const userRoles = extWindow.Microsoft?.Dynamic365?.Portal?.User?.userRoles || [];
    const isReviewer = Array.isArray(userRoles) && userRoles.includes("Credit Card Application Reviewer");
    const { theme } = useTheme();
    const { getIdToken } = useAuth();

    // Status code constants
    const STATUS_CODES = {
        IN_PROGRESS: 156860001,
        APPROVED: 156860002,
        REJECTED: 156860003
    };

    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTab, setSelectedTab] = useState<number>(0);
    const [rejectComments, setRejectComments] = useState<string>('');
    const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
    const [updating, setUpdating] = useState<boolean>(false);
    const [token, setToken] = useState<string>("");

    const tabs = [
        { name: 'Submitted', status: 'Submitted' },
        { name: 'In Progress', status: 'In Progress' },
        { name: 'Approved', status: 'Approved' },
        { name: 'Rejected', status: 'Rejected' }
    ];

    const fetchApplications = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const idToken = await getIdToken();
            const response = await fetch(
                `/_api/sample_creditcardapplications?$select=sample_creditcardapplicationid,sample_id,sample_email,sample_firstname,sample_lastname,sample_status,sample_comments,sample_cardtype,createdon`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'OData-MaxVersion': '4.0',
                        'OData-Version': '4.0',
                        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch applications');
            }

            const data = await response.json();
            setApplications(data.value || []);
        } catch (err) {
            console.error('Error fetching applications:', err);
            setError('Failed to fetch applications. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [getIdToken]);

    useEffect(() => {
        fetchApplications();

        // Get verification token
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
    }, [extWindow.shell, fetchApplications]);
    const updateApplicationStatus = async (applicationId: string, status: number, statusLabel: string, comments?: string) => {
        setUpdating(true);
        try {
            const payload: {
                sample_status: number;
                sample_comments?: string;
            } = {
                sample_status: status
            };

            if (comments) {
                payload.sample_comments = comments;
            }

            const idToken = await getIdToken();
            const response = await fetch(
                `/_api/sample_creditcardapplications(${applicationId})`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'OData-MaxVersion': '4.0',
                        'OData-Version': '4.0',
                        'If-Match': '*',
                        '__RequestVerificationToken': token,
                        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
                    },
                    body: JSON.stringify(payload)
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to update application status to ${statusLabel}`);
            }

            toast.success(`Application successfully ${statusLabel.toLowerCase()}`);
            fetchApplications();
        } catch (err) {
            console.error(`Error updating application status to ${statusLabel}:`, err);
            toast.error(`Failed to update application status to ${statusLabel}`);
        } finally {
            setUpdating(false);
            setShowRejectModal(false);
            setRejectComments('');
            setSelectedApplication(null);
        }
    };

    const handleMoveToInProgress = (application: Application) => {
        updateApplicationStatus(application.sample_creditcardapplicationid, STATUS_CODES.IN_PROGRESS, "In Progress");
    };

    const handleApprove = (application: Application) => {
        updateApplicationStatus(application.sample_creditcardapplicationid, STATUS_CODES.APPROVED, "Approved");
    };

    const openRejectModal = (application: Application) => {
        setSelectedApplication(application);
        setShowRejectModal(true);
    };

    const handleReject = () => {
        if (selectedApplication && rejectComments.trim()) {
            updateApplicationStatus(
                selectedApplication.sample_creditcardapplicationid,
                STATUS_CODES.REJECTED,
                "Rejected",
                rejectComments
            );
        } else {
            toast.error("Please provide rejection comments");
        }
    };

    const filterApplicationsByStatus = (status: string) => {
        return applications.filter(app =>
            app["sample_status@OData.Community.Display.V1.FormattedValue"] === status
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
            .then(() => {
                toast.success('ID copied to clipboard');
            })
            .catch((err) => {
                console.error('Failed to copy text: ', err);
                toast.error('Failed to copy to clipboard');
            });
    };

    if (!isReviewer) {
        return <Navigate to="/" replace />;
    } return (
        <div className={ `container mx-auto p-6 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}` }>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-semibold dark:text-white">Credit Card Applications</h1>
                <button
                    type='button'
                    onClick={ fetchApplications }
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors dark:bg-indigo-700 dark:hover:bg-indigo-800"
                    disabled={ loading }
                >
                    { loading ? 'Refreshing...' : 'Refresh' }
                </button>
            </div>

            { error && (
                <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md dark:!bg-red-900/30 dark:text-red-300">
                    { error }
                </div>
            ) }

            <div className="bg-white shadow rounded-md dark:!bg-gray-800">
                <Tab.Group
                    selectedIndex={ selectedTab }
                    onChange={ setSelectedTab }
                >
                    <Tab.List className="flex rounded-t-md bg-gray-100 p-1 dark:!bg-gray-700">
                        { tabs.map((tab) => (
                            <Tab
                                key={ tab.name }
                                className={ ({ selected }) =>
                                    classNames(
                                        'w-full py-2.5 text-sm font-medium leading-5 rounded-md',
                                        'focus:outline-none focus:ring-2 ring-offset-2 ring-opacity-60',
                                        selected
                                            ? 'bg-white shadow text-indigo-700 dark:!bg-gray-900 dark:text-indigo-400 dark:ring-offset-gray-800 dark:ring-white'
                                            : 'text-gray-700 hover:bg-white/[0.12] hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400'
                                    )
                                }
                            >
                                { tab.name } ({ filterApplicationsByStatus(tab.status).length })
                            </Tab>
                        )) }
                    </Tab.List>
                    <Tab.Panels className="mt-2">
                        { tabs.map((tab, idx) => {
                            const filteredApplications = filterApplicationsByStatus(tab.status);

                            return (
                                <Tab.Panel
                                    key={ idx }
                                    className={ classNames(
                                        'rounded-b-md bg-white p-3 dark:!bg-gray-800',
                                        'focus:outline-none'
                                    ) }
                                >
                                    { loading ? (
                                        <div className="flex justify-center items-center h-40">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-700 dark:border-indigo-400"></div>
                                        </div>
                                    ) : filteredApplications.length === 0 ? (
                                        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                            No { tab.status.toLowerCase() } applications found
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                <thead className="bg-gray-50 dark:!bg-gray-700">
                                                    <tr>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                                                            ID
                                                        </th>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                                                            Name
                                                        </th>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                                                            Email
                                                        </th>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                                                            Card Type
                                                        </th>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                                                            Date
                                                        </th>
                                                        { tab.status === 'Rejected' && (
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                                                                Comments
                                                            </th>
                                                        ) }
                                                        { (tab.status === 'Submitted' || tab.status === 'In Progress') && (
                                                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                                                                Actions
                                                            </th>
                                                        ) }
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200 dark:!bg-gray-800 dark:divide-gray-700">
                                                    { filteredApplications.map((application) => (
                                                        <tr key={ application.sample_id } className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                                <div className="flex items-center">
                                                                    { application.sample_id }
                                                                    <button
                                                                        onClick={ () => copyToClipboard(application.sample_id) }
                                                                        className="ml-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                                                        title="Copy ID to clipboard"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                                { `${application.sample_firstname} ${application.sample_lastname}` }
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                                { application.sample_email }
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                                { application["sample_cardtype"] || 'N/A' }
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                                { formatDate(application.createdon) }
                                                            </td>
                                                            { tab.status === 'Rejected' && (
                                                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate dark:text-gray-300">
                                                                    { application.sample_comments || 'No comments' }
                                                                </td>
                                                            ) }
                                                            { (tab.status === 'Submitted' || tab.status === 'In Progress') && (
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                    { tab.status === 'Submitted' && (
                                                                        <button
                                                                            onClick={ () => handleMoveToInProgress(application) }
                                                                            disabled={ updating }
                                                                            className="text-indigo-600 hover:text-indigo-900 bg-white border border-indigo-600 px-3 py-1 rounded-md hover:bg-indigo-50 transition dark:!bg-gray-800 dark:text-indigo-400 dark:border-indigo-500 dark:hover:text-indigo-300 dark:hover:bg-gray-700"
                                                                        >
                                                                            Move to In Progress
                                                                        </button>
                                                                    ) }
                                                                    { tab.status === 'In Progress' && (
                                                                        <div className="flex space-x-2 justify-end">
                                                                            <button
                                                                                onClick={ () => handleApprove(application) }
                                                                                disabled={ updating }
                                                                                className="text-green-600 hover:text-green-900 bg-white border border-green-600 px-3 py-1 rounded-md hover:bg-green-50 transition dark:!bg-gray-800 dark:text-green-400 dark:border-green-500 dark:hover:text-green-300 dark:hover:bg-gray-700"
                                                                            >
                                                                                Approve
                                                                            </button>
                                                                            <button
                                                                                onClick={ () => openRejectModal(application) }
                                                                                disabled={ updating }
                                                                                className="text-red-600 hover:text-red-900 bg-white border border-red-600 px-3 py-1 rounded-md hover:bg-red-50 transition dark:!bg-gray-800 dark:text-red-400 dark:border-red-500 dark:hover:text-red-300 dark:hover:bg-gray-700"
                                                                            >
                                                                                Reject
                                                                            </button>
                                                                        </div>
                                                                    ) }
                                                                </td>
                                                            ) }
                                                        </tr>
                                                    )) }
                                                </tbody>
                                            </table>
                                        </div>
                                    ) }
                                </Tab.Panel>
                            );
                        }) }
                    </Tab.Panels>
                </Tab.Group>
            </div>

            {/* Rejection Modal */ }
            { showRejectModal && (
                <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-8 max-w-md w-full dark:!bg-gray-800 dark:text-white">
                        <h3 className="text-lg font-semibold mb-4">Reject Application</h3>
                        <div className="mb-4">
                            <label htmlFor="rejectComments" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                                Rejection Comments (Required)
                            </label>
                            <textarea
                                id="rejectComments"
                                value={ rejectComments }
                                onChange={ (e) => setRejectComments(e.target.value) }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:!bg-gray-700 dark:!border-gray-600 dark:text-white dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                                rows={ 4 }
                                placeholder="Explain why this application is being rejected..."
                                required
                            />
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                type='button'
                                onClick={ () => {
                                    setShowRejectModal(false);
                                    setRejectComments('');
                                    setSelectedApplication(null);
                                } }
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                                disabled={ updating }
                            >
                                Cancel
                            </button>
                            <button
                                type='button'
                                onClick={ handleReject }
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                                disabled={ updating || !rejectComments.trim() }
                            >
                                { updating ? 'Rejecting...' : 'Reject Application' }
                            </button>
                        </div>
                    </div>
                </div>
            ) }
        </div>
    );
};

export default Applications;
