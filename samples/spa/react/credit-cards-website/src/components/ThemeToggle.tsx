import React from 'react';
import { useTheme } from '../context/useTheme';
import { Sun, Moon, Monitor } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
    const { theme, setTheme } = useTheme();

    const handleThemeChange = () => {
        // Cycle through themes: light -> dark -> system -> light
        if (theme === 'light') {
            setTheme('dark');
        } else if (theme === 'dark') {
            setTheme('system');
        } else {
            setTheme('light');
        }
    }; return (
        <button
            onClick={ handleThemeChange }
            className="rounded-full p-2 bg-secondary hover:bg-secondary/80 transition-colors dark:bg-gray-700 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-500 shadow-sm"
            title={ `Current theme: ${theme}. Click to change.` }
        >
            { theme === 'dark' ? (
                <Moon className="h-5 w-5 text-yellow-300" />
            ) : theme === 'light' ? (
                <Sun className="h-5 w-5 text-yellow-500" />
            ) : (
                <Monitor className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            ) }
        </button>
    );
};

export default ThemeToggle;
