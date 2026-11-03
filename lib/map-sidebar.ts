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

// The covered canvas does not contribute to the visible geographic bounds.
// `margin` shrinks the draggable area further, so a phone can pull the outer provinces in.
export function chinaCameraBounds(map: Pick<MapCamera, 'getZoom' | 'getSize' | 'project' | 'unproject'>, inset: number, margin = 0) {
  const zoom = map.getZoom()
  const size = map.getSize()
  const nw = map.project([CHINA_BOUNDS[1][0], CHINA_BOUNDS[0][1]], zoom)
  const se = map.project([CHINA_BOUNDS[0][0], CHINA_BOUNDS[1][1]], zoom)
  const midX = (nw.x + se.x) / 2, midY = (nw.y + se.y) / 2
  const halfX = (size.x - inset - 2 * margin) / 2, halfY = (size.y - 2 * margin) / 2
  return [
    map.unproject([Math.min(midX, nw.x + halfX) - (size.x + inset) / 2, Math.min(midY, nw.y + halfY) - halfY], zoom),
    map.unproject([Math.max(midX, se.x - halfX) + (size.x - inset) / 2, Math.max(midY, se.y - halfY) + halfY], zoom),
  ] as const
}

// Constrain the requested camera before it reaches the renderer, not after a drag has painted.
export function constrainChinaCenter(map: Pick<MapCamera, 'getZoom' | 'getSize' | 'project' | 'unproject'>, center: GeoPoint, inset: number, margin = 0) {
  const zoom = map.getZoom(), size = map.getSize()
  const [nw, se] = chinaCameraBounds(map, inset, margin)
  const min = map.project(nw, zoom).add(size.divideBy(2))
  const max = map.project(se, zoom).subtract(size.divideBy(2))
  const point = map.project(center, zoom)
  return map.unproject([Math.max(min.x, Math.min(max.x, point.x)), Math.max(min.y, Math.min(max.y, point.y))], zoom)
}
