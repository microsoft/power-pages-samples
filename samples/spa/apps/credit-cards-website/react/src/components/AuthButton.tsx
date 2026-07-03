import React from 'react';
import { useAuth } from '../context/AuthContext';

export const AuthButton = () => {
    const { isAuthenticated, user, login, logout } = useAuth();
    const displayName = user?.name || user?.username || user?.givenName || '';
    return (
        <div className="flex items-center gap-4">
            { isAuthenticated ? (
                <>
                    { displayName && <span className="text-sm text-white">Welcome { displayName }</span> }
                    <button
                        className="px-4 py-2 text-sm font-medium text-white bg-transparent border border-white rounded-md hover:bg-white/10 transition-colors"
                        onClick={ logout }
                    >
                        Sign Out
                    </button>
                </>
            ) : (
                <button
                    type="button"
                    onClick={ login }
                    className="px-4 py-2 text-sm font-medium text-white bg-transparent border border-white rounded-md hover:bg-white/10 transition-colors"
                >
                    Sign In
                </button>
            ) }
        </div>
    );
};
