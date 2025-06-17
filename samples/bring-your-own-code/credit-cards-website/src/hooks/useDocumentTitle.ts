import { useEffect } from 'react';

/**
 * Custom hook to set the document title with a consistent format
 * @param title - The specific page title
 * @param includeAppName - Whether to include the app name in the title (defaults to true)
 */
export const useDocumentTitle = (title: string, includeAppName: boolean = true) => {
    useEffect(() => {
        const appName = 'Woodgrove Bank';
        document.title = includeAppName ? `${title} | ${appName}` : title;

        // Optional: Restore the original title when the component unmounts
        return () => {
            document.title = appName;
        };
    }, [title, includeAppName]);
};
