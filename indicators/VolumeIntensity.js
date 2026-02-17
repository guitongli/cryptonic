'use strict';

/**
 * VolumeIntensity
 * Current 10-second volume compared against a 20-period rolling median.
 *
 * Every 10 s the window volume is snapshotted into a circular history
 * of 20 periods.  The intensity ratio = currentWindowVol / median(history).
 *
 * Output : 0 to 3+ (1.0 = average, 2.0 = double average)
 * Signal : HIGH (> 1.5), LOW (< 0.5), NORMAL otherwise
 */
class VolumeIntensity {
  constructor(windowMs = 10_000, periods = 20) {
    this.windowMs = windowMs;
    this.periods  = periods;
    this._window  = [];          // [{ ts, vol }] — current 10 s trades
    this._history = [];          // completed period volumes (up to `periods`)
    this._lastSampleTs = Date.now();
    this.value    = 0;
    this.signal   = 'NORMAL';
  }

  update(trade) {
    const now = Date.now();
    const vol = parseFloat(trade.q);

    this._window.push({ ts: now, vol });
    this._evict(now);

    // When a full period has elapsed, snapshot window volume into history
    if (now - this._lastSampleTs >= this.windowMs) {
      const periodVol = this._currentVolume();
      this._history.push(periodVol);
      if (this._history.length > this.periods) {
        this._history.shift();
      }
      this._lastSampleTs = now;
    }

    const currentVol = this._currentVolume();
    const median     = this._median();

    this.value = median > 0 ? currentVol / median : 0;

    if (this.value > 1.5)      this.signal = 'HIGH';
    else if (this.value < 0.5) this.signal = 'LOW';
    else                       this.signal = 'NORMAL';

    return this.value;
  }

  getState() {
    return {
      value:    +this.value.toFixed(4),
      signal:   this.signal,
      windowMs: this.windowMs,
      periods:  this.periods,
    };
  }

  _currentVolume() {
    let sum = 0;
    for (const e of this._window) sum += e.vol;
    return sum;
  }

  _median() {
    if (this._history.length === 0) return 0;
    const sorted = [...this._history].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  _evict(now) {
    const cutoff = now - this.windowMs;
    let i = 0;
    while (i < this._window.length && this._window[i].ts < cutoff) i++;
    if (i > 0) this._window.splice(0, i);
  }
}

module.exports = VolumeIntensity;
