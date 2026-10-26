import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makeNebulaTexture } from './textures'
import { moodColors } from './moods'
import { useJourney } from '../state/journey'
import { reducedMotion } from '../config/quality'

// Large, slowly drifting nebula sheets far behind everything.
// Their colours lerp towards the current scene's mood.
const LAYERS = [
  { pos: [-18, 8, -58], scale: 70, rot: 0.2, speed: 0.012, tint: 0 },
  { pos: [22, -6, -64], scale: 80, rot: 1.4, speed: -0.009, tint: 1 },
  { pos: [4, 14, -70], scale: 66, rot: 2.6, speed: 0.007, tint: 2 },
  { pos: [-26, -12, -52], scale: 54, rot: 0.9, speed: -0.014, tint: 1 },
  { pos: [30, 10, -48], scale: 48, rot: 3.3, speed: 0.01, tint: 0 },
]

export default function Nebula() {
  const { scene } = useJourney()
  const refs = useRef([])
  const textures = useMemo(() => [makeNebulaTexture(512, 3), makeNebulaTexture(512, 11), makeNebulaTexture(512, 29)], [])
  const target = useMemo(() => moodColors(scene), [scene])

  useFrame((state, dt) => {
    const k = 1 - Math.exp(-0.9 * dt)
    refs.current.forEach((m, i) => {
      if (!m) return
      const L = LAYERS[i]
      if (!reducedMotion) m.rotation.z += L.speed * dt
      m.material.color.lerp(target.nebula[L.tint], k)
      m.material.opacity += (0.42 * target.glow - m.material.opacity) * k
    })
  })

  return (
    <group>
      {LAYERS.map((L, i) => (
        <mesh key={i} position={L.pos} rotation={[0, 0, L.rot]} scale={L.scale} ref={(el) => (refs.current[i] = el)}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={textures[i % textures.length]}
            transparent
            opacity={0.4}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            color={target.nebula[L.tint]}
          />
        </mesh>
      ))}
    </group>
  )
}
