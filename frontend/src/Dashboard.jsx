import { useState, useEffect, useRef, useCallback, memo } from 'react'

// ─── Keyframe animations (only @keyframes here, everything else via Tailwind) ─
const GLOBAL_STYLES = `
  @keyframes orbPulse {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(var(--orb-scale, 1.1)); }
  }
  @keyframes liveDot {
    0%, 100% { opacity: 1;   box-shadow: 0 0 6px 3px #22c55e; }
    50%      { opacity: 0.2; box-shadow: none; }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
`

// ─── Colour helpers ────────────────────────────────────────────────────────────
function lerpColor(score) {
  const t = (Math.max(-1, Math.min(1, score)) + 1) / 2
  const r = Math.round(239 + (34  - 239) * t)
  const g = Math.round(68  + (197 - 68)  * t)
  const b = Math.round(68  + (94  - 68)  * t)
  return { rgb: `rgb(${r},${g},${b})`, hex: `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}` }
}

function flowLabel(score) {
  if (score >  0.6) return ['STRONG BUYING PRESSURE',  '#22c55e']
  if (score >  0.2) return ['BUYING PRESSURE',          '#22c55e']
  if (score > -0.2) return ['NEUTRAL',                  '#6b7280']
  if (score > -0.6) return ['SELLING PRESSURE',         '#ef4444']
  return               ['STRONG SELLING PRESSURE',  '#ef4444']
}

function fmtUSD(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function fmtTime(ms) {
  return new Date(ms).toTimeString().slice(0, 8)
}

// ─── SVG arc helpers ──────────────────────────────────────────────────────────
// Math convention: 0°=right, 90°=up (SVG y is flipped so we negate sin)
function polarXY(cx, cy, r, deg) {
  const rad = deg * Math.PI / 180
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }
}

// Produces an SVG arc path along the UPPER semicircle (sweep=1 clockwise in screen)
function arcD(cx, cy, r, startDeg, endDeg) {
  const s = polarXY(cx, cy, r, startDeg)
  const e = polarXY(cx, cy, r, endDeg)
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
  return `M${s.x.toFixed(2)},${s.y.toFixed(2)} A${r},${r} 0 ${large},1 ${e.x.toFixed(2)},${e.y.toFixed(2)}`
}

// ─── SSE hook ─────────────────────────────────────────────────────────────────
function useSSE() {
  const [sseData,      setSseData]      = useState(null)
  const [deltaHistory, setDeltaHistory] = useState([])

  useEffect(() => {
    let es
    const connect = () => {
      es = new EventSource('http://localhost:3000/stream')
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          setSseData(data)
          setDeltaHistory(prev => {
            const next = [...prev, data.cumulativeDelta]
            return next.length > 100 ? next.slice(-100) : next
          })
        } catch (_) { /* ignore parse errors */ }
      }
      es.onerror = () => { es.close(); setTimeout(connect, 2000) }
    }
    connect()
    return () => es && es.close()
  }, [])

  return { sseData, deltaHistory }
}

// ─── Tape WebSocket hook ───────────────────────────────────────────────────────
function useTapeWS() {
  const [trades, setTrades] = useState([])
  const [tps,    setTps]    = useState(0)
  const tpsCountRef = useRef(0)

  useEffect(() => {
    let ws
    let reconnectTimer

    const connect = () => {
      ws = new WebSocket('wss://fstream.binance.com/ws/ethusdt@aggTrade')
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        const trade = {
          id:    msg.a,
          price: parseFloat(msg.p),
          qty:   parseFloat(msg.q),
          isBuy: !msg.m,
          time:  msg.T,
        }
        tpsCountRef.current++
        setTrades(prev => [trade, ...prev].slice(0, 100))
      }
      ws.onclose = () => { reconnectTimer = setTimeout(connect, 1000) }
      ws.onerror = () =>  ws.close()
    }

    connect()
    const tpsInterval = setInterval(() => {
      setTps(tpsCountRef.current)
      tpsCountRef.current = 0
    }, 1000)

    return () => {
      ws && ws.close()
      clearTimeout(reconnectTimer)
      clearInterval(tpsInterval)
    }
  }, [])

  return { trades, tps }
}

