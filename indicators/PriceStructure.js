'use strict';

/**
 * PriceStructure
 * Analyses price context from 1-minute kline data.
 *
 * Tracks:
 *   - Trend direction from last N closed candles (higher/lower close sequence)
 *   - Current candle's position within its own high–low range  (0=at low, 1=at high)
 *   - Intra-candle price change %
 *   - Rolling session high and low (support / resistance extremes)
 *
 * Signal:
 *   BULLISH  → majority of recent closes trending up
 *   BEARISH  → majority of recent closes trending down
 *   NEUTRAL  → mixed / insufficient data
 */
class PriceStructure {
  constructor(lookback = 10) {
    this.lookback      = lookback;
    this._closes       = [];   // closed-candle close prices
    this._sessionHigh  = -Infinity;
    this._sessionLow   =  Infinity;
    this.trend         = 'NEUTRAL';
    this.rangePosition = 0.5;  // 0–1 within current candle's H–L
    this.priceChangePct = 0;   // intra-candle %
    this.sessionHighPx  = null;
    this.sessionLowPx   = null;
    this.distFromHighPct = 0;
    this.distFromLowPct  = 0;
  }

  /**
   * Call on every kline event (live or closed candle).
   * @param {Object} kline  — processed kline from IndicatorEngine._state.kline
   *   { open, high, low, close, volume, takerBuyVol, tradeCount, closed }
   */
  update(kline) {
    const { open, high, low, close, closed } = kline;

    // Intra-candle position
    const range = high - low;
    this.rangePosition  = range > 0 ? (close - low) / range : 0.5;
    this.priceChangePct = open > 0 ? ((close - open) / open) * 100 : 0;

    // Session extremes
    if (high > this._sessionHigh) this._sessionHigh = high;
    if (low  < this._sessionLow)  this._sessionLow  = low;
    this.sessionHighPx = this._sessionHigh;
    this.sessionLowPx  = this._sessionLow;

    if (this._sessionHigh > 0 && close > 0) {
      this.distFromHighPct = ((close - this._sessionHigh) / this._sessionHigh) * 100;
      this.distFromLowPct  = ((close - this._sessionLow)  / this._sessionLow)  * 100;
    }

    // Snapshot only closed candles for trend analysis
    if (closed) {
      this._closes.push(close);
      if (this._closes.length > this.lookback) this._closes.shift();
      this._computeTrend();
    }
  }

  getState() {
    return {
      trend:           this.trend,
      rangePosition:   +this.rangePosition.toFixed(4),
      priceChangePct:  +this.priceChangePct.toFixed(4),
      sessionHigh:     this.sessionHighPx,
      sessionLow:      this.sessionLowPx,
      distFromHighPct: +this.distFromHighPct.toFixed(4),
      distFromLowPct:  +this.distFromLowPct.toFixed(4),
      closedCandles:   this._closes.length,
    };
  }

  // ── private ────────────────────────────────────────────────────────────────

  _computeTrend() {
    const n = this._closes.length;
    if (n < 3) { this.trend = 'NEUTRAL'; return; }

    let up = 0, down = 0;
    for (let i = 1; i < n; i++) {
      if (this._closes[i] > this._closes[i - 1]) up++;
      else if (this._closes[i] < this._closes[i - 1]) down++;
    }

    const ratio = (up - down) / (n - 1);
    if (ratio > 0.3)       this.trend = 'BULLISH';
    else if (ratio < -0.3) this.trend = 'BEARISH';
    else                   this.trend = 'NEUTRAL';
  }
}

module.exports = PriceStructure;
