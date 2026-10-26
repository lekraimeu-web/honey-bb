import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useJourney } from '../state/journey'
import { pointer, smoothPointer } from '../hooks/usePointer'
import { reducedMotion } from '../config/quality'
import { GALLERY_CENTER } from './GallerySpace'

// World regions. The meadow lives far below the heart, the cosmos far above,
// so each environment has its own space and the camera flies between them.
export const MEADOW_ORIGIN = [0, -400, 0]
export const COSMOS_ORIGIN = [0, 400, 0]

const [gx, gy, gz] = GALLERY_CENTER
const [mx, my, mz] = MEADOW_ORIGIN
const [cx, cy, cz] = COSMOS_ORIGIN

const TARGETS = {
  intro:    { pos: [0, 0.4, 11], look: [0, 0, 0], parallax: 0.2, speed: 1.7 },
  meadow:   { pos: [mx, my + 0.95, mz + 3.4], look: [mx, my + 0.55, mz - 2], parallax: 0.18, speed: 1.2 },
  universe: { pos: [0, 0, 6.8], look: [0, 0, 0], parallax: 0.9, speed: 1.5 },
  gallery:  { pos: [gx, gy + 0.15, gz + 8.8], look: [gx, gy, gz], parallax: 0.35, speed: 1.4 },
  letter:   { pos: [0, 1.2, -78], look: [0, 1.6, -92], parallax: 0.25, speed: 1.6 },
  secret:   { pos: [0, 1.2, -78], look: [0, 3.2, -92], parallax: 0.15, speed: 1.6 },
  finale:   { pos: [0, 0, 6.5], look: [0, 0, 0], parallax: 0.3, speed: 1.2 },
  cosmos:   { pos: [cx, cy, cz], look: [cx, cy, cz - 10], parallax: 0.6, speed: 1.0 },
}

const easeInOut = (x) => x * x * (3 - 2 * x)

// Moves the camera between scenes with soft damping, adds pointer parallax
// and a slow breathing drift so the universe never feels frozen.
export default function CameraRig() {
  const { scene, sceneStart, phase } = useJourney()
  const camera = useThree((s) => s.camera)
  const pos = useRef(new THREE.Vector3(0, 0.4, 11))
  const look = useRef(new THREE.Vector3(0, 0, 0))
  const tmp = useRef(new THREE.Vector3())
  const phaseStart = useRef(0)
  const lastPhase = useRef('')
  const lastScene = useRef('intro')

  useFrame((state, dt) => {
    smoothPointer(dt, 2.5)
    const T = TARGETS[scene] || TARGETS.universe
    if (scene !== lastScene.current) {
      // Worlds far apart (meadow, cosmos) are entered behind the veil: jump there
      // instead of flying 400 units through nothing.
      if (scene === 'meadow' || scene === 'cosmos') {
        pos.current.set(T.pos[0], T.pos[1], T.pos[2])
        look.current.set(T.look[0], T.look[1], T.look[2])
      }
      lastScene.current = scene
    }
    const t = state.clock.elapsedTime
    const e = (performance.now() - sceneStart) / 1000
    if (phase !== lastPhase.current) { lastPhase.current = phase; phaseStart.current = performance.now() }
    const pe = (performance.now() - phaseStart.current) / 1000
    const drift = reducedMotion ? 0 : 1
    const par = reducedMotion ? 0 : T.parallax

    tmp.current.set(T.pos[0], T.pos[1], T.pos[2])
    const lk = [T.look[0], T.look[1], T.look[2]]

    if (scene === 'meadow') {
      // slow push-in while the kitten approaches, then tilt up when night falls
      tmp.current.z -= THREE.MathUtils.smoothstep(e, 0, 14) * 0.5 * drift
      if (phase === 'night') {
        const k = easeInOut(THREE.MathUtils.clamp(pe / 3.2, 0, 1))
        lk[1] += k * 7
        tmp.current.y += k * 1.5
      }
    }
    if (scene === 'finale') {
      // slow dolly into the heart as it bursts
      tmp.current.z = THREE.MathUtils.lerp(6.5, 2.3, THREE.MathUtils.smoothstep(e, 1.5, 11))
      if (phase === 'portal') {
        // glide through the portal
        const k = easeInOut(THREE.MathUtils.clamp(pe / 3.4, 0, 1))
        tmp.current.z = THREE.MathUtils.lerp(2.3, -4.2, k)
        lk[2] = -6
      } else {
        lk[2] = THREE.MathUtils.lerp(0, -2, THREE.MathUtils.smoothstep(e, 14, 20))
      }
    }
    if (scene === 'cosmos') {
      // endless slow travel forward
      tmp.current.z = cz - e * 1.6
      tmp.current.x += Math.sin(e * 0.08) * 1.5 * drift
      lk[2] = tmp.current.z - 10
      lk[0] = tmp.current.x + Math.sin(e * 0.08 + 0.5) * 0.6 * drift
    }

    tmp.current.x += pointer.sx * par + Math.sin(t * 0.21) * 0.15 * drift
    tmp.current.y += pointer.sy * par * 0.6 + Math.cos(t * 0.17) * 0.1 * drift

    const k = 1 - Math.exp(-T.speed * dt)
    pos.current.lerp(tmp.current, k)
    tmp.current.set(lk[0] + pointer.sx * par * 0.3, lk[1] + pointer.sy * par * 0.2, lk[2])
    look.current.lerp(tmp.current, k)

    camera.position.copy(pos.current)
    camera.lookAt(look.current)
  })
  return null
}
