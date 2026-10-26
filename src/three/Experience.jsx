import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useJourney } from '../state/journey'
import { quality } from '../config/quality'
import { moodColors } from './moods'
import CameraRig from './CameraRig'
import Starfield from './Starfield'
import Nebula from './Nebula'
import ParticleHeart from './ParticleHeart'
import FloatingHearts from './FloatingHearts'
import GallerySpace from './GallerySpace'
import GoldDust from './GoldDust'
import Effects from './Effects'
import Meadow from './Meadow'
import Portal from './Portal'
import Cosmos from './Cosmos'
import { MEADOW_ORIGIN, COSMOS_ORIGIN } from './CameraRig'

// Sky (stars + nebula) follows the camera so it stays infinitely far away.
function Sky({ fade }) {
  const group = useRef()
  const camera = useThree((s) => s.camera)
  useFrame(() => {
    if (group.current) group.current.position.copy(camera.position)
  })
  return (
    <group ref={group}>
      <Starfield fade={fade} />
      <Nebula />
    </group>
  )
}

// Background + fog colours melt toward the mood of the current scene.
function Mood() {
  const { scene, phase } = useJourney()
  const three = useThree((s) => s.scene)
  const target = useMemo(() => moodColors(scene === 'meadow' && phase === 'night' ? 'universe' : scene), [scene, phase])
  useEffect(() => {
    if (!three.background) three.background = new THREE.Color(target.bg)
    if (!three.fog) three.fog = new THREE.Fog(target.bg.clone(), 18, 110)
  }, [three, target])
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-1.2 * dt)
    three.background.lerp(target.bg, k)
    three.fog.color.lerp(target.bg, k)
    three.fog.near += (target.fog[0] - three.fog.near) * k
    three.fog.far += (target.fog[1] - three.fog.far) * k
  })
  return null
}

function World({ onHeartActivate, onPortalActivate }) {
  const { scene, heartBurst, phase, setPhase } = useJourney()
  const showHeart = scene === 'universe' || scene === 'finale'
  const inLetter = scene === 'letter' || scene === 'secret'
  const inMeadow = scene === 'intro' || scene === 'meadow'
  const starsFade = inMeadow && phase !== 'night' ? 0 : 1
  const portalUp = scene === 'finale' && (phase === 'portal-wait' || phase === 'portal')
  return (
    <>
      <CameraRig />
      <Mood />
      <ambientLight intensity={0.5} color="#b48cff" />
      <directionalLight position={[4, 6, 5]} intensity={2.2} color="#ffd1ec" />
      <pointLight position={[0, 0, 0]} intensity={8} color="#ff3fa4" distance={16} />
      <Sky fade={starsFade} />
      {scene !== 'cosmos' && <FloatingHearts />}
      {inMeadow && <Meadow origin={MEADOW_ORIGIN} onKittenArrived={() => setPhase('arrived')} />}
      {showHeart && (
        <ParticleHeart
          interactive={scene === 'universe'}
          onActivate={onHeartActivate}
          burst={scene === 'finale' || (scene === 'universe' && phase === 'burst') ? heartBurst : 0}
        />
      )}
      {portalUp && <Portal position={[0, -0.1, -3.6]} open={phase === 'portal'} onActivate={onPortalActivate} />}
      {(scene === 'cosmos' || phase === 'portal') && <Cosmos origin={COSMOS_ORIGIN} />}
      {(scene === 'universe' || scene === 'gallery') && <GallerySpace active={scene === 'gallery'} />}
      {inLetter && <GoldDust center={[0, 1.5, -86]} radius={9} />}
    </>
  )
}

export default function Experience({ onHeartActivate, onPortalActivate, onReady }) {
  return (
    <Canvas
      dpr={quality.dpr}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false, depth: true }}
      camera={{ fov: 50, near: 0.1, far: 600, position: [0, 0.4, 11] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        onReady && onReady()
      }}
      style={{ position: 'fixed', inset: 0 }}
    >
      <Suspense fallback={null}>
        <World onHeartActivate={onHeartActivate} onPortalActivate={onPortalActivate} />
        {quality.bloom && <Effects />}
      </Suspense>
    </Canvas>
  )
}
