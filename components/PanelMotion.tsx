'use client'

import { useRef, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

// Panel motion never changes SDK-owned geographic transforms or canvas dimensions.
export function PanelMotion({ children, motionKey, slideIndex }: { children: ReactNode; motionKey: string; slideIndex?: number }) {
  const root = useRef<HTMLDivElement>(null)
  const previousIndex = useRef(slideIndex)
  useGSAP(() => {
    const direction = Math.sign((slideIndex ?? 0) - (previousIndex.current ?? 0)) || 1
    previousIndex.current = slideIndex
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(root.current, { x: slideIndex === undefined ? 0 : direction * 20, y: slideIndex === undefined ? 8 : 0,
        opacity: 0.6, duration: 0.22, ease: 'power3.out', clearProps: 'transform,opacity' })
    })
    return () => media.revert()
  }, { scope: root, dependencies: [motionKey], revertOnUpdate: true })
  return <div ref={root}>{children}</div>
}
