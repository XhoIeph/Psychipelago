'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { PSY_FILTERS } from '@/lib/psy/categories'

gsap.registerPlugin(useGSAP)

export type PsyScale = {
  id: string
  name: string
  fullName: string
  category: string
  questionCount: number
  description: string
}

export function PsyCatalogue({ items }: { items: PsyScale[] }) {
  const [active, setActive] = useState('all')
  const rootRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLUListElement>(null)
  const filters = useMemo(() => PSY_FILTERS.filter((filter) =>
    filter.id === 'all' || items.some((item) => item.category === filter.label),
  ), [items])

  useEffect(() => {
    const cat = new URLSearchParams(window.location.search).get('cat')
    if (cat && filters.some((f) => f.id === cat)) setActive(cat)
  }, [filters])

  const filter = filters.find((f) => f.id === active) ?? PSY_FILTERS[0]

  const visible = useMemo(
    () => filter.id === 'all' ? items : items.filter((item) => item.category === filter.label),
    [items, filter]
  )

  useGSAP(
    () => {
      const list = gridRef.current
      if (!list) return
      const cards = Array.from(list.children) as HTMLElement[]
      if (!cards.length) return
      const media = gsap.matchMedia()
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.killTweensOf(cards)
        gsap.fromTo(
          cards,
          { opacity: 0, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: 0.34,
            stagger: { each: 0.016, amount: Math.min(0.24, cards.length * 0.016) },
            ease: 'power3.out',
            overwrite: 'auto',
            clearProps: 'transform,opacity',
          },
        )
      })
      return () => media.revert()
    },
    { scope: rootRef, dependencies: [active] },
  )

  return (
    <div className="tc-psy" ref={rootRef}>
      <header className="tc-psy-head">
        <h1>量表库</h1>
      </header>

      <div className="tc-psy-filters" role="group" aria-label="按分类筛选量表">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            className="tc-psy-chip"
            data-filter={f.id}
            aria-pressed={f.id === active}
            onClick={() => setActive(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="tc-psy-empty">这个分类下还没有量表。</p>
      ) : (
        <ul className="tc-psy-grid" ref={gridRef}>
          {visible.map((item) => (
            <li key={item.id}>
              <Link href={`/psy/${item.id}/`} className="tc-psy-card">
                <h2 className="tc-psy-card-name">
                  <span className="tc-psy-card-code" lang="en">{item.name}</span>
                  <span className="tc-psy-card-full-name">{item.fullName}</span>
                </h2>
                <p className="tc-psy-card-desc">{item.description}</p>
                <div className="tc-psy-card-foot">
                  <span className="tc-psy-card-meta">
                    <span className="tc-lead-tag">{item.category}</span>
                    <span>{item.questionCount} 题</span>
                  </span>
                  <span className="tc-psy-card-cta">
                    查看量表
                    <ChevronRight size={16} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
