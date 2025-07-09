import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from './config/authConfig';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import "./index.css";

const msalInstance = new PublicClientApplication(msalConfig);

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Failed to find the root element");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <AuthProvider msalInstance={msalInstance}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);