'use client'

import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(useGSAP, ScrollTrigger)

/**
 * 首页下半部分的分段入场：滚到视口里时从下往上浮起，只播一次。
 * 初始状态不写在 CSS 里，动画只在 onEnter 时才发生——脚本失效或触发器没命中时，内容照常完整显示。
 */
export function HomeMotion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const media = gsap.matchMedia()
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const blocks = gsap.utils.toArray<HTMLElement>('[data-reveal]', root.current)
        blocks.forEach((block) => {
          ScrollTrigger.create({
            trigger: block,
            start: 'top 92%',
            once: true,
            onEnter: () => {
              gsap.from(block, { opacity: 0, y: 16, duration: 0.55, ease: 'power2.out', clearProps: 'opacity,transform' })
            },
          })
        })
      })
    },
    { scope: root }
  )

  return <div ref={root}>{children}</div>
}
