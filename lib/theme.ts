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
