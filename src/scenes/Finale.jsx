import { useEffect, useState } from 'react'
import { finaleLines, FINAL_WORDS, portal } from '../content/texts'
import { useJourney } from '../state/journey'
import { ambient } from '../audio/ambient'
import { reducedMotion } from '../config/quality'

// The heart beats, swells, and bursts into a sky of light while the last
// lines fade in one by one. Then the signature breathes, and a portal appears.
export default function Finale() {
  const { setHeartBurst, phase, setPhase } = useJourney()
  const [step, setStep] = useState(-1) // -1: nothing yet, 0..n-1 lines, n: signature

  useEffect(() => {
    setHeartBurst(0)
    const lineTime = reducedMotion ? 2600 : 3800
    const timers = []
    timers.push(setTimeout(() => ambient.swell(9), 800))
    timers.push(setTimeout(() => setHeartBurst(1), 2800))
    finaleLines.forEach((_, i) => timers.push(setTimeout(() => setStep(i), 2200 + i * lineTime)))
    const sigAt = 2200 + finaleLines.length * lineTime + 400
    timers.push(
      setTimeout(() => {
        setStep(finaleLines.length)
        ambient.chime(0.4, 0.1)
        setTimeout(() => ambient.chime(0.8, 0.08), 500)
      }, sigAt),
    )
    // let the signature breathe, then the portal rises
    timers.push(setTimeout(() => setPhase('portal-wait'), sigAt + 5200))
    return () => {
      timers.forEach(clearTimeout)
      setHeartBurst(0)
    }
  }, [setHeartBurst, setPhase])

  const portalUp = phase === 'portal-wait' || phase === 'portal'
  return (
    <div className={`overlay finale-ui ${portalUp ? 'with-portal' : ''} ${phase === 'portal' ? 'opening' : ''}`}>
      {step >= 0 && step < finaleLines.length && (
        <p className="finale-line" key={step}>{finaleLines[step]}</p>
      )}
      {step >= finaleLines.length && phase !== 'portal' && (
        <h1 className={`final-words ${portalUp ? 'breathe rise' : 'breathe'}`}>{FINAL_WORDS}</h1>
      )}
      {phase === 'portal-wait' && <p className="portal-hint fade-in-slow delay-2">{portal.hint}</p>}
    </div>
  )
}
