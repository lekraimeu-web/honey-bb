import * as THREE from 'three'

// Procedural textures drawn on canvases: no image downloads, instant startup.

export function makeGlowTexture(size = 256, inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, inner)
  g.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.55)'))
  g.addColorStop(0.6, inner.replace(/[\d.]+\)$/, '0.12)'))
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// A soft, lumpy nebula/cloud blob made from many overlapping radial gradients.
export function makeNebulaTexture(size = 512, seed = 1) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  let s = seed * 9301 + 49297
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  ctx.globalCompositeOperation = 'lighter'
  const blobs = 26
  for (let i = 0; i < blobs; i++) {
    const r = size * (0.12 + rnd() * 0.22)
    const x = size / 2 + (rnd() - 0.5) * size * 0.55
    const y = size / 2 + (rnd() - 0.5) * size * 0.55
    const a = 0.05 + rnd() * 0.08
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(255,255,255,${a})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // Fade edges to zero so sprites never show a square.
  ctx.globalCompositeOperation = 'destination-in'
  const edge = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size / 2)
  edge.addColorStop(0, 'rgba(0,0,0,1)')
  edge.addColorStop(0.75, 'rgba(0,0,0,0.6)')
  edge.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = edge
  ctx.fillRect(0, 0, size, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// Fluffy, brighter cloud puff for the dawn gallery.
export function makeCloudTexture(size = 512, seed = 7) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  let s = seed * 7919 + 104729
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 40; i++) {
    const r = size * (0.08 + rnd() * 0.16)
    const x = size / 2 + (rnd() - 0.5) * size * 0.6
    const y = size * 0.55 + (rnd() - 0.5) * size * 0.35
    const a = 0.08 + rnd() * 0.1
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(255,255,255,${a})`)
    g.addColorStop(0.6, `rgba(255,255,255,${a * 0.4})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'destination-in'
  const edge = ctx.createRadialGradient(size / 2, size / 2, size * 0.15, size / 2, size / 2, size / 2)
  edge.addColorStop(0, 'rgba(0,0,0,1)')
  edge.addColorStop(0.7, 'rgba(0,0,0,0.5)')
  edge.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = edge
  ctx.fillRect(0, 0, size, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
