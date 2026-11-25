'use client'

import { useRef, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { animatePanelDrill } from '@/lib/panel-motion'

gsap.registerPlugin(useGSAP)

// Panel motion never changes SDK-owned geographic transforms or canvas dimensions.
export function PanelMotion({ children, motionKey, slideIndex }: { children: ReactNode; motionKey: string; slideIndex?: number }) {
  const root = useRef<HTMLDivElement>(null)
  const previousIndex = useRef(slideIndex)
  useGSAP(() => {
    const direction = Math.sign((slideIndex ?? 0) - (previousIndex.current ?? 0)) || 1
    previousIndex.current = slideIndex
    return animatePanelDrill(root.current, {
      direction,
      verticalFallback: slideIndex === undefined,
    })
  }, { scope: root, dependencies: [motionKey], revertOnUpdate: true })
  return <div ref={root}>{children}</div>
}
