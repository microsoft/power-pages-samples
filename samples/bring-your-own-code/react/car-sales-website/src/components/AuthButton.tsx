import { IconButton, Tooltip } from '@mui/material';
import {
    Login,
    Logout
} from '@mui/icons-material';
import React from 'react';
export const AuthButton = () => {
    const username = (window as any)["Microsoft"]?.Dynamic365?.Portal?.User?.userName ?? "";
    const firstName = (window as any)["Microsoft"]?.Dynamic365?.Portal?.User?.firstName ?? "";
    const lastName = (window as any)["Microsoft"]?.Dynamic365?.Portal?.User?.lastName ?? "";
    const tenantId = (window as any)["Microsoft"]?.Dynamic365?.Portal?.tenant ?? "";
    const isAuthenticated = username !== "";
    const [token, setToken] = React.useState<string>("");

    React.useEffect(() => {
        const fetchAntiForgeryToken = async (): Promise<string> => {
            try {
                const tokenEndpoint = "/_layout/tokenhtml";

                const response = await fetch(tokenEndpoint, {});

                if (response.status !== 200) {
                    throw new Error(`Failed to fetch token: ${response.status}`);
                }

                const tokenResponse = await response.text();
                console.log(`Token Response = ${tokenResponse}`);
                const valueString = 'value="';
                const terminalString = '" />';
                const valueIndex = tokenResponse.indexOf(valueString);

                if (valueIndex === -1) {
                    throw new Error('Token not found in response');
                }

                const requestVerificationToken = tokenResponse.substring(
                    valueIndex + valueString.length,
                    tokenResponse.indexOf(terminalString, valueIndex)
                );

                return requestVerificationToken || '';
            } catch (error) {
                console.warn('[Impersonation] Failed to fetch anti-forgery token:', error);
                return '';
            }
        };

        const getToken = async () => {
            try {
                const token = await fetchAntiForgeryToken();
                setToken(token);
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
                    <span className="text-sm">Welcome {firstName + " " + lastName}</span>
                    <Tooltip title="Logout">
                        <IconButton color="primary" onClick={() => window.location.href = "/Account/Login/LogOff?returnUrl=%2F"}>
                            <Logout />
                        </IconButton>
                    </Tooltip>
                </>
            ) : (
                <form action="/Account/Login/ExternalLogin" method="post">
                    <input name="__RequestVerificationToken" type="hidden" value={token} />
                    <Tooltip title="Login">
                        <IconButton name="provider" type="submit" color="primary" value={`https://login.windows.net/${tenantId}/`}>
                            <Login />
                        </IconButton>
                    </Tooltip>
                </form>
            )}
        </div>
    );
};
