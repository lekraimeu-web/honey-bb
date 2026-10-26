import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { quality, reducedMotion } from '../config/quality'
import { pointer } from '../hooks/usePointer'
import { makeGlowTexture } from './textures'

// 2D heart outline (classic parametric curve), normalised to about [-1, 1].
function heartCurve(t) {
  const x = 16 * Math.pow(Math.sin(t), 3)
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
  return [x / 16, (y + 2.5) / 16]
}

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uBurst;
  uniform float uHover;
  uniform float uPixelRatio;
  attribute float aRand;
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Double heartbeat: strong thump, softer second thump.
    float ph = fract(uTime * 0.95);
    float beat = exp(-ph * 9.0) + 0.55 * exp(-max(ph - 0.28, 0.0) * 11.0) * step(0.28, ph);
    vec3 p = position * (1.0 + 0.045 * beat + 0.05 * uHover);

    // Gentle shimmer along the surface.
    vec3 dir = normalize(position + vec3(0.0, 0.0001, 0.0));
    p += dir * sin(uTime * 2.0 + aRand * 6.2831) * 0.012;

    // Burst: fly outward with a bit of swirl, used by the finale.
    float b = uBurst * uBurst;
    p += dir * b * (2.5 + aRand * 9.0);
    p += vec3(sin(aRand * 17.0 + uTime * 0.8), cos(aRand * 13.0 + uTime * 0.6), sin(aRand * 7.0 + uTime * 0.5)) * b * 2.2;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = aSize * uPixelRatio * (1.0 + 0.35 * uHover + 0.4 * beat * 0.3) * (1.0 - 0.45 * b);
    gl_PointSize = size * (30.0 / -mv.z);
    vColor = aColor;
    vAlpha = (0.78 + 0.22 * sin(uTime * 3.0 + aRand * 25.0)) * (1.0 - 0.55 * b);
  }
`
const fragment = /* glsl */ `
  uniform float uHover;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.08, d);
    float core = smoothstep(0.22, 0.0, d);
    vec3 c = vColor * (1.15 + core * 1.1 + uHover * 0.5);
    gl_FragColor = vec4(c, a * vAlpha);
  }
