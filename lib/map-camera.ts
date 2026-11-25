export type GeoPoint = { lat: number; lng: number }
export type PointLike = { x: number; y: number } | readonly [number, number]
export const MAP_MAX_ZOOM = 20

export class MapPoint {
  x: number
  y: number
  constructor(x: number, y: number) { this.x = x; this.y = y }
  add(point: PointLike) {
    return new MapPoint(this.x + ('x' in point ? point.x : point[0]), this.y + ('y' in point ? point.y : point[1]))
  }
  subtract(point: PointLike) {
    return new MapPoint(this.x - ('x' in point ? point.x : point[0]), this.y - ('y' in point ? point.y : point[1]))
  }
  multiplyBy(value: number) { return new MapPoint(this.x * value, this.y * value) }
  divideBy(value: number) { return this.multiplyBy(1 / value) }
}

export function project(point: GeoPoint | readonly [number, number], zoom: number) {
  const lat = 'lat' in point ? point.lat : point[0]
  const lng = 'lng' in point ? point.lng : point[1]
  const sin = Math.sin(lat * Math.PI / 180)
  const size = 256 * 2 ** zoom
  return new MapPoint(size * (lng + 180) / 360, size * (.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)))
}

export function unproject(point: PointLike, zoom: number): GeoPoint {
  const x = 'x' in point ? point.x : point[0]
  const y = 'y' in point ? point.y : point[1]
  const size = 256 * 2 ** zoom
  return { lng: x / size * 360 - 180, lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / size))) * 180 / Math.PI }
}

export type MapProjection = {
  project: typeof project
  unproject: typeof unproject
  getMaxZoom(): number
}

export type MapCamera = MapProjection & {
  getContainer(): HTMLElement
  getZoom(): number
  getMinZoom(): number
  getCenter(): GeoPoint
  getSize(): MapPoint
  mouseEventToContainerPoint(event: MouseEvent): MapPoint
  containerPointToLatLng(point: MapPoint): GeoPoint
  beginMove(): void
  move(center: GeoPoint, zoom: number): void
  endMove(): void
}

export type MapPadding = readonly [top: number, bottom: number, left: number, right: number]

function fitProjectedBounds(a: MapPoint, b: MapPoint, size: MapPoint, inset: number, padding: MapPadding, minZoom: number, maxZoom: number, step: number) {
  const [top, bottom, left, right] = padding
  const width = Math.max(1, size.x - inset - left - right), height = Math.max(1, size.y - top - bottom)
  const fitZoom = Math.log2(Math.min(width / Math.abs(b.x - a.x), height / Math.abs(b.y - a.y)))
  const zoom = Math.max(minZoom, Math.min(maxZoom, Math.floor(fitZoom * step) / step))
  const center = unproject(a.add(b).divideBy(2).multiplyBy(2 ** zoom).subtract([(inset + left - right) / 2, (top - bottom) / 2]), zoom)
  return { zoom, center }
}

export function fitMapBounds(bounds: readonly [GeoPoint, GeoPoint], size: MapPoint, inset: number, padding: MapPadding) {
  return fitProjectedBounds(project(bounds[0], 0), project(bounds[1], 0), size, inset, padding, 2, MAP_MAX_ZOOM, 1)
}

export function fitProvinceFrame(bounds: readonly [GeoPoint, GeoPoint], pins: readonly GeoPoint[], size: MapPoint, inset: number, padding: MapPadding, minZoom: number) {
  const nw = project([bounds[1].lat, bounds[0].lng], 0)
  const se = project([bounds[0].lat, bounds[1].lng], 0)
  if (!pins.length) return fitProjectedBounds(nw, se, size, inset, padding, minZoom, 12, 10)
  const pinNW = new MapPoint(Infinity, Infinity)
  const pinSE = new MapPoint(-Infinity, -Infinity)
  for (const pin of pins) {
    const { x, y } = project(pin, 0)
    pinNW.x = Math.min(pinNW.x, x)
    pinNW.y = Math.min(pinNW.y, y)
    pinSE.x = Math.max(pinSE.x, x)
    pinSE.y = Math.max(pinSE.y, y)
  }
  // Size the frame for province context, then bring the hospitals toward the center of that frame.
  const margin = se.subtract(nw).multiplyBy(.25)
  const contextNW = nw.add(margin), contextSE = se.subtract(margin)
  const { zoom } = fitProjectedBounds(
    new MapPoint(Math.min(contextNW.x, pinNW.x), Math.min(contextNW.y, pinNW.y)),
    new MapPoint(Math.max(contextSE.x, pinSE.x), Math.max(contextSE.y, pinSE.y)),
    size, inset, padding, minZoom, 12, 10,
  )
  const center = pinNW.add(pinSE).multiplyBy(.35).add(nw.add(se).multiplyBy(.15))
  const [top, bottom, left, right] = padding
  const halfWidth = Math.max(pinSE.x - pinNW.x, (size.x - inset - left - right) / 2 ** zoom) / 2
  const halfHeight = Math.max(pinSE.y - pinNW.y, (size.y - top - bottom) / 2 ** zoom) / 2
  center.x = Math.max(pinSE.x - halfWidth, Math.min(pinNW.x + halfWidth, center.x))
  center.y = Math.max(pinSE.y - halfHeight, Math.min(pinNW.y + halfHeight, center.y))
  return {
    zoom,
    center: unproject(center.multiplyBy(2 ** zoom).subtract([(inset + left - right) / 2, (top - bottom) / 2]), zoom),
  }
}
