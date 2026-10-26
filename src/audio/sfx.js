// Small sound effects. The meow uses public/audio/meow.mp3 when present,
// otherwise a tiny synthesized "mew" built from two gliding oscillators.
import { ambient } from './ambient'

let meowEl = null
let meowFileOk = null // null = unknown, true/false after first attempt

function ctx() {
  ambient.start()
  ambient.resume()
  return ambient.ctx
}

function synthMeow(pitch = 1, volume = 0.16) {
  const ac = ctx()
  if (!ac || ambient.muted) return
  const t = ac.currentTime
  const dur = 0.55
  const out = ac.createGain()
  out.gain.setValueAtTime(0.0001, t)
  out.gain.exponentialRampToValueAtTime(volume, t + 0.06)
  out.gain.setValueAtTime(volume, t + dur * 0.55)
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  // formant-ish body
  const bp = ac.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.setValueAtTime(1400 * pitch, t)
  bp.frequency.linearRampToValueAtTime(2300 * pitch, t + dur * 0.4)
  bp.frequency.linearRampToValueAtTime(1200 * pitch, t + dur)
  bp.Q.value = 1.6
  bp.connect(out)
  out.connect(ambient.master)
  const voices = [1, 2.01, 3.02]
  voices.forEach((h, i) => {
    const o = ac.createOscillator()
    o.type = i === 0 ? 'sawtooth' : 'triangle'
    const f0 = 540 * pitch * h
    o.frequency.setValueAtTime(f0 * 0.9, t)
    o.frequency.exponentialRampToValueAtTime(f0 * 1.45, t + dur * 0.35)
    o.frequency.exponentialRampToValueAtTime(f0 * 0.95, t + dur)
    // vibrato
    const lfo = ac.createOscillator()
    const lg = ac.createGain()
    lfo.frequency.value = 9
    lg.gain.value = f0 * 0.02
    lfo.connect(lg)
    lg.connect(o.frequency)
    const g = ac.createGain()
    g.gain.value = i === 0 ? 0.5 : 0.18 / i
    o.connect(g)
    g.connect(bp)
    o.start(t)
    lfo.start(t)
    o.stop(t + dur + 0.05)
    lfo.stop(t + dur + 0.05)
  })
}

export function meow(pitch = 1, volume = 0.16) {
  if (ambient.muted) return
  if (meowFileOk === false) return synthMeow(pitch, volume)
  if (!meowEl) {
    meowEl = new Audio(`${import.meta.env.BASE_URL}audio/meow.mp3`)
    meowEl.addEventListener('error', () => { meowFileOk = false; synthMeow(pitch, volume) }, { once: true })
    meowEl.addEventListener('canplay', () => { meowFileOk = true }, { once: true })
  }
  if (meowFileOk === true || meowFileOk === null) {
    meowEl.volume = Math.min(1, volume * 3)
    meowEl.playbackRate = pitch
    const p = meowEl.play()
    if (p && p.catch) p.catch(() => { if (meowFileOk !== true) { meowFileOk = false; synthMeow(pitch, volume) } })
  }
}

// A soft, airy "whoosh" for big transitions (filtered noise).
export function whoosh(duration = 1.6, volume = 0.12) {
  const ac = ctx()
  if (!ac || ambient.muted) return
  const t = ac.currentTime
  const len = Math.floor(ac.sampleRate * duration)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.6
  const src = ac.createBufferSource()
  src.buffer = buf
  const f = ac.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = 0.8
  f.frequency.setValueAtTime(220, t)
  f.frequency.exponentialRampToValueAtTime(2400, t + duration * 0.5)
  f.frequency.exponentialRampToValueAtTime(300, t + duration)
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(volume, t + duration * 0.4)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  src.connect(f)
  f.connect(g)
  g.connect(ambient.master)
  src.start(t)
  src.stop(t + duration + 0.05)
}
