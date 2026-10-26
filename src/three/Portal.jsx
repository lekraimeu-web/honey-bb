import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makeGlowTexture } from './textures'
import { reducedMotion } from '../config/quality'

// A luminous portal: layered rotating rings around a swirling disc of light.
// Tapping it opens it (rings fly apart, the disc swells to fill the view).
const discVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const discFrag = /* glsl */ `
  uniform float uTime;
  uniform float uOpen;
  varying vec2 vUv;
  // cheap value noise
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    float a = atan(p.y, p.x);
    // swirl
    float sw = a + r * 3.5 - uTime * 0.6;
    float n = noise(vec2(cos(sw), sin(sw)) * 2.2 + r * 3.0 + uTime * 0.15) * 0.7 + noise(p * 9.0 - uTime * 0.2) * 0.3;
    vec3 violet = vec3(0.45, 0.2, 0.9);
    vec3 rose = vec3(1.0, 0.45, 0.8);
    vec3 gold = vec3(1.0, 0.85, 0.55);
    vec3 col = mix(violet, rose, n);
    col = mix(col, gold, pow(1.0 - r, 3.0) * 0.8);
    float core = smoothstep(0.35, 0.0, r);
    col += vec3(1.0, 0.95, 1.0) * core * (0.6 + uOpen * 1.2);
    float edge = smoothstep(1.0, 0.86, r);
    float alpha = edge * (0.75 + 0.25 * n);
    gl_FragColor = vec4(col * (1.0 + uOpen * 0.25), alpha);
  }
`

export default function Portal({ position = [0, 0, -3.5], open = false, onActivate }) {
  const group = useRef()
  const disc = useRef()
  const rings = useRef([])
  const glow = useRef()
  const [hover, setHover] = useState(false)
  const appear = useRef(0)
  const openV = useRef(0)
  const glowTex = useMemo(() => makeGlowTexture(256, 'rgba(200,150,255,1)'), [])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uOpen: { value: 0 } }), [])
  const ringDefs = useMemo(
    () => [
      { r: 1.0, tube: 0.018, tilt: [0.2, 0, 0], speed: 0.35, color: '#ff8fd0' },
      { r: 1.18, tube: 0.012, tilt: [-0.35, 0.3, 0], speed: -0.22, color: '#b48cff' },
      { r: 1.36, tube: 0.008, tilt: [0.5, -0.4, 0.2], speed: 0.14, color: '#ffd59e' },
    ],
    [],
  )

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    appear.current += (1 - appear.current) * (1 - Math.exp(-1.2 * dt))
    openV.current += ((open ? 1 : 0) - openV.current) * (1 - Math.exp(-1.1 * dt))
    const o = openV.current
    uniforms.uTime.value = t
    uniforms.uOpen.value = o
    const g = group.current
    if (!g) return
    const base = appear.current * (1 + (hover ? 0.05 : 0))
    g.scale.setScalar(base * (1 + o * 7))
    if (!reducedMotion) g.position.y = position[1] + Math.sin(t * 0.7) * 0.06 * (1 - o)
    rings.current.forEach((r, i) => {
      if (!r) return
      const d = ringDefs[i]
      r.rotation.z = t * d.speed
      r.rotation.x = d.tilt[0] + Math.sin(t * 0.3 + i) * 0.15
      r.rotation.y = d.tilt[1] + Math.cos(t * 0.25 + i) * 0.15
      r.scale.setScalar(1 + o * (1.5 + i * 0.6))
      r.material.opacity = (0.9 - o * 0.9)
    })
    if (glow.current) glow.current.material.opacity = 0.5 + Math.sin(t * 1.3) * 0.12 + (hover ? 0.2 : 0)
  })

  return (
    <group ref={group} position={position} scale={0}>
      <sprite ref={glow} scale={3.4}>
        <spriteMaterial map={glowTex} color="#c99cff" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <mesh
        ref={disc}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}
        onClick={(e) => { e.stopPropagation(); if (!open) onActivate && onActivate() }}
      >
        <circleGeometry args={[0.92, 64]} />
        <shaderMaterial vertexShader={discVert} fragmentShader={discFrag} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {ringDefs.map((d, i) => (
        <mesh key={i} ref={(el) => (rings.current[i] = el)} rotation={d.tilt}>
          <torusGeometry args={[d.r, d.tube, 12, 96]} />
          <meshBasicMaterial color={d.color} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}
