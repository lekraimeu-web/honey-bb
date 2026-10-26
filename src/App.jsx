import { useCallback, useEffect, useState } from 'react'
import { JourneyProvider, useJourney } from './state/journey'
import { usePointerTracking } from './hooks/usePointer'
import Experience from './three/Experience'
import Veil from './ui/Veil'
import SoundToggle from './ui/SoundToggle'
import Intro from './scenes/Intro'
import MeadowUI from './scenes/MeadowUI'
import CosmosUI from './scenes/CosmosUI'
import UniverseUI from './scenes/UniverseUI'
import GalleryUI from './scenes/GalleryUI'
import Letter from './scenes/Letter'
import Secret from './scenes/Secret'
import Finale from './scenes/Finale'
import { ambient } from './audio/ambient'
import { music } from './audio/music'
import { whoosh } from './audio/sfx'
import { heartTap } from './state/heartTap'

const DUCK = { meadow: 1, universe: 0.9, gallery: 0.85, letter: 0.55, secret: 0.6, finale: 1, cosmos: 1 }

function Journey() {
  const { scene, go, setPhase } = useJourney()
  const [ready, setReady] = useState(false)
  usePointerTracking()

  // Touching the big heart: the universe overlay decides what happens
  // (a word of light, or the burst that opens the gallery).
  const onHeartActivate = useCallback(() => heartTap.emit(), [])

  // Touching the portal at the end: it opens, and the camera glides through.
  const onPortalActivate = useCallback(() => {
    setPhase('portal')
    whoosh(3.2, 0.14)
    ambient.swell(6)
    window.setTimeout(() => go('cosmos', 'light', 1400), 3400)
  }, [go, setPhase])

  // Music breathes with the scenes (softer while she reads).
  useEffect(() => { music.duck(DUCK[scene] ?? 1) }, [scene])

  return (
    <>
      <Experience onHeartActivate={onHeartActivate} onPortalActivate={onPortalActivate} onReady={() => setReady(true)} />
      {scene === 'intro' && <Intro ready={ready} />}
      {scene === 'meadow' && <MeadowUI />}
      {scene === 'cosmos' && <CosmosUI />}
      {scene === 'universe' && <UniverseUI />}
      {scene === 'gallery' && <GalleryUI />}
      {scene === 'letter' && <Letter />}
      {scene === 'secret' && <Secret />}
      {scene === 'finale' && <Finale />}
      {scene !== 'intro' && <SoundToggle />}
      <Veil />
    </>
  )
}

export default function App() {
  return (
    <JourneyProvider>
      <Journey />
    </JourneyProvider>
  )
}
