import { useEffect, useMemo, useRef, useState } from 'react'
import Chapter from '../ui/Chapter'
import { letter as T } from '../content/texts'
import { letterContent } from '../content/letter'
import { useJourney } from '../state/journey'
import { ambient } from '../audio/ambient'
import { reducedMotion } from '../config/quality'

// The letter reveals itself one character at a time. Tap anywhere to hurry.
export default function Letter() {
  const { go } = useJourney()
  const paragraphs = letterContent.paragraphs
  const total = useMemo(() => paragraphs.reduce((n, p) => n + p.length, 0), [paragraphs])
  const [count, setCount] = useState(reducedMotion ? total : 0)
  const [whisper, setWhisper] = useState(false)
  const [talk, setTalk] = useState(false)
  const paperRef = useRef()
  const done = count >= total

  // Typing loop with natural pauses on punctuation.
  useEffect(() => {
    if (done) return
    let alive = true
    let timer
    const flat = paragraphs.join('')
    const tick = () => {
      if (!alive) return
      setCount((c) => {
        const ch = flat[c] || ''
        let delay = 26
        if (ch === ',' || ch === ';') delay = 160
        if (ch === '.' || ch === '?' || ch === '!' || ch === ':') delay = 380
        timer = setTimeout(tick, delay)
        return c + 1
      })
    }
    timer = setTimeout(tick, 900)
    return () => { alive = false; clearTimeout(timer) }
  }, [done, paragraphs])

  // Keep the newest line in view on small screens.
  useEffect(() => {
    const el = paperRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [count])

  // After the letter is complete, a star begins to whisper.
  useEffect(() => {
    if (!done) return
    ambient.chime(0.5, 0.07)
    const a = setTimeout(() => setWhisper(true), 2500)
    const b = setTimeout(() => setTalk(true), 9000)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [done])

  const hurry = (e) => {
    if (done) return
    if (e.target.closest && e.target.closest('button')) return
    setCount(total)
  }

  // Slice the revealed characters across paragraphs.
  let remaining = count
  const rendered = paragraphs.map((p, i) => {
    const shown = Math.max(0, Math.min(p.length, remaining))
    remaining -= p.length
    const active = shown > 0 && shown < p.length
    const visible = shown > 0 || i === 0
    return visible ? (
      <p key={i}>
        {p.slice(0, shown)}
        {active && <span className="cursor" />}
      </p>
    ) : null
  })

  return (
    <>
      <Chapter num={T.chapter} title={T.title} />
      <div className="overlay letter-ui" onPointerDown={hurry} onTouchStart={hurry}>
        <div className="letter-paper fade-up" ref={paperRef}>
          <h2 className="greeting">{letterContent.greeting}</h2>
          {rendered}
          {done && (
            <>
              <p className="closing fade-in">{letterContent.closing}</p>
              <p className="signature fade-in delay-1">{letterContent.signature}</p>
            </>
          )}
        </div>
        <div className="letter-actions">
          {done ? (
            <button className="btn fade-up delay-2" onClick={() => go('finale', 'dark')}>{T.continueButton}</button>
          ) : (
            <span className="hint-line fade-in-slow delay-3" style={{ fontSize: '.68rem', letterSpacing: '.26em', textTransform: 'uppercase', color: 'rgba(251,243,232,.4)' }}>{T.skipHint}</span>
          )}
        </div>
      </div>
      {whisper && (
        <div className={`whisper fade-in ${talk ? 'talk' : ''}`}>
          <button className="star" onClick={() => { ambient.chime(0.9, 0.1); go('secret', 'dark') }} aria-label="A whispering star" data-ui>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l2.2 7.1L22 10l-7.8 1.9L12 20l-2.2-8.1L2 10l7.8-1.9z" /></svg>
          </button>
          <span className="say">{T.whisper}</span>
        </div>
      )}
    </>
  )
}
