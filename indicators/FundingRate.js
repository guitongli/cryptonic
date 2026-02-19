'use strict';

/**
 * FundingRate
 * Consumes Binance Futures markPrice stream (ethusdt@markPrice@1s).
 *
 * The stream carries:
 *   p  — mark price
 *   i  — index price
 *   r  — last funding rate  (8-hour rate, e.g. 0.0001 = 0.01%)
 *   T  — next funding timestamp (ms)
 *
 * Signal:
 *   LONGS_PAY   — positive rate  (longs pay shorts → slight bearish weight)
 *   SHORTS_PAY  — negative rate  (shorts pay longs → slight bullish weight)
 *   NEUTRAL     — within ±0.01 % per 8 h
 *
 * annualisedPct = rate * 3 * 365 * 100   (3 funding periods/day × 365 days)
 */
class FundingRate {
  constructor() {
    this.rate             = null;
    this.markPrice        = null;
    this.indexPrice       = null;
    this.premium          = null;    // mark − index spread
    this.nextFundingTime  = null;
    this.annualisedPct    = null;
    this.signal           = 'NEUTRAL';
  }

  /**
   * @param {Object} msg  — raw Binance markPrice stream message
   *   { e, E, s, p, P, i, r, T }
   */
  update(msg) {
    const rate      = parseFloat(msg.r);
    const markPrice = parseFloat(msg.p);
    const idxPrice  = parseFloat(msg.i);

    if (isNaN(rate) || isNaN(markPrice)) return;

    this.rate            = rate;
    this.markPrice       = markPrice;
    this.indexPrice      = idxPrice;
    this.premium         = +(markPrice - idxPrice).toFixed(4);
    this.nextFundingTime = msg.T || null;
    this.annualisedPct   = +(rate * 3 * 365 * 100).toFixed(4);

    // ±0.01% per 8-hour period as neutral threshold
    if (rate > 0.0001)       this.signal = 'LONGS_PAY';
    else if (rate < -0.0001) this.signal = 'SHORTS_PAY';
    else                     this.signal = 'NEUTRAL';
  }

  getState() {
    return {
      rate:            this.rate,
      annualisedPct:   this.annualisedPct,
      markPrice:       this.markPrice,
      indexPrice:      this.indexPrice,
      premium:         this.premium,
      nextFundingTime: this.nextFundingTime,
      signal:          this.signal,
    };
  }
}

module.exports = FundingRate;