// ─── SemicircleGauge ──────────────────────────────────────────────────────────
// viewBox 0 0 200 100  center=(100,90)  r=75  needle rotates via CSS transform
function SemicircleGauge({ value = 0, signal = null, connecting = false }) {
  const cx = 100, cy = 90, r = 75, sw = 14, nl = 60
  const val       = connecting ? 0 : Math.max(-1, Math.min(1, value))
  // rotation: value=-1 → -90° (left), value=0 → 0° (up), value=+1 → +90° (right)
  const rotateDeg = val * 90
  const sigColor  = signal === 'BULLISH' ? '#22c55e' : signal === 'BEARISH' ? '#ef4444' : '#6b7280'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg viewBox="0 0 200 100" style={{ width: '100%', maxHeight: '90px' }}>
        {/* Track */}
        <path d={arcD(cx, cy, r, 180, 0)} fill="none" stroke="#1f2937" strokeWidth={sw} />
        {/* Red left third */}
        <path d={arcD(cx, cy, r, 180, 120)} fill="none" stroke="#ef4444" strokeWidth={sw} opacity="0.75" />
        {/* Yellow centre third */}
        <path d={arcD(cx, cy, r, 120, 60)}  fill="none" stroke="#eab308" strokeWidth={sw} opacity="0.75" />
        {/* Green right third */}
        <path d={arcD(cx, cy, r, 60, 0)}    fill="none" stroke="#22c55e" strokeWidth={sw} opacity="0.75" />
        {/* Needle — CSS transform rotates around centre (cx,cy) */}
        <g style={{
          transform: `rotate(${rotateDeg}deg)`,
          transformOrigin: `${cx}px ${cy}px`,
          transition: 'transform 300ms ease',
        }}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - nl}
            stroke="white" strokeWidth="2" strokeLinecap="round" />
        </g>
        {/* Hub dot */}
        <circle cx={cx} cy={cy} r="4" fill="white" />
      </svg>
      {/* Value */}
      <span style={{ color: connecting ? '#4b5563' : 'white', fontSize: '12px', transition: 'all 300ms', marginTop: '-4px' }}>
        {connecting ? '—' : val.toFixed(2)}
      </span>
      {/* Signal */}
      <span style={{ color: connecting ? '#4b5563' : sigColor, fontSize: '10px', letterSpacing: '0.1em', marginTop: '2px' }}>
        {connecting ? 'CONNECTING...' : (signal || 'NEUTRAL')}
      </span>
    </div>
  )
}