`

// Tiny motes circling the heart on three tilted orbits, plus a few golden
// sparkles drifting inside it: the heart looks like it holds a small universe.
function HeartOrbits({ burst }) {
  const groups = useRef([])
  const tex = useMemo(() => makeGlowTexture(64, 'rgba(255,220,255,1)'), [])
  const rings = useMemo(
    () =>
      [
        { r: 1.35, n: 160, tilt: [0.5, 0, 0.2], speed: 0.25, color: '#ffb3e6', size: 0.045 },
        { r: 1.6, n: 120, tilt: [-0.9, 0.4, 0], speed: -0.17, color: '#c9a6ff', size: 0.04 },
        { r: 1.85, n: 90, tilt: [1.3, -0.3, 0.6], speed: 0.11, color: '#ffd9a0', size: 0.035 },
      ].map((d) => {
        const pos = new Float32Array(d.n * 3)
        for (let i = 0; i < d.n; i++) {
          const a = Math.random() * Math.PI * 2
          const r = d.r + (Math.random() - 0.5) * 0.18
          pos[i * 3] = Math.cos(a) * r
          pos[i * 3 + 1] = (Math.random() - 0.5) * 0.08
          pos[i * 3 + 2] = Math.sin(a) * r
        }
        return { ...d, pos }
      }),
    [],
  )
  const inner = useMemo(() => {
    const n = 140
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const [hx, hy] = heartCurve(Math.random() * Math.PI * 2)
      const k = Math.random() * 0.85
      pos[i * 3] = hx * k
      pos[i * 3 + 1] = hy * k
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.5 * k
    }
    return pos
  }, [])
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    groups.current.forEach((g, i) => {
      if (!g) return
      g.rotation.y += rings[i].speed * dt * (reducedMotion ? 0 : 1)
      g.scale.setScalar(1 + burst * 3)
      g.children[0].material.opacity = 0.75 * (1 - burst)
    })
  })
  return (
    <>
      {rings.map((d, i) => (
        <group key={i} ref={(el) => (groups.current[i] = el)} rotation={d.tilt}>
          <points frustumCulled={false}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[d.pos, 3]} />
            </bufferGeometry>
            <pointsMaterial map={tex} alphaTest={0.01} color={d.color} size={d.size} sizeAttenuation transparent opacity={0.75} depthWrite={false} blending={THREE.AdditiveBlending} />
          </points>
        </group>
      ))}
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[inner, 3]} />
        </bufferGeometry>
        <pointsMaterial map={tex} alphaTest={0.01} color="#ffe2a8" size={0.035} sizeAttenuation transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </>
  )
}

export default function ParticleHeart({ onActivate, interactive = true, burst = 0, position = [0, 0, 0], scale = 1 }) {
  const group = useRef()
  const mat = useRef()
  const glow = useRef()
  const [hover, setHover] = useState(false)
  const hoverV = useRef(0)

  const { positions, rands, sizes, colors } = useMemo(() => {
    const rows = quality.heartRows
    const rings = quality.heartRings
    const n = rows * rings
    const positions = new Float32Array(n * 3)
    const rands = new Float32Array(n)
    const sizes = new Float32Array(n)
    const colors = new Float32Array(n * 3)
    const cA = new THREE.Color('#ff2d9b') // magenta
    const cB = new THREE.Color('#ff8a3d') // warm orange
    const cC = new THREE.Color('#b55bff') // violet
    const cD = new THREE.Color('#ffd27a') // gold
    const tmp = new THREE.Color()
    let i = 0
    for (let r = 0; r < rings; r++) {
      const v = (r + 0.5) / rings
      const z = v * 2 - 1
      const s = Math.sqrt(Math.max(0, 1 - z * z))
      for (let k = 0; k < rows; k++) {
        const t = (k / rows) * Math.PI * 2 + (r % 2) * (Math.PI / rows)
        const [hx, hy] = heartCurve(t)
        positions[i * 3] = hx * s
        positions[i * 3 + 1] = hy * s
        positions[i * 3 + 2] = z * 0.62
        rands[i] = Math.random()
        sizes[i] = 1.3 + Math.random() * 1.6
        // Colour: bottom tip magenta → upper lobes orange/gold, with violet accents.
        const yy = THREE.MathUtils.clamp((hy + 0.9) / 1.7, 0, 1)
        tmp.copy(cA).lerp(cB, yy)
        if (Math.random() < 0.18) tmp.lerp(cC, 0.7)
        if (Math.random() < 0.1) tmp.lerp(cD, 0.8)
        colors[i * 3] = tmp.r
        colors[i * 3 + 1] = tmp.g
        colors[i * 3 + 2] = tmp.b
        i++
      }
    }
    return { positions, rands, sizes, colors }
  }, [])

  const glowTex = useMemo(() => makeGlowTexture(256, 'rgba(255,90,170,1)'), [])
  // Stable uniforms object: a new object on each render would detach the
  // material from the values written in useFrame.
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBurst: { value: 0 },
      uHover: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    }),
    [],
  )

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    if (mat.current) {
      mat.current.uniforms.uTime.value = t
      hoverV.current += ((hover && interactive ? 1 : 0) - hoverV.current) * (1 - Math.exp(-6 * dt))
      mat.current.uniforms.uHover.value = hoverV.current
      mat.current.uniforms.uBurst.value += (burst - mat.current.uniforms.uBurst.value) * (1 - Math.exp(-1.2 * dt))
    }
    if (group.current) {
      const drift = reducedMotion ? 0 : 1
      group.current.position.y = position[1] + Math.sin(t * 0.7) * 0.08 * drift
      // Lean gently towards the pointer.
      const rx = -pointer.sy * 0.25 * drift
      const ry = pointer.sx * 0.45 * drift + Math.sin(t * 0.25) * 0.12 * drift
      group.current.rotation.x += (rx - group.current.rotation.x) * (1 - Math.exp(-3 * dt))
      group.current.rotation.y += (ry - group.current.rotation.y) * (1 - Math.exp(-3 * dt))
    }
    if (glow.current) {
      const ph = (t * 0.95) % 1
      const beat = Math.exp(-ph * 9) + 0.55 * Math.exp(-Math.max(ph - 0.28, 0) * 11) * (ph > 0.28 ? 1 : 0)
      const s = (3.6 + beat * 0.5 + hoverV.current * 0.6) * (1 - burst * 0.6)
      glow.current.scale.setScalar(s * scale)
      glow.current.material.opacity = (0.35 + beat * 0.12 + hoverV.current * 0.2) * (1 - burst)
    }
  })

  return (
    <group ref={group} position={position} scale={scale}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aRand" args={[rands, 1]} />
          <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
          <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        </bufferGeometry>
        <shaderMaterial
          ref={mat}
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <HeartOrbits burst={burst} />
      {/* Soft luminous core */}
      <sprite ref={glow} position={[0, 0.05, 0]}>
        <spriteMaterial map={glowTex} transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} color="#ff4fae" />
      </sprite>
      {/* Invisible hit area for hover / tap */}
      {interactive && (
        <mesh
          onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}
          onClick={(e) => { e.stopPropagation(); onActivate && onActivate() }}
        >
          <sphereGeometry args={[1.05, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}
