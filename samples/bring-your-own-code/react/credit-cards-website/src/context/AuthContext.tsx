import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useMsal, MsalProvider } from "@azure/msal-react";
import { IPublicClientApplication } from '@azure/msal-browser';
import { loginRequest } from '../config/authConfig';
import { Alert, AlertDescription } from '../components/ui/alert';

interface AuthContextType {
    isAuthenticated: boolean;
    user: any;
    login: () => void;
    logout: () => void;
    error: string | null;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
    msalInstance: IPublicClientApplication;
}

export const AuthProvider = ({ children, msalInstance }: AuthProviderProps) => {
    return (
        <MsalProvider instance={msalInstance}>
            <AuthProviderContent>
                {children}
            </AuthProviderContent>
        </MsalProvider>
    );
};

const AuthProviderContent = ({ children }: { children: ReactNode }) => {
    const { instance, accounts } = useMsal();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (accounts.length > 0) {
            setIsAuthenticated(true);
            setUser(accounts[0]);
        } else {
            setIsAuthenticated(false);
            setUser(null);
        }
    }, [accounts]);

    const clearError = () => setError(null);

    const login = async () => {
        try {
            setError(null);
            await instance.loginPopup(loginRequest);
        } catch (error: any) {
            console.error('Login failed:', error);
            setError(error.message || 'Authentication failed. Please try again.');
        }
    };

    const logout = () => {
        try {
            setError(null);
            instance.logoutPopup();
        } catch (error: any) {
            console.error('Logout failed:', error);
            setError(error.message || 'Logout failed. Please try again.');
        }
    };

    const value = {
        isAuthenticated,
        user,
        login,
        logout,
        error,
        clearError
    };

    return (
        <AuthContext.Provider value={value}>
            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {children}
        </AuthContext.Provider>
    );
}; 