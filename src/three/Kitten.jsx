import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useJourney } from '../state/journey'
import { meadow as T } from '../content/texts'
import { meow } from '../audio/sfx'

// A small white kitten built from smooth primitives and animated procedurally:
// walk cycle, breathing, blinking, ear twitches, tail wave, head tracking.
// (No external model: everything is generated at runtime.)

// ── Direction script: where the kitten is and what it does, second by second ─
const SCRIPT = [
  { t: 0.0,  x: -1.7, z: -9.6, head: 'down' },
  { t: 1.6,  x: -1.7, z: -9.6, head: 'down' },
  { t: 2.5,  x: -1.7, z: -9.6, head: 'camera', perk: true },
  { t: 3.8,  x: -1.7, z: -9.6, head: 'camera' },
  { t: 7.6,  x: -0.5, z: -4.6, head: 'camera' },            // walks
  { t: 8.9,  x: -0.5, z: -4.6, head: 'camera', tilt: true },// curious pause
  { t: 12.2, x: 0.2, z: 0.75, head: 'camera' },             // walks close
  { t: 13.0, x: 0.2, z: 0.75, head: 'camera', sit: true, happy: true },
]
const MEOWS = [
  { t: 2.9, pitch: 1.05, vol: 0.14 },
  { t: 8.2, pitch: 0.95, vol: 0.13 },
  { t: 13.3, pitch: 1.15, vol: 0.11 },
]
const ARRIVE_AT = 13.4

const smooth = (x) => x * x * (3 - 2 * x)

