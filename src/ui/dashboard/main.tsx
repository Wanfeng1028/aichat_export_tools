import React from 'react';
import ReactDOM from 'react-dom/client';
import '../shared/theme/index.css';
import { DashboardApp } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DashboardApp />
  </React.StrictMode>
);
