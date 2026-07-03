import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Alert, AlertDescription } from '../components/ui/alert';

// Re-introduced Entra ID (Azure AD) auth using legacy v1 endpoint via ADAL JS.
// NOTE: ADAL is deprecated. Prefer migrating to MSAL (v2 endpoints) when possible.
// Env vars required:
//   VITE_AAD_TENANT_ID (directory / tenant ID or common / organizations)
//   VITE_AAD_CLIENT_ID (app registration Application (client) ID)
// Optional:
//   VITE_AUTH_DEBUG=true for verbose logging.

const AAD_TENANT_ID = (import.meta as ImportMeta).env?.VITE_AAD_TENANT_ID || 'common';
const AAD_CLIENT_ID = (import.meta as ImportMeta).env?.VITE_AAD_CLIENT_ID || '';
const AUTH_DEBUG = ((import.meta as ImportMeta).env?.VITE_AUTH_DEBUG ?? '').toString().toLowerCase() === 'true';
if (!AAD_CLIENT_ID) console.warn('VITE_AAD_CLIENT_ID is not set. Entra (ADAL) login will fail.');

// Minimal shape to remain backward compatible with prior consumer code (name, username, givenName)
interface AADUserInfo {
    userName?: string; // ADAL cached user property
    profile?: Record<string, unknown>;
    idToken?: string; // raw id token (base64 JWT)
    displayableId?: string;
    name?: string;
    givenName?: string;
    familyName?: string;
    // Back-compat for prior code expecting these fields
    username?: string;
}

// Extend global window type for Google Identity Services
declare global {
    interface Window {
        AuthenticationContext?: {
            new(config: Record<string, unknown>): ADALContext;
        } & ((config: Record<string, unknown>) => ADALContext);
    }
}