// ─── VolumeBar ────────────────────────────────────────────────────────────────
function VolumeBar({ value = 1, signal = null, connecting = false }) {
  const fillPct  = connecting ? 0 : Math.min(value / 3, 1) * 100
  const barColor = connecting ? '#374151'
    : value < 0.5  ? '#3b82f6'
    : value > 1.5  ? '#f59e0b'
    : '#ffffff'
  const sigColor = signal === 'HIGH' ? '#f59e0b' : signal === 'LOW' ? '#3b82f6' : '#6b7280'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      {/* Bar */}
      <div style={{ position: 'relative', width: '28px', height: '75px', backgroundColor: '#1a1a1a', borderRadius: '2px' }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${fillPct}%`,
          backgroundColor: barColor,
          borderRadius: '2px',
          transition: 'height 300ms ease, background-color 300ms ease',
        }} />
        {/* 1× baseline dashed marker */}
        <div style={{
          position: 'absolute', left: 0, right: 0,
          bottom: `${(1 / 3) * 100}%`,
          borderTop: '1px dashed #4b5563',
        }} />
      </div>
      <span style={{ color: 'white', fontSize: '12px', transition: 'all 300ms' }}>
        {connecting ? '—' : `${value.toFixed(1)}x`}
      </span>
      <span style={{ color: connecting ? '#4b5563' : sigColor, fontSize: '10px', letterSpacing: '0.1em' }}>
        {connecting ? 'CONNECTING...' : (signal || 'NORMAL')}
      </span>
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ midPrice, connecting }) {
  return (
    <div style={{
      height: '60px', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px',
      backgroundColor: '#111111',
      borderBottom: '1px solid #1a1a1a',
    }}>
      {/* Brand */}
      <span style={{ color: 'white', fontWeight: 'bold', fontSize: '15px', letterSpacing: '0.06em' }}>
        TradeSonic
      </span>
      {/* Symbol */}
      <span style={{ color: '#6b7280', fontSize: '12px', letterSpacing: '0.18em' }}>
        ETH-USDT-PERP
      </span>
      {/* Live price */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: 'white', fontSize: '15px', fontWeight: 'bold', transition: 'all 300ms' }}>
          {connecting || !midPrice
            ? '—'
            : midPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%',
          backgroundColor: '#22c55e', display: 'inline-block',
          animation: 'liveDot 1.5s ease-in-out infinite',
        }} />
        <span style={{ color: '#22c55e', fontSize: '10px', letterSpacing: '0.12em' }}>LIVE</span>
      </div>
    </div>
  )
}

// ─── HeroOrb ──────────────────────────────────────────────────────────────────
function HeroOrb({ score = 0, urgency = 0, connecting = false }) {
  const { rgb, hex } = connecting ? { rgb: '#333333', hex: '#333333' } : lerpColor(score)
  const [label, labelColor] = connecting ? ['CONNECTING...', '#6b7280'] : flowLabel(score)
  const orbScale = (1 + (connecting ? 0.05 : urgency * 0.22)).toFixed(3)
  const duration = (connecting ? 2 : 3 - urgency * 2.4).toFixed(2)
  const scoreStr = connecting ? '—' : (score >= 0 ? '+' : '') + score.toFixed(2)

  return (
    <div style={{
      height: '40vh', flexShrink: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#0f0f0f',
    }}>
      {/* Orb */}
      <div style={{
        width: '180px', height: '180px', borderRadius: '50%',
        backgroundColor: rgb,
        boxShadow: `0 0 70px 25px ${hex}33`,
        animation: `orbPulse ${duration}s ease-in-out infinite`,
        '--orb-scale': orbScale,
        transition: 'background-color 500ms ease, box-shadow 500ms ease',
      }} />
      {/* Score */}
      <div style={{
        fontSize: '46px', fontWeight: 'bold', letterSpacing: '-0.02em',
        color: connecting ? '#6b7280' : 'white',
        marginTop: '28px',
        transition: 'all 300ms',
      }}>
        {scoreStr}
      </div>
      {/* Label */}
      <div style={{
        fontSize: '11px', letterSpacing: '0.22em',
        color: labelColor,
        marginTop: '10px',
      }}>
        {label}
      </div>
    </div>
  )
}

// ─── IndicatorRow ─────────────────────────────────────────────────────────────
function IndicatorRow({ sseData, connecting }) {
  const tp = sseData?.tapePressure    || { value: 0, signal: null }
  const ba = sseData?.bidAskImbalance || { value: 0, signal: null }
  const vi = sseData?.volumeIntensity || { value: 1, signal: null }

  const colStyle = (border) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    flex: 1, padding: '4px 6px',
    borderRight: border ? '1px solid #1a1a1a' : 'none',
  })

  return (
    <div style={{
      height: '160px', flexShrink: 0,
      display: 'flex',
      backgroundColor: '#111111',
      borderTop: '1px solid #1a1a1a',
    }}>
      <div style={colStyle(true)}>
        <span style={{ color: '#6b7280', fontSize: '9px', letterSpacing: '0.1em', marginBottom: '4px' }}>
          TAPE PRESSURE
        </span>
        <SemicircleGauge value={tp.value} signal={tp.signal} connecting={connecting} />
      </div>
      <div style={colStyle(true)}>
        <span style={{ color: '#6b7280', fontSize: '9px', letterSpacing: '0.1em', marginBottom: '4px' }}>
          BID/ASK IMBALANCE
        </span>
        <SemicircleGauge value={ba.value} signal={ba.signal} connecting={connecting} />
      </div>
      <div style={colStyle(false)}>
        <span style={{ color: '#6b7280', fontSize: '9px', letterSpacing: '0.1em', marginBottom: '4px' }}>
          VOLUME INTENSITY
        </span>
        <VolumeBar value={vi.value} signal={vi.signal} connecting={connecting} />
      </div>
    </div>
  )
}

// ─── CumulativeDelta ──────────────────────────────────────────────────────────
function CumulativeDelta({ history, connecting }) {
  const SVG_W = 500, SVG_H = 60, PAD = 4

  const current = history.length > 0 ? history[history.length - 1] : 0
  const prev10  = history.length >= 11 ? history[history.length - 11] : (history[0] ?? 0)
  const trending = current >= prev10
  const lineColor = connecting ? '#374151' : (trending ? '#22c55e' : '#ef4444')

  let linePts = `0,${SVG_H / 2} ${SVG_W},${SVG_H / 2}`
  let fillD   = ''
  let zeroLineY = SVG_H / 2

  if (!connecting && history.length >= 2) {
    const min   = Math.min(...history)
    const max   = Math.max(...history)
    const range = max - min || 1
    const norm  = (v) => SVG_H - PAD - ((v - min) / range) * (SVG_H - PAD * 2)
    zeroLineY   = Math.max(PAD, Math.min(SVG_H - PAD, norm(0)))

    const pts = history.map((v, i) => [
      ((i / (history.length - 1)) * SVG_W).toFixed(1),
      norm(v).toFixed(1),
    ])

    linePts = pts.map(([x, y]) => `${x},${y}`).join(' ')
    const [lx, ly] = pts[pts.length - 1]
    const [fx, fy] = pts[0]
    fillD = `M${fx},${fy} ` +
      pts.slice(1).map(([x, y]) => `L${x},${y}`).join(' ') +
      ` L${lx},${zeroLineY.toFixed(1)} L${fx},${zeroLineY.toFixed(1)} Z`
  }

  const arrow      = trending ? '↑' : '↓'
  const currentStr = connecting
    ? '—'
    : (current >= 0 ? '+' : '') + Math.round(current).toLocaleString()

  return (
    <div style={{
      height: '120px', flexShrink: 0,
      backgroundColor: '#0f0f0f',
      borderTop: '1px solid #1a1a1a',
      padding: '8px 12px',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Labels row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexShrink: 0 }}>
        <span style={{ color: '#6b7280', fontSize: '10px', letterSpacing: '0.1em' }}>CUMULATIVE DELTA</span>
        <span style={{ color: lineColor, fontSize: '12px', fontWeight: 'bold', transition: 'color 300ms' }}>
          {currentStr}{!connecting && ` ${arrow}`}
        </span>
      </div>
      {/* Sparkline */}
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="none"
        style={{ width: '100%', flex: 1 }}>
        {/* Zero line */}
        <line x1="0" y1={zeroLineY.toFixed(1)} x2={SVG_W} y2={zeroLineY.toFixed(1)}
          stroke="#374151" strokeWidth="1" strokeDasharray="6 4" />
        {/* Area fill */}
        {fillD && <path d={fillD} fill={lineColor} fillOpacity="0.18" />}
        {/* Line */}
        <polyline points={linePts} fill="none" stroke={lineColor} strokeWidth="1.5" />
      </svg>
    </div>
  )
}

// ─── TapeRow (memoised) ───────────────────────────────────────────────────────
const TapeRow = memo(function TapeRow({ trade, maxQty, isNewest }) {
  const { price, qty, isBuy, time } = trade
  const color    = isBuy ? '#22c55e' : '#ef4444'
  const barPct   = maxQty > 0 ? Math.min((qty / maxQty) * 100, 100) : 0
  const tier     = qty < 8 ? 1 : qty < 29 ? 2 : qty < 58 ? 3 : 4
  const bgAlpha  = [0, 0.03, 0.08, 0.15, 0.25][tier]
  const rowBg    = isBuy
    ? `rgba(34,197,94,${bgAlpha})`
    : `rgba(239,68,68,${bgAlpha})`
  const rowGlow  = tier === 4 ? `0 0 10px 2px ${color}30` : 'none'
  const fontSize = tier < 3 ? '11px' : tier === 3 ? '12px' : '13px'
  const weight   = tier >= 3 ? 'bold' : 'normal'
  const sizeTag  = ['', '●', '●●', '●●●', '●●●●'][tier]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '1px 10px',
      backgroundColor: rowBg,
      boxShadow: rowGlow,
      fontFamily: "'Courier New', monospace",
      fontSize,
      fontWeight: weight,
      minHeight: tier >= 3 ? '22px' : '17px',
      animation: isNewest ? 'slideIn 150ms ease-out' : 'none',
    }}>
      {/* Time */}
      <span style={{ color: '#4b5563', fontSize: '10px', whiteSpace: 'nowrap', minWidth: '58px' }}>
        {fmtTime(time)}
      </span>
      {/* Price */}
      <span style={{ color: 'white', whiteSpace: 'nowrap', minWidth: '70px', textAlign: 'right' }}>
        {price.toFixed(2)}
      </span>
      {/* Volume bar */}
      <div style={{ flex: 1, height: '7px', backgroundColor: '#1a1a1a', borderRadius: '2px', position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${barPct}%`,
          backgroundColor: color,
          borderRadius: '2px',
        }} />
      </div>
      {/* Qty */}
      <span style={{ color: '#6b7280', fontSize: '10px', whiteSpace: 'nowrap', minWidth: '36px', textAlign: 'right' }}>
        {qty.toFixed(2)}
      </span>
      {/* Size tier dots */}
      <span style={{ color: '#4b5563', fontSize: '9px', minWidth: '22px' }}>{sizeTag}</span>
      {/* Direction */}
      <span style={{ color, fontSize: '10px', fontWeight: 'bold', minWidth: '32px' }}>
        {isBuy ? 'BUY' : 'SELL'}
      </span>
    </div>
  )
})

