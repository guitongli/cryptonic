'use strict';

/**
 * VWAP  (Volume-Weighted Average Price)
 * Session VWAP computed from aggTrade tick data.
 *
 *   VWAP = Σ(price × volume) / Σ(volume)
 *
 * Resets at session start (call reset() on new daily candle if needed).
 * Provides distance signal — how far current price sits from VWAP.
 *
 * Signal:
 *   ABOVE  — price trades above VWAP  (bullish bias)
 *   BELOW  — price trades below VWAP  (bearish bias)
 *   AT     — within 0.05 % of VWAP
 */
class VWAP {
  constructor() {
    this.vwap         = 0;
    this.lastPrice    = 0;
    this.distancePct  = 0;
    this.signal       = 'AT';
    this._cumPV       = 0;   // Σ price × vol
    this._cumVol      = 0;   // Σ vol
    this.sessionStart = Date.now();
  }

  update(trade) {
    const price = parseFloat(trade.p);
    const vol   = parseFloat(trade.q);

    this._cumPV  += price * vol;
    this._cumVol += vol;

    this.vwap      = this._cumVol > 0 ? this._cumPV / this._cumVol : price;
    this.lastPrice = price;

    this.distancePct = this.vwap > 0
      ? ((price - this.vwap) / this.vwap) * 100
      : 0;

    if (this.distancePct > 0.05)       this.signal = 'ABOVE';
    else if (this.distancePct < -0.05) this.signal = 'BELOW';
    else                               this.signal = 'AT';

    return this.vwap;
  }

  reset() {
    this._cumPV       = 0;
    this._cumVol      = 0;
    this.vwap         = 0;
    this.distancePct  = 0;
    this.signal       = 'AT';
    this.sessionStart = Date.now();
  }

  getState() {
    return {
      vwap:         +this.vwap.toFixed(4),
      lastPrice:    +this.lastPrice.toFixed(4),
      distancePct:  +this.distancePct.toFixed(4),
      signal:       this.signal,
      sessionStart: this.sessionStart,
    };
  }
}

module.exports = VWAP;
