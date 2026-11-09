import type { Report } from '../../lib/schema.ts'

export type Poi = {
  id: string
  name: string
  address: string
  location: string
  pname: string
  cityname: string
  adcode: string
  typecode: string
}

export type LocationTarget = { name: string; report_ids: string[]; region: string }
export type LocationResult = LocationTarget & {
  status: 'geocoded' | 'not_found' | 'ambiguous' | 'not_queried'
  reason: string
  candidates: Poi[]
  chosen?: Poi
  matched_name?: string
  selection_rule?: 'base-name' | 'main-campus' | 'best-score' | 'explicit-campus' | 'visit-site' | 'medical-building' | 'institution-building'
}

export const LOCATION_EVIDENCE = 'data/evidence/locations/amap-2026-11-09.json'

export type LocationRun = {
  source_url: string
  generated_at: string
  requests: number
  requests_total?: number
  results: LocationResult[]
}

/**
 * 同名机构可能分属不同地区（来源表里「重庆精神卫生中心」既标四川也标重庆），
 * 分组必须带上地区，否则两处线索会被合成一个机构、并按错误的省份查询。
 */
function targetKey(name: string, region: string): string {
  return `${name}\u0000${region}`
}

/**
 * 同一行里的多条发言拆成的线索共用原始行 id（`-p2` 起是拆出来的段落）。
 * 机构定位是机构级事实，拆段不会多出机构，所以归集时回到原始行 id。
 */
export function baseReportId(id: string): string {
  return id.replace(/-p\d+$/u, '')
}

export function locationTargets(reports: Report[]): LocationTarget[] {
  const groups = new Map<string, LocationTarget>()
  for (const report of reports) {
    const name = report.hospital_name_raw!
    const region = report.hospital_region ?? ''
    const key = targetKey(name, region)
    const target = groups.get(key) ?? { name, report_ids: [], region }
    const base = baseReportId(report.id)
    if (!target.report_ids.includes(base)) target.report_ids.push(base)
    groups.set(key, target)
  }
  return [...groups.values()]
}

export function searchName(raw: string): string {
  // 来源在跨省就诊的机构名前写了地区（「云南 大理州第二人民医院」），高德不接受这种前缀。
  const bare = raw.replace(/^[^\s]{2,6}\s+/u, '')
  return (SOURCE_NAME_EXPANSIONS[bare] ?? SOURCE_NAME_EXPANSIONS[raw] ?? bare).replace(/（([^）]*)）/gu, (_, note: string) => /院区|芳村|^(?:保定|青岛|南昌|海南)$/u.test(note) ? note : '')
}

const SOURCE_NAME_EXPANSIONS: Record<string, string> = {
  '甘肃兰州大学第二医院': '兰州大学第二医院',
  '上海市同济大学附属同济医院': '同济大学附属同济医院',
  '上海新华医院': '上海交通大学医学院附属新华医院',
  '深圳精神卫生中心/康宁医院（坪山院区）': '深圳市康宁医院（坪山院区）',
  '广西南宁第五医院': '南宁市第五人民医院',
  '陕西省西安市西京医院': '西京医院',
  '黑龙江省大庆市第三医院精神科': '大庆市第三医院',
  '中山大学第八附属医院': '中山大学附属第八医院',
  '海南安宁医院': '海南省安宁医院',
  '浙大一附院': '浙江大学医学院附属第一医院',
  '杭州七院': '杭州市第七人民医院',
  '江苏徐州东方医院': '徐州市东方人民医院',
  '中国人民解放军总医院301': '中国人民解放军总医院',
  '湖南儿童医院': '湖南省儿童医院',
  '湖南长沙湘雅医院': '中南大学湘雅医院',
  '广西南宁第一人民医院': '南宁市第一人民医院',
  '河南商丘市第一人民医院': '商丘市第一人民医院',
  '宁夏回族自治区宁安医院': '宁夏宁安医院',
  '贵州中医院大学第一附属医院': '贵州中医药大学第一附属医院',
  '广西北海市人民医院': '北海市人民医院',
  '广西北海市人民医院（银滩院区）': '北海市人民医院（银滩院区）',
  '南京泰康仙林鼓楼医院': '泰康仙林鼓楼医院',
  '浙江省荣军康复医院': '宁波大学附属民康医院',
  '江西省精神卫生中心（南昌）': '江西省精神病院',
  '上海市精卫': '上海交通大学医学院附属精神卫生中心',
  '四川省精神卫生中心（绵阳三医院）': '绵阳市第三人民医院',
  '海南医学院第一附属医院': '海南医科大学第一附属医院',
  '中国人民解放军总医院（海南）': '中国人民解放军总医院海南医院',
  '澳门科技大学医院': '科大医院',
  '港安医院': '香港港安医院',
  '苏州广济医院（在吴中人民医院出诊）': '苏州市吴中人民医院',
  '高雄医学大学附设医院': '高雄医学大学中和纪念医院',
  '长庚医院': '长庚纪念医院',
  '河南省郑州大学第一附属医院东区': '郑州大学第一附属医院东区',
  '陕西省宝鸡市康复医院': '宝鸡市康复医院',
  '山东省青岛精神卫生中心': '青岛市精神卫生中心',
  '辽宁省中国医科大学附属盛京医院': '中国医科大学附属盛京医院',
  '贵州省贵阳正宇铁路医院（私立）': '贵阳正宇铁路医院',
  '四川省成都第四人民医院': '成都市第四人民医院',
  '四川省宜宾第四人民医院': '宜宾市第四人民医院',
  '广州白云区心理医院': '白云心理医院',
  '内蒙古自治区第三医院': '内蒙古第三医院',
  '福州第四医院': '福州市第二总医院神经精神病防治院',
  '赣南医学院第一附属医院': '赣南医科大学第一附属医院',
  '湖南省立第二人民医院/脑科医院': '湖南省脑科医院',
  '台湾大学医学院附设医院': '台大医院',
  '山西医科大学第一附属医院': '山西医科大学第一医院',
  '成功大学医学院附设医院': '国立成功大学医学院附设医院',
  '广州市惠爱医院': '广州医科大学附属脑科医院',
  '山东省精卫（青岛）': '青岛市精神卫生中心',
  '广东省精神卫生中心': '广东省人民医院惠福分院',
  '中国医药大学附设医院': 'China Medical University Hospital',
  '澳门大学心理学系诊所': '澳门大学社会科学学院',
  '澳门心理卫生中心': '澳門心理衛生中心',
}

