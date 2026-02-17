'use strict';

const EventEmitter = require('events');

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

/**
 * IndicatorEngine
 *
 * Wires StreamManager events to indicator modules and aggregates their
 * outputs into a single state snapshot.  Emits 'update' on every
 * aggTrade message; emits 'liquidation' on every forceOrder message.
 *
 * Usage:
 *   const engine = new IndicatorEngine(streamManager);
 *   engine.start();
 *   engine.on('update', state => { … });
 *   engine.getState();  // synchronous snapshot (used by /state endpoint)
 */
class IndicatorEngine extends EventEmitter {
  constructor(streamManager) {
    super();
    this._stream = streamManager;

    // ── indicator instances ─────────────────────────────────────────────────
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

    // ── shared state snapshot ───────────────────────────────────────────────
    this._state = {
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
      lastLiquidation:   null,
      timestamp:         null,
    };

    this._bindStreams();
  }

  // ── public ─────────────────────────────────────────────────────────────────

  start() {
    this._stream.connect();
    console.log('[Engine] Started — waiting for stream data…');
  }

  stop() {
    this._stream.disconnect();
    console.log('[Engine] Stopped.');
  }

  getState() {
    return this._state;
  }

  // ── private ────────────────────────────────────────────────────────────────

  _bindStreams() {
    this._stream.on('aggTrade',   msg => this._onAggTrade(msg));
    this._stream.on('bookTicker', msg => this._onBookTicker(msg));
    this._stream.on('kline',      msg => this._onKline(msg));
    this._stream.on('forceOrder', msg => this._onForceOrder(msg));
    // depth stream is consumed raw and stored as-is (e.g. for future spread calc)
    this._stream.on('depth',      msg => this._onDepth(msg));
  }

  _onAggTrade(trade) {
    // Run every tape-flow indicator
    this._tape.update(trade);
    this._cumDelta.update(trade);

    const rate = this._tradeRate.update(trade);
    this._tradeAccel.update(rate);

    const largeTrade  = this._largeTrade.update(trade);
    this._volClassifier.update(trade);

    const iceberg = this._iceberg.update(trade);

    this._volIntensity.update(trade);

    // Console alerts
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
    this._state.kline = {
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
  }

  _onDepth(msg) {
    // Store best bid/ask from depth update for future use
    // (bookTicker is more granular, so this is supplementary)
    this._state.depth = {
      bids: (msg.b || []).slice(0, 5),
      asks: (msg.a || []).slice(0, 5),
      ts:   msg.T || Date.now(),
    };

    this._bidAskImbal.update(msg);
    this._state.bidAskImbalance = this._bidAskImbal.getState();
  }

  _onForceOrder(msg) {
    const o = msg.o;
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
    this._state.timestamp         = Date.now();
  }
}

module.exports = IndicatorEngine;
