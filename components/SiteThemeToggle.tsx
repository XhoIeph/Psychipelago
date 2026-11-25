'use client'

import { Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { readTheme, togglePageTheme, type Theme } from '@/lib/theme'

export function SiteThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setTheme(readTheme())
    setMounted(true)
  }, [])

  const isDark = theme === 'dark'
  const label = isDark ? '切换到白天模式' : '切换到夜间模式'

  return (
    <button
      type="button"
      className="tc-theme-toggle"
      aria-pressed={isDark}
      aria-label={label}
      title={label}
      onClick={() => togglePageTheme(setTheme)}
    >
      {mounted && isDark ? (
        <Sun size={18} aria-hidden="true" />
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.1 15.1a.45.45 0 0 0-.55-.54A7.7 7.7 0 0 1 9.4 4.45a.45.45 0 0 0-.55-.55 8.5 8.5 0 1 0 11.25 11.2Z" />
        </svg>
      )}
    </button>
  )
}
