import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

// Scenes of the journey, in order.
export const SCENES = ['intro', 'meadow', 'universe', 'gallery', 'letter', 'secret', 'finale', 'cosmos']

const JourneyContext = createContext(null)

export function JourneyProvider({ children }) {
  const [scene, setScene] = useState('intro')
  const [veil, setVeil] = useState({ on: false, tone: 'dark' })
  const [heartBurst, setHeartBurst] = useState(0) // 0..1, used by the finale
  const [sceneStart, setSceneStart] = useState(performance.now())
  // Free-form per-scene phase flags (e.g. "night falling" in the meadow,
  // "portal open" in the finale) read by the 3D layer.
  const [phase, setPhase] = useState('')
  const busy = useRef(false)

  // Change scene behind a soft veil so every transition feels intentional.
  const go = useCallback((next, tone = 'dark', delay = 650) => {
    if (busy.current) return
    busy.current = true
    setVeil({ on: true, tone })
    window.setTimeout(() => {
      setScene(next)
      setPhase('')
      setSceneStart(performance.now())
      window.setTimeout(() => {
        setVeil((v) => ({ ...v, on: false }))
        busy.current = false
      }, 250)
    }, delay)
  }, [])

  const value = useMemo(
    () => ({ scene, go, veil, heartBurst, setHeartBurst, sceneStart, phase, setPhase }),
    [scene, go, veil, heartBurst, sceneStart, phase],
  )
  if (typeof window !== 'undefined') window.__journey = { scene, sceneStart, phase }
  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>
}

export function useJourney() {
  return useContext(JourneyContext)
}
