import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { makeGlowTexture } from './textures'
import Clouds from './Clouds'
import Kitten from './Kitten'
import { isMobile, reducedMotion } from '../config/quality'
import { useJourney } from '../state/journey'

// ── Sky dome: a hand-painted sunset gradient that melts into night ─────────
const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const skyFrag = /* glsl */ `
  uniform float uNight;
  uniform vec3 uSunDir;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, -0.2, 1.0);
    // golden hour
    vec3 horizon = vec3(0.98, 0.72, 0.46);  // warm gold
    vec3 low     = vec3(0.95, 0.52, 0.56);  // blush / peach
    vec3 mid     = vec3(0.72, 0.44, 0.72);  // rose-lavender
    vec3 top     = vec3(0.36, 0.30, 0.66);  // lavender
    vec3 day = mix(horizon, low, smoothstep(0.0, 0.12, h));
    day = mix(day, mid, smoothstep(0.1, 0.35, h));
    day = mix(day, top, smoothstep(0.3, 0.9, h));
    float sun = max(dot(vDir, uSunDir), 0.0);
    day += vec3(1.0, 0.75, 0.45) * pow(sun, 40.0) * 0.55;
    day += vec3(1.0, 0.6, 0.4) * pow(sun, 5.0) * 0.18;
    // night
    vec3 nHor = vec3(0.16, 0.07, 0.26);
    vec3 nTop = vec3(0.02, 0.01, 0.07);
    vec3 night = mix(nHor, nTop, smoothstep(0.0, 0.6, h));
    vec3 c = mix(day, night, uNight);
    gl_FragColor = vec4(c, 1.0 - uNight * 0.92);
  }
`

function SkyDome({ nightRef, sunDir }) {
  const mat = useRef()
  const uniforms = useMemo(() => ({ uNight: { value: 0 }, uSunDir: { value: sunDir.clone().normalize() } }), [sunDir])
  useFrame(() => { if (mat.current) mat.current.uniforms.uNight.value = nightRef.current })
  return (
    <mesh renderOrder={-10}>
      <sphereGeometry args={[46, 48, 24]} />
      <shaderMaterial ref={mat} vertexShader={skyVert} fragmentShader={skyFrag} uniforms={uniforms} side={THREE.BackSide} transparent depthWrite={false} fog={false} />
    </mesh>
  )
}

// ── Rolling hills softened by distance ──────────────────────────────────────
function hillGeometry(seed, amp, base) {
  const pts = []
  const n = 80
  for (let i = 0; i <= n; i++) {
    const x = -90 + (i / n) * 180
    const y =
      base +
      amp * (0.6 * Math.sin(x * 0.045 + seed) + 0.3 * Math.sin(x * 0.11 + seed * 2.3) + 0.15 * Math.sin(x * 0.23 + seed * 5.1))
    pts.push(new THREE.Vector2(x, y))
  }
  const shape = new THREE.Shape()
  shape.moveTo(-90, -10)
  pts.forEach((p) => shape.lineTo(p.x, p.y))
  shape.lineTo(90, -10)
  shape.closePath()
  return new THREE.ShapeGeometry(shape)
}

function Hills() {
  const layers = useMemo(
    () => [
      { z: -24, geo: hillGeometry(1.3, 2.2, 1.6), color: '#8f5f9c' },
      { z: -34, geo: hillGeometry(4.1, 3.6, 3.4), color: '#b07cb4' },
      { z: -44, geo: hillGeometry(7.7, 5.5, 6.0), color: '#cf9cc6' },
    ],
    [],
  )
  return (
    <group>
      {layers.map((L, i) => (
        <mesh key={i} geometry={L.geo} position={[0, 0, L.z]}>
          <meshBasicMaterial color={L.color} />
        </mesh>
      ))}
    </group>
  )
}

