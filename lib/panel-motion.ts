import { gsap } from 'gsap'

// Panel motion never changes SDK-owned geographic transforms or canvas dimensions.
export function animatePanelDrill(
  targets: gsap.TweenTarget,
  options: { direction?: number; verticalFallback?: boolean } = {},
): () => void {
  const { direction = 1, verticalFallback = false } = options
  const media = gsap.matchMedia()
  media.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from(targets, {
      x: verticalFallback ? 0 : direction * 20,
      y: verticalFallback ? 8 : 0,
      opacity: 0.6,
      duration: 0.22,
      ease: 'power3.out',
      clearProps: 'transform,opacity',
    })
  })
  return () => media.revert()
}
