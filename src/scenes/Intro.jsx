import { useEffect, useState } from 'react'
import { OPENING_WORDS, intro } from '../content/texts'
import { useJourney } from '../state/journey'
import { ambient } from '../audio/ambient'

// The very first screen: black, silent, and just the words.
export default function Intro({ ready }) {
  const { go } = useJourney()
  const [leaving, setLeaving] = useState(false)
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowMore(true), 2600)
    return () => clearTimeout(t)
  }, [])

  const begin = () => {
    // Unlock audio on this first gesture (needed for the kitten's meows);
    // the music itself starts later, when she answers "Yes".
    ambient.start()
    ambient.resume()
    ambient.setMuted(false)
    ambient.chime(0.3, 0.06)
    setLeaving(true)
    go('meadow', 'light', 1000)
  }

  return (
    <div className={`overlay intro ${leaving ? 'leaving' : ''}`}>
      <h1 className="display xl words" aria-label={OPENING_WORDS}>
        {OPENING_WORDS.split('').map((ch, i) => (
          <span key={i} style={{ animationDelay: `${0.4 + i * 0.07}s` }} aria-hidden="true">{ch}</span>
        ))}
      </h1>
      {showMore && (
        <>
          <p className="lede fade-up">{intro.subtitle}</p>
          <p className="hint-line fade-up delay-1">{intro.hint}</p>
          {ready ? (
            <button className="btn fade-up delay-2" onClick={begin}>{intro.button}</button>
          ) : (
            <div className="spark fade-in" aria-label="Loading" role="status" />
          )}
        </>
      )}
    </div>
  )
}
