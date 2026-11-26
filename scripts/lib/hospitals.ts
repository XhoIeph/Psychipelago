/**
 * 高德定位结果 -> 机构记录。放在 lib 里是为了让 `import-kdocs` 也能从同一份定位依据
 * 重建 `hospitals.json`：入库与校验必须用同一条推导路径，`source_value` 的比对才有意义。
 */
import type { Hospital } from '../../lib/schema.ts'
import { CURATED_FILES, readJson } from './paths.ts'
import type { LocationRun } from './amap.ts'
import type { ManualLocation } from './locations.ts'

const GCJ_A = 6378245
const GCJ_EE = 0.00669342162296594323

function transformLat(x: number, y: number): number {
  let ret = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3
  ret += ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) / 3
  ret += ((160 * Math.sin((y / 12) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30)) * 2) / 3
  return ret
}

function transformLng(x: number, y: number): number {
  let ret = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3
  ret += ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) / 3
  ret += ((150 * Math.sin((x / 12) * Math.PI) + 300 * Math.sin((x / 30) * Math.PI)) * 2) / 3
  return ret
}

function gcjDelta(lng: number, lat: number): [number, number] {
  let dLat = transformLat(lng - 105, lat - 35)
  let dLng = transformLng(lng - 105, lat - 35)
  const radLat = (lat / 180) * Math.PI
  let magic = Math.sin(radLat)
  magic = 1 - GCJ_EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180) / ((GCJ_A * (1 - GCJ_EE)) / (magic * sqrtMagic) * Math.PI)
  dLng = (dLng * 180) / ((GCJ_A / sqrtMagic) * Math.cos(radLat) * Math.PI)
  return [dLng, dLat]
}

export function gcj02ToWgs84(lng: number, lat: number): [number, number] {
  if (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) return [lng, lat]
  let wgsLng = lng
  let wgsLat = lat
  for (let i = 0; i < 3; i++) {
    const [dLng, dLat] = gcjDelta(wgsLng, wgsLat)
    wgsLng = lng - dLng
    wgsLat = lat - dLat
  }
  const offset = Math.max(Math.abs(wgsLng - lng), Math.abs(wgsLat - lat))
  if (!Number.isFinite(offset) || offset > 0.02) {
    throw new Error(`GCJ->WGS 转换结果异常：gcj=(${lng},${lat}) wgs=(${wgsLng},${wgsLat})`)
  }
  return [Number(wgsLng.toFixed(6)), Number(wgsLat.toFixed(6))]
}

/**
 * 人工选点能不能盖这家机构。三种坐标来源的分量不一样：
 *
 * - `geocoded`：高德按机构地址查到的点，有地址依据。人工在图上点一下没有更强的来源，
 *   所以不覆盖——但拒绝必须说出来，静默丢掉等于「界面说成功、地图没变」。
 * - `province-centroid`：省级近似占位值。写它的 `place-hospitals.ts` 已退役——那个产物在
 *   证据集里没有出处，`validate` 与 `buildLocationIndex` 都会判红。枚举值留着：将来真有别的
 *   来源写这个值时，人工精确选中的点严格更好，应当盖掉。
 * - `manual`：上一次人工选的点。重选同样是人在改，以新的为准，否则选错了没法改。
 * - 没有坐标：当然接受，这正是新增机构上图的路径。
 */
export function acceptsManualCoordinate(hospital: Hospital): boolean {
  // 没有坐标就一律接受：即便来源字段还留着 geocoded，那也是一条缺坐标的记录，得有人把它补上。
  return !hospital.coordinates || hospital.coordinates_source !== 'geocoded'
}