function makeTagTexture(text) {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 300
  const ctx = c.getContext('2d')
  // gold tag with rounded corners
  const r = 60
  ctx.beginPath()
  ctx.moveTo(r, 0); ctx.lineTo(512 - r, 0); ctx.quadraticCurveTo(512, 0, 512, r)
  ctx.lineTo(512, 300 - r); ctx.quadraticCurveTo(512, 300, 512 - r, 300)
  ctx.lineTo(r, 300); ctx.quadraticCurveTo(0, 300, 0, 300 - r)
  ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.closePath()
  const g = ctx.createLinearGradient(0, 0, 512, 300)
  g.addColorStop(0, '#f9dc8a'); g.addColorStop(0.5, '#e8b94c'); g.addColorStop(1, '#f7d67a')
  ctx.fillStyle = g; ctx.fill()
  ctx.lineWidth = 10; ctx.strokeStyle = '#b8862c'; ctx.stroke()
  // ring hole
  ctx.beginPath(); ctx.arc(256, 36, 16, 0, Math.PI * 2); ctx.fillStyle = '#7a5a1c'; ctx.fill()
  // engraved text (two lines)
  ctx.fillStyle = '#5a3a12'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const words = text.split(' ')
  const line1 = words.slice(0, 2).join(' ')
  const line2 = words.slice(2).join(' ')
  ctx.font = '600 72px "Cormorant Garamond", Georgia, serif'
  ctx.fillText(line1, 256, line2 ? 128 : 165)
  if (line2) { ctx.font = 'italic 600 88px "Cormorant Garamond", Georgia, serif'; ctx.fillText(line2, 256, 220) }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

export default function Kitten({ onArrived }) {
  const { sceneStart, scene } = useJourney()
  const camera = useThree((s) => s.camera)
  const root = useRef()
  const body = useRef()
  const head = useRef()
  const earL = useRef(); const earR = useRef()
  const eyeL = useRef(); const eyeR = useRef()
  const legs = useRef([])
  const tail = useRef([])
  const tagRef = useRef()
  const state = useRef({ walkPhase: 0, blink: 0, nextBlink: 2.5, meowed: new Set(), arrived: false, earTwitch: 0 })

  const fur = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: '#fffaf5', roughness: 0.95, metalness: 0, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.7, clearcoat: 0, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.1 }),
    [],
  )
  const pink = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ff9fb4', roughness: 0.8 }), [])
  const eyeMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#1b1a2a', roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }), [])
  const irisMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6aa5c9', roughness: 0.3, emissive: '#1b3a55', emissiveIntensity: 0.4 }), [])
  const shine = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff' }), [])
  const collar = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ff6fa8', roughness: 0.5 }), [])
  const whisker = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f4eef0', transparent: true, opacity: 0.7 }), [])
  const tagTex = useMemo(() => makeTagTexture(T.collarTag), [])

  // Fonts may finish loading after the first draw; redraw the tag once they do.
  useEffect(() => {
    let alive = true
    document.fonts?.ready.then(() => {
      if (!alive || !tagRef.current) return
      const t = makeTagTexture(T.collarTag)
      tagRef.current.material.map = t
      tagRef.current.material.needsUpdate = true
    })
    return () => { alive = false }
  }, [])

  const tmp = useMemo(() => ({ v: new THREE.Vector3(), q: new THREE.Quaternion(), e: new THREE.Euler(), m: new THREE.Matrix4(), look: new THREE.Vector3() }), [])

  useFrame((fs, dt) => {
    const g = root.current
    if (!g) return
    const S = state.current
    const e = scene === 'meadow' ? (performance.now() - sceneStart) / 1000 : 0
    const clock = fs.clock.elapsedTime

    // ── position along the script ──
    let i = 0
    while (i < SCRIPT.length - 1 && SCRIPT[i + 1].t <= e) i++
    const a = SCRIPT[i]
    const b = SCRIPT[Math.min(i + 1, SCRIPT.length - 1)]
    const span = Math.max(0.0001, b.t - a.t)
    const k = smooth(THREE.MathUtils.clamp((e - a.t) / span, 0, 1))
    const x = THREE.MathUtils.lerp(a.x, b.x, k)
    const z = THREE.MathUtils.lerp(a.z, b.z, k)
    const moving = (a.x !== b.x || a.z !== b.z) && k > 0 && k < 1
    const speed = moving ? Math.hypot(b.x - a.x, b.z - a.z) / span : 0
    const cur = k < 1 ? a : b
    const sitting = !!cur.sit
    const happy = !!cur.happy

    g.position.x = x
    g.position.z = z

    // ── facing: direction of travel while walking, else toward the camera ──
    let yaw
    if (moving) yaw = Math.atan2(b.x - a.x, b.z - a.z)
    else {
      g.getWorldPosition(tmp.v)
      yaw = Math.atan2(camera.position.x - tmp.v.x, camera.position.z - tmp.v.z)
    }
    let dy = yaw - g.rotation.y
    dy = Math.atan2(Math.sin(dy), Math.cos(dy))
    g.rotation.y += dy * (1 - Math.exp(-4 * dt))

    // ── walk cycle ──
    if (moving) S.walkPhase += dt * (6 + speed * 3)
    const wp = S.walkPhase
    const gait = moving ? 1 : 0
    const swing = 0.55
    legs.current.forEach((leg, n) => {
      if (!leg) return
      const sign = n === 0 || n === 3 ? 1 : -1 // diagonal pairs
      const target = sitting && n >= 2 ? -1.35 : Math.sin(wp) * swing * sign * gait
      leg.rotation.x += (target - leg.rotation.x) * (1 - Math.exp(-8 * dt))
      // sitting: hind legs fold under
      const ty = sitting && n >= 2 ? 0.06 : 0.12
      leg.position.y += (ty - leg.position.y) * (1 - Math.exp(-6 * dt))
    })

    // ── body: bob while walking, breathing always, lower rump when sitting ──
    if (body.current) {
      const bob = Math.abs(Math.sin(wp * 2)) * 0.02 * gait
      const breath = Math.sin(clock * 2.1) * 0.012
      body.current.position.y = 0.3 + bob
      body.current.scale.set(1, 1 + breath, 1 + breath * 0.5)
      const sitTilt = sitting ? -0.42 : 0
      body.current.rotation.x += (sitTilt - body.current.rotation.x) * (1 - Math.exp(-5 * dt))
      body.current.position.z = sitting ? -0.06 : 0
    }

    // ── head: down / toward camera, tilt, happy squint ──
    if (head.current) {
      head.current.getWorldPosition(tmp.v)
      let rx = 0, ry = 0, rz = 0
      if (cur.head === 'down') { rx = 0.55; ry = Math.sin(clock * 1.7) * 0.25 }
      else {
        // look at the camera (limited angles, relative to body yaw)
        tmp.look.copy(camera.position).sub(tmp.v)
        const bodyYaw = g.rotation.y
        const dx = tmp.look.x, dz = tmp.look.z
        const worldYaw = Math.atan2(dx, dz)
        ry = THREE.MathUtils.clamp(Math.atan2(Math.sin(worldYaw - bodyYaw), Math.cos(worldYaw - bodyYaw)), -1.1, 1.1)
        rx = THREE.MathUtils.clamp(-Math.atan2(tmp.look.y, Math.hypot(dx, dz)), -0.9, 0.5)
      }
      if (cur.tilt) rz = Math.sin(Math.min(1, (e - cur.t) * 1.5) * Math.PI) * 0.35
      if (happy) rz = 0.18 + Math.sin(clock * 0.8) * 0.05
      const kk = 1 - Math.exp(-5 * dt)
      head.current.rotation.x += (rx - head.current.rotation.x) * kk
      head.current.rotation.y += (ry - head.current.rotation.y) * kk
      head.current.rotation.z += (rz - head.current.rotation.z) * kk
      head.current.position.y += ((cur.head === 'down' ? 0.42 : 0.52) + Math.abs(Math.sin(wp * 2)) * 0.012 * gait - head.current.position.y) * kk
    }

    // ── blink / happy eyes ──
    S.nextBlink -= dt
    if (S.nextBlink <= 0) { S.blink = 0.16; S.nextBlink = 2.2 + Math.random() * 3 }
    if (S.blink > 0) S.blink -= dt
    const open = S.blink > 0 ? 0.08 : happy ? 0.42 : 1
    ;[eyeL, eyeR].forEach((r) => { if (r.current) r.current.scale.y += (open - r.current.scale.y) * (1 - Math.exp(-18 * dt)) })

    // ── ears: perk when noticing, little twitches ──
    S.earTwitch -= dt
    if (S.earTwitch <= 0) S.earTwitch = 3 + Math.random() * 4
    const twitch = S.earTwitch < 0.25 ? Math.sin((0.25 - S.earTwitch) / 0.25 * Math.PI) * 0.25 : 0
    const perk = cur.head === 'down' ? 0.35 : 0
    if (earL.current) { earL.current.rotation.z = 0.45 + perk + twitch; earL.current.rotation.x = -0.15 }
    if (earR.current) { earR.current.rotation.z = -0.45 - perk; earR.current.rotation.x = -0.15 }

    // ── tail: a chain of beads following a wave ──
    const swish = sitting ? 0.9 : happy ? 1.2 : moving ? 0.6 : 1.4
    tail.current.forEach((bead, n) => {
      if (!bead) return
      const u = n / (tail.current.length - 1)
      const wave = Math.sin(clock * 2.2 * swish + u * 3.2) * 0.14 * u
      const lift = sitting ? 0.05 : 0.22
      bead.position.set(wave + (sitting ? u * 0.25 : 0), 0.3 + lift * Math.sin(u * 1.4) - (sitting ? u * 0.18 : 0), -0.3 - u * 0.36)
    })

    if (typeof window !== 'undefined') window.__kitten = { e: +e.toFixed(2), x: +x.toFixed(2), z: +z.toFixed(2), moving, sitting }
    // ── meows & arrival ──
    MEOWS.forEach((m, n) => { if (e >= m.t && !S.meowed.has(n)) { S.meowed.add(n); meow(m.pitch, m.vol) } })
    if (e >= ARRIVE_AT && !S.arrived) { S.arrived = true; onArrived && onArrived() }
  })

  return (
    <group ref={root} position={[SCRIPT[0].x, 0, SCRIPT[0].z]}>
      <pointLight position={[0.6, 1.1, 1.2]} intensity={2.2} color="#fff1e6" distance={4} decay={2} />
      {/* body */}
      <group ref={body} position={[0, 0.3, 0]}>
        <mesh material={fur} castShadow>
          <sphereGeometry args={[0.22, 28, 20]} />
        </mesh>
        <mesh material={fur} position={[0, 0.02, 0.16]} scale={[0.85, 0.85, 0.9]}>
          <sphereGeometry args={[0.19, 24, 18]} />
        </mesh>
        {/* belly / rump */}
        <mesh material={fur} position={[0, -0.02, -0.12]} scale={[0.95, 0.9, 1]}>
          <sphereGeometry args={[0.2, 24, 18]} />
        </mesh>
      </group>
      {/* legs: front-left, front-right, back-left, back-right */}
      {[[-0.1, 0.17], [0.1, 0.17], [-0.1, -0.16], [0.1, -0.16]].map(([lx, lz], n) => (
        <group key={n} ref={(el) => (legs.current[n] = el)} position={[lx, 0.12, lz]}>
          <mesh material={fur} position={[0, -0.05, 0]}>
            <capsuleGeometry args={[0.045, 0.12, 4, 10]} />
          </mesh>
          <mesh material={fur} position={[0, -0.13, 0.015]} scale={[1, 0.6, 1.2]}>
            <sphereGeometry args={[0.05, 12, 10]} />
          </mesh>
        </group>
      ))}
      {/* tail */}
      {Array.from({ length: 9 }, (_, n) => (
        <mesh key={n} ref={(el) => (tail.current[n] = el)} material={fur} position={[0, 0.3, -0.3 - n * 0.04]}>
          <sphereGeometry args={[0.045 - n * 0.0025, 10, 8]} />
        </mesh>
      ))}
      {/* head */}
      <group ref={head} position={[0, 0.52, 0.26]}>
        <mesh material={fur}>
          <sphereGeometry args={[0.2, 32, 24]} />
        </mesh>
        {/* cheeks + muzzle */}
        <mesh material={fur} position={[-0.07, -0.06, 0.14]}>
          <sphereGeometry args={[0.075, 16, 12]} />
        </mesh>
        <mesh material={fur} position={[0.07, -0.06, 0.14]}>
          <sphereGeometry args={[0.075, 16, 12]} />
        </mesh>
        <mesh material={fur} position={[0, -0.1, 0.12]} scale={[1.2, 0.8, 1]}>
          <sphereGeometry args={[0.07, 16, 12]} />
        </mesh>
        {/* nose */}
        <mesh material={pink} position={[0, -0.03, 0.205]} scale={[1.2, 0.8, 0.7]}>
          <sphereGeometry args={[0.024, 12, 10]} />
        </mesh>
        {/* eyes: big, dark, glossy, with a soft blue iris and two highlights */}
        {[-1, 1].map((s) => (
          <group key={s} ref={s < 0 ? eyeL : eyeR} position={[s * 0.082, 0.035, 0.16]}>
            <mesh material={eyeMat} scale={[1, 1.15, 0.7]}>
              <sphereGeometry args={[0.05, 20, 16]} />
            </mesh>
            <mesh material={irisMat} position={[0, 0, 0.028]} scale={[1, 1.1, 0.4]}>
              <sphereGeometry args={[0.028, 14, 12]} />
            </mesh>
            <mesh material={shine} position={[-0.016 * s + 0.012, 0.022, 0.042]}>
              <sphereGeometry args={[0.013, 8, 8]} />
            </mesh>
            <mesh material={shine} position={[0.014 * s, -0.016, 0.042]}>
              <sphereGeometry args={[0.006, 8, 8]} />
            </mesh>
          </group>
        ))}
        {/* ears */}
        <group ref={earL} position={[-0.12, 0.15, -0.02]}>
          <mesh material={fur} rotation={[0, 0, 0]}>
            <coneGeometry args={[0.065, 0.15, 12]} />
          </mesh>
          <mesh material={pink} position={[0, -0.01, 0.012]} scale={[0.6, 0.7, 0.6]}>
            <coneGeometry args={[0.065, 0.15, 12]} />
          </mesh>
        </group>
        <group ref={earR} position={[0.12, 0.15, -0.02]}>
          <mesh material={fur}>
            <coneGeometry args={[0.065, 0.15, 12]} />
          </mesh>
          <mesh material={pink} position={[0, -0.01, 0.012]} scale={[0.6, 0.7, 0.6]}>
            <coneGeometry args={[0.065, 0.15, 12]} />
          </mesh>
        </group>
        {/* whiskers */}
        {[-1, 1].map((s) =>
          [-0.05, 0, 0.05].map((dy, n) => (
            <mesh key={`${s}${n}`} material={whisker} position={[s * 0.19, -0.05 + dy * 0.4, 0.15]} rotation={[0, 0, s * Math.PI / 2 + dy * 4 * s]}>
              <cylinderGeometry args={[0.0008, 0.002, 0.17, 4]} />
            </mesh>
          )),
        )}
        {/* collar + tag */}
        <mesh material={collar} position={[0, -0.16, -0.02]} rotation={[Math.PI / 2 + 0.25, 0, 0]}>
          <torusGeometry args={[0.165, 0.022, 10, 36]} />
        </mesh>
        <mesh ref={tagRef} position={[0, -0.23, 0.17]} rotation={[-0.25, 0, 0]}>
          <planeGeometry args={[0.15, 0.088]} />
          <meshStandardMaterial map={tagTex} roughness={0.35} metalness={0.4} side={THREE.DoubleSide} transparent />
        </mesh>
      </group>
    </group>
  )
}
