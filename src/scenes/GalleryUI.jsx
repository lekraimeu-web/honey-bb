import { useEffect, useState } from 'react'
import Chapter from '../ui/Chapter'
import { gallery } from '../content/texts'
import { photos } from '../content/photos'
import { useGallery } from '../state/galleryStore'
import { useJourney } from '../state/journey'

const Arrow = ({ dir }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    {dir === 'left' ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
  </svg>
)

export default function GalleryUI() {
  const g = useGallery()
  const { go } = useJourney()
  const [showContinue, setShowContinue] = useState(false)
  const hasPhotos = photos.length > 0
  const current = hasPhotos ? photos[g.index] : null

  useEffect(() => {
    const t = setTimeout(() => setShowContinue(true), 3500)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <Chapter num={gallery.chapter} title={gallery.title} />
      <div className="overlay gallery-ui passthrough">
        {hasPhotos ? (
          <>
            <div className="caption fade-in" key={g.index}>{current?.caption}</div>
            <div className="counter">{g.index + 1} / {g.count}</div>
          </>
        ) : (
          <div className="fade-in" style={{ maxWidth: 420 }}>
            <p className="display md" style={{ marginBottom: 10 }}>{gallery.empty.title}</p>
            <p className="lede" style={{ fontSize: '1rem' }}>{gallery.empty.text}</p>
          </div>
        )}
      </div>
      {g.count > 1 && (
        <>
          <button className="arrow left fade-in" onClick={() => g.prev?.()} aria-label="Previous photo" data-ui><Arrow dir="left" /></button>
          <button className="arrow right fade-in" onClick={() => g.next?.()} aria-label="Next photo" data-ui><Arrow dir="right" /></button>
        </>
      )}
      {!g.zoomed && <p className="hint fade-in-slow delay-2">{gallery.hint}</p>}
      {g.zoomed && <p className="hint fade-in">tap the photo to let it float again</p>}
      {showContinue && (
        <button className="btn continue fade-up" onClick={() => go('letter', 'dark')} data-ui>{gallery.continueButton}</button>
      )}
    </>
  )
}
