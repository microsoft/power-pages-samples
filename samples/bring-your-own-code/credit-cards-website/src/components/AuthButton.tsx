import ExtendedWindow from '@/ExtendedWindow';
import React from 'react';

export const AuthButton = () => {
    const extWindow = window as unknown as ExtendedWindow;
    const username = extWindow.Microsoft?.Dynamic365?.Portal?.User?.userName ?? "";
    const firstName = extWindow.Microsoft?.Dynamic365?.Portal?.User?.firstName ?? "";
    const lastName = extWindow.Microsoft?.Dynamic365?.Portal?.User?.lastName ?? "";
    const tenantId = extWindow.Microsoft?.Dynamic365?.Portal?.tenant ?? "";
    const isAuthenticated = username !== "";
    const [token, setToken] = React.useState<string>("");

    React.useEffect(() => {
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

    return (
        <div className="flex items-center gap-4">
            {isAuthenticated ? (
                <>
                    <span className="text-sm text-white">Welcome {firstName} {lastName}</span>
                    <button
                        className="px-4 py-2 text-sm font-medium text-white bg-transparent border border-white rounded-md hover:bg-white/10 transition-colors"
                        onClick={() => window.location.href = "/Account/Login/LogOff?returnUrl=%2F"}
                    >
                        Sign Out
                    </button>
                </>
            ) : (
                <form action="/Account/Login/ExternalLogin" method="post">
                    <input name="__RequestVerificationToken" type="hidden" value={token} />
                    <button
                        name="provider"
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-transparent border border-white rounded-md hover:bg-white/10 transition-colors"
                            value={`https://login.windows.net/${tenantId}/`}
                    >
                        Sign In
                    </button>
                </form>
            )}
        </div>
    );
};
