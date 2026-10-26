// Music system.
//  - If public/audio/music.mp3 exists, it plays that file (looped, with fades).
//  - Otherwise it falls back to the built-in generative ambient pad.
// Playback only ever starts after a user gesture ("Yes, of course ♡").
import { ambient } from './ambient'

class Music {
  constructor() {
    this.el = null
    this.usingFile = false
    this.started = false
    this.muted = false
    this.level = 1        // scene ducking level 0..1
    this.base = 0.7       // master volume for the file
    this.fadeRaf = null
  }

  start() {
    if (this.started) return
    this.started = true
    const el = new Audio()
    el.loop = true
    el.preload = 'auto'
    el.volume = 0
    el.src = `${import.meta.env.BASE_URL}audio/music.mp3`
    let settled = false
    const useFile = () => {
      if (settled) return
      settled = true
      this.usingFile = true
      this.el = el
      el.play().then(() => this._fadeTo(this.muted ? 0 : this.base * this.level, 4000)).catch(() => useSynth())
    }
    const useSynth = () => {
      if (settled) return
      settled = true
      this.usingFile = false
      ambient.start(true)
      ambient.resume()
    }
    el.addEventListener('canplay', useFile, { once: true })
    el.addEventListener('error', useSynth, { once: true })
    // If the browser is silent for too long (file missing on some hosts), fall back.
    setTimeout(useSynth, 4000)
    el.load()
  }

  _fadeTo(target, ms) {
    if (!this.el) return
    cancelAnimationFrame(this.fadeRaf)
    const from = this.el.volume
    const t0 = performance.now()
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms)
      this.el.volume = from + (target - from) * (k * k * (3 - 2 * k))
      if (k < 1) this.fadeRaf = requestAnimationFrame(step)
    }
    this.fadeRaf = requestAnimationFrame(step)
  }

  // Gentle per-scene volume (1 = full, 0.6 = softer while reading the letter…)
  duck(level, ms = 2500) {
    this.level = level
    if (this.usingFile) this._fadeTo(this.muted ? 0 : this.base * level, ms)
  }

  setMuted(m) {
    this.muted = m
    ambient.setMuted(m)
    if (this.usingFile) this._fadeTo(m ? 0 : this.base * this.level, 600)
  }
}

export const music = new Music()
