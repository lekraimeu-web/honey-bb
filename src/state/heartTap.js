// Tiny event bus: the 3D heart emits a tap, the universe overlay listens.
const listeners = new Set()
export const heartTap = {
  emit: () => listeners.forEach((l) => l()),
  on: (l) => { listeners.add(l); return () => listeners.delete(l) },
}