// ─── TapeFeed ─────────────────────────────────────────────────────────────────
function TapeFeed({ trades, tps }) {
  const containerRef  = useRef(null)
  const autoScrollRef = useRef(true)
  const resumeTimer   = useRef(null)
  const connecting    = trades.length === 0
  const maxQty        = trades.length > 0 ? Math.max(...trades.map(t => t.qty)) : 1

  // Scroll to top on new trade if auto-scroll is enabled
  useEffect(() => {
    if (autoScrollRef.current && containerRef.current) {
      containerRef.current.scrollTop = 0
    }
  }, [trades])

  const onMouseEnter = useCallback(() => {
    clearTimeout(resumeTimer.current)
    autoScrollRef.current = false
  }, [])

  const onMouseLeave = useCallback(() => {
    resumeTimer.current = setTimeout(() => { autoScrollRef.current = true }, 3000)
  }, [])

  return (
    <div style={{
      flex: 1, minHeight: 0,
      display: 'flex', flexDirection: 'column',
      backgroundColor: '#0a0a0a',
      borderLeft: '1px solid #1a1a1a',
    }}>
      {/* Sticky header */}
      <div style={{
        flexShrink: 0,
        backgroundColor: '#111111',
        borderBottom: '1px solid #1a1a1a',
        padding: '8px 10px 5px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#9ca3af', fontSize: '11px', letterSpacing: '0.1em' }}>
            TAPE&nbsp;&nbsp;•&nbsp;&nbsp;ETH-USDT-PERP
          </span>
          <span style={{ color: '#22c55e', fontSize: '11px', fontWeight: 'bold' }}>
            {tps.toFixed(1)}/s
          </span>
        </div>
        <div style={{ color: '#374151', fontSize: '9px', marginTop: '4px', letterSpacing: '0.04em' }}>
          ● 1-7&nbsp;&nbsp;&nbsp;●● 8-28&nbsp;&nbsp;&nbsp;●●● 29-57&nbsp;&nbsp;&nbsp;●●●● 58+
        </div>
      </div>

      {/* Scrollable list */}
      <div
        ref={containerRef}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="scrollbar-hide"
        style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
      >
        {connecting ? (
          <div style={{ padding: '12px 10px', color: '#374151', fontSize: '11px' }}>
            Connecting to market feed...
          </div>
        ) : (
          trades.map((trade, i) => (
            <TapeRow
              key={trade.id}
              trade={trade}
              maxQty={maxQty}
              isNewest={i === 0}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─── LiquidationFeed ──────────────────────────────────────────────────────────
function LiquidationFeed({ events = [], cascade = false }) {
  const recent = [...events].slice(-4).reverse()

  return (
    <div style={{
      height: '160px', flexShrink: 0,
      backgroundColor: '#0a0a0a',
      borderTop: '1px solid #1a1a1a',
      borderLeft: '1px solid #1a1a1a',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '7px 10px',
        borderBottom: '1px solid #1a1a1a',
        flexShrink: 0,
      }}>
        <span style={{ color: '#f59e0b', fontSize: '11px', letterSpacing: '0.1em', fontWeight: 'bold' }}>
          ⚡ LIQUIDATIONS
        </span>
        {cascade && (
          <span style={{ color: '#f59e0b', fontSize: '10px', marginLeft: '10px' }}>
            ⚠️ CASCADE
          </span>
        )}
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {recent.length === 0 ? (
          <div style={{ padding: '10px', color: '#374151', fontSize: '11px' }}>
            No recent liquidations
          </div>
        ) : (
          recent.map((ev, i) => {
            const isLong    = ev.side === 'LONG'
            const textColor = isLong ? '#22c55e' : '#ef4444'
            const rowBg     = cascade ? 'rgba(245,158,11,0.12)' : 'transparent'

            return (
              <div key={`${ev.timestamp}-${i}`} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '5px 10px',
                backgroundColor: rowBg,
                fontFamily: "'Courier New', monospace",
              }}>
                <span style={{ color: textColor, fontSize: '11px', fontWeight: 'bold', minWidth: '48px' }}>
                  {isLong ? 'LONG' : 'SHORT'}
                </span>
                <span style={{ color: 'white', fontSize: '11px', flex: 1, textAlign: 'center' }}>
                  {fmtUSD(ev.usdSize)}
                </span>
                <span style={{ color: '#6b7280', fontSize: '10px' }}>
                  {fmtTime(ev.timestamp)}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Root Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { sseData, deltaHistory } = useSSE()
  const { trades, tps }           = useTapeWS()

  const connecting  = sseData === null
  const score       = sseData?.compositeFlowScore ?? 0
  const urgency     = sseData?.urgencyIndex       ?? 0
  const midPrice    = sseData?.midPrice           ?? null
  const liqEvents   = sseData?.liquidationFeed?.events  ?? []
  const liqCascade  = sseData?.liquidationFeed?.cascade ?? false

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div style={{
        fontFamily: "'Courier New', monospace",
        backgroundColor: '#0a0a0a',
        color: 'white',
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        userSelect: 'none',
      }}>
        {/* ── LEFT COLUMN (60%) ──────────────────────────────────── */}
        <div style={{ width: '60%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Header   midPrice={midPrice} connecting={connecting} />
          <HeroOrb  score={score}       urgency={urgency} connecting={connecting} />
          <IndicatorRow sseData={sseData} connecting={connecting} />
          <CumulativeDelta history={deltaHistory} connecting={connecting} />
        </div>

        {/* ── RIGHT COLUMN (40%) ─────────────────────────────────── */}
        <div style={{ width: '40%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <TapeFeed        trades={trades}      tps={tps} />
          <LiquidationFeed events={liqEvents}   cascade={liqCascade} />
        </div>
      </div>
    </>
  )
}
