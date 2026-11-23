// Entry point: mounts the React app and wraps it in the providers it needs.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import { StoreProvider } from './lib/store.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
