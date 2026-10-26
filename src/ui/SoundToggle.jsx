import { useState } from 'react'
import { ambient } from '../audio/ambient'
import { music } from '../audio/music'

export default function SoundToggle() {
  const [muted, setMuted] = useState(ambient.muted)
  const toggle = () => {
    const m = !muted
    setMuted(m)
    music.setMuted(m)
    ambient.resume()
  }
  return (
    <button className="icon-btn fade-in" onClick={toggle} aria-label={muted ? 'Turn sound on' : 'Turn sound off'} title={muted ? 'Sound off' : 'Sound on'} data-ui>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        {muted ? (
          <path d="M18 9l-4 6M14 9l4 6" />
        ) : (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </>
        )}
      </svg>
    </button>
  )
}
