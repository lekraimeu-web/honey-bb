import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makeCloudTexture } from './textures'
import { reducedMotion } from '../config/quality'

const COLORS = ['#ffb6dd', '#c2b1ff', '#ffd3b8', '#f1c0ff', '#ffc9e3']

// Soft dusk clouds for the gallery, like cotton lit from below.
export default function Clouds({ center = [0, 0, 0], count = 16, colors = COLORS, spread = [40, 10, 18] }) {
  const textures = useMemo(() => [makeCloudTexture(512, 3), makeCloudTexture(512, 17), makeCloudTexture(512, 42)], [])
  const refs = useRef([])
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const far = i >= count * 0.6
        return {
          x: (Math.random() - 0.5) * (far ? spread[0] : spread[0] * 0.45),
          y: far ? -1 + Math.random() * spread[1] : -3.6 + Math.random() * 1.8,
          z: far ? -16 - Math.random() * spread[2] : -4 + Math.random() * 9,
          s: far ? 12 + Math.random() * 10 : 5.5 + Math.random() * 4,
          color: colors[i % colors.length],
          op: far ? 0.3 + Math.random() * 0.2 : 0.55 + Math.random() * 0.25,
          speed: (Math.random() - 0.5) * 0.08,
          tex: i % 3,
        }
      }),
    [count, colors, spread],
  )

  useFrame((state, dt) => {
    if (reducedMotion) return
    const t = state.clock.elapsedTime
    refs.current.forEach((s, i) => {
      if (!s) return
      const it = items[i]
      s.position.x = center[0] + it.x + Math.sin(t * 0.08 + i) * 0.8
      s.position.y = center[1] + it.y + Math.sin(t * 0.15 + i * 2) * 0.12
    })
  })

  return (
    <group>
      {items.map((it, i) => (
        <sprite
          key={i}
          ref={(el) => (refs.current[i] = el)}
          position={[center[0] + it.x, center[1] + it.y, center[2] + it.z]}
          scale={[it.s * 1.6, it.s, 1]}
        >
          <spriteMaterial map={textures[it.tex]} color={it.color} transparent opacity={it.op} depthWrite={false} />
        </sprite>
      ))}
    </group>
  )
}
