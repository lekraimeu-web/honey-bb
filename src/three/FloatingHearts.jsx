import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { quality, reducedMotion } from '../config/quality'
import { ambient } from '../audio/ambient'

// Small glossy 3D hearts drifting upward through the whole universe,
// like the ones in a dream. Tap one and it pops with a chime.
function makeHeartGeometry() {
  const s = new THREE.Shape()
  const x = 0, y = 0
  s.moveTo(x, y + 0.25)
  s.bezierCurveTo(x, y + 0.25, x - 0.05, y + 0.5, x - 0.25, y + 0.5)
  s.bezierCurveTo(x - 0.55, y + 0.5, x - 0.55, y + 0.15, x - 0.55, y + 0.15)
  s.bezierCurveTo(x - 0.55, y - 0.05, x - 0.35, y - 0.25, x, y - 0.5)
  s.bezierCurveTo(x + 0.35, y - 0.25, x + 0.55, y - 0.05, x + 0.55, y + 0.15)
  s.bezierCurveTo(x + 0.55, y + 0.15, x + 0.55, y + 0.5, x + 0.25, y + 0.5)
  s.bezierCurveTo(x + 0.1, y + 0.5, x, y + 0.25, x, y + 0.25)
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.22,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.08,
    bevelThickness: 0.08,
    curveSegments: 14,
  })
  geo.center()
  return geo
}

const PALETTE = ['#ff5fb4', '#ff8fcf', '#c084ff', '#ff6f9f', '#e9a8ff', '#ff4f8b']

export default function FloatingHearts({ count = quality.floatingHearts, region = { x: 9, y: 6, zMin: -92, zMax: 10 } }) {
  const mesh = useRef()
  const geo = useMemo(makeHeartGeometry, [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const items = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * region.x * 2,
        y: (Math.random() - 0.5) * region.y * 2,
        z: region.zMin + Math.random() * (region.zMax - region.zMin),
        s: 0.08 + Math.random() * 0.22,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.6,
        vy: 0.08 + Math.random() * 0.18,
        phase: Math.random() * Math.PI * 2,
        pop: 0,
      })),
    [count, region],
  )

  const colors = useMemo(() => {
    const arr = new Float32Array(count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < count; i++) {
      c.set(PALETTE[i % PALETTE.length])
      arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b
    }
    return arr
  }, [count])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const m = mesh.current
    if (!m) return
    for (let i = 0; i < count; i++) {
      const it = items[i]
      if (!reducedMotion) {
        it.y += it.vy * dt
        it.ry += it.vr * dt
        if (it.y > region.y) it.y = -region.y
      }
      if (it.pop > 0) {
        it.pop = Math.max(0, it.pop - dt * 2.2)
      }
      const popScale = it.pop > 0 ? 1 + Math.sin((1 - it.pop) * Math.PI) * 1.4 : 1
      const vis = it.pop > 0 && it.pop < 0.5 ? it.pop * 2 : 1
      dummy.position.set(it.x + Math.sin(t * 0.5 + it.phase) * 0.3, it.y, it.z)
      dummy.rotation.set(it.rx + Math.sin(t * 0.4 + it.phase) * 0.3, it.ry, 0)
      dummy.scale.setScalar(it.s * popScale * vis)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })

  const onClick = (e) => {
    e.stopPropagation()
    const it = items[e.instanceId]
    if (!it || it.pop > 0) return
    it.pop = 1
    ambient.chime(Math.random(), 0.1)
  }

  return (
    <instancedMesh ref={mesh} args={[geo, undefined, count]} onClick={onClick} frustumCulled={false}>
      <instancedBufferAttribute attach="instanceColor" args={[colors, 3]} />
      <meshPhysicalMaterial
        roughness={0.25}
        metalness={0.1}
        clearcoat={0.8}
        clearcoatRoughness={0.2}
        emissive="#ff2f8f"
        emissiveIntensity={0.25}
        toneMapped={false}
      />
    </instancedMesh>
  )
}
