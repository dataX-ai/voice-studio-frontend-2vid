
import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log('👋 This message is being logged by "renderer.js", included via webpack');

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
