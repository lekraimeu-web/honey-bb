// A gentle generative ambient pad + small chimes, synthesized with the Web Audio
// API so no music files are needed. Starts only after the first user gesture.

class Ambient {
  constructor() {
    this.ctx = null
    this.master = null
    this.muted = false
    this.started = false
  }

  // Creates the audio context and the pad. `padOn` false keeps the pad silent
  // (effects still play); call padUp() later to bring it in.
  start(padOn = false) {
    if (this.started) { if (padOn) this.padUp(); return }
    this.padOn = padOn
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    this.started = true
    const ctx = (this.ctx = new AC())
    const master = (this.master = ctx.createGain())
    master.gain.value = 0
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 1100
    filter.Q.value = 0.4
    filter.connect(master)
    master.connect(ctx.destination)
    this.bus = filter

    // Warm chord: Db2 Ab2 Db3 F3 Ab3 Eb4  (Db major add9)
    const freqs = [69.3, 103.83, 138.59, 174.61, 207.65, 311.13]
    this.voices = freqs.map((f, i) => {
      const g = ctx.createGain()
      g.gain.value = 0
      g.connect(filter)
      const oscA = ctx.createOscillator()
      const oscB = ctx.createOscillator()
      oscA.type = i < 2 ? 'sine' : 'triangle'
      oscB.type = 'sine'
      oscA.frequency.value = f
      oscB.frequency.value = f
      oscA.detune.value = -5
      oscB.detune.value = 6
      oscA.connect(g)
      oscB.connect(g)
      // Slow swell per voice so the pad breathes.
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.frequency.value = 0.05 + i * 0.017
      lfoGain.gain.value = 0.012
      lfo.connect(lfoGain)
      lfoGain.connect(g.gain)
      const base = i === 0 ? 0.05 : i < 3 ? 0.035 : 0.022
      g.gain.setValueAtTime(0.0001, ctx.currentTime)
      g.gain.linearRampToValueAtTime(base, ctx.currentTime + 6 + i)
      oscA.start()
      oscB.start()
      lfo.start()
      return { g }
    })

    master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.9, ctx.currentTime + 2)
    this.pad = ctx.createGain()
    this.pad.gain.value = padOn ? 1 : 0
    // re-route voices through the pad gain
    this.voices.forEach(({ g }) => { g.disconnect(); g.connect(this.pad) })
    this.pad.connect(filter)
  }

  padUp(seconds = 6) {
    if (!this.ctx || !this.pad) return
    this.padOn = true
    this.pad.gain.cancelScheduledValues(this.ctx.currentTime)
    this.pad.gain.setTargetAtTime(1, this.ctx.currentTime, seconds / 3)
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume()
  }

  setMuted(m) {
    this.muted = m
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(t)
    this.master.gain.setTargetAtTime(m ? 0 : 0.9, t, 0.4)
  }

  // A soft bell. `pitch` 0..1 picks a note on a pentatonic scale.
  chime(pitch = Math.random(), volume = 0.12) {
    if (!this.ctx || this.muted) return
    const ctx = this.ctx
    const scale = [1108.73, 1244.51, 1396.91, 1661.22, 1864.66, 2217.46]
    const f = scale[Math.min(scale.length - 1, Math.floor(pitch * scale.length))]
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = f
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.8)
    osc.connect(g)
    g.connect(this.master)
    osc.start()
    osc.stop(ctx.currentTime + 2)
  }

  // Deep swell for the big moments (heart burst, finale).
  swell(duration = 6) {
    if (!this.ctx || this.muted) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 34.65 // Db1
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + duration * 0.4)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
    osc.connect(g)
    g.connect(this.master)
    osc.start()
    osc.stop(ctx.currentTime + duration + 0.1)
  }
}

export const ambient = new Ambient()
