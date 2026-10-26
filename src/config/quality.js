// Device-aware quality settings. Computed once at startup.
const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
const small = typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 700
export const isMobile = coarse || small

export const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const quality = {
  dpr: isMobile ? [1, 1.5] : [1, 1.75],
  stars: reducedMotion ? 900 : isMobile ? 1600 : 3200,
  heartRows: isMobile ? 64 : 96,     // points around the heart outline
  heartRings: isMobile ? 26 : 38,    // rings from front to back
  floatingHearts: reducedMotion ? 10 : isMobile ? 26 : 52,
  dust: reducedMotion ? 150 : isMobile ? 350 : 700,
  bloom: true,
}