// ── Flowers: one instanced mesh (stem + 5 petals + heart), swaying in a breeze ─
function flowerGeometry() {
  const parts = []
  const stem = new THREE.CylinderGeometry(0.0035, 0.006, 0.3, 4, 1)
  stem.translate(0, 0.15, 0)
  parts.push(colorize(stem, '#3f7a3c'))
  const petal = new THREE.CircleGeometry(0.024, 7)
  petal.scale(0.7, 1.15, 1)
  petal.translate(0, 0.021, 0)
  for (let i = 0; i < 5; i++) {
    const p = petal.clone()
    p.rotateZ((i / 5) * Math.PI * 2)
    p.rotateX(-Math.PI / 2 + 0.75)
    p.translate(0, 0.305, 0)
    parts.push(colorize(p, '#ffffff'))
  }
  const heart = new THREE.CircleGeometry(0.009, 6)
  heart.rotateX(-Math.PI / 2 + 0.75)
  heart.translate(0, 0.31, 0.004)
  parts.push(colorize(heart, '#ffd46b'))
  const g = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())
  return g
}
function colorize(geo, hex) {
  const c = new THREE.Color(hex)
  const n = geo.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return geo
}

const PASTELS = ['#ffb7d5', '#ffd1dc', '#fff1c9', '#e8d5ff', '#ffc9b3', '#ffe3ee', '#d9c6ff', '#ffdfb0']

function grassGeometry() {
  const g = new THREE.PlaneGeometry(0.014, 0.22, 1, 2)
  g.translate(0, 0.11, 0)
  const c1 = new THREE.Color('#3b7a38'), c2 = new THREE.Color('#9fcf5a')
  const n = g.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const y = g.attributes.position.getY(i) / 0.22
    const c = c1.clone().lerp(c2, y)
    arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return g
}

