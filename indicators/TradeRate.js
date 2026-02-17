'use strict';

/**
 * TradeRate
 * Trades per second calculated over a rolling 10-second window.
 */
class TradeRate {
  constructor(windowMs = 10_000) {
    this.windowMs = windowMs;
    this._ticks   = []; // timestamps (ms)
    this.rate     = 0;
  }

  update(_trade) {
    const now = Date.now();
    this._ticks.push(now);
    this._evict(now);
    this.rate = this._ticks.length / (this.windowMs / 1000);
    return this.rate;
  }

  getState() {
    return {
      rate:     +this.rate.toFixed(3),
      windowMs: this.windowMs,
    };
  }

  _evict(now) {
    const cutoff = now - this.windowMs;
    let i = 0;
    while (i < this._ticks.length && this._ticks[i] < cutoff) i++;
    if (i > 0) this._ticks.splice(0, i);
  }
}

module.exports = TradeRate;
