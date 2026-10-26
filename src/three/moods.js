import * as THREE from 'three'

// Colour mood per scene. The sky, nebula and fog lerp between them.
export const moods = {
  intro:    { bg: '#06020e', nebula: ['#5b1a8a', '#b4237d', '#2a1b7a'], glow: 0.9, fog: [18, 110] },
  meadow:   { bg: '#f6c3a6', nebula: ['#ffb27a', '#ff9ad0', '#c9a6ff'], glow: 0.0, fog: [14, 70] },
  universe: { bg: '#07031a', nebula: ['#6a1fa6', '#d4288f', '#2b2a9e'], glow: 1.0, fog: [18, 110] },
  gallery:  { bg: '#2a1550', nebula: ['#ff7cc4', '#8c74ff', '#ffb38a'], glow: 1.15, fog: [18, 110] },
  letter:   { bg: '#120823', nebula: ['#7d2d8f', '#d98a4a', '#3a2a8a'], glow: 0.8, fog: [18, 110] },
  secret:   { bg: '#040209', nebula: ['#2c1d6b', '#6b1f7a', '#161343'], glow: 0.55, fog: [18, 110] },
  finale:   { bg: '#1a0b2e', nebula: ['#ff5fb0', '#ffb070', '#7a4cff'], glow: 1.3, fog: [18, 110] },
  cosmos:   { bg: '#03010a', nebula: ['#6a2fd0', '#d23c8f', '#2a4fd0'], glow: 1.2, fog: [40, 400] },
}

export function moodColors(name) {
  const m = moods[name] || moods.universe
  return {
    bg: new THREE.Color(m.bg),
    nebula: m.nebula.map((c) => new THREE.Color(c)),
    glow: m.glow,
    fog: m.fog,
  }
}
