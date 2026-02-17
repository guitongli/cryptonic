'use strict';

const EventEmitter = require('events');
const WebSocket = require('ws');

const STREAMS = {
  aggTrade:   'wss://fstream.binance.com/ws/ethusdt@aggTrade',
  depth:      'wss://fstream.binance.com/ws/ethusdt@depth@100ms',
  bookTicker: 'wss://fstream.binance.com/ws/ethusdt@bookTicker',
  kline:      'wss://fstream.binance.com/ws/ethusdt@kline_1m',
  forceOrder: 'wss://fstream.binance.com/ws/ethusdt@forceOrder',
};

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS  = 30000;

class StreamManager extends EventEmitter {
  constructor() {
    super();
    this._sockets  = {};   // name → WebSocket
    this._delays   = {};   // name → current reconnect delay (ms)
    this._timers   = {};   // name → reconnect setTimeout handle
    this._active   = false;
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

  // ── private ──────────────────────────────────────────────────────────────

  _open(name, url) {
    console.log(`[Stream] Connecting  ${name}`);
    const ws = new WebSocket(url);
    this._sockets[name] = ws;

    ws.on('open', () => {
      console.log(`[Stream] Connected   ${name}`);
      this._delays[name] = RECONNECT_BASE_MS; // reset backoff on success
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        this.emit(name, msg);
      } catch (err) {
        console.error(`[Stream] Parse error on ${name}:`, err.message);
      }
    });

    ws.on('error', (err) => {
      // 'close' will fire after 'error', so just log here
      console.error(`[Stream] Error on    ${name}: ${err.message}`);
    });

    ws.on('close', (code, reason) => {
      if (!this._active) return;
      const delay = this._delays[name];
      console.log(`[Stream] Closed      ${name} (${code}). Reconnecting in ${delay}ms…`);
      this._delays[name] = Math.min(delay * 2, RECONNECT_MAX_MS);
      this._timers[name] = setTimeout(() => this._open(name, url), delay);
    });
  }
}

module.exports = StreamManager;
