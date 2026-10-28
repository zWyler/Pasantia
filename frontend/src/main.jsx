import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import ApplicationErrorBoundary from './components/ApplicationErrorBoundary.jsx';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter>
            <ApplicationErrorBoundary>
                <App />
            </ApplicationErrorBoundary>
        </BrowserRouter>
    </StrictMode>,
);
