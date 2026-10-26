import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { makeGlowTexture, makeNebulaTexture } from './textures'
import { isMobile, reducedMotion } from '../config/quality'

// The infinite universe beyond the portal: a long tunnel of stars the camera
// travels through (stars wrap around behind the camera so it never ends),
// constellations drawn with glowing lines, distant galaxies and cosmic dust.

const starVert = /* glsl */ `
  uniform float uTime; uniform float uPixelRatio;
  attribute float aSize; attribute float aPhase; attribute vec3 aColor;
  varying vec3 vColor; varying float vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.7 + 0.3 * sin(uTime * (0.5 + aPhase) + aPhase * 30.0);
    vA = tw;
    vColor = aColor;
    gl_PointSize = aSize * uPixelRatio * tw * (120.0 / -mv.z);
  }
`
const starFrag = /* glsl */ `
  varying vec3 vColor; varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(vColor * (1.0 + smoothstep(0.2, 0.0, d)), a * vA);
  }
`

const LEN = 420 // tunnel length

function TunnelStars({ count }) {
  const mat = useRef()
  const geo = useRef()
  const camera = useThree((s) => s.camera)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } }), [])
  const data = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const phases = new Float32Array(count)
    const colors = new Float32Array(count * 3)
    const palette = ['#ffffff', '#fff3e0', '#cfd8ff', '#ffc2ea', '#e2c9ff', '#ffe9b8'].map((c) => new THREE.Color(c))
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 160
      positions[i * 3 + 1] = (Math.random() - 0.5) * 110
      positions[i * 3 + 2] = -Math.random() * LEN
      sizes[i] = Math.random() < 0.05 ? 2.5 + Math.random() * 2.5 : 0.7 + Math.random() * 1.4
      phases[i] = Math.random()
      const c = palette[Math.floor(Math.random() * palette.length)]
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
    }
    return { positions, sizes, phases, colors }
  }, [count])

  useFrame((state) => {
    if (mat.current) mat.current.uniforms.uTime.value = state.clock.elapsedTime
    // wrap stars that fell behind the camera to the far end of the tunnel
    const g = geo.current
    if (!g) return
    const arr = g.attributes.position.array
    const camZ = camera.position.z - (g.parent?.parent?.position.z || 0)
    let changed = false
    for (let i = 0; i < count; i++) {
      if (arr[i * 3 + 2] > camZ + 5) { arr[i * 3 + 2] -= LEN; changed = true }
    }
    if (changed) g.attributes.position.needsUpdate = true
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geo}>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[data.sizes, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[data.phases, 1]} />
        <bufferAttribute attach="attributes-aColor" args={[data.colors, 3]} />
      </bufferGeometry>
      <shaderMaterial ref={mat} vertexShader={starVert} fragmentShader={starFrag} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

// A few constellations: small clusters of bright stars joined by faint lines.
function Constellations({ count = 7 }) {
  const camera = useThree((s) => s.camera)
  const group = useRef()
  const glowTex = useMemo(() => makeGlowTexture(64, 'rgba(255,255,255,1)'), [])
  const sets = useMemo(() => {
    const out = []
    for (let s = 0; s < count; s++) {
      const n = 5 + Math.floor(Math.random() * 4)
      const cx = (Math.random() - 0.5) * 120
      const cy = (Math.random() - 0.5) * 70
      const cz = -40 - (s / count) * (LEN - 80)
      const pts = []
      let px = cx, py = cy, pz = cz
      for (let i = 0; i < n; i++) {
        px += (Math.random() - 0.5) * 12
        py += (Math.random() - 0.5) * 10
        pz += (Math.random() - 0.5) * 6
        pts.push(new THREE.Vector3(px, py, pz))
      }
      const linePts = []
      for (let i = 0; i < n - 1; i++) linePts.push(pts[i], pts[i + 1])
      if (Math.random() < 0.5) linePts.push(pts[n - 1], pts[Math.floor(n / 2)])
      out.push({ pts, lineGeo: new THREE.BufferGeometry().setFromPoints(linePts), z: cz })
    }
    return out
  }, [count])

  useFrame(() => {
    const g = group.current
    if (!g) return
    const camZ = camera.position.z - (g.parent?.position.z || 0)
    g.children.forEach((c) => { if (c.position.z + c.userData.z > camZ + 10) c.position.z -= LEN })
  })

  return (
    <group ref={group}>
      {sets.map((s, i) => (
        <group key={i} userData={{ z: s.z }}>
          <lineSegments geometry={s.lineGeo}>
            <lineBasicMaterial color="#ffc8ee" transparent opacity={0.38} blending={THREE.AdditiveBlending} depthWrite={false} />
          </lineSegments>
          {s.pts.map((p, j) => (
            <sprite key={j} position={p} scale={1.6}>
              <spriteMaterial map={glowTex} color="#fff4ff" transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
          ))}
        </group>
      ))}
    </group>
  )
}

function makeGalaxyTexture(size = 256, seed = 1) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  ctx.translate(size / 2, size / 2)
  ctx.globalCompositeOperation = 'lighter'
  let s = seed * 1013
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  // soft disc haze
  const haze = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.48)
  haze.addColorStop(0, 'rgba(200,170,255,0.35)'); haze.addColorStop(0.5, 'rgba(170,140,255,0.12)'); haze.addColorStop(1, 'rgba(120,90,220,0)')
  ctx.save(); ctx.scale(1, 0.55); ctx.fillStyle = haze; ctx.beginPath(); ctx.arc(0, 0, size * 0.48, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  // two loose spiral arms of tiny stars
  for (let i = 0; i < 2600; i++) {
    const arm = i % 2 ? 0 : Math.PI
    const d = Math.pow(rnd(), 0.7) * size * 0.46
    const a = arm + d * 0.028 + (rnd() - 0.5) * (0.9 + d * 0.004)
    const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.55
    const r = 0.5 + rnd() * 1.6
    ctx.fillStyle = `rgba(${225 + rnd() * 30}, ${200 + rnd() * 45}, 255, ${0.05 + rnd() * 0.12})`
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.14)
  core.addColorStop(0, 'rgba(255,245,235,0.95)'); core.addColorStop(0.4, 'rgba(255,220,240,0.45)'); core.addColorStop(1, 'rgba(255,200,240,0)')
  ctx.save(); ctx.scale(1, 0.7); ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, size * 0.14, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function Galaxies({ count = 5 }) {
  const camera = useThree((s) => s.camera)
  const group = useRef()
  const textures = useMemo(() => [makeGalaxyTexture(256, 3), makeGalaxyTexture(256, 9)], [])
  const items = useMemo(
    () => Array.from({ length: count }, (_, i) => ({ x: (Math.random() - 0.5) * 150, y: (Math.random() - 0.5) * 80, z: -60 - (i / count) * (LEN - 100), s: 12 + Math.random() * 16, rot: Math.random() * Math.PI, tex: i % 2 })),
    [count],
  )
  useFrame((state) => {
    const g = group.current
    if (!g) return
    const camZ = camera.position.z - (g.parent?.position.z || 0)
    g.children.forEach((c, i) => {
      if (c.position.z > camZ + 10) c.position.z -= LEN
      c.material.rotation = items[i].rot + state.clock.elapsedTime * 0.02
    })
  })
  return (
    <group ref={group}>
      {items.map((it, i) => (
        <sprite key={i} position={[it.x, it.y, it.z]} scale={[it.s * 1.5, it.s, 1]}>
          <spriteMaterial map={textures[it.tex]} transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
        </sprite>
      ))}
    </group>
  )
}

function Dust({ count }) {
  const camera = useThree((s) => s.camera)
  const ref = useRef()
  const tex = useMemo(() => makeGlowTexture(64, 'rgba(255,220,255,1)'), [])
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) { p[i * 3] = (Math.random() - 0.5) * 40; p[i * 3 + 1] = (Math.random() - 0.5) * 26; p[i * 3 + 2] = -Math.random() * LEN }
    return p
  }, [count])
  useFrame((state, dt) => {
    const g = ref.current?.geometry
    if (!g) return
    const a = g.attributes.position.array
    const t = state.clock.elapsedTime
    const camZ = camera.position.z - (ref.current.parent?.position.z || 0)
    for (let i = 0; i < count; i++) {
      if (!reducedMotion) { a[i * 3] += Math.sin(t * 0.2 + i) * 0.004; a[i * 3 + 1] += Math.cos(t * 0.15 + i) * 0.003 }
      if (a[i * 3 + 2] > camZ + 2) a[i * 3 + 2] -= LEN
    }
    g.attributes.position.needsUpdate = true
  })
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial map={tex} alphaTest={0.01} color="#e9c8ff" size={0.35} sizeAttenuation transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

