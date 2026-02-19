import React, { useState, useEffect, createContext, useContext } from 'react';

export interface MarketEvent {
  id: string;
  symbol: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

export interface Liquidation {
  id: string;
  symbol: string;
  amount: number;
  price: number;
  side: 'long' | 'short';
  timestamp: number;
}

export interface MarketState {
  currentPrice: number;
  priceChange: number;
  volatility: number;
  sentiment: number; // -1 to 1
  tape: MarketEvent[];
  liquidations: Liquidation[];
  deltaData: { time: string; delta: number }[];
}

const MarketDataContext = createContext<MarketState | undefined>(undefined);

export const useMarketData = () => {
  const context = useContext(MarketDataContext);
  if (!context) {
    throw new Error('useMarketData must be used within a MarketDataProvider');
  }
  return context;
};

export const MarketDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<MarketState>({
    currentPrice: 52432.50,
    priceChange: 1.25,
    volatility: 0.5,
    sentiment: 0.2,
    tape: [],
    liquidations: [],
    deltaData: Array.from({ length: 20 }, (_, i) => ({
      time: `${i}:00`,
      delta: Math.floor(Math.random() * 1000) - 500,
    })),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        const isBuy = Math.random() > 0.45 + (prev.sentiment * 0.05);
        const priceChange = (Math.random() - 0.48) * 10;
        const newPrice = prev.currentPrice + priceChange;
        const size = Math.floor(Math.random() * 100) / 10;

        const newEvent: MarketEvent = {
          id: Math.random().toString(36).substr(2, 9),
          symbol: 'BTC/USDT',
          price: newPrice,
          size,
          side: isBuy ? 'buy' : 'sell',
          timestamp: Date.now(),
        };

        const newTape = [newEvent, ...prev.tape].slice(0, 50);

        // Random liquidations
        let newLiquidations = [...prev.liquidations];
        if (Math.random() > 0.95) {
          const liq: Liquidation = {
            id: Math.random().toString(36).substr(2, 9),
            symbol: 'BTC/USDT',
            amount: Math.floor(Math.random() * 1000000),
            price: newPrice,
            side: Math.random() > 0.5 ? 'long' : 'short',
            timestamp: Date.now(),
          };
          newLiquidations = [liq, ...newLiquidations].slice(0, 20);
        }

        // Update Delta
        const lastDelta = prev.deltaData[prev.deltaData.length - 1].delta;
        const newDeltaValue = lastDelta + (isBuy ? size * 100 : -size * 100);
        const newDeltaData = [...prev.deltaData.slice(1), { 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
          delta: newDeltaValue 
        }];

        return {
          ...prev,
          currentPrice: newPrice,
          priceChange: ((newPrice - 52432.50) / 52432.50) * 100,
          sentiment: Math.max(-1, Math.min(1, prev.sentiment + (isBuy ? 0.01 : -0.01))),
          volatility: Math.abs(priceChange) / 10,
          tape: newTape,
          liquidations: newLiquidations,
          deltaData: newDeltaData,
        };
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <MarketDataContext.Provider value={state}>
      {children}
    </MarketDataContext.Provider>
  );
};
