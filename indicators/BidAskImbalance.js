'use strict';

/**
 * BidAskImbalance
 * Total bid liquidity vs ask liquidity within N ticks of the mid price.
 *
 * Maintains a local order book from incremental depth-stream updates and
 * computes  (bidLiq − askLiq) / (bidLiq + askLiq)  for all levels that
 * fall within `tickRange` ticks of the current mid.
 *
 * Output : −1 to +1  (positive = more bids, negative = more asks)
 * Signal : matches TapePressure formula — same [−1, +1] normalisation.
 *          BULLISH  (> 0.3)
 *          BEARISH  (< −0.3)
 *          NEUTRAL  otherwise
 */
class BidAskImbalance {
  constructor(tickSize = 0.01, tickRange = 10) {
    this.tickSize  = tickSize;
    this.tickRange = tickRange;
    this._bids     = new Map();  // price → qty
    this._asks     = new Map();  // price → qty
    this.value     = 0;
    this.signal    = 'NEUTRAL';
  }

  /**
   * Call on every depth-stream message.
   * @param {Object} depthMsg  Binance depth update { b: [[price,qty],…], a: [[price,qty],…] }
   */
  update(depthMsg) {
    // Merge bid updates (qty 0 = remove level)
    for (const entry of (depthMsg.b || [])) {
      const p = parseFloat(entry[0]);
      const q = parseFloat(entry[1]);
      if (q === 0) this._bids.delete(p);
      else this._bids.set(p, q);
    }

    // Merge ask updates
    for (const entry of (depthMsg.a || [])) {
      const p = parseFloat(entry[0]);
      const q = parseFloat(entry[1]);
      if (q === 0) this._asks.delete(p);
      else this._asks.set(p, q);
    }

    this._compute();
    return this.value;
  }

  getState() {
    return {
      value:     +this.value.toFixed(4),
      signal:    this.signal,
      tickSize:  this.tickSize,
      tickRange: this.tickRange,
      bidLevels: this._bids.size,
      askLevels: this._asks.size,
    };
  }

  // ── private ────────────────────────────────────────────────────────────────

  _compute() {
    if (this._bids.size === 0 || this._asks.size === 0) return;

    // Best bid = highest bid price, best ask = lowest ask price
    let bestBid = -Infinity;
    for (const p of this._bids.keys()) if (p > bestBid) bestBid = p;

    let bestAsk = Infinity;
    for (const p of this._asks.keys()) if (p < bestAsk) bestAsk = p;

    const mid   = (bestBid + bestAsk) / 2;
    const range = this.tickSize * this.tickRange;

    let bidLiq = 0;
    for (const [price, qty] of this._bids) {
      if (price >= mid - range) bidLiq += qty;
    }

    let askLiq = 0;
    for (const [price, qty] of this._asks) {
      if (price <= mid + range) askLiq += qty;
    }

    const total = bidLiq + askLiq;
    this.value  = total > 0 ? (bidLiq - askLiq) / total : 0;

    if (this.value > 0.3)       this.signal = 'BULLISH';
    else if (this.value < -0.3) this.signal = 'BEARISH';
    else                        this.signal = 'NEUTRAL';

    // Prune far-away levels to prevent unbounded growth
    this._prune(mid, range * 10);
  }

  _prune(mid, maxRange) {
    for (const p of this._bids.keys()) {
      if (p < mid - maxRange) this._bids.delete(p);
    }
    for (const p of this._asks.keys()) {
      if (p > mid + maxRange) this._asks.delete(p);
    }
  }
}

module.exports = BidAskImbalance;
