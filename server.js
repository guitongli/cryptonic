'use strict';

/**
 * Cryptonic — Consolidated Backend
 * =================================
 * Single-file entry point that wires together:
 *   - StreamManager  (Binance WebSocket streams)
 *   - IndicatorEngine (all 16 indicators)
 *   - Express HTTP server  (REST + SSE)
 *
 * Endpoints
 * ---------
 *   GET /state        → one-shot JSON snapshot of all indicator values
 *   GET /stream       → Server-Sent Events stream (push on every aggTrade)
 *   GET /             → serves ./frontend/index.html (static)
 *
 * Indicators
 * ----------
 *   Existing  : TapePressure, CumulativeDelta, TradeRate, TradeAcceleration,
 *               LargeTradeFilter, VolumeClassifier, IcebergDetector,
 *               VolumeIntensity, BidAskImbalance, LiquidationFeed
 *   New       : VWAP, PriceStructure, Volume, OpenInterest,
 *               FundingRate, BTCCorrelation
 */

const EventEmitter = require('events');
const WebSocket    = require('ws');
const express      = require('express');
const path         = require('path');

// ── indicator imports ──────────────────────────────────────────────────────────

const TapePressure      = require('./indicators/TapePressure');
const CumulativeDelta   = require('./indicators/CumulativeDelta');
const TradeRate         = require('./indicators/TradeRate');
const TradeAcceleration = require('./indicators/TradeAcceleration');
const LargeTradeFilter  = require('./indicators/LargeTradeFilter');
const VolumeClassifier  = require('./indicators/VolumeClassifier');
const IcebergDetector   = require('./indicators/IcebergDetector');
const VolumeIntensity   = require('./indicators/VolumeIntensity');
const BidAskImbalance   = require('./indicators/BidAskImbalance');
const LiquidationFeed   = require('./indicators/LiquidationFeed');
// New
const VWAP              = require('./indicators/VWAP');
const PriceStructure    = require('./indicators/PriceStructure');
const Volume            = require('./indicators/Volume');
const OpenInterest      = require('./indicators/OpenInterest');
const FundingRate       = require('./indicators/FundingRate');
const BTCCorrelation    = require('./indicators/BTCCorrelation');

// ══════════════════════════════════════════════════════════════════════════════
// StreamManager
// ══════════════════════════════════════════════════════════════════════════════

const STREAMS = {
  aggTrade:    'wss://fstream.binance.com/ws/ethusdt@aggTrade',
  depth:       'wss://fstream.binance.com/ws/ethusdt@depth@100ms',
  bookTicker:  'wss://fstream.binance.com/ws/ethusdt@bookTicker',
  kline:       'wss://fstream.binance.com/ws/ethusdt@kline_1m',
  forceOrder:  'wss://fstream.binance.com/ws/ethusdt@forceOrder',
  markPrice:   'wss://fstream.binance.com/ws/ethusdt@markPrice@1s',  // funding rate
  btcAggTrade: 'wss://fstream.binance.com/ws/btcusdt@aggTrade',      // BTC correlation
};

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS  = 30_000;

class StreamManager extends EventEmitter {
  constructor() {
    super();
    this._sockets = {};
    this._delays  = {};
    this._timers  = {};
    this._active  = false;
  }

  connect() {
    this._active = true;
    for (const [name, url] of Object.entries(STREAMS)) {
      this._delays[name] = RECONNECT_BASE_MS;
      this._open(name, url);
    }
  }

  disconnect() {
    this._active = false;
    for (const name of Object.keys(this._sockets)) {
      clearTimeout(this._timers[name]);
      const ws = this._sockets[name];
      ws.removeAllListeners();
      ws.terminate();
    }
    this._sockets = {};
    this._timers  = {};
  }

