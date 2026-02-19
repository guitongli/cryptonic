import React from 'react';
import { MarketDataProvider } from './components/MarketDataWrapper';
import { Dashboard } from './components/Dashboard';

function App() {
  return (
    <MarketDataProvider>
      <Dashboard />
    </MarketDataProvider>
  );
}

export default App;
