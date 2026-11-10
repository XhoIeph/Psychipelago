'use client'

import { Moon, Sun } from 'lucide-react'
import type { Theme } from '@/lib/theme'

/** 主题开关：白天显示月亮、夜间显示太阳，aria-pressed 表示当前是否为夜间。 */
export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={dark ? '切换到白天模式' : '切换到夜间模式'}
      aria-pressed={dark}
      onClick={onToggle}
    >
      {dark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
    </button>
  )
}
