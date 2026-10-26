import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { photos } from '../content/photos'
import { buildPolaroid } from './polaroidTexture'
import { galleryStore } from '../state/galleryStore'
import Clouds from './Clouds'
import { ambient } from '../audio/ambient'
import { reducedMotion } from '../config/quality'

export const GALLERY_CENTER = [0, 0, -40]

// Polaroids to show: the real photos, or a few empty frames with instructions
// when the photos folder is still empty (never fake pictures).
const items = photos.length
  ? photos
  : Array.from({ length: 5 }, (_, i) => ({
      name: `0${i + 1}.jpg`,
      url: null,
      caption: '',
      missingLabel: `photos/0${i + 1}.jpg`,
    }))

const COUNT = items.length
const RADIUS = Math.max(3.3, COUNT * 0.58)
const STEP = (Math.PI * 2) / COUNT
const CARD = 1.75 // width of a polaroid in world units

function Polaroid({ item, index, ringRot, zoomedIndex, onTap, active }) {
  const group = useRef()
  const inner = useRef()
  const [tex, setTex] = useState(null)
  const [aspect, setAspect] = useState(0.82)
  const [hover, setHover] = useState(false)
  const gl = useThree((s) => s.gl)
  const phase = useMemo(() => Math.random() * Math.PI * 2, [])
  const tilt = useMemo(() => (Math.random() - 0.5) * 0.14, [])
  const appear = useRef(0)

  useEffect(() => {
    let alive = true
    buildPolaroid(item).then(({ texture, aspect }) => {
      if (!alive) return
      texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
      setTex(texture)
      setAspect(aspect)
    })
    return () => { alive = false }
  }, [item, gl])

  const target = useMemo(() => new THREE.Vector3(), [])
  const tmpQ = useMemo(() => new THREE.Quaternion(), [])
  const tmpE = useMemo(() => new THREE.Euler(), [])

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    const t = state.clock.elapsedTime
    const k = 1 - Math.exp(-4 * dt)
    appear.current = THREE.MathUtils.lerp(appear.current, tex && active ? 1 : 0, 1 - Math.exp(-2.5 * dt))

    const zoomed = zoomedIndex === index
    const angle = index * STEP + ringRot.current
    const bob = reducedMotion ? 0 : Math.sin(t * 0.6 + phase) * 0.1

    if (zoomed) {
      target.set(0, 0.1, RADIUS + 1.9)
      tmpE.set(0, 0, 0)
    } else {
      target.set(Math.sin(angle) * RADIUS, bob + ((index % 2) - 0.5) * 0.35, Math.cos(angle) * RADIUS)
      tmpE.set(0, angle, tilt + (reducedMotion ? 0 : Math.sin(t * 0.5 + phase) * 0.02))
    }
    g.position.lerp(target, k)
    tmpQ.setFromEuler(tmpE)
    g.quaternion.slerp(tmpQ, k)

    const front = Math.cos(angle) // 1 when facing the camera
    const s = (zoomed ? 1.45 : 0.78 + 0.22 * Math.max(0, front) + (hover ? 0.05 : 0)) * appear.current
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, s, k))
  })

  const h = CARD / aspect
  // The mesh is created only once its texture exists, so the material is
  // compiled with the map from the start.
  if (!tex) return <group ref={group} />
  return (
    <group ref={group}>
      <mesh
        ref={inner}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}
        onClick={(e) => { e.stopPropagation(); onTap(index) }}
      >
        <boxGeometry args={[CARD, h, 0.03]} />
        {/* right, left, top, bottom, front, back */}
        <meshBasicMaterial attach="material-0" color="#cfc6bc" toneMapped={false} />
        <meshBasicMaterial attach="material-1" color="#cfc6bc" toneMapped={false} />
        <meshBasicMaterial attach="material-2" color="#d7d1ca" toneMapped={false} />
        <meshBasicMaterial attach="material-3" color="#c6bcb2" toneMapped={false} />
        <meshBasicMaterial attach="material-4" map={tex} color="#dcdcdc" toneMapped={false} />
        <meshBasicMaterial attach="material-5" color="#c9bfb6" toneMapped={false} />
      </mesh>
    </group>
  )
}