export function searchCity(target: LocationTarget): string {
  const cities: Record<string, string> = {
    '中国医药大学附设医院': '台中市',
    '成功大学医学院附设医院': '台南市',
    '苏州广济医院（在吴中人民医院出诊）': '苏州市',
  }
  const hint = target.name.match(/（(保定|青岛|南昌)）/u)?.[1]
  return cities[target.name] ?? (hint ? `${hint}市` : target.region)
}

const BUILDING = /门诊|急诊|住院|病房|楼|病区|科室|药房|停车|入口|出口|大厅|诊疗|体检|急救|科$/u
const AUXILIARY = /超市|食堂|便利店|美容中心|护理之家|医疗\d+区|解剖室|眼视光部|餐厅|商品部|核振中心|药店|健康管理|服务站|公司|办公室|宿舍|公交站|地铁站|美发/u

export function siteCandidates(pois: Poi[]): Poi[] {
  return pois.filter(poi => !BUILDING.test(poi.name) && !AUXILIARY.test(poi.name))
}

export function normalizedName(name: string): string {
  return name.replace(/^首都医科大学附属/u, '')
    .replace(/^国立/u, '')
    .replace(/^北大国际/u, '北京大学国际')
    .replace(/^郑大一附院/u, '郑州大学第一附属医院')
    .replace(/精卫$/u, '精神卫生中心')
    .replace(/医院东区$/u, '医院东院区')
    .replace(/芳村(?:总院|院区)?/u, '芳村')
    .replace(/[\s（）()·市]/gu, '')
}

export function selectPoi(target: LocationTarget, pois: Poi[]): LocationResult {
  const base: LocationResult = { name: target.name, report_ids: target.report_ids, region: target.region, matched_name: searchName(target.name), status: 'not_found', reason: '高德候选尚未匹配到机构名称', candidates: pois }
  const wanted = normalizedName(searchName(target.name).replace(/(?:保定|青岛|南昌)$/u, ''))
  const hint = target.name.match(/（(保定|青岛|南昌|海南)）/u)?.[1]
  const located = pois.filter(poi => {
    if (!poi.location || !poi.address || !poi.pname) return false
    const macauManaged = target.name === '澳门大学心理学系诊所' && /由澳门特别行政区.*管辖/u.test(`${poi.name}${poi.address}`)
    if (!macauManaged && target.region && poi.pname.replace(/省|市|壮族自治区|维吾尔自治区|回族自治区|自治区|特别行政区/gu, '') !== target.region.replace(/省|市|壮族自治区|维吾尔自治区|回族自治区|自治区|特别行政区/gu, '')) return false
    const city = searchCity(target)
    if (city && city !== target.region && !`${poi.cityname}${poi.address}`.includes(city.replace(/市$/u, ''))) return false
    return !hint || `${poi.pname}${poi.cityname}${poi.address}`.includes(hint)
  })
  const names = /在.+出诊/u.test(target.name) ? [wanted] : [wanted, normalizedName(target.name.replace(/（[^）]*）/gu, ''))]
  const scoreName = (name: string, wanted: string) => {
    if (name === wanted) return 100
    if (name.startsWith(wanted) || wanted.startsWith(name)) return 85
    if (name.includes(wanted)) return 78
    let common = 0
    while (common < Math.min(name.length, wanted.length) && name[common] === wanted[common]) common++
    return Math.min(50, common * 6)
  }
  const score = (poi: Poi) => Math.max(...names.map(name => scoreName(normalizedName(poi.name), name)))
  const candidates = siteCandidates(located).filter(poi => !/医院|附院/u.test(target.name) || poi.typecode.startsWith('09'))
  const ranked = candidates.map(poi => ({ poi, score: score(poi) })).filter(item => item.score >= 25).sort((a, b) => b.score - a.score)
  const campusSpecified = /院区|分院|医院[东西南北]区$/u.test(target.name) || /芳村/u.test(target.name)
  const exact = ranked.find(item => item.score === 100)
  if (campusSpecified) {
    // An explicit campus cannot fall back to a different site or the hospital's head office.
    const bracket = target.name.match(/（([^）]*(?:院区|分院|芳村)[^）]*)）/u)?.[1]
    const tail = wanted.slice(wanted.lastIndexOf('医院') + 2)
    const campus = normalizedName(bracket ?? tail).replace(/院区|分院|总院/gu, '')
    const chosen = exact ?? ranked.find(item => campus && normalizedName(item.poi.name).includes(campus))
    return chosen ? { ...base, status: 'geocoded', reason: '匹配原文指定院区', selection_rule: 'explicit-campus', chosen: chosen.poi } : { ...base, reason: '高德候选未匹配到指定院区' }
  }
  const primary = ranked.find(item => item.score >= 85 && /总院|院本部|主院区/u.test(item.poi.name))
  const selected = primary ?? exact ?? ranked[0]
  if (!selected) {
    const building = located.find(poi => (!/医院|附院/u.test(target.name) || poi.typecode.startsWith('09')) && !AUXILIARY.test(poi.name) && names.some(name => normalizedName(poi.name).startsWith(name)))
    return building ? { ...base, status: 'geocoded', reason: '采用高德院内医疗建筑位置', selection_rule: 'medical-building', chosen: building } : base
  }
  if (target.name === '澳门大学心理学系诊所') return { ...base, status: 'geocoded', reason: '采用心理学系所在社会科学学院建筑点', selection_rule: 'institution-building', chosen: selected.poi }
  const rule = /在.+出诊/u.test(target.name) ? 'visit-site' : primary ? 'main-campus' : exact ? 'base-name' : 'best-score'
  return { ...base, status: 'geocoded', reason: rule === 'visit-site' ? '匹配原文出诊地点' : '按高德主体/本部及名称匹配选取机构代表位置', selection_rule: rule, chosen: selected.poi }
}

