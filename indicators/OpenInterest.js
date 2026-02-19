'use strict';

const https = require('https');

/**
 * OpenInterest
 * Polls Binance Futures REST endpoint every `intervalMs` for open interest.
 *
 * Endpoint: GET https://fapi.binance.com/fapi/v1/openInterest?symbol=ETHUSDT
 *
 * Tracks:
 *   - Absolute OI in base asset (ETH)
 *   - Change since last poll (absolute + %)
 *
 * Signal:
 *   INCREASING  — OI rose > 1 % since last poll  (new positions opening)
 *   DECREASING  — OI fell > 1 % since last poll  (positions closing)
 *   STABLE      — within ±1 %
 *
 * Call start() to begin polling, stop() to cancel.
 */
class OpenInterest {
  constructor(symbol = 'ETHUSDT', intervalMs = 10_000) {
    this.symbol       = symbol;
    this.intervalMs   = intervalMs;
    this._timer       = null;
    this.openInterest = null;
    this.prevOI       = null;
    this.changePct    = 0;
    this.changeAbs    = 0;
    this.signal       = 'STABLE';
    this.lastFetchTs  = null;
  }

  start() {
    this._fetch();
    this._timer = setInterval(() => this._fetch(), this.intervalMs);
  }

  stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  getState() {
    return {
      openInterest: this.openInterest,
      changePct:    +this.changePct.toFixed(4),
      changeAbs:    +this.changeAbs.toFixed(4),
      signal:       this.signal,
      lastFetchTs:  this.lastFetchTs,
    };
  }

  // ── private ────────────────────────────────────────────────────────────────

  _fetch() {
    const url = `https://fapi.binance.com/fapi/v1/openInterest?symbol=${this.symbol}`;

    https.get(url, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          const oi   = parseFloat(json.openInterest);
          if (isNaN(oi)) return;

          this.prevOI      = this.openInterest;
          this.openInterest = oi;
          this.lastFetchTs  = Date.now();

          if (this.prevOI !== null && this.prevOI > 0) {
            this.changeAbs = oi - this.prevOI;
            this.changePct = (this.changeAbs / this.prevOI) * 100;
          } else {
            this.changeAbs = 0;
            this.changePct = 0;
          }

          if (this.changePct > 1)       this.signal = 'INCREASING';
          else if (this.changePct < -1) this.signal = 'DECREASING';
          else                          this.signal = 'STABLE';

        } catch (e) {
          console.error('[OpenInterest] Parse error:', e.message);
        }
      });
    }).on('error', err => console.error('[OpenInterest] Fetch error:', err.message));
  }
}

module.exports = OpenInterest;
