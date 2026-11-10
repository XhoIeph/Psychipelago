/**
 * 控制台新增机构的坐标：单条查询、人工选定、合成页面用的坐标表。
 *
 * `data/evidence/locations/amap-2026-11-09.json` 记录的是「那天用主线表格问了高德什么」，
 * 冻结不改；控制台为源表里没有的机构查到的结果另存一份，两边合成
 * `data/generated/locations.json`，页面只读合成后的文件。
 *
 * 坐标一律保留高德返回的 GCJ-02 原文，与证据文件同口径：
 * 页面用这份原始坐标出图，curated 里的 WGS84 只作存档。
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Hospital } from '../../lib/schema.ts'
import { shortProvinceName } from '../../lib/region.ts'
import { GENERATED_DIR, ROOT, readJson, today, writeJson } from './paths.ts'
import { searchAmap, searchCity, searchName, siteCandidates } from './amap.ts'
import type { LocationResult, LocationTarget, Poi } from './amap.ts'

export const MANUAL_LOCATION_FILE = 'data/evidence/locations/amap-manual.json'
export const GENERATED_LOCATIONS = resolve(GENERATED_DIR, 'locations.json')

export type ManualQuery = { keywords: string; city: string }
export type ManualPick = { by: string; at: string; reason?: string }

export type ManualLocation = {
  hospital_id: string
  name: string
  /** queried = 查过但还没人选；geocoded = 有人从这个候选列表里挑定了一条 */
  status: 'queried' | 'geocoded'
  queried_at: string
  query: ManualQuery
  /** 高德原始返回，原样留下；页面不显示落选候选，人选时才用得上 */
  candidates: Poi[]
  /** 通过建成/辅助设施过滤的候选，只是提示，不代表选定 */
  shortlist: string[]
  chosen?: Poi
  picked?: ManualPick
}

export type ManualLocationFile = {
  schema_version: '1.0.0'
  provider: 'amap'
  source_crs: 'GCJ-02'
  stored_crs: 'GCJ-02'
  entries: ManualLocation[]
}

export type GeneratedLocation = {
  hospital_id: string
  name: string
  status: ManualLocation['status'] | 'not_found'
  provenance: 'evidence' | 'manual'
  chosen?: Poi
  queried_at?: string
  picked?: ManualPick
}

export type GeneratedLocations = {
  schema_version: '1.0.0'
  generated_at: string
  provider: 'amap'
  source_crs: 'GCJ-02'
  /** 这里存的 chosen.location 就是高德原始 GCJ-02，没有被反算成 WGS84，别照着头去转。 */
  stored_crs: 'GCJ-02'
  results: GeneratedLocation[]
}

/** 证据文件里一条结果对应的机构 id；同址多个原文名共用一条 POI 时以第一条为准。 */
export function evidenceHospitalId(result: LocationResult): string | undefined {
  return result.chosen ? `kdocs-amap-${result.chosen.id.toLowerCase()}` : undefined
}

function manualPath(root: string): string {
  return resolve(root, MANUAL_LOCATION_FILE)
}

function assertEntry(entry: ManualLocation, where: string): void {
  if (!entry.hospital_id) throw new Error(`${where}: 缺少 hospital_id`)
  if (entry.status !== 'queried' && entry.status !== 'geocoded') throw new Error(`${where}: status 只能是 queried 或 geocoded`)
  if (!Array.isArray(entry.candidates)) throw new Error(`${where}: candidates 必须是数组`)
  if (entry.status === 'geocoded') {
    if (!entry.chosen) throw new Error(`${where}: 已选定的记录缺少 chosen`)
    if (!entry.chosen.id || !entry.chosen.location) throw new Error(`${where}: chosen 缺少 id 或 location`)
    if (!entry.candidates.some(poi => poi.id === entry.chosen!.id)) throw new Error(`${where}: chosen 不在候选列表里，候选已经换过，请重新查询`)
  }
}

export function readManualLocations(root = ROOT): ManualLocation[] {
  const path = manualPath(root)
  if (!existsSync(path)) return []
  const file = readJson<ManualLocationFile>(path)
  if (file.schema_version !== '1.0.0') throw new Error(`${MANUAL_LOCATION_FILE}: 版本号不认识（${file.schema_version}）`)
  const seen = new Set<string>()
  for (const [index, entry] of file.entries.entries()) {
    const where = `${MANUAL_LOCATION_FILE} 第 ${index + 1} 条`
    assertEntry(entry, where)
    if (seen.has(entry.hospital_id)) throw new Error(`${where}: 机构 ${entry.hospital_id} 重复`)
    seen.add(entry.hospital_id)
  }
  return file.entries
}

export function writeManualLocations(entries: ManualLocation[], root = ROOT): void {
  const sorted = [...entries].sort((a, b) => a.hospital_id.localeCompare(b.hospital_id))
  const file: ManualLocationFile = {
    schema_version: '1.0.0',
    provider: 'amap',
    source_crs: 'GCJ-02',
    stored_crs: 'GCJ-02',
    entries: sorted,
  }
  writeJson(manualPath(root), file)
}

