'use strict';

/**
 * VolumeClassifier
 * Buckets each trade by quantity into predefined size tiers.
 *
 * Tiers (in base-asset units, ETH for ETHUSDT):
 *   micro  :   1 –   3
 *   small  :   4 –   7
 *   medium :   8 –  28
 *   large  :  29 –  57
 *   whale  :  58+
 *
 * sub-unit trades (< 1 ETH) are counted separately as 'dust'.
 * Counts are session-cumulative; call reset() to start fresh.
 */

const TIERS = [
  { label: 'micro',  min:  1, max:  3 },
  { label: 'small',  min:  4, max:  7 },
  { label: 'medium', min:  8, max: 28 },
  { label: 'large',  min: 29, max: 57 },
  { label: 'whale',  min: 58, max: Infinity },
];

class VolumeClassifier {
  constructor() {
    this._counts = { dust: 0, micro: 0, small: 0, medium: 0, large: 0, whale: 0 };
    this.sessionStart = Date.now();
  }

  update(trade) {
    const vol   = parseFloat(trade.q);
    const label = this._classify(vol);
    this._counts[label]++;
    return { vol, tier: label };
  }

  reset() {
    for (const k of Object.keys(this._counts)) this._counts[k] = 0;
    this.sessionStart = Date.now();
  }

  getState() {
    return {
      counts:       { ...this._counts },
      sessionStart: this.sessionStart,
    };
  }

  _classify(vol) {
    if (vol < 1) return 'dust';
    for (const tier of TIERS) {
      if (vol >= tier.min && vol <= tier.max) return tier.label;
    }
    return 'whale'; // safety fallback
  }
}

module.exports = VolumeClassifier;
