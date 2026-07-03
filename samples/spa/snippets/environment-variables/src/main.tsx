import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Set the page title from an env variable to demonstrate usage at startup
if (import.meta.env.VITE_PUBLIC_TITLE) {
    document.title = import.meta.env.VITE_PUBLIC_TITLE;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
