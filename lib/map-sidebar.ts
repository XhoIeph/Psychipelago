import type { GeoPoint, MapCamera, MapProjection } from './map-camera.ts'

export const CHINA_BOUNDS: [[number, number], [number, number]] = [[17.5, 73], [53.8, 135.5]]

// Insets are screen pixels; the geographic anchor stays centered in the visible area.
export function sidebarCameraFrame(
  map: MapProjection,
  anchor: GeoPoint,
  width: number,
  fromInset: number,
  inset: number,
  startZoom: number,
  startMinZoom: number,
  endInset = inset,
) {
  const offset = Math.log2((width - endInset) / (width - fromInset))
  const progress = endInset === fromInset ? 1 : (inset - fromInset) / (endInset - fromInset)
  const targetZoom = startZoom <= startMinZoom + 0.001 ? startMinZoom
    : Math.max(startMinZoom, Math.min(map.getMaxZoom(), Math.round(startZoom + offset)))
  const zoom = startZoom + (targetZoom - startZoom) * progress
  const center = map.unproject(map.project(anchor, zoom).subtract([inset / 2, 0]), zoom)
  return { center, zoom, minZoom: startMinZoom }
}

// Constrain the requested camera before it reaches the renderer, not after a drag has painted.
// The only rule is independent of zoom: China must keep at least `keep` pixels on screen, and the
// center is free everywhere else. Requiring the country to cover the whole viewport (the old
// rule) squeezed the allowed centers into a narrow band at intermediate zooms, so a phone could
// never pan down to Guangdong and shrinking from z7 to z5 pulled the camera back north.
export function constrainChinaCenter(
  map: Pick<MapCamera, 'getZoom' | 'getSize' | 'project' | 'unproject'>,
  center: GeoPoint,
  keep = 48,
) {
  const zoom = map.getZoom(), size = map.getSize()
  const nw = map.project([CHINA_BOUNDS[1][0], CHINA_BOUNDS[0][1]], zoom)
  const se = map.project([CHINA_BOUNDS[0][0], CHINA_BOUNDS[1][1]], zoom)
  const point = map.project(center, zoom)
  const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))
  return map.unproject([
    clamp(point.x, nw.x - size.x / 2 + keep, se.x + size.x / 2 - keep),
    clamp(point.y, nw.y - size.y / 2 + keep, se.y + size.y / 2 - keep),
  ], zoom)
}
