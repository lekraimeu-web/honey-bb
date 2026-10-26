import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { quality } from '../config/quality'

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uFade;
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.65 + 0.35 * sin(uTime * (0.6 + aPhase * 1.4) + aPhase * 40.0);
    vTwinkle = tw * uFade;
    vColor = aColor;
    gl_PointSize = aSize * uPixelRatio * tw * (260.0 / -mv.z);
  }
`
const fragment = /* glsl */ `
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.05, d);
    float core = smoothstep(0.2, 0.0, d);
    gl_FragColor = vec4(vColor * (1.0 + core * 0.8), a * vTwinkle);
  }
`

// Thousands of softly twinkling stars on a far dome around the camera.
export default function Starfield({ fade = 1 }) {
  const mat = useRef()
  const { positions, sizes, phases, colors } = useMemo(() => {
    const n = quality.stars
    const positions = new Float32Array(n * 3)
    const sizes = new Float32Array(n)
    const phases = new Float32Array(n)
    const colors = new Float32Array(n * 3)
    const palette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#fff1e0'),
      new THREE.Color('#cfd8ff'),
      new THREE.Color('#ffb8e6'),
      new THREE.Color('#e9c9ff'),
    ]
    for (let i = 0; i < n; i++) {
      const r = 70 + Math.random() * 60
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.9
      positions[i * 3 + 2] = r * Math.cos(phi)
      sizes[i] = Math.random() < 0.06 ? 2.2 + Math.random() * 2 : 0.6 + Math.random() * 1.2
      phases[i] = Math.random()
      const c = palette[Math.floor(Math.random() * palette.length)]
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    return { positions, sizes, phases, colors }
  }, [])

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uFade: { value: 1 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } }),
    [],
  )

  useFrame((state, dt) => {
    if (!mat.current) return
    mat.current.uniforms.uTime.value = state.clock.elapsedTime
    const u = mat.current.uniforms.uFade
    u.value += (fade - u.value) * (1 - Math.exp(-0.8 * dt))
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
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
  )
}
