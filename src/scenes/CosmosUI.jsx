import { useEffect, useState } from 'react'
import { FINAL_WORDS } from '../content/texts'
import { ambient } from '../audio/ambient'
import { reducedMotion } from '../config/quality'

// Beyond the portal: no words at all for a while, only the universe.
// Then the signature returns and stays. Nothing comes after it.
export default function CosmosUI() {
  const [sign, setSign] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => { setSign(true); ambient.chime(0.5, 0.08) }, reducedMotion ? 6000 : 17000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="overlay cosmos-ui">
      {sign && <h1 className="final-words breathe">{FINAL_WORDS}</h1>}
    </div>
  )
}
