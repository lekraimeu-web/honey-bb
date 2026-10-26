import { useSyncExternalStore } from 'react'

// Tiny store shared between the 3D gallery and its HTML overlay.
let state = { index: 0, count: 0, zoomed: false, loaded: false }
const listeners = new Set()

export const galleryStore = {
  get: () => state,
  set(patch) {
    state = { ...state, ...patch }
    listeners.forEach((l) => l())
  },
  subscribe(l) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

export function useGallery() {
  return useSyncExternalStore(galleryStore.subscribe, galleryStore.get)
}
