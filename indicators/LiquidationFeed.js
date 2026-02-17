'use strict';

/**
 * LiquidationFeed
 * Tracks raw liquidation events with size and direction.
 * Fires a CascadeAlert when 3+ liquidations in the same direction
 * occur within a 10-second window.
 *
 * Binance forceOrder sides:
 *   "SELL" → long position liquidated  → BEARISH signal
 *   "BUY"  → short position liquidated → BULLISH signal
 *
 * Output : last liquidation record + cascade boolean
 * Signal : BULLISH (short liqs cascade), BEARISH (long liqs cascade), NONE
 */
class LiquidationFeed {
  constructor(cascadeWindowMs = 10_000, cascadeMin = 3) {
    this.cascadeWindowMs = cascadeWindowMs;
    this.cascadeMin      = cascadeMin;
    this._history        = [];   // [{ ts, side, qty, price, notional }]
    this.lastLiquidation = null;
    this.cascade         = false;
    this.signal          = 'NONE';
  }

  /**
   * Call on every forceOrder message.
   * @param {Object} forceMsg  Binance forceOrder { o: { S, q, p, ap, X, … } }
   */
  update(forceMsg) {
    const now = Date.now();
    const o   = forceMsg.o;
    const qty   = parseFloat(o.q);
    const price = parseFloat(o.ap);

    const record = {
      ts:       now,
      side:     o.S,                       // "BUY" or "SELL"
      qty,
      price,
      notional: +(qty * price).toFixed(2),
    };

    this._history.push(record);
    this._evict(now);
    this.lastLiquidation = record;

    // Cascade detection: 3+ same-direction liquidations in window
    const sameSide = this._history.filter(e => e.side === record.side);
    this.cascade   = sameSide.length >= this.cascadeMin;

    // Signal: BUY-side liqs = shorts squeezed = bullish
    //         SELL-side liqs = longs flushed   = bearish
    if (this.cascade) {
      this.signal = record.side === 'BUY' ? 'BULLISH' : 'BEARISH';
    } else {
      this.signal = 'NONE';
    }

    return {
      ...record,
      cascade: this.cascade,
      signal:  this.signal,
    };
  }

  getState() {
    const now = Date.now();
    this._evict(now);
    return {
      lastLiquidation: this.lastLiquidation,
      cascade:         this.cascade,
      signal:          this.signal,
      cascadeWindowMs: this.cascadeWindowMs,
      recentCount:     this._history.length,
    };
  }

  _evict(now) {
    const cutoff = now - this.cascadeWindowMs;
    let i = 0;
    while (i < this._history.length && this._history[i].ts < cutoff) i++;
    if (i > 0) this._history.splice(0, i);
  }
}

module.exports = LiquidationFeed;
