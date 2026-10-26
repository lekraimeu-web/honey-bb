import { useEffect } from 'react'

// A tiny shared pointer store (normalized -1..1). Updated by mouse or touch,
// read inside the 3D loop without triggering React re-renders.
export const pointer = { x: 0, y: 0, sx: 0, sy: 0, active: false }

export function usePointerTracking() {
  useEffect(() => {
    const update = (clientX, clientY) => {
      pointer.x = (clientX / window.innerWidth) * 2 - 1
      pointer.y = -((clientY / window.innerHeight) * 2 - 1)
      pointer.active = true
    }
    const onMove = (e) => update(e.clientX, e.clientY)
    const onTouch = (e) => {
      if (e.touches.length) update(e.touches[0].clientX, e.touches[0].clientY)
    }
    const onLeave = () => { pointer.active = false }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchstart', onTouch, { passive: true })
    window.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchstart', onTouch)
      window.removeEventListener('pointerleave', onLeave)
    }
  }, [])
}

// Smooth the pointer each frame (call inside useFrame).
export function smoothPointer(dt, speed = 3) {
  const k = 1 - Math.exp(-speed * dt)
  pointer.sx += (pointer.x - pointer.sx) * k
  pointer.sy += (pointer.y - pointer.sy) * k
}
