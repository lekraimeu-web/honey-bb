import { useCallback, useEffect, useRef, useState } from 'react'
import Chapter from '../ui/Chapter'
import { meadow as T } from '../content/texts'
import { useJourney } from '../state/journey'
import { music } from '../audio/music'
import { ambient } from '../audio/ambient'
import { whoosh } from '../audio/sfx'

// The kitten arrives, then asks. "Yes" opens the universe.
// "No" politely refuses to be caught.
export default function MeadowUI() {
  const { phase, setPhase, go } = useJourney()
  const [answered, setAnswered] = useState(false)
  const [noPos, setNoPos] = useState(null) // null = in its natural spot
  const [tease, setTease] = useState(0)
  const noRef = useRef()
  const yesRef = useRef()
  const asked = phase === 'arrived' || phase === 'night'

  const flee = useCallback((e) => {
    if (e && e.cancelable) e.preventDefault()
    const btn = noRef.current
    const yes = yesRef.current?.getBoundingClientRect()
    if (!btn) return
    const w = btn.offsetWidth, h = btn.offsetHeight
    const m = 18
    const vw = window.innerWidth, vh = window.innerHeight
    const px = e?.clientX ?? e?.touches?.[0]?.clientX ?? vw / 2
    const py = e?.clientY ?? e?.touches?.[0]?.clientY ?? vh / 2
    let best = null
    for (let i = 0; i < 24; i++) {
      const x = m + Math.random() * Math.max(1, vw - w - m * 2)
      const y = m + 70 + Math.random() * Math.max(1, vh - h - m * 2 - 90)
      const cx = x + w / 2, cy = y + h / 2
      const dPointer = Math.hypot(cx - px, cy - py)
      const dYes = yes ? Math.hypot(cx - (yes.left + yes.width / 2), cy - (yes.top + yes.height / 2)) : 999
      const score = Math.min(dPointer, 260) + Math.min(dYes, 200) * 0.6
      if (dYes > 110 && (!best || score > best.score)) best = { x, y, score }
    }
    if (best) setNoPos({ x: best.x, y: best.y })
    setTease((t) => t + 1)
  }, [])

  const yes = () => {
    if (answered) return
    setAnswered(true)
    music.start()
    ambient.resume()
    ambient.chime(0.5, 0.1)
    whoosh(2.4, 0.1)
    setPhase('night')
    window.setTimeout(() => go('universe', 'light', 1100), 3600)
  }

  const renderNo = () => (
    <button
      ref={noRef}
      className={`btn ghost no ${noPos ? 'fleeing' : ''}`}
      style={noPos ? { left: noPos.x, top: noPos.y } : undefined}
      onPointerEnter={flee}
      onPointerDown={flee}
      onTouchStart={flee}
      onClick={(e) => { e.preventDefault(); flee(e) }}
      data-ui
      aria-label="No"
    >
      {tease > 0 ? T.noTeases[(tease - 1) % T.noTeases.length] : T.no}
    </button>
  )

  // keyboard users: Enter/Space on "No" also makes it flee
  useEffect(() => {
    const k = (e) => { if (document.activeElement === noRef.current && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); flee() } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [flee])

  return (
    <>
      <Chapter num={T.chapter} title={T.title} />
      {asked && !answered && (
        <div className="overlay question-ui passthrough">
          <div className="question-card fade-up" data-ui>
            <p className="display lg question">{T.question}</p>
            <div className="answers">
              <button ref={yesRef} className="btn yes" onClick={yes} data-ui>{T.yes}</button>
              {!noPos && renderNo()}
              {noPos && <span className="btn ghost no placeholder" aria-hidden="true">{T.no}</span>}
            </div>
          </div>
          {/* once it flees, the button lives outside the blurred card so it can roam the whole screen */}
          {noPos && renderNo()}
        </div>
      )}
    </>
  )
}