function NebulaVeils({ count = 8 }) {
  const camera = useThree((s) => s.camera)
  const group = useRef()
  const textures = useMemo(() => [makeNebulaTexture(512, 5), makeNebulaTexture(512, 21)], [])
  const palette = ['#7a3fd1', '#d23c8f', '#2a4fd0', '#ff7fb8', '#ffb070']
  const items = useMemo(
    () => Array.from({ length: count }, (_, i) => ({ x: (Math.random() - 0.5) * 120, y: (Math.random() - 0.5) * 70, z: -30 - (i / count) * (LEN - 60), s: 50 + Math.random() * 50, color: palette[i % palette.length], rot: Math.random() * 6 })),
    [count],
  )
  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    const camZ = camera.position.z - (g.parent?.position.z || 0)
    g.children.forEach((m, i) => {
      if (m.position.z > camZ + 20) m.position.z -= LEN
      if (!reducedMotion) m.rotation.z += 0.01 * dt * (i % 2 ? 1 : -1)
    })
  })
  return (
    <group ref={group}>
      {items.map((it, i) => (
        <mesh key={i} position={[it.x, it.y, it.z]} rotation={[0, 0, it.rot]} scale={it.s}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={textures[i % 2]} color={it.color} transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
        </mesh>
      ))}
    </group>
  )
}

export default function Cosmos({ origin }) {
  const stars = reducedMotion ? 3000 : isMobile ? 6000 : 12000
  return (
    <group position={origin}>
      <TunnelStars count={stars} />
      <Constellations count={isMobile ? 5 : 8} />
      <Galaxies count={isMobile ? 3 : 5} />
      <NebulaVeils count={isMobile ? 5 : 8} />
      <Dust count={isMobile ? 300 : 700} />
    </group>
  )
}
