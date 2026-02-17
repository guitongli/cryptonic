'use strict';

const express        = require('express');
const StreamManager  = require('./StreamManager');
const IndicatorEngine = require('./IndicatorEngine');

const PORT = parseInt(process.env.PORT || '3000', 10);

// ── core ───────────────────────────────────────────────────────────────────

const stream = new StreamManager();
const engine = new IndicatorEngine(stream);

// ── HTTP server ────────────────────────────────────────────────────────────

const app = express();

/**
 * GET /state
 * Returns the current indicator snapshot as JSON.
 * Used by the sonification layer to poll or stream values.
 */
app.get('/state', (_req, res) => {
  res.json(engine.getState());
});

app.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
  console.log(`[Server] GET /state  → indicator snapshot`);
});

// ── start ──────────────────────────────────────────────────────────────────

engine.start();

// Optional: periodic summary log every 5 s
setInterval(() => {
  const s = engine.getState();
  if (!s.timestamp) return; // no data yet

  const tape    = s.tapePressure?.value?.toFixed(3)   ?? '—';
  const delta   = s.cumulativeDelta?.delta?.toFixed(2) ?? '—';
  const rate    = s.tradeRate?.rate?.toFixed(1)         ?? '—';
  const accel   = s.tradeAcceleration?.acceleration?.toFixed(3) ?? '—';
  const spread  = s.bookTicker?.spread?.toFixed(4)      ?? '—';
  const price   = s.bookTicker
    ? `${s.bookTicker.bestBid} / ${s.bookTicker.bestAsk}`
    : '— / —';
  const volInt  = s.volumeIntensity?.value?.toFixed(2)   ?? '—';
  const volSig  = s.volumeIntensity?.signal              ?? '—';
  const imbal   = s.bidAskImbalance?.value?.toFixed(3)   ?? '—';
  const liqCasc = s.liquidationFeed?.cascade ? 'CASCADE' : '—';

  console.log(
    `[Snapshot] tape=${tape}  Δ=${delta}  rate=${rate}tps  accel=${accel}  ` +
    `spread=${spread}  bid/ask=${price}  volInt=${volInt}(${volSig})  ` +
    `imbal=${imbal}  liq=${liqCasc}`
  );
}, 5000);

// ── graceful shutdown ──────────────────────────────────────────────────────

function shutdown(signal) {
  console.log(`\n[Server] ${signal} received — shutting down…`);
  engine.stop();
  process.exit(0);
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
