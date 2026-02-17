'use strict';

/**
 * TapePressure
 * Rolling 30-second buy/sell volume ratio normalised to [-1, +1].
 *
 *   +1 → all volume is aggressive buying
 *   -1 → all volume is aggressive selling
 *    0 → perfectly balanced
 *
 * In aggTrade messages:
 *   m = isBuyerMaker
 *   m = false → taker is buyer  (aggressive BUY)
 *   m = true  → taker is seller (aggressive SELL)
 */
class TapePressure {
  constructor(windowMs = 30_000) {
    this.windowMs = windowMs;
    this._window  = []; // [{ ts, buy, sell }]
    this.value    = 0;
  }

  update(trade) {
    const now  = Date.now();
    const vol  = parseFloat(trade.q);
    const isBuy = !trade.m;

    this._window.push({
      ts:   now,
      buy:  isBuy ? vol : 0,
      sell: isBuy ? 0   : vol,
    });

    this._evict(now);

    let totalBuy  = 0;
    let totalSell = 0;
    for (const e of this._window) {
      totalBuy  += e.buy;
      totalSell += e.sell;
    }

    const total = totalBuy + totalSell;
    this.value  = total > 0 ? (totalBuy - totalSell) / total : 0;
    return this.value;
  }

  getState() {
    return {
      value:    +this.value.toFixed(4),
      windowMs: this.windowMs,
    };
  }

  _evict(now) {
    const cutoff = now - this.windowMs;
    let i = 0;
    while (i < this._window.length && this._window[i].ts < cutoff) i++;
    if (i > 0) this._window.splice(0, i);
  }
}

module.exports = TapePressure;
