import { useEffect, useRef, useState } from 'react'
import Chapter from '../ui/Chapter'
import { universe } from '../content/texts'
import { isMobile } from '../config/quality'
import { heartTap } from '../state/heartTap'
import { useJourney } from '../state/journey'
import { ambient } from '../audio/ambient'
import { whoosh } from '../audio/sfx'

// Each touch of the heart releases one line of light. The last touch bursts
// the heart open and carries her into the gallery.
export default function UniverseUI() {
  const { go, setHeartBurst, setPhase } = useJourney()
  const [shown, setShown] = useState([]) // [{ id, text }]
  const count = useRef(0)
  const leaving = useRef(false)
  const words = universe.heartWords

  useEffect(() => {
    setHeartBurst(0)
    return heartTap.on(() => {
      if (leaving.current) return
      const i = count.current
      if (i < words.length) {
        count.current = i + 1
        const id = Date.now()
        setShown((s) => [...s.slice(-1), { id, text: words[i] }])
        ambient.chime(0.3 + (i / words.length) * 0.6, 0.11)
        window.setTimeout(() => setShown((s) => s.filter((w) => w.id !== id)), 3600)
      } else {
        leaving.current = true
        ambient.chime(0.6, 0.12)
        ambient.swell(4)
        whoosh(1.8, 0.12)
        setPhase('burst')
        setHeartBurst(1)
        go('gallery', 'light', 1300)
      }
    })
  }, [go, setHeartBurst, setPhase, words])

  const done = count.current >= words.length
  return (
    <>
      <Chapter num={universe.chapter} title={universe.title} />
      <div className="overlay heart-words passthrough">
        {shown.map((w) => (
          <p key={w.id} className="heart-word">{w.text}</p>
        ))}
      </div>
      <p className="hint fade-in-slow delay-3" key={done ? 'last' : 'first'}>
        {done ? universe.hintLast : isMobile ? universe.hintMobile : universe.hint}
      </p>
    </>
  )
}
