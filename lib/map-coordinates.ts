import type { Hospital, Report } from './schema.ts'
import type { MapHospital } from '../components/map/types.ts'

type SavedLocation = { status: string; chosen?: { id: string; location: string } }
export type CoordinateTree = number[] | CoordinateTree[]

export function mapHospitalInputs(hospitals: Hospital[], reports: Report[], locations: SavedLocation[]): MapHospital[] {
  const original = new Map<string, [number, number]>()
  for (const result of locations) {
    if (result.status !== 'geocoded' || !result.chosen) continue
    const id = `kdocs-amap-${result.chosen.id.toLowerCase()}`
    if (!original.has(id)) original.set(id, result.chosen.location.split(',').map(Number) as [number, number])
  }
  return hospitals.filter(hospital => hospital.coordinates).map(hospital => {
    const coordinate = original.get(hospital.id)
    if (!coordinate) throw new Error(`缺少机构的原始高德坐标：${hospital.id}`)
    return {
      id: hospital.id, name: hospital.name, adcode: hospital.adcode,
      province: hospital.province, city: hospital.city, category: hospital.category, level: hospital.level,
      lng: coordinate[0], lat: coordinate[1], coordinateSource: hospital.coordinates_source,
      leads: reports.filter(report => report.hospital_id === hospital.id).length,
    }
  })
}

// Province geometry uses the same GCJ offset model as the saved positioning pipeline.
export function wgs84ToGcj02(lng: number, lat: number): [number, number] {
  if (lng < 72.004 || lng > 137.8347 || lat < .8293 || lat > 55.8271) return [lng, lat]
  const x = lng - 105, y = lat - 35
  let dLat = -100 + 2 * x + 3 * y + .2 * y * y + .1 * x * y + .2 * Math.sqrt(Math.abs(x))
  let dLng = 300 + x + 2 * y + .1 * x * x + .1 * x * y + .1 * Math.sqrt(Math.abs(x))
  const common = (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3
  dLat += common + (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3
    + (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3
  dLng += common + (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3
    + (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3
  const rad = lat * Math.PI / 180, ee = .00669342162296594323, a = 6378245
  const magic = 1 - ee * Math.sin(rad) ** 2, sqrt = Math.sqrt(magic)
  return [lng + dLng * 180 / (a / sqrt * Math.cos(rad) * Math.PI),
    lat + dLat * 180 / (a * (1 - ee) / (magic * sqrt) * Math.PI)]
}

export function gcjCoordinateTree(coordinates: CoordinateTree): CoordinateTree {
  if (typeof coordinates[0] === 'number') return wgs84ToGcj02(coordinates[0], coordinates[1] as number)
  return (coordinates as CoordinateTree[]).map(gcjCoordinateTree)
}
