import React from 'react';
import ReactDOM from 'react-dom/client';
import '../shared/theme/index.css';
import { PopupApp } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
);
