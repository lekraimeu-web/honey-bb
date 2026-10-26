import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { quality, reducedMotion } from '../config/quality'
import { makeGlowTexture } from './textures'

// Warm, slowly rising dust motes for the letter and secret scenes.
export default function GoldDust({ center = [0, 0, 0], radius = 7, color = '#ffd9a0', count = quality.dust }) {
  const ref = useRef()
  const sprite = useMemo(() => makeGlowTexture(64, 'rgba(255,255,255,1)'), [])
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = center[0] + (Math.random() - 0.5) * radius * 2
      positions[i * 3 + 1] = center[1] + (Math.random() - 0.5) * radius * 1.4
      positions[i * 3 + 2] = center[2] + (Math.random() - 0.5) * radius * 2
      speeds[i] = 0.05 + Math.random() * 0.15
    }
    return { positions, speeds }
  }, [count, center, radius])

  useFrame((state, dt) => {
    const geo = ref.current?.geometry
    if (!geo || reducedMotion) return
    const arr = geo.attributes.position.array
    const t = state.clock.elapsedTime
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i] * dt
      arr[i * 3] += Math.sin(t * 0.3 + i) * 0.002
      if (arr[i * 3 + 1] > center[1] + radius * 0.7) arr[i * 3 + 1] = center[1] - radius * 0.7
    }
    geo.attributes.position.needsUpdate = true
    ref.current.material.opacity = 0.55 + Math.sin(t * 0.8) * 0.1
  })

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        alphaTest={0.01}
        color={color}
        size={0.09}
        sizeAttenuation
        transparent
        opacity={0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
