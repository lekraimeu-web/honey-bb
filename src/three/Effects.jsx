import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing'
import { isMobile } from '../config/quality'

export default function Effects() {
  return (
    <EffectComposer multisampling={0} disableNormalPass>
      <Bloom
        intensity={isMobile ? 0.9 : 1.15}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.15}
        mipmapBlur
        radius={0.7}
      />
      <Vignette eskil={false} offset={0.22} darkness={0.72} />
      <SMAA />
    </EffectComposer>
  )
}
