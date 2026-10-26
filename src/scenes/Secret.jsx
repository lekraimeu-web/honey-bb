import { useEffect, useMemo, useState } from 'react'
import Chapter from '../ui/Chapter'
import { secret as T } from '../content/texts'
import { secretLines } from '../content/secret'
import { useJourney } from '../state/journey'
import { ambient } from '../audio/ambient'

// Hidden scene: eight stars, laid out along a heart she cannot see yet.
// The brightest star pulses; touching it lights it and reveals one line.
// When all are lit, the lines connect and the heart appears.
function heartPoint(t) {
  const x = 16 * Math.pow(Math.sin(t), 3)
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
  return [x / 17, -(y - 2) / 17] // y down for SVG
}

export default function Secret() {
  const { go } = useJourney()
  const N = Math.min(8, secretLines.length)
  const [lit, setLit] = useState(0)
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })

  useEffect(() => {
    const r = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', r)
    return () => window.removeEventListener('resize', r)
  }, [])

  const stars = useMemo(() => {
    const cx = size.w / 2
    const cy = size.h * 0.42
    const s = Math.min(size.w, size.h) * 0.3
    // Order along the curve, starting at the bottom tip and going around.
    return Array.from({ length: N }, (_, i) => {
      const t = Math.PI + (i / N) * Math.PI * 2
      const [hx, hy] = heartPoint(t)
      return { x: cx + hx * s, y: cy + hy * s, r: 3.2 + ((i * 7) % 3) }
    })
  }, [size, N])

  const bgStars = useMemo(
    () => Array.from({ length: 90 }, (_, i) => ({ x: Math.random() * size.w, y: Math.random() * size.h, r: Math.random() * 1.3 + 0.3, d: (i % 7) * 0.4 })),
    [size],
  )

  const tap = (i) => {
    if (i !== lit) return
    ambient.chime(0.2 + (i / N) * 0.8, 0.12)
    setLit(i + 1)
    if (i + 1 === N) setTimeout(() => ambient.swell(5), 400)
  }

  const complete = lit >= N
  const path = complete ? stars.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ') + ' Z' : ''

  return (
    <>
      <Chapter num={T.chapter} title={T.title} />
      <svg className="sky-svg fade-in" viewBox={`0 0 ${size.w} ${size.h}`} preserveAspectRatio="none">
        <defs>
          <radialGradient id="halo">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#ffb3e6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff5fb4" stopOpacity="0" />
          </radialGradient>
          <filter id="glowLine" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {bgStars.map((s, i) => (
          <circle key={i} className="bg-star" cx={s.x} cy={s.y} r={s.r} style={{ animation: `twinkle ${2 + (i % 5)}s ease-in-out ${s.d}s infinite`, transformBox: 'fill-box', transformOrigin: 'center' }} />
        ))}
        {stars.slice(0, Math.max(0, lit - 1)).map((p, i) => (
          <line key={i} className="link" x1={p.x} y1={p.y} x2={stars[i + 1].x} y2={stars[i + 1].y} />
        ))}
        {complete && <path className="link" d={path} fill="rgba(255,120,200,0.06)" />}
        {stars.map((p, i) => (
          <g key={i} className={`cstar ${i < lit ? 'lit' : ''} ${i === lit ? 'next' : ''}`} onClick={() => tap(i)} onTouchStart={(e) => { e.preventDefault(); tap(i) }}>
            <circle className="halo" cx={p.x} cy={p.y} r={i === lit ? 42 : 34} />
            <circle cx={p.x} cy={p.y} r={i === lit ? 30 : 22} fill="transparent" />
            <circle className="core" cx={p.x} cy={p.y} r={i === lit ? p.r + 2.2 : p.r} fill={i < lit ? '#fff' : i === lit ? '#ffe3f5' : 'rgba(255,255,255,0.55)'} style={{ filter: 'drop-shadow(0 0 8px rgba(255,200,240,.9))' }} />
          </g>
        ))}
      </svg>
      <div className="overlay secret-ui passthrough">
        <div className="secret-line fade-in" key={lit}>
          {complete ? T.done : lit > 0 ? secretLines[lit - 1] : ''}
        </div>
        <div className="secret-progress">
          {Array.from({ length: N }, (_, i) => <i key={i} className={i < lit ? 'on' : ''} />)}
        </div>
        {complete ? (
          <button className="btn fade-up delay-2" onClick={() => go('finale', 'dark')} data-ui>{T.continueButton}</button>
        ) : (
          <p className="hint-line" style={{ fontSize: '.68rem', letterSpacing: '.26em', textTransform: 'uppercase', color: 'rgba(251,243,232,.45)' }}>{T.hint}</p>
        )}
      </div>
    </>
  )
}
