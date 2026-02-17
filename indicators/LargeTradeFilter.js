'use strict';

/**
 * LargeTradeFilter
 * Flags aggTrades whose quantity meets or exceeds a configurable threshold.
 * Keeps a rolling 60-second history of flagged trades.
 *
 * threshold (default 50) is in the base asset units (ETH for ETHUSDT).
 */
class LargeTradeFilter {
  constructor(threshold = 50, historyMs = 60_000) {
    this.threshold  = threshold;
    this.historyMs  = historyMs;
    this._history   = []; // recent large trades
    this.lastFlagged = null;
  }

  update(trade) {
    const vol   = parseFloat(trade.q);
    const price = parseFloat(trade.p);

    if (vol < this.threshold) {
      return { flagged: false };
    }

    const now    = Date.now();
    const isBuy  = !trade.m;
    const record = {
      ts:      now,
      side:    isBuy ? 'BUY' : 'SELL',
      price,
      volume:  vol,
      notional: +(vol * price).toFixed(2),
      flagged: true,
    };

    this._history.push(record);
    this._evict(now);
    this.lastFlagged = record;

    return record;
  }

  getState() {
    const now = Date.now();
    this._evict(now);
    return {
      threshold: this.threshold,
      count:     this._history.length,
      last5:     this._history.slice(-5),
    };
  }

  _evict(now) {
    const cutoff = now - this.historyMs;
    let i = 0;
    while (i < this._history.length && this._history[i].ts < cutoff) i++;
    if (i > 0) this._history.splice(0, i);
  }
}

module.exports = LargeTradeFilter;