/**
 * 覆盖层新增的机构没有源表行，也就没有定位依据，`coordinates` 一直是 null，
 * 于是在地图上永远没有图钉。人工用 `--query`/`--pick` 选定的落点记在
 * `amap-manual.json`，这里把它补回机构记录：只要人工表里有一条已选定的落点，这家机构就上图。
 *
 * 补在这一层而不是只补在烘焙里：`validate` 拿同一份结果做比对基准，
 * 只在写盘前补的话，curated 有坐标、基准还是 null，那条红会指向「有人手改数据」，方向是错的。
 * 高德返回的落点是 GCJ-02，机构记录存 WGS84，转换必须走同一次逆算。
 */
export function withManualCoordinates(hospitals: Hospital[], manual: ManualLocation[]): Hospital[] {
  const picked = new Map<string, ManualLocation>()
  for (const entry of manual) {
    if (!entry.hospital_id || entry.status !== 'geocoded' || !entry.chosen) continue
    picked.set(entry.hospital_id, entry)
  }
  if (picked.size === 0) return hospitals
  return hospitals.map(hospital => {
    if (!acceptsManualCoordinate(hospital)) return hospital
    const entry = picked.get(hospital.id)
    if (!entry?.chosen) return hospital
    const values = entry.chosen.location.split(',').map(Number)
    if (values.length !== 2 || !values.every(Number.isFinite)) throw new Error(`人工选定的坐标无效：${entry.name}`)
    const [lng, lat] = gcj02ToWgs84(values[0], values[1])
    return { ...hospital, coordinates: { lat, lng }, coordinates_source: 'manual' as const }
  })
}

export function hospitalsFromRun(run: LocationRun): Hospital[] {
  const provinces = readJson<{ items: Array<{ name: string; adcode: string }> }>(CURATED_FILES.provinces).items
  const hospitals = new Map<string, Hospital>()
  const campuses = new Map<string, string>()
  for (const { chosen, campus, status } of run.results) {
    if (status !== 'geocoded' || !chosen || !campus) continue
    const prior = campuses.get(chosen.id)
    if (prior && prior !== campus) throw new Error(`高德地点关联了两个不同院区：${chosen.name}`)
    campuses.set(chosen.id, campus)
  }
  for (const result of run.results) {
    if (result.status !== 'geocoded' || !result.chosen) continue
    const poi = result.chosen
    const id = `kdocs-amap-${poi.id.toLowerCase()}`
    if (hospitals.has(id)) {
      hospitals.get(id)!.aliases.push(result.name)
      continue
    }
    const values = poi.location.split(',').map(Number)
    if (values.length !== 2 || !values.every(Number.isFinite)) throw new Error(`高德坐标无效：${result.name}`)
    const [lng, lat] = gcj02ToWgs84(values[0], values[1])
    // The Hengqin campus is administered by Macao even when the POI labels the land as Zhuhai.
    const macauManaged = result.region === '澳门' && /由澳门特别行政区.*管辖/u.test(`${poi.name}${poi.address}`)
    const province = provinces.find(item => item.name === (macauManaged ? '澳门特别行政区' : poi.pname))
    if (!province) throw new Error(`高德省级归属不在行政区字典：${poi.name} / ${poi.pname}`)
    const campus = campuses.get(poi.id)
    const name = result.selection_rule === 'institution-building' ? result.name.replace(/（[^）]*）/gu, '') : poi.name
    hospitals.set(id, {
      id,
      name: campus && !name.includes(campus) ? name + '（' + campus + '）' : name,
      aliases: [result.name],
      adcode: province.adcode,
      province: province.name,
      city: macauManaged ? province.name : poi.cityname || poi.pname,
      level: '未知',
      category: '其他',
      departments: ['未录入'],
      trauma_service: { cptsd_assessment: 'unknown', cptsd_bpd_diagnosis: 'unknown', icd11_practice: 'unknown', evidence: [] },
      address: poi.address,
      coordinates: { lat, lng },
      coordinates_source: 'geocoded',
      official_sources: [],
      last_verified_at: run.generated_at.slice(0, 10),
    })
  }
  return [...hospitals.values()]
}
