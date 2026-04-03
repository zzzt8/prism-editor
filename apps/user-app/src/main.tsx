import React from 'react';
import ReactDOM from 'react-dom/client';
import '@prism/shared-ui/styles/tokens.css';
import '@prism/shared-ui/styles/components.css';
import './styles/global.css';
import App from './App';
import { globalRegistry } from '@prism/core';

// Initialize the global registry (loads built-in nodes)
globalRegistry.initialize();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
