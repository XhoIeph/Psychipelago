import type { Theme } from './theme'

const densityRamp: Record<Theme, readonly string[]> = {
  light: ['#a9c9b3', '#83b398', '#629e7d', '#45846a', '#2f6349'],
  dark: ['#16311f', '#2a5237', '#3a6d49', '#4a8759', '#5aa06a'],
}

export const DENSITY_OPACITY: Record<Theme, number> = { light: .6, dark: .9 }

export function densityLimits(stats: Record<string, { reports: number }>) {
  const max = Math.max(0, ...Object.values(stats).map(({ reports }) => reports))
  const bands = Math.min(5, max)
  return Array.from({ length: bands }, (_, i) => Math.ceil(max * (i + 1) / bands))
}

export function densitySwatch(theme: Theme, band: number, bands: number) {
  const index = bands <= 1 ? 0 : Math.round(band * 4 / (bands - 1))
  return densityRamp[theme][index]
}

export function densityColor(theme: Theme, count: number, limits: readonly number[]) {
  const band = count > 0 ? limits.findIndex(limit => count <= limit) : -1
  return band < 0 ? 'transparent' : densitySwatch(theme, band, limits.length)
}
