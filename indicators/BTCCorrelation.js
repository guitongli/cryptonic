'use strict';

/**
 * BTCCorrelation
 * Rolling Pearson correlation of ETH vs BTC log-returns.
 *
 * Both assets are sampled from their respective aggTrade streams.
 * Prices are stored in a sliding window; once both arrays have ≥ 5
 * data points the Pearson r is computed over log-returns.
 *
 * windowSize (default 60) controls how many price samples are kept.
 * At ~5 aggTrades/s for ETH, this covers roughly 10–15 seconds.
 *
 * Signal:
 *   HIGH      — r > 0.7   (very tight BTC-ETH co-movement)
 *   MODERATE  — r 0.3–0.7 (typical positive correlation)
 *   LOW       — r < 0.3   (diverging — ETH showing independence)
 *   INVERSE   — r < −0.3  (ETH moving opposite to BTC — rare)
 */
class BTCCorrelation {
  constructor(windowSize = 60) {
    this.windowSize  = windowSize;
    this._eth        = [];   // sliding window of ETH prices
    this._btc        = [];   // sliding window of BTC prices
    this.correlation = 0;
    this.signal      = 'LOW';
  }

  /** Call on each ETH aggTrade */
  updateETH(price) {
    this._eth.push(price);
    if (this._eth.length > this.windowSize) this._eth.shift();
    this._compute();
  }

  /** Call on each BTC aggTrade */
  updateBTC(price) {
    this._btc.push(price);
    if (this._btc.length > this.windowSize) this._btc.shift();
    this._compute();
  }

  getState() {
    return {
      correlation: +this.correlation.toFixed(4),
      signal:      this.signal,
      windowSize:  this.windowSize,
      ethSamples:  this._eth.length,
      btcSamples:  this._btc.length,
    };
  }

  // ── private ────────────────────────────────────────────────────────────────

  _compute() {
    const n = Math.min(this._eth.length, this._btc.length);
    if (n < 5) return;  // need at least 5 points for meaningful correlation

    // Log-returns for the aligned suffix of both arrays
    const ethSlice = this._eth.slice(-n);
    const btcSlice = this._btc.slice(-n);

    const ethR = [];
    const btcR = [];
    for (let i = 1; i < n; i++) {
      ethR.push(Math.log(ethSlice[i] / ethSlice[i - 1]));
      btcR.push(Math.log(btcSlice[i] / btcSlice[i - 1]));
    }

    const m = ethR.length;
    if (m < 2) return;

    const meanE = ethR.reduce((a, b) => a + b, 0) / m;
    const meanB = btcR.reduce((a, b) => a + b, 0) / m;

    let cov = 0, varE = 0, varB = 0;
    for (let i = 0; i < m; i++) {
      const de = ethR[i] - meanE;
      const db = btcR[i] - meanB;
      cov  += de * db;
      varE += de * de;
      varB += db * db;
    }

    const denom = Math.sqrt(varE * varB);
    this.correlation = denom > 0 ? cov / denom : 0;

    if (this.correlation > 0.7)       this.signal = 'HIGH';
    else if (this.correlation > 0.3)  this.signal = 'MODERATE';
    else if (this.correlation < -0.3) this.signal = 'INVERSE';
    else                              this.signal = 'LOW';
  }
}

module.exports = BTCCorrelation;