export async function searchAmap(key: string, keywords: string, city: string, request = fetch): Promise<{ pois: Poi[]; requests: number }> {
  const pois: Poi[] = []
  let pages = 1
  for (let page = 1; page <= pages; page++) {
    const params = new URLSearchParams({ key, keywords, city, offset: '25', page: String(page), extensions: 'base' })
    let response: Response
    try {
      response = await request(`https://restapi.amap.com/v3/place/text?${params}`, { signal: AbortSignal.timeout(20000) })
    } catch (error) {
      const cause = error as Error & { cause?: { code?: string } }
      throw new Error(`高德网络请求失败：${cause.name}${cause.cause?.code ? `/${cause.cause.code}` : ''}`)
    }
    if (!response.ok) throw new Error(`高德 HTTP ${response.status}`)
    const body = await response.json() as { status: string; info: string; infocode: string; count: string; pois?: Poi[] }
    if (body.status !== '1') throw new Error(`高德 HTTP ${response.status}, status=${body.status}, infocode=${body.infocode}, info=${body.info.replaceAll(key, '[redacted]')}`)
    for (const raw of body.pois ?? []) {
      const poi = Object.fromEntries(['id', 'name', 'address', 'location', 'pname', 'cityname', 'adcode', 'typecode'].map(field => [field, typeof raw[field as keyof Poi] === 'string' ? raw[field as keyof Poi] : ''])) as Poi
      pois.push(poi)
    }
    pages = Math.max(1, Math.ceil(Number(body.count) / 25))
    if (page < pages) await new Promise(resolve => setTimeout(resolve, 1100))
  }
  return { pois, requests: pages }
}

export function linkLocationReports(reports: Report[], run: LocationRun): Report[] {
  const targets = locationTargets(reports)
  if (run.results.length !== targets.length) throw new Error('定位清单没有覆盖全部原文机构')
  const byTarget = new Map(run.results.map(result => [targetKey(result.name, result.region), result]))
  if (byTarget.size !== targets.length) throw new Error('定位清单存在重复机构')
  const links = new Map<string, string>()
  for (const target of targets) {
    const result = byTarget.get(targetKey(target.name, target.region))
    if (!result || JSON.stringify(result.report_ids) !== JSON.stringify(target.report_ids)) {
      throw new Error(`定位清单与来源对应不符：${target.name}`)
    }
    if (result.status === 'geocoded') {
      if (!result.chosen || !result.selection_rule || !result.candidates.some(poi => JSON.stringify(poi) === JSON.stringify(result.chosen))) throw new Error(`定位缺少候选依据或选点规则：${target.name}`)
      for (const id of result.report_ids) links.set(id, `kdocs-amap-${result.chosen.id.toLowerCase()}`)
    } else if (result.chosen) throw new Error(`未确定机构不能关联坐标：${target.name}`)
  }
  return reports.map(report => {
    const hospitalId = links.get(baseReportId(report.id))
    return hospitalId ? { ...report, hospital_id: hospitalId } : { ...report }
  })
}
