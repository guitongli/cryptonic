'use strict';

/**
 * Volume
 * Per-candle buy vs. sell volume breakdown sourced from 1-minute kline data.
 *
 * Binance kline provides:
 *   volume       → total candle volume (base asset)
 *   takerBuyVol  → taker-buy portion  (aggressive buys)
 *
 * Derived:
 *   sellVolume   = volume − takerBuyVol  (aggressive sells + maker fills)
 *   buyPercent   = takerBuyVol / volume  (0–1)
 *
 * Signal:
 *   BULLISH  — buy side > 60 % of candle volume
 *   BEARISH  — buy side < 40 % of candle volume
 *   NEUTRAL  — balanced
 *
 * Note: VolumeIntensity (rolling 10 s comparison to median) remains separate.
 */
class Volume {
  constructor() {
    this.totalVolume = 0;
    this.buyVolume   = 0;
    this.sellVolume  = 0;
    this.buyPercent  = 0.5;
    this.signal      = 'NEUTRAL';
    this.closed      = false;
  }

  /**
   * @param {Object} kline  — engine's kline state
   *   { open, high, low, close, volume, takerBuyVol, tradeCount, closed }
   */
  update(kline) {
    const total  = kline.volume      || 0;
    const buyVol = kline.takerBuyVol || 0;

    this.totalVolume = total;
    this.buyVolume   = buyVol;
    this.sellVolume  = total - buyVol;
    this.buyPercent  = total > 0 ? buyVol / total : 0.5;
    this.closed      = kline.closed || false;

    if (this.buyPercent > 0.6)       this.signal = 'BULLISH';
    else if (this.buyPercent < 0.4)  this.signal = 'BEARISH';
    else                             this.signal = 'NEUTRAL';
  }

  getState() {
    return {
      totalVolume: +this.totalVolume.toFixed(4),
      buyVolume:   +this.buyVolume.toFixed(4),
      sellVolume:  +this.sellVolume.toFixed(4),
      buyPercent:  +this.buyPercent.toFixed(4),
      signal:      this.signal,
      candleClosed: this.closed,
    };
  }
}

module.exports = Volume;
