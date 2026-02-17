'use strict';

/**
 * TradeAcceleration
 * Rate-of-change of TradeRate, sampled at a configurable interval.
 *
 * acceleration = ΔTPS / Δt  (trades/s²)
 *
 * Positive → trade activity is speeding up.
 * Negative → trade activity is slowing down.
 */
class TradeAcceleration {
  constructor(sampleIntervalMs = 1000) {
    this.sampleIntervalMs = sampleIntervalMs;
    this.acceleration     = 0;
    this._prevRate        = 0;
    this._prevSampleTs    = Date.now();
  }

  /**
   * Call this every time TradeRate.update() returns a new value.
   * @param {number} currentRate  — latest trades/s from TradeRate
   */
  update(currentRate) {
    const now     = Date.now();
    const elapsed = now - this._prevSampleTs;

    if (elapsed >= this.sampleIntervalMs) {
      const dt          = elapsed / 1000; // seconds
      this.acceleration = (currentRate - this._prevRate) / dt;
      this._prevRate    = currentRate;
      this._prevSampleTs = now;
    }

    return this.acceleration;
  }

  getState() {
    return {
      acceleration:     +this.acceleration.toFixed(4),
      sampleIntervalMs: this.sampleIntervalMs,
    };
  }
}

module.exports = TradeAcceleration;
