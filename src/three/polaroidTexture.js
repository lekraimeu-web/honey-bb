import * as THREE from 'three'

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load ' + url))
    img.src = url
  })
}

let fontsReady
function ensureFonts() {
  if (!fontsReady) {
    fontsReady = Promise.race([
      document.fonts ? document.fonts.load('500 80px Caveat').catch(() => null) : Promise.resolve(),
      new Promise((r) => setTimeout(r, 2500)),
    ])
  }
  return fontsReady
}

function drawHeart(ctx, cx, cy, size) {
  ctx.beginPath()
  const top = cy - size * 0.3
  ctx.moveTo(cx, cy + size * 0.5)
  ctx.bezierCurveTo(cx - size, cy - size * 0.1, cx - size * 0.55, top - size * 0.45, cx, top)
  ctx.bezierCurveTo(cx + size * 0.55, top - size * 0.45, cx + size, cy - size * 0.1, cx, cy + size * 0.5)
  ctx.closePath()
}

// Draws a Polaroid-style frame (paper + photo + handwritten caption) on a
// canvas and returns a texture plus the frame's aspect ratio (width/height).
// The photo is never stretched: the frame adapts to the photo's proportions.
export async function buildPolaroid({ url, caption, missingLabel }) {
  await ensureFonts()
  let img = null
  if (url) {
    try { img = await loadImage(url) } catch { img = null }
  }

  const W = 1000
  const pad = 54
  const photoW = W - pad * 2
  const natural = img ? img.naturalWidth / img.naturalHeight : 1
  const photoH = Math.round(THREE.MathUtils.clamp(photoW / natural, 640, 1240))
  const bottom = caption ? 236 : 150
  const H = pad + photoH + bottom

  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')

  // Paper
  const paper = ctx.createLinearGradient(0, 0, W, H)
  paper.addColorStop(0, '#fdfaf4')
  paper.addColorStop(1, '#f4ecec')
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, W, H)

  // Photo area
  const px = pad, py = pad
  if (img) {
    // "cover" fit: preserve proportions, crop only the tiny overflow if any.
    const scale = Math.max(photoW / img.naturalWidth, photoH / img.naturalHeight)
    const dw = img.naturalWidth * scale
    const dh = img.naturalHeight * scale
    ctx.save()
    ctx.beginPath()
    ctx.rect(px, py, photoW, photoH)
    ctx.clip()
    ctx.drawImage(img, px + (photoW - dw) / 2, py + (photoH - dh) / 2, dw, dh)
    ctx.restore()
    // inner shadow edge, like real instant film
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'
    ctx.lineWidth = 3
    ctx.strokeRect(px + 1.5, py + 1.5, photoW - 3, photoH - 3)
  } else {
    const g = ctx.createLinearGradient(px, py, px + photoW, py + photoH)
    g.addColorStop(0, '#e9d9f3')
    g.addColorStop(1, '#f6dde9')
    ctx.fillStyle = g
    ctx.fillRect(px, py, photoW, photoH)
    ctx.save()
    ctx.setLineDash([14, 14])
    ctx.lineWidth = 5
    ctx.strokeStyle = 'rgba(160,90,160,0.55)'
    drawHeart(ctx, px + photoW / 2, py + photoH / 2 - 20, 150)
    ctx.stroke()
    ctx.restore()
    ctx.fillStyle = 'rgba(90,50,100,0.85)'
    ctx.textAlign = 'center'
    ctx.font = '500 64px Caveat, cursive'
    ctx.fillText('your photo here', px + photoW / 2, py + photoH / 2 + 170)
    ctx.font = '300 30px Jost, sans-serif'
    ctx.fillStyle = 'rgba(90,50,100,0.6)'
    ctx.fillText(missingLabel || 'photos/01.jpg', px + photoW / 2, py + photoH / 2 + 220)
  }

  // Caption
  if (caption) {
    ctx.fillStyle = '#3b2a3f'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    let size = 82
    ctx.font = `500 ${size}px Caveat, cursive`
    while (ctx.measureText(caption).width > photoW - 40 && size > 44) {
      size -= 4
      ctx.font = `500 ${size}px Caveat, cursive`
    }
    ctx.fillText(caption, W / 2, pad + photoH + bottom / 2 + 6)
  }

  const texture = new THREE.CanvasTexture(c)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return { texture, aspect: W / H }
}
