import React from 'react';
import ReactDOM from 'react-dom/client';
import '@prism/shared-ui/styles/tokens.css';
import '@prism/shared-ui/styles/components.css';
import './styles/global.css';
import './styles/nodes/dense-control-node.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
