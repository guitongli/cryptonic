'use strict';

/**
 * IcebergDetector
 * Detects iceberg orders by tracking repeated prints of the same size
 * at the same price within a sliding 5-second window.
 *
 * An "iceberg" is flagged when ≥ minRepeats prints share identical
 * (price, quantity) within the observation window.  Subsequent prints
 * that extend an already-flagged cluster are reported as updates so
 * the consumer can gauge how deep the iceberg is.
 *
 * Key:   `${price}_${qty}` — both rounded to 4 dp to absorb float noise.
 */
class IcebergDetector {
  constructor(windowMs = 5_000, minRepeats = 3) {
    this.windowMs   = windowMs;
    this.minRepeats = minRepeats;
    this._prints    = []; // { ts, key, price, qty, side }
    this._alerted   = new Map(); // key → { ts, count } — suppresses spam
  }

  update(trade) {
    const now   = Date.now();
    const price = parseFloat(trade.p);
    const qty   = parseFloat(trade.q);
    const isBuy = !trade.m;
    const key   = `${price.toFixed(4)}_${qty.toFixed(4)}`;

    this._prints.push({ ts: now, key, price, qty, side: isBuy ? 'BUY' : 'SELL' });
    this._evict(now);

    const cluster = this._prints.filter(p => p.key === key);
    if (cluster.length < this.minRepeats) {
      return { detected: false };
    }

    // De-duplicate: only fire a new alert once per window per key
    const prev = this._alerted.get(key);
    if (prev && now - prev.ts < this.windowMs && prev.count === cluster.length) {
      return { detected: false }; // same count as last alert — nothing new
    }

    const detection = {
      detected: true,
      price,
      qty,
      side:       cluster[cluster.length - 1].side,
      count:      cluster.length,
      windowMs:   this.windowMs,
      ts:         now,
    };

    this._alerted.set(key, { ts: now, count: cluster.length });

    // Prune stale alert keys
    for (const [k, v] of this._alerted) {
      if (now - v.ts > this.windowMs * 2) this._alerted.delete(k);
    }

    return detection;
  }

  getState() {
    const now     = Date.now();
    this._evict(now);

    // Summarise active clusters (those still within the window)
    const active = new Map();
    for (const p of this._prints) {
      if (!active.has(p.key)) {
        active.set(p.key, { price: p.price, qty: p.qty, side: p.side, count: 0 });
      }
      active.get(p.key).count++;
    }

    const clusters = [...active.values()]
      .filter(c => c.count >= this.minRepeats)
      .sort((a, b) => b.count - a.count);

    return { activeClusters: clusters };
  }

  _evict(now) {
    const cutoff = now - this.windowMs;
    let i = 0;
    while (i < this._prints.length && this._prints[i].ts < cutoff) i++;
    if (i > 0) this._prints.splice(0, i);
  }
}

module.exports = IcebergDetector;