export function upsertManualLocation(entry: ManualLocation, root = ROOT): ManualLocation[] {
  const entries = readManualLocations(root).filter(existing => existing.hospital_id !== entry.hospital_id)
  entries.push(entry)
  writeManualLocations(entries, root)
  return entries
}

/**
 * 把控制台传进来的机构 id 或名称对到一家医院。
 * 源表里的机构按 id 或原名都能找到；控制台新增的机构只存在于覆盖层，
 * 所以这里读的是「源 + 覆盖层」合成后的清单，与生成器判断一致。
 */
export function resolveTarget(hospitals: Hospital[], arg: string): { hospital_id: string; name: string; region: string } {
  const byId = hospitals.find(hospital => hospital.id === arg)
  if (byId) return { hospital_id: byId.id, name: byId.name, region: shortProvinceName(byId.province) }
  const byAlias = hospitals.find(hospital => hospital.name === arg || hospital.aliases.includes(arg))
  if (byAlias) return { hospital_id: byAlias.id, name: byAlias.name, region: shortProvinceName(byAlias.province) }
  // 还没落库的机构：只给了名字，照样能查，选定后再补 id。
  return { hospital_id: arg.startsWith('local-') ? arg : '', name: arg, region: '' }
}

/** 查一次，候选原样返回；不替人做决定。 */
export async function queryLocation(
  key: string,
  target: { hospital_id: string; name: string; region: string },
  previous?: ManualLocation,
  request: typeof fetch = fetch,
): Promise<ManualLocation> {
  const probe: LocationTarget = { name: target.name, region: target.region, report_ids: [] }
  const keywords = searchName(target.name)
  const city = searchCity(probe)
  const reply = await searchAmap(key, keywords, city, request)
  const candidates = reply.pois
  const kept = previous?.chosen && candidates.some(poi => poi.id === previous.chosen!.id) ? previous.chosen : undefined
  return {
    hospital_id: target.hospital_id || previous?.hospital_id || '',
    name: target.name,
    status: kept ? 'geocoded' : 'queried',
    queried_at: new Date().toISOString(),
    query: { keywords, city },
    candidates,
    shortlist: siteCandidates(candidates).map(poi => poi.id),
    ...(kept ? { chosen: kept, picked: previous?.picked } : {}),
  }
}

export function pickCandidate(entry: ManualLocation, poiId: string, pick: { by: string; reason?: string }): ManualLocation {
  const chosen = entry.candidates.find(poi => poi.id === poiId)
  if (!chosen) throw new Error(`候选里没有 ${poiId}；先跑 --query 拿到当前候选`)
  return {
    ...entry,
    status: 'geocoded',
    chosen,
    picked: { by: pick.by, at: today(), ...(pick.reason ? { reason: pick.reason } : {}) },
  }
}

/**
 * 合成页面用的坐标表：证据结果 + 人工选定，同一机构以人工为准。
 * 任何一家有坐标的医院在表里找不到落点，都在这里一次报全，不留到页面渲染时才发现。
 */
export function buildLocationIndex(
  hospitals: Hospital[],
  evidence: LocationResult[],
  manual: ManualLocation[],
): GeneratedLocations {
  const results = new Map<string, GeneratedLocation>()
  for (const result of evidence) {
    const hospitalId = evidenceHospitalId(result)
    if (!hospitalId || result.status !== 'geocoded' || !result.chosen) continue
    if (results.has(hospitalId)) continue
    results.set(hospitalId, { hospital_id: hospitalId, name: result.name, status: 'geocoded', provenance: 'evidence', chosen: result.chosen })
  }
  for (const entry of manual) {
    // 只合已经选定的记录：查到候选但还没人选，就没有坐标可画，
    // 这时仍用证据里的落点，别把已有的图钉弄没。
    if (!entry.hospital_id || entry.status !== 'geocoded' || !entry.chosen) continue
    results.set(entry.hospital_id, {
      hospital_id: entry.hospital_id,
      name: entry.name,
      status: 'geocoded',
      provenance: 'manual',
      chosen: entry.chosen,
      queried_at: entry.queried_at,
      ...(entry.picked ? { picked: entry.picked } : {}),
    })
  }
  const missing = hospitals
    .filter(hospital => hospital.coordinates)
    .filter(hospital => {
      const entry = results.get(hospital.id)
      return !entry || entry.status !== 'geocoded' || !entry.chosen
    })
    .map(hospital => hospital.id)
  if (missing.length) throw new Error(`缺少机构的原始高德坐标：${missing.join('、')}`)
  return {
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    provider: 'amap',
    source_crs: 'GCJ-02',
    stored_crs: 'GCJ-02',
    results: [...results.values()].sort((a, b) => a.hospital_id.localeCompare(b.hospital_id)),
  }
}
