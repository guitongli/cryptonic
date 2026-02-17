'use strict';

/**
 * CumulativeDelta
 * Session running total of (buyVolume − sellVolume).
 *
 * Positive → net buying pressure since session start.
 * Negative → net selling pressure since session start.
 *
 * Call reset() to start a new session (e.g. on new daily candle).
 */
class CumulativeDelta {
  constructor() {
    this.delta        = 0;
    this.sessionStart = Date.now();
  }

  update(trade) {
    const vol  = parseFloat(trade.q);
    const isBuy = !trade.m; // m=false → taker buy
    this.delta += isBuy ? vol : -vol;
    return this.delta;
  }

  reset() {
    this.delta        = 0;
    this.sessionStart = Date.now();
  }

  getState() {
    return {
      delta:        +this.delta.toFixed(4),
      sessionStart: this.sessionStart,
    };
  }
}

module.exports = CumulativeDelta;
