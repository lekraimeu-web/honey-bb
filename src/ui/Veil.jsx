import { useJourney } from '../state/journey'

export default function Veil() {
  const { veil } = useJourney()
  return <div className={`veil ${veil.tone} ${veil.on ? 'on' : ''}`} aria-hidden="true" />
}
