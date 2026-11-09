/**
 * Resolve only the active document's institutions through the configured Amap service.
 * Candidates stay in ignored raw storage; --write applies reviewed source mappings.
 * --probe diagnoses one request without writing; --apply <report> --write uses a saved run.
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { doctorsFileSchema, hospitalsFileSchema, reportsFileSchema } from '../lib/schema.ts'
import type { Hospital, Report } from '../lib/schema.ts'
import { doctorsWithLocations, markUnlinked, reportsFromDocument, SOURCE_CAPTURE, SOURCE_URL } from './import-kdocs.ts'
import type { SourceDocument } from './import-kdocs.ts'
import { LOCATION_EVIDENCE, locationTargets, searchName, searchCity, selectPoi, searchAmap, linkLocationReports } from './lib/amap.ts'
import type { LocationRun, Poi } from './lib/amap.ts'
import { CURATED_FILES, readJson, writeJson } from './lib/paths.ts'

function loadEnvKey(): string {
  if (!existsSync('.env.local')) throw new Error('.env.local 不存在')
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = line.match(/^AMAP_WEB_SERVICE_KEY=(.+)\s*$/)
    if (match) return match[1].trim()
  }
  throw new Error('.env.local 缺少 AMAP_WEB_SERVICE_KEY')
}

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

export function hospitalsFromRun(run: LocationRun): Hospital[] {
  const provinces = readJson<{ items: Array<{ name: string; adcode: string }> }>(CURATED_FILES.provinces).items
  const hospitals = new Map<string, Hospital>()
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
    const province = provinces.find(province => province.name === (macauManaged ? '澳门特别行政区' : poi.pname))
    if (!province) throw new Error(`高德省级归属不在行政区字典：${poi.name} / ${poi.pname}`)
    hospitals.set(id, {
      id, name: /building$/u.test(result.selection_rule ?? '') || !/[\u4e00-\u9fff]/u.test(poi.name) ? result.name.replace(/（[^）]*）/gu, '') : poi.name, aliases: [result.name], adcode: province.adcode,
      province: province.name, city: macauManaged ? province.name : poi.cityname || poi.pname, level: '未知', category: '其他', departments: ['未录入'],
      trauma_service: { cptsd_assessment: 'unknown', cptsd_bpd_diagnosis: 'unknown', icd11_practice: 'unknown', evidence: [] },
      address: poi.address, coordinates: { lat, lng }, coordinates_source: 'geocoded',
      official_sources: [], last_verified_at: run.generated_at.slice(0, 10),
    })
  }
  return [...hospitals.values()]
}

export function applyRun(reports: Report[], run: LocationRun, document: SourceDocument) {
  if (run.source_url !== SOURCE_URL || run.results.some(result => result.status === 'not_queried')) throw new Error('定位报告来源不符或尚未完成查询')
  const linked = markUnlinked(linkLocationReports(reports, run), run)
  const hospitals = hospitalsFromRun(run)
  const updated_at = run.generated_at.slice(0, 10)
  const hospitalFile = hospitalsFileSchema.parse({ schema_version: '1.0.0', updated_at, items: hospitals })
  const reportFile = reportsFileSchema.parse({ schema_version: '1.0.0', updated_at, items: linked })
  const doctorFile = doctorsFileSchema.parse({ schema_version: '1.0.0', updated_at, items: doctorsWithLocations(document, linked) })
  // Keep public provenance minimal; the full candidate inventory stays in ignored raw storage.
  writeJson(LOCATION_EVIDENCE, { ...run, provider: 'amap', endpoint: 'https://restapi.amap.com/v3/place/text', source_crs: 'GCJ-02', stored_crs: 'WGS84', conversion: 'three-iteration approximate inverse', results: run.results.map(result => ({ ...result, candidates: result.chosen ? [result.chosen] : [] })) })
  writeJson(CURATED_FILES.hospitals, hospitalFile)
  writeJson(CURATED_FILES.reports, reportFile)
  writeJson(CURATED_FILES.doctors, doctorFile)
  console.log(`已入库 ${hospitals.length} 个位置，${doctorFile.items.length} 位医生，关联 ${linked.filter(report => report.hospital_id).length}/${linked.length} 条来源；其余保留未定位`)
}

async function main() {
  const document = readJson<SourceDocument>(SOURCE_CAPTURE)
  const reports = reportsFromDocument(document)
  const args = process.argv.slice(2)
  if (args.includes('--apply')) {
    const run = readJson<LocationRun>(args[args.indexOf('--apply') + 1])
    if (!args.includes('--write')) throw new Error('应用定位报告须明确 --write')
    const candidates = run.results.flatMap(result => result.candidates)
    run.results = run.results.map(result => {
      if (result.status === 'not_queried') return result
      const selected = selectPoi(result, result.candidates)
      if (selected.chosen) return selected
      // Identical POIs already returned for another current-source name do not need another request.
      const matching = candidates.filter(poi => poi.name.replace(/[市（）()\s]/gu, '') === searchName(result.name).replace(/[市（）()\s]/gu, ''))
      return matching.length ? selectPoi(result, matching) : selected
    })
    applyRun(reports, run, document)
    return
  }
  const key = loadEnvKey()
  if (args.includes('--probe')) {
    console.log(`${new Date().toISOString()} 高德单次诊断：${reports[0].hospital_name_raw}`)
    const params = new URLSearchParams({ key, keywords: reports[0].hospital_name_raw!, offset: '1', page: '1' })
    const response = await fetch(`https://restapi.amap.com/v3/place/text?${params}`, { signal: AbortSignal.timeout(20000) })
    const body = await response.json() as { status: string; info: string; infocode: string }
    console.log(`HTTP ${response.status}, status=${body.status}, infocode=${body.infocode}, info=${body.info.replaceAll(key, '[redacted]')}`)
    if (!response.ok || body.status !== '1') process.exitCode = 1
    return
  }
  const targets = locationTargets(reports)
  const run: LocationRun = { source_url: SOURCE_URL, generated_at: new Date().toISOString(), requests: 0, requests_total: 0,
    results: targets.map(target => ({ ...target, status: 'not_queried', reason: '尚未查询', candidates: [] })) }
  const rawPath = 'data/raw/amap-2026-11-09.json'
  if (args.includes('--missing') && existsSync(LOCATION_EVIDENCE)) {
    const previous = readJson<LocationRun>(LOCATION_EVIDENCE)
    if (previous.source_url !== SOURCE_URL) throw new Error('已有定位不属于当前来源，须重新全量定位')
    linkLocationReports(reports, previous)
    run.requests_total = previous.requests_total ?? previous.requests
    run.results = previous.results.map(result => result.status === 'geocoded' ? result : { ...result, status: 'not_queried', candidates: [] })
  }
  // 上一轮主线已确认的同一家机构可直接复用 POI，避免为改造来源结构白查一遍高德配额。
  const reusePath = args.includes('--reuse') ? args[args.indexOf('--reuse') + 1] : undefined
  const reusable = new Map<string, Poi>()
  if (reusePath) {
    for (const result of readJson<LocationRun>(reusePath).results) {
      if (result.status === 'geocoded' && result.chosen) reusable.set(result.name, result.chosen)
    }
    console.log(`复用上一轮定位：${reusable.size} 家机构可跳过查询`)
  }
  const countedFetch: typeof fetch = (...args) => { run.requests++; run.requests_total!++; return fetch(...args) }
  try {
    for (let index = 0; index < targets.length; index++) {
      if (run.results[index].status === 'geocoded') continue
      const target = targets[index]
      const known = reusable.get(target.name)
      if (known) {
        run.results[index] = { ...target, status: 'geocoded', reason: '复用上一轮同一机构的定位结果', candidates: [known], chosen: known, matched_name: known.name, selection_rule: 'base-name' }
        console.log(`${index + 1}/${targets.length} 复用 ${target.name} -> ${known.name}`)
        writeJson(rawPath, run)
        continue
      }
      let reply
      try {
        reply = await searchAmap(key, searchName(target.name), searchCity(target), countedFetch)
      } catch (error) {
        const message = (error as Error).message
        // 高德业务拒绝（如境外机构超出 key 权限）只影响这一家，其余机构照常完成。
        const infocode = message.match(/infocode=(\d+)/u)?.[1]
        if (!infocode) throw error
        run.results[index] = { ...target, status: 'not_found', reason: `高德接口拒绝查询（${infocode}）`, candidates: [] }
        console.log(`${index + 1}/${targets.length} not_found ${target.name} -> 接口拒绝 ${infocode}`)
        writeJson(rawPath, run)
        continue
      }
      run.results[index] = selectPoi(target, reply.pois)
      const result = run.results[index]
      console.log(`${index + 1}/${targets.length} ${result.status} ${target.name} -> ${result.chosen?.name ?? result.reason} (${reply.pois.length} 候选)`)
      writeJson(rawPath, run)
      await new Promise(resolve => setTimeout(resolve, 1100))
    }
  } catch (error) {
    writeJson(rawPath, run)
    const done = run.results.filter(result => result.status !== 'not_queried').length
    console.error(`高德查询中止：已完成 ${done}/${targets.length}，请求 ${run.requests} 次；本地进度 ${rawPath}`)
    throw error
  }
  console.log(`高德完成 ${targets.length} 个原文机构、${reports.length} 条来源，${run.requests} 次请求。候选报告：${rawPath}`)
  if (args.includes('--write')) applyRun(reports, run, document)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: Error & { cause?: { code?: string } }) => {
    // Request URLs contain credentials; expose only the controlled diagnostic message.
    console.error(`定位停止：${error.message === 'fetch failed' ? `网络请求失败 ${error.cause?.code ?? ''}` : error.message}`)
    process.exitCode = 1
  })
}
