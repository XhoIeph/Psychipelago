'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { TransitionLink } from '@/components/PageTransition'
import { SiteThemeToggle } from '@/components/SiteThemeToggle'

const NAV = [
  { href: '/', label: '首页' },
  { href: '/map/', label: '地图' },
  { href: '/psy/', label: '量表' },
  { href: '/resources/', label: '资源' },
  { href: '/about/', label: '关于' },
]

export function SiteNav() {
  const pathname = usePathname()
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const actions = useRef<HTMLDivElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!actions.current?.contains(event.target as Node)) setOpenOn(null)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpenOn(null)
      toggle.current?.focus()
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div className="tc-header-actions" ref={actions}>
      <nav className="tc-nav" id="site-navigation" aria-label="主导航" data-expanded={open}>
        {NAV.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : `${pathname.replace(/\/$/, '')}/`.startsWith(item.href)
          const NavLink = item.href === '/map/' ? TransitionLink : Link
          return (
            <NavLink key={item.href} href={item.href} prefetch={item.href === '/map/' ? false : undefined} aria-current={active ? 'page' : undefined} onClick={() => setOpenOn(null)}>
              {item.label}
            </NavLink>
          )
        })}
      </nav>
      <SiteThemeToggle />
      <button
        ref={toggle}
        className="tc-site-menu"
        type="button"
        aria-label={open ? '关闭导航' : '展开导航'}
        aria-expanded={open}
        aria-controls="site-navigation"
        onClick={(event) => {
          setOpenOn(open ? null : pathname)
          if (!open && event.detail === 0) {
            requestAnimationFrame(() => actions.current?.querySelector<HTMLAnchorElement>('nav a')?.focus())
          }
        }}
      >
        {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>
    </div>
  )
}