function Flowers({ count, grass = false }) {
  const mesh = useRef()
  const geo = useMemo(grass ? grassGeometry : flowerGeometry, [grass])
  const timeRef = useRef({ value: 0 })
  const { matrices, colors } = useMemo(() => {
    const dummy = new THREE.Object3D()
    const matrices = new Float32Array(count * 16)
    const colors = new Float32Array(count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < count; i++) {
      // denser near the camera, thinning toward the hills
      const r = 0.8 + Math.pow(Math.random(), 0.6) * 30
      const a = Math.random() * Math.PI * 2
      let x = Math.cos(a) * r * 1.4
      let z = Math.sin(a) * r
      if (z > 3.2) z = 3.2 - (z - 3.2) // keep in front of the camera mostly
      const onPath = Math.abs(x) < 0.9 && z > -11 && z < 2.2
      const s = grass ? 0.7 + Math.random() * 0.9 : onPath ? 0.45 + Math.random() * 0.35 : 0.6 + Math.random() * 0.8
      dummy.position.set(x, 0, z)
      dummy.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.5)
      dummy.scale.set(s, s * (0.75 + Math.random() * 0.6), s)
      dummy.updateMatrix()
      dummy.matrix.toArray(matrices, i * 16)
      c.set(grass ? '#ffffff' : PASTELS[Math.floor(Math.random() * PASTELS.length)])
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
    }
    return { matrices, colors }
  }, [count, grass])

  useEffect(() => {
    const m = mesh.current
    if (!m) return
    m.instanceMatrix.array.set(matrices)
    m.instanceMatrix.needsUpdate = true
  }, [matrices])

  const onBeforeCompile = useMemo(
    () => (shader) => {
      shader.uniforms.uTime = timeRef.current
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float ph = instanceMatrix[3].x * 0.9 + instanceMatrix[3].z * 0.7;
          float w = smoothstep(0.0, 0.3, position.y);
          transformed.x += (sin(uTime * 1.1 + ph) * 0.06 + sin(uTime * 2.3 + ph * 1.7) * 0.02) * w;
          transformed.z += cos(uTime * 0.8 + ph * 1.3) * 0.03 * w;`,
        )
    },
    [],
  )

  useFrame((state) => { if (!reducedMotion) timeRef.current.value = state.clock.elapsedTime })

  return (
    <instancedMesh ref={mesh} args={[geo, undefined, count]} frustumCulled={false}>
      <instancedBufferAttribute attach="instanceColor" args={[colors, 3]} />
      <meshLambertMaterial vertexColors side={THREE.DoubleSide} onBeforeCompile={onBeforeCompile} emissive="#ffffff" emissiveIntensity={grass ? 0.04 : 0.2} />
    </instancedMesh>
  )
}

// ── Pollen, fireflies, light rays, shooting star ────────────────────────────
function Pollen({ count }) {
  const ref = useRef()
  const tex = useMemo(() => makeGlowTexture(64, 'rgba(255,240,200,1)'), [])
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16
      positions[i * 3 + 1] = Math.random() * 3
      positions[i * 3 + 2] = -10 + Math.random() * 14
      speeds[i] = 0.05 + Math.random() * 0.12
    }
    return { positions, speeds }
  }, [count])
  useFrame((state, dt) => {
    const geo = ref.current?.geometry
    if (!geo || reducedMotion) return
    const a = geo.attributes.position.array
    const t = state.clock.elapsedTime
    for (let i = 0; i < count; i++) {
      a[i * 3] += Math.sin(t * 0.4 + i) * 0.003
      a[i * 3 + 1] += speeds[i] * dt * (0.5 + 0.5 * Math.sin(t * 0.3 + i))
      if (a[i * 3 + 1] > 3.2) a[i * 3 + 1] = 0.05
    }
    geo.attributes.position.needsUpdate = true
  })
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial map={tex} alphaTest={0.01} color="#fff0c8" size={0.05} sizeAttenuation transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

function Fireflies({ count = 18 }) {
  const refs = useRef([])
  const tex = useMemo(() => makeGlowTexture(64, 'rgba(255,230,150,1)'), [])
  const items = useMemo(
    () => Array.from({ length: count }, (_, i) => ({ x: (Math.random() - 0.5) * 20, y: 0.4 + Math.random() * 1.6, z: -14 + Math.random() * 12, ph: i * 1.7, sp: 0.6 + Math.random() })),
    [count],
  )
  useFrame((state) => {
    const t = state.clock.elapsedTime
    refs.current.forEach((s, i) => {
      if (!s) return
      const it = items[i]
      s.position.set(it.x + Math.sin(t * 0.3 * it.sp + it.ph) * 0.8, it.y + Math.sin(t * 0.5 * it.sp + it.ph * 2) * 0.3, it.z + Math.cos(t * 0.25 * it.sp + it.ph) * 0.8)
      s.material.opacity = Math.max(0, Math.sin(t * it.sp * 1.3 + it.ph)) * 0.9
    })
  })
  return items.map((it, i) => (
    <sprite key={i} ref={(el) => (refs.current[i] = el)} scale={0.16}>
      <spriteMaterial map={tex} color="#ffe6a0" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  ))
}

function LightRays({ sun, nightRef }) {
  const group = useRef()
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 64; c.height = 512
    const ctx = c.getContext('2d')
    const g = ctx.createLinearGradient(0, 0, 0, 512)
    g.addColorStop(0, 'rgba(255,220,170,0.55)')
    g.addColorStop(0.5, 'rgba(255,200,150,0.18)')
    g.addColorStop(1, 'rgba(255,200,150,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 512)
    const h = ctx.createLinearGradient(0, 0, 64, 0)
    h.addColorStop(0, 'rgba(0,0,0,0)'); h.addColorStop(0.5, 'rgba(0,0,0,1)'); h.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalCompositeOperation = 'destination-in'
    ctx.fillStyle = h
    ctx.fillRect(0, 0, 64, 512)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  const rays = useMemo(() => Array.from({ length: 6 }, (_, i) => ({ a: -0.55 + i * 0.22 + (Math.random() - 0.5) * 0.1, w: 2.5 + Math.random() * 3, sp: 0.05 + Math.random() * 0.05 })), [])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (!group.current) return
    group.current.children.forEach((m, i) => {
      m.rotation.z = rays[i].a + Math.sin(t * rays[i].sp + i) * 0.06
      m.material.opacity = (0.3 + Math.sin(t * 0.4 + i * 1.3) * 0.12) * (1 - (nightRef?.current || 0))
    })
  })
  return (
    <group ref={group} position={sun}>
      {rays.map((r, i) => (
        <mesh key={i} rotation={[0, 0, r.a]}>
          <planeGeometry args={[r.w, 46]} />
          <meshBasicMaterial map={tex} transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
        </mesh>
      ))}
    </group>
  )
}

function ShootingStar({ at = [9, 2.5], nightRef }) {
  const mesh = useRef()
  const { sceneStart } = useJourney()
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256; c.height = 16
    const ctx = c.getContext('2d')
    const g = ctx.createLinearGradient(0, 0, 256, 0)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(0.85, 'rgba(255,240,230,0.7)')
    g.addColorStop(1, 'rgba(255,255,255,1)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 16)
    return new THREE.CanvasTexture(c)
  }, [])
  useFrame(() => {
    const m = mesh.current
    if (!m) return
    const e = (performance.now() - sceneStart) / 1000
    let vis = 0
    for (const t0 of at) {
      const k = (e - t0) / 1.4
      if (k >= 0 && k <= 1) {
        const x = 14 - k * 26
        const y = 15 - k * 6
        m.position.set(x, y, -40)
        m.rotation.z = Math.atan2(-6, -26)
        vis = Math.sin(k * Math.PI)
      }
    }
    m.visible = vis > 0.01
    m.material.opacity = vis * 0.9
  })
  return (
    <mesh ref={mesh} visible={false}>
      <planeGeometry args={[6, 0.14]} />
      <meshBasicMaterial map={tex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
    </mesh>
  )
}

// ── The meadow ──────────────────────────────────────────────────────────────
export default function Meadow({ origin, onKittenArrived }) {
  const { phase } = useJourney()
  const nightRef = useRef(0)
  const sun = useMemo(() => new THREE.Vector3(-13, 4.2, -42), [])
  const sunTex = useMemo(() => makeGlowTexture(256, 'rgba(255,214,150,1)'), [])
  const sunCore = useRef()
  const sunGlow = useRef()
  const lights = useRef()
  const flowerCount = reducedMotion ? 900 : isMobile ? 1300 : 3200

  useFrame((state, dt) => {
    const target = phase === 'night' ? 1 : 0
    nightRef.current += (target - nightRef.current) * (1 - Math.exp(-0.9 * dt))
    const n = nightRef.current
    if (sunCore.current) {
      sunCore.current.material.opacity = 0.9 * (1 - n)
      sunCore.current.scale.setScalar(3.2 + Math.sin(state.clock.elapsedTime * 0.5) * 0.15)
    }
    if (sunGlow.current) sunGlow.current.material.opacity = 0.45 * (1 - n)
    if (lights.current) {
      lights.current.children.forEach((l) => { if (l.userData.base !== undefined) l.intensity = l.userData.base * (1 - n * 0.85) })
    }
  })

  return (
    <group position={origin}>
      <SkyDome nightRef={nightRef} sunDir={sun} />
      {/* sun */}
      <sprite ref={sunGlow} position={sun} scale={15}>
        <spriteMaterial map={sunTex} color="#ff9a5c" transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </sprite>
      <sprite ref={sunCore} position={sun} scale={3.2}>
        <spriteMaterial map={sunTex} color="#ffe9c4" transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </sprite>
      <LightRays sun={[sun.x, sun.y, sun.z + 0.5]} nightRef={nightRef} />
      <Clouds center={[0, 9, -30]} count={14} colors={['#ffc7b8', '#ffd9c2', '#f5c3e0', '#e7c7ff', '#ffe0cc']} spread={[70, 10, 20]} />
      <Hills />
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -10]} receiveShadow>
        <planeGeometry args={[160, 120]} />
        <meshLambertMaterial color="#5c8f4a" />
      </mesh>
      <Flowers count={flowerCount} />
      <Flowers count={Math.round(flowerCount * 1.6)} grass />
      <Pollen count={reducedMotion ? 120 : isMobile ? 220 : 420} />
      <Fireflies count={isMobile ? 10 : 18} />
      <ShootingStar at={[8.6, 15.5]} nightRef={nightRef} />
      <Kitten onArrived={onKittenArrived} />
      {/* lighting: low warm sun, pink sky, green bounce */}
      <group ref={lights}>
        <hemisphereLight args={['#ffb8d0', '#5a8a4a', 0.9]} userData={{ base: 0.9 }} />
        <directionalLight position={[-14, 5, -30]} intensity={2.4} color="#ffc08a" userData={{ base: 2.4 }} />
        <directionalLight position={[6, 6, 8]} intensity={0.7} color="#ffe6f0" userData={{ base: 0.7 }} />
        <ambientLight intensity={0.35} color="#8a6cff" />
      </group>
    </group>
  )
}