// Minimal ADAL context surface we use
interface ADALContext {
    isCallback: (hash: string) => boolean;
    handleWindowCallback: () => void;
    getLoginError: () => string | null;
    getCachedUser: () => { userName?: string; profile?: Record<string, unknown> } | null;
    getCachedToken: (resource: string) => string | null;
    login: () => void;
    logOut: () => void;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: AADUserInfo | null;
    login: () => Promise<void> | void;
    logout: () => void;
    error: string | null;
    clearError: () => void;
    getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps { children: ReactNode; }

export const AuthProvider = ({ children }: AuthProviderProps) => (
    <AuthProviderContent>{ children }</AuthProviderContent>
);

const AuthProviderContent = ({ children }: { children: ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<AADUserInfo | null>(null);
    const [idToken, setIdToken] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const scriptLoadedRef = useRef(false);
    const adalContextRef = useRef<ADALContext | null>(null);

    const clearError = () => setError(null);

    const logDebug = useCallback((...args: unknown[]) => { if (AUTH_DEBUG) console.log('[AuthDebug]', ...args); }, []);

    // Load ADAL script dynamically (from Microsoft CDN). Alternative: install adal-js via npm.
    const loadAdalScript = useCallback((): Promise<void> => {
        if (scriptLoadedRef.current) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-adal]') as HTMLScriptElement | null;
            if (existing) {
                scriptLoadedRef.current = true;
                resolve();
                return;
            }
            const script = document.createElement('script');
            // Version pinned; can update if needed.
            script.src = 'https://secure.aadcdn.microsoftonline-p.com/lib/1.0.17/js/adal.min.js';
            script.async = true;
            script.defer = true;
            script.setAttribute('data-adal', 'true');
            script.onload = () => { scriptLoadedRef.current = true; resolve(); };
            script.onerror = (e) => reject(e);
            document.head.appendChild(script);
        });
    }, []);

    const buildAdalConfig = (): Record<string, unknown> => ({
        tenant: AAD_TENANT_ID,
        clientId: AAD_CLIENT_ID,
        redirectUri: window.location.origin,
        cacheLocation: 'localStorage', // or 'sessionStorage'
        navigateToLoginRequestUrl: false,
        // endpoints: { 'https://graph.microsoft.com': 'https://graph.microsoft.com' }, // add resource mapping if needed
        extraQueryParameter: 'prompt=select_account'
    });

    const ensureAdalContext = useCallback((): ADALContext | null => {
        if (!adalContextRef.current && window.AuthenticationContext && AAD_CLIENT_ID) {
            try {
                const Ctx = window.AuthenticationContext as unknown as { new(config: Record<string, unknown>): ADALContext };
                adalContextRef.current = new Ctx(buildAdalConfig());
                logDebug('ADAL context created');
            } catch (e) {
                console.warn('Failed to create ADAL context', e);
            }
        }
        return adalContextRef.current;
    }, [logDebug]);

    const processCallbackIfPresent = useCallback(() => {
        const ctx = ensureAdalContext();
        if (!ctx) return;
        if (ctx.isCallback(window.location.hash)) {
            ctx.handleWindowCallback();
            const err = ctx.getLoginError();
            if (err) {
                setError(err);
            }
        }
    }, [ensureAdalContext]);

    const populateFromCache = useCallback(() => {
        const ctx = ensureAdalContext();
        if (!ctx) return;
        const cachedUser = ctx.getCachedUser();
        const cachedIdToken = ctx.getCachedToken(AAD_CLIENT_ID);
        if (cachedUser && cachedIdToken) {
            const profile = cachedUser.profile || {};
            const profileRecord = profile as Record<string, unknown>;
            const str = (v: unknown) => typeof v === 'string' ? v : undefined;
            const mapped: AADUserInfo = {
                userName: cachedUser.userName,
                displayableId: str(profileRecord['upn']) || cachedUser.userName,
                name: str(profileRecord['name']),
                givenName: str(profileRecord['given_name']),
                familyName: str(profileRecord['family_name']),
                username: cachedUser.userName,
                idToken: cachedIdToken,
                profile
            };
            setUser(mapped);
            setIdToken(cachedIdToken);
            setIsAuthenticated(true);
        } else {
            setIsAuthenticated(false);
        }
    }, [ensureAdalContext]);

    const login = async () => {
        setError(null);
        if (!AAD_CLIENT_ID) {
            setError('AAD client ID not configured.');
            return;
        }
        try {
            await loadAdalScript();
            const ctx = ensureAdalContext();
            if (!ctx) {
                setError('ADAL context not available.');
                return;
            }
            ctx.login(); // redirects browser
        } catch (e) {
            console.error('AAD login failed', e);
            setError('Login failed.');
        }
    };

    const logout = () => {
        try {
            const ctx = ensureAdalContext();
            if (ctx) ctx.logOut();
            setIsAuthenticated(false);
            setUser(null);
            setIdToken(null);
        } catch (e) {
            console.error('Logout failed', e);
            setError('Logout failed.');
        }
    };

    const getIdToken = async (): Promise<string | null> => idToken;

    // Attempt silent initialization on mount (won't authenticate until credential callback fires)
    useEffect(() => {
        // Initialize ADAL flow
        loadAdalScript()
            .then(() => {
                processCallbackIfPresent();
                populateFromCache();
            })
            .catch(e => {
                console.warn('Failed to load ADAL script', e);
                setError('Failed to load authentication library.');
            });
        if (AUTH_DEBUG) {
            console.log('[AuthDebug] Mounted AuthProvider (ADAL)', {
                origin: window.location.origin,
                tenant: AAD_TENANT_ID,
                clientIdPresent: !!AAD_CLIENT_ID,
                time: new Date().toISOString()
            });
        }
    }, [loadAdalScript, processCallbackIfPresent, populateFromCache]);

    const value = { isAuthenticated, user, login, logout, error, clearError, getIdToken };

    return (
        <AuthContext.Provider value={ value }>
            { error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{ error }</AlertDescription>
                </Alert>
            ) }
            { children }
        </AuthContext.Provider>
    );
};