export default function GallerySpace({ active }) {
  const ringRot = useRef(0)
  const ringTarget = useRef(0)
  const velocity = useRef(0)
  const [zoomed, setZoomed] = useState(-1)
  const drag = useRef({ on: false, x: 0, moved: 0 })
  const lastIndex = useRef(-1)

  // ── Interactions: drag / swipe / wheel / keyboard ─────────────────────────
  useEffect(() => {
    if (!active) return
    galleryStore.set({ count: COUNT, loaded: true, index: 0, zoomed: false })
    const isUI = (e) => e.target.closest && e.target.closest('button, a, [data-ui]')
    const down = (e) => {
      if (isUI(e)) return
      drag.current = { on: true, x: e.clientX, moved: 0 }
    }
    const move = (e) => {
      if (!drag.current.on) return
      const dx = e.clientX - drag.current.x
      drag.current.x = e.clientX
      drag.current.moved += Math.abs(dx)
      if (zoomed >= 0) return
      ringTarget.current += dx * 0.006
      velocity.current = dx * 0.006
    }
    const up = () => {
      if (!drag.current.on) return
      drag.current.on = false
      // settle on the nearest photo
      ringTarget.current += velocity.current * 6
      ringTarget.current = Math.round(ringTarget.current / STEP) * STEP
      velocity.current = 0
    }
    const wheel = (e) => {
      if (zoomed >= 0) return
      ringTarget.current = Math.round(ringTarget.current / STEP) * STEP - Math.sign(e.deltaY + e.deltaX) * STEP
    }
    const key = (e) => {
      if (e.key === 'ArrowRight') ringTarget.current = Math.round(ringTarget.current / STEP) * STEP - STEP
      if (e.key === 'ArrowLeft') ringTarget.current = Math.round(ringTarget.current / STEP) * STEP + STEP
      if (e.key === 'Escape') setZoomed(-1)
    }
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('wheel', wheel, { passive: true })
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('wheel', wheel)
      window.removeEventListener('keydown', key)
    }
  }, [active, zoomed])

  // Arrow buttons in the HTML overlay call these through the store.
  useEffect(() => {
    galleryStore.set({
      next: () => { ringTarget.current = Math.round(ringTarget.current / STEP) * STEP - STEP },
      prev: () => { ringTarget.current = Math.round(ringTarget.current / STEP) * STEP + STEP },
      unzoom: () => setZoomed(-1),
    })
  }, [])

  useFrame((_, dt) => {
    ringRot.current += (ringTarget.current - ringRot.current) * (1 - Math.exp(-3.5 * dt))
    const idx = ((Math.round(-ringRot.current / STEP) % COUNT) + COUNT) % COUNT
    if (idx !== lastIndex.current) {
      lastIndex.current = idx
      galleryStore.set({ index: idx })
    }
  })

  const onTap = (index) => {
    if (drag.current.moved > 8) return // it was a drag, not a tap
    const frontIdx = ((Math.round(-ringRot.current / STEP) % COUNT) + COUNT) % COUNT
    if (zoomed === index) {
      setZoomed(-1)
      galleryStore.set({ zoomed: false })
    } else if (index === frontIdx) {
      setZoomed(index)
      galleryStore.set({ zoomed: true })
      ambient.chime(0.7, 0.08)
    } else {
      // rotate so that photo comes to the front
      const current = Math.round(-ringRot.current / STEP)
      let delta = index - (((current % COUNT) + COUNT) % COUNT)
      if (delta > COUNT / 2) delta -= COUNT
      if (delta < -COUNT / 2) delta += COUNT
      ringTarget.current = -(current + delta) * STEP
    }
  }

  return (
    <group position={GALLERY_CENTER}>
      <Clouds center={[0, 0, 0]} />
      {items.map((item, i) => (
        <Polaroid key={item.name} item={item} index={i} ringRot={ringRot} zoomedIndex={zoomed} onTap={onTap} active={active} />
      ))}
      {/* a soft warm light from below, like a sunset under the clouds */}
      <pointLight position={[0, -4, 2]} intensity={6} color="#ff9ad0" distance={18} />
    </group>
  )
}
