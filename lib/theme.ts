import { flushSync } from 'react-dom'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'tc.theme'

/** 手动选过就以记录为准；首次访问跟随系统偏好。 */
export function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // 隐私模式下 localStorage 会抛，退回系统偏好。
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme, persist = true) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  if (!persist) return
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // 存不下就只在本次会话生效。
  }
}

export function togglePageTheme(onChange: (theme: Theme) => void) {
  function update() {
    const current = document.documentElement.dataset.theme ?? readTheme()
    const next = current === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    onChange(next)
  }

  if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update()
    return
  }

  // Capture the new surface colors and the theme control in the same frame.
  document.startViewTransition(() => flushSync(update))
}