  _open(name, url) {
    console.log(`[Stream] Connecting  ${name}`);
    const ws = new WebSocket(url);
    this._sockets[name] = ws;

    ws.on('open', () => {
      console.log(`[Stream] Connected   ${name}`);
      this._delays[name] = RECONNECT_BASE_MS;
    });

    ws.on('message', (raw) => {
      try { this.emit(name, JSON.parse(raw)); }
      catch (err) { console.error(`[Stream] Parse error on ${name}:`, err.message); }
    });

    ws.on('error', (err) => {
      console.error(`[Stream] Error on    ${name}: ${err.message}`);
    });

    ws.on('close', (code) => {
      if (!this._active) return;
      const delay = this._delays[name];
      console.log(`[Stream] Closed      ${name} (${code}). Reconnecting in ${delay}ms…`);
      this._delays[name] = Math.min(delay * 2, RECONNECT_MAX_MS);
      this._timers[name] = setTimeout(() => this._open(name, url), delay);
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// IndicatorEngine
// ══════════════════════════════════════════════════════════════════════════════

class IndicatorEngine extends EventEmitter {
  constructor(stream) {
    super();
    this._stream = stream;

    // ── existing indicators ────────────────────────────────────────────────
    this._tape          = new TapePressure();
    this._cumDelta      = new CumulativeDelta();
    this._tradeRate     = new TradeRate();
    this._tradeAccel    = new TradeAcceleration();
    this._largeTrade    = new LargeTradeFilter();
    this._volClassifier = new VolumeClassifier();
    this._iceberg       = new IcebergDetector();
    this._volIntensity  = new VolumeIntensity();
    this._bidAskImbal   = new BidAskImbalance();
    this._liqFeed       = new LiquidationFeed();

    // ── new indicators ─────────────────────────────────────────────────────
    this._vwap          = new VWAP();
    this._priceStruct   = new PriceStructure();
    this._volume        = new Volume();
    this._openInterest  = new OpenInterest('ETHUSDT', 10_000);
    this._fundingRate   = new FundingRate();
    this._btcCorr       = new BTCCorrelation();

    // ── state snapshot ─────────────────────────────────────────────────────
    this._state = {
      // existing
      tapePressure:      {},
      cumulativeDelta:   {},
      tradeRate:         {},
      tradeAcceleration: {},
      largeTradeFilter:  {},
      volumeClassifier:  {},
      icebergDetector:   {},
      volumeIntensity:   {},
      bidAskImbalance:   {},
      liquidationFeed:   {},
      bookTicker:        null,
      kline:             null,
      depth:             null,
      lastLiquidation:   null,
      // new
      vwap:              {},
      priceStructure:    {},
      volume:            {},
      openInterest:      {},
      fundingRate:       {},
      btcCorrelation:    {},
      timestamp:         null,
    };

    this._bindStreams();
  }

  // ── public ─────────────────────────────────────────────────────────────────

  start() {
    this._stream.connect();
    this._openInterest.start();
    console.log('[Engine] Started — waiting for stream data…');
  }

  stop() {
    this._stream.disconnect();
    this._openInterest.stop();
    console.log('[Engine] Stopped.');
  }

  getState() {
    // Merge live-polled values that don't come from stream events
    this._state.openInterest = this._openInterest.getState();
    return this._state;
  }

  // ── stream bindings ────────────────────────────────────────────────────────

  _bindStreams() {
    this._stream.on('aggTrade',    msg => this._onAggTrade(msg));
    this._stream.on('bookTicker',  msg => this._onBookTicker(msg));
    this._stream.on('kline',       msg => this._onKline(msg));
    this._stream.on('forceOrder',  msg => this._onForceOrder(msg));
    this._stream.on('depth',       msg => this._onDepth(msg));
    this._stream.on('markPrice',   msg => this._onMarkPrice(msg));
    this._stream.on('btcAggTrade', msg => this._onBtcAggTrade(msg));
  }

  _onAggTrade(trade) {
    this._tape.update(trade);
    this._cumDelta.update(trade);
    this._vwap.update(trade);

    const rate = this._tradeRate.update(trade);
    this._tradeAccel.update(rate);

    const largeTrade = this._largeTrade.update(trade);
    this._volClassifier.update(trade);

    const iceberg = this._iceberg.update(trade);

    this._volIntensity.update(trade);
    this._btcCorr.updateETH(parseFloat(trade.p));

    if (largeTrade.flagged) {
      console.log(
        `[LargeTrade] ${largeTrade.side} ${largeTrade.volume} ETH @ ${largeTrade.price}` +
        `  (~$${largeTrade.notional.toLocaleString()})`
      );
    }
    if (iceberg.detected) {
      console.log(
        `[Iceberg] ${iceberg.side} ${iceberg.count}× ${iceberg.qty} ETH @ ${iceberg.price}`
      );
    }

    this._rebuildState();
    this.emit('update', this._state);
  }

  _onBookTicker(msg) {
    this._state.bookTicker = {
      bestBid:    parseFloat(msg.b),
      bestBidQty: parseFloat(msg.B),
      bestAsk:    parseFloat(msg.a),
      bestAskQty: parseFloat(msg.A),
      spread:     +(parseFloat(msg.a) - parseFloat(msg.b)).toFixed(4),
    };
  }

  _onKline(msg) {
    const k = msg.k;
    const kline = {
      open:         parseFloat(k.o),
      high:         parseFloat(k.h),
      low:          parseFloat(k.l),
      close:        parseFloat(k.c),
      volume:       parseFloat(k.v),
      takerBuyVol:  parseFloat(k.V),
      tradeCount:   k.n,
      closed:       k.x,
      intervalMs:   k.T - k.t,
    };
    this._state.kline = kline;
    this._priceStruct.update(kline);
    this._volume.update(kline);
    this._state.priceStructure = this._priceStruct.getState();
    this._state.volume         = this._volume.getState();
  }

  _onDepth(msg) {
    this._state.depth = {
      bids: (msg.b || []).slice(0, 5),
      asks: (msg.a || []).slice(0, 5),
      ts:   msg.T || Date.now(),
    };
    this._bidAskImbal.update(msg);
    this._state.bidAskImbalance = this._bidAskImbal.getState();
  }

  _onMarkPrice(msg) {
    this._fundingRate.update(msg);
    this._state.fundingRate = this._fundingRate.getState();
  }

  _onBtcAggTrade(trade) {
    this._btcCorr.updateBTC(parseFloat(trade.p));
    this._state.btcCorrelation = this._btcCorr.getState();
  }

  _onForceOrder(msg) {
    const o        = msg.o;
    const notional = +(parseFloat(o.q) * parseFloat(o.ap)).toFixed(2);

    console.log(
      `[Liquidation] ${o.S} ${o.q} ETH @ avg ${o.ap}  (~$${notional.toLocaleString()})`
    );

    this._state.lastLiquidation = {
      side:     o.S,
      quantity: parseFloat(o.q),
      price:    parseFloat(o.p),
      avgPrice: parseFloat(o.ap),
      notional,
      status:   o.X,
      ts:       Date.now(),
    };

    const liqResult = this._liqFeed.update(msg);
    this._state.liquidationFeed = this._liqFeed.getState();

    if (liqResult.cascade) {
      console.log(
        `[CascadeAlert] ${liqResult.signal} — ${this._liqFeed._history.length} liquidations ` +
        `(${liqResult.side}) in ${this._liqFeed.cascadeWindowMs / 1000}s`
      );
    }

    this.emit('liquidation', this._state.lastLiquidation);
  }

  _rebuildState() {
    this._state.tapePressure      = this._tape.getState();
    this._state.cumulativeDelta   = this._cumDelta.getState();
    this._state.tradeRate         = this._tradeRate.getState();
    this._state.tradeAcceleration = this._tradeAccel.getState();
    this._state.largeTradeFilter  = this._largeTrade.getState();
    this._state.volumeClassifier  = this._volClassifier.getState();
    this._state.icebergDetector   = this._iceberg.getState();
    this._state.volumeIntensity   = this._volIntensity.getState();
    this._state.vwap              = this._vwap.getState();
    this._state.btcCorrelation    = this._btcCorr.getState();
    this._state.openInterest      = this._openInterest.getState();
    this._state.timestamp         = Date.now();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HTTP Server
// ══════════════════════════════════════════════════════════════════════════════

const PORT   = parseInt(process.env.PORT || '3000', 10);
const stream = new StreamManager();
const engine = new IndicatorEngine(stream);

const app = express();

// CORS — allows the frontend to be served from a different dev port
app.use((_req, res, next) => {
  res.set('Access-Control-Allow-Origin',  '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Static frontend
app.use(express.static(path.join(__dirname, 'frontend')));

/**
 * GET /state
 * One-shot JSON snapshot of all indicator values.
 */
app.get('/state', (_req, res) => {
  res.json(engine.getState());
});

/**
 * GET /stream
 * Server-Sent Events — pushes a state update on every aggTrade tick.
 * Frontend connects once and receives live updates without polling.
 *
 * Event format:  data: <JSON>\n\n
 */
app.get('/stream', (req, res) => {
  res.set({
    'Content-Type':                'text/event-stream',
    'Cache-Control':               'no-cache',
    'Connection':                  'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  res.flushHeaders();

  // Send current state immediately so the client doesn't wait for next trade
  res.write(`data: ${JSON.stringify(engine.getState())}\n\n`);

  const onUpdate = (state) => res.write(`data: ${JSON.stringify(state)}\n\n`);
  engine.on('update', onUpdate);

  req.on('close', () => {
    engine.off('update', onUpdate);
  });
});

app.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
  console.log(`[Server] GET /state   → indicator snapshot (JSON)`);
  console.log(`[Server] GET /stream  → live SSE feed`);
  console.log(`[Server] GET /        → frontend`);
});

// ── start engine ───────────────────────────────────────────────────────────────

engine.start();

// ── periodic console summary (every 5 s) ──────────────────────────────────────

setInterval(() => {
  const s = engine.getState();
  if (!s.timestamp) return;

  const tape    = s.tapePressure?.value?.toFixed(3)          ?? '—';
  const delta   = s.cumulativeDelta?.delta?.toFixed(2)        ?? '—';
  const rate    = s.tradeRate?.rate?.toFixed(1)               ?? '—';
  const vwap    = s.vwap?.vwap?.toFixed(2)                   ?? '—';
  const vwapSig = s.vwap?.signal                             ?? '—';
  const oi      = s.openInterest?.openInterest?.toFixed(0)    ?? '—';
  const oiSig   = s.openInterest?.signal                     ?? '—';
  const funding = s.fundingRate?.rate != null
    ? `${(s.fundingRate.rate * 100).toFixed(4)}%`            : '—';
  const corr    = s.btcCorrelation?.correlation?.toFixed(3)   ?? '—';
  const corrSig = s.btcCorrelation?.signal                   ?? '—';
  const trend   = s.priceStructure?.trend                    ?? '—';
  const volSig  = s.volume?.signal                           ?? '—';
  const imbal   = s.bidAskImbalance?.value?.toFixed(3)        ?? '—';

  console.log(
    `[Snapshot] tape=${tape}  Δ=${delta}  rate=${rate}tps  ` +
    `VWAP=${vwap}(${vwapSig})  OI=${oi}(${oiSig})  ` +
    `fund=${funding}(${s.fundingRate?.signal ?? '—'})  ` +
    `BTCcorr=${corr}(${corrSig})  trend=${trend}  ` +
    `vol=${volSig}  imbal=${imbal}`
  );
}, 5000);

// ── graceful shutdown ──────────────────────────────────────────────────────────

function shutdown(signal) {
  console.log(`\n[Server] ${signal} received — shutting down…`);
  engine.stop();
  process.exit(0);
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
