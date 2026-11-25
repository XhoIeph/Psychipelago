'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createLiquidSurface } from './home/home-liquid'

export function SiteWater() {
  const pathname = usePathname()
  const field = useRef<HTMLDivElement>(null)
  const liquid = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const main = field.current!.parentElement!
    const surface = createLiquidSurface(liquid.current!)
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let pointer: { x: number; y: number } | undefined

    function move(event: PointerEvent) {
      if (event.pointerType !== 'touch' && !document.hidden && !reduced.matches) {
        pointer = { x: event.clientX, y: event.clientY }
        surface.move(pointer.x, pointer.y)
      }
    }
    function scroll() {
      if (pointer) surface.move(pointer.x, pointer.y)
    }
    function leave() {
      pointer = undefined
      surface.leave()
    }
    function reset() {
      pointer = undefined
      surface.reset()
    }

    main.addEventListener('pointermove', move, { capture: true, passive: true })
    main.addEventListener('pointerleave', leave)
    main.addEventListener('pointercancel', leave)
    window.addEventListener('scroll', scroll, { passive: true })
    document.addEventListener('visibilitychange', reset)
    reduced.addEventListener('change', reset)
    return () => {
      main.removeEventListener('pointermove', move, true)
      main.removeEventListener('pointerleave', leave)
      main.removeEventListener('pointercancel', leave)
      window.removeEventListener('scroll', scroll)
      document.removeEventListener('visibilitychange', reset)
      reduced.removeEventListener('change', reset)
      reset()
    }
  }, [pathname])

  return (
    <>
      <div className="tc-site-sea" aria-hidden="true">
        <div className="tc-site-sea-edges" />
      </div>
      <div className="tc-site-liquid-field" ref={field} aria-hidden="true">
        <div className="tc-site-water-surface">
          <canvas className="tc-site-liquid" ref={liquid} />
        </div>
      </div>
    </>
  )
}
