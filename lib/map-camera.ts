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

export function fitMapBounds(bounds: readonly [GeoPoint, GeoPoint], size: MapPoint, inset: number, padding: readonly [number, number, number, number]) {
  const a = project(bounds[0], 0), b = project(bounds[1], 0)
  const [top, bottom, left, right] = padding
  const width = size.x - inset - left - right, height = size.y - top - bottom
  const zoom = Math.max(2, Math.min(MAP_MAX_ZOOM, Math.floor(Math.log2(Math.min(width / Math.abs(b.x - a.x), height / Math.abs(b.y - a.y))))))
  const center = unproject(a.add(b).divideBy(2).multiplyBy(2 ** zoom).subtract([(inset + left - right) / 2, (top - bottom) / 2]), zoom)
  return { zoom, center }
}
