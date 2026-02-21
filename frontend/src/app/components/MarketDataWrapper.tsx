import React, { useState, useEffect, useRef, createContext, useContext } from 'react';

export interface MarketEvent {
  id: string;
  symbol: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: number;
  count: number; // trades aggregated in this 1-second bucket
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
  sentiment: number; // -1 to 1 (tapePressure.value)
  tape: MarketEvent[];
  liquidations: Liquidation[];
  deltaData: { time: string; delta: number }[];
  raw: Record<string, any>; // full backend SSE state
}

const defaultState: MarketState = {
  currentPrice: 0,
  priceChange: 0,
  volatility: 0,
  sentiment: 0,
  tape: [],
  liquidations: [],
  deltaData: Array.from({ length: 30 }, (_, i) => ({ time: `${i}:00`, delta: 0 })),
  raw: {},
};

const MarketDataContext = createContext<MarketState | undefined>(undefined);

export const useMarketData = () => {
  const context = useContext(MarketDataContext);
  if (!context) throw new Error('useMarketData must be used within MarketDataProvider');
  return context;
};

export const MarketDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<MarketState>(defaultState);
  // Raw trade buffer — written by WebSocket, drained by 1-second interval
  const tradeBuffer = useRef<Array<{ price: number; size: number; side: 'buy' | 'sell' }>>([]);

  // ── SSE: backend indicator state ──────────────────────────────────────────
  useEffect(() => {
    let es: EventSource;
    let lastLiqTs = 0;

    const connect = () => {
      es = new EventSource('http://localhost:3000/stream');

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);

          setState((prev) => {
            const bookTicker = data.bookTicker;
            const kline = data.kline;

            // Price: mid of best bid/ask, fallback to kline close
            const currentPrice = bookTicker
              ? (bookTicker.bestBid + bookTicker.bestAsk) / 2
              : kline?.close ?? prev.currentPrice;

            // Price change % from kline open→close
            const priceChange =
              kline && kline.open && kline.open > 0
                ? ((kline.close - kline.open) / kline.open) * 100
                : prev.priceChange;

            // Volatility: volumeIntensity multiplier normalised 0-1
            const volatility =
              data.volumeIntensity?.value != null
                ? Math.min(data.volumeIntensity.value / 3, 1)
                : prev.volatility;

            // Sentiment: tapePressure.value (-1 to +1)
            const sentiment = data.tapePressure?.value ?? prev.sentiment;

            // Delta history: one entry per second (update current second, append on new second)
            const deltaVal = (data.cumulativeDelta?.delta ?? 0) * 10; // scale for display
            const timeKey = new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            const last = prev.deltaData[prev.deltaData.length - 1];
            const deltaData = last && last.time === timeKey
              ? [...prev.deltaData.slice(0, -1), { time: timeKey, delta: deltaVal }]
              : [...prev.deltaData.slice(-29), { time: timeKey, delta: deltaVal }];

            // Liquidations: accumulate new events by timestamp
            let liquidations = prev.liquidations;
            const lastLiq = data.lastLiquidation;
            if (lastLiq && lastLiq.ts && lastLiq.ts !== lastLiqTs) {
              lastLiqTs = lastLiq.ts;
              const newLiq: Liquidation = {
                id: String(lastLiq.ts),
                symbol: 'ETH/USDT',
                amount: lastLiq.notional,
                price: lastLiq.avgPrice,
                // SELL = long position liquidated; BUY = short position liquidated
                side: lastLiq.side === 'SELL' ? 'long' : 'short',
                timestamp: lastLiq.ts,
              };
              liquidations = [newLiq, ...prev.liquidations].slice(0, 20);
            }

            return {
              ...prev,
              currentPrice,
              priceChange,
              volatility,
              sentiment,
              deltaData,
              liquidations,
              raw: data,
            };
          });
        } catch (_) {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        setTimeout(connect, 2000);
      };
    };

    connect();
    return () => es && es.close();
  }, []);

  // ── WebSocket: real-time tape from Binance ────────────────────────────────
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    // Drain the buffer once per second and emit one aggregated tape entry
    const interval = setInterval(() => {
      const trades = tradeBuffer.current.splice(0); // drain
      if (trades.length === 0) return;

      const buySz  = trades.filter(t => t.side === 'buy').reduce((s, t) => s + t.size, 0);
      const sellSz = trades.filter(t => t.side === 'sell').reduce((s, t) => s + t.size, 0);

      const event: MarketEvent = {
        id: `agg-${Date.now()}`,
        symbol: 'ETH/USDT',
        price: trades[trades.length - 1].price, // last price in the second
        size: buySz + sellSz,
        side: buySz >= sellSz ? 'buy' : 'sell',
        timestamp: Date.now(),
        count: trades.length,
      };

      setState((prev) => ({
        ...prev,
        tape: [event, ...prev.tape].slice(0, 100),
      }));
    }, 1000);

    const connect = () => {
      ws = new WebSocket('wss://fstream.binance.com/ws/ethusdt@aggTrade');

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        tradeBuffer.current.push({
          price: parseFloat(msg.p),
          size: parseFloat(msg.q),
          side: !msg.m ? 'buy' : 'sell',
        });
      };

      ws.onclose = () => { reconnectTimer = setTimeout(connect, 1000); };
      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      ws && ws.close();
      clearTimeout(reconnectTimer);
      clearInterval(interval);
    };
  }, []);

  return (
    <MarketDataContext.Provider value={state}>
      {children}
    </MarketDataContext.Provider>
  );
};
