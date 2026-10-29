import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import type { Report } from '../lib/schema.ts'
import { reportsFileSchema } from '../lib/schema.ts'
import { CURATED_FILES, readJson, writeJson } from './lib/paths.ts'
import { LOCATION_EVIDENCE, linkLocationReports } from './lib/amap.ts'
import type { LocationRun } from './lib/amap.ts'

export const SOURCE_URL = 'https://www.kdocs.cn/l/crOlzFWeu2GY'
export const SOURCE_CAPTURE = 'data/evidence/kdocs/2026-10-27/document.json'

export type SourceDocument = {
  title: string
  url: string
  captured_at: string
  document_updated_at: string | null
  displayed_word_count: number
  page_count: number
  reading_method: string
  pages: Array<{ page: number; lines: string[] }>
}

export function reportsFromDocument(document: SourceDocument): Report[] {
  const reports: Report[] = []
  let section = ''
  let region: string | undefined
  const sections = new Set(['cptsd：', 'osdd/did：', '人格障碍：'])
  const regions: Record<string, string> = { 港: '香港', 澳: '澳门', 台: '台湾' }

  for (const page of document.pages) {
    for (let index = 0; index < page.lines.length; index++) {
      const line = page.lines[index]
      if (sections.has(line)) {
        section = line.slice(0, -1)
        region = undefined
        continue
      }
      if (regions[line]) {
        region = regions[line]
        continue
      }
      if (!section || !line.includes('：') || line.startsWith('（')) continue

      const separator = line.indexOf('：')
      const hospitalName = line.slice(0, separator)
      const doctorNames = line.slice(separator + 1)
        .replace(/（[^）]*）/gu, '')
        .split(/[、，,]/u)
        .map((name) => name.trim().replace(/等$/u, '').replace(/医生$/u, ''))
        .filter((name) => name && !/门诊|会诊|团队|课题组/u.test(name))
      const followingNote = page.lines[index + 1]?.startsWith('（') ? page.lines[index + 1] : undefined
      const quote = followingNote ? `${line}\n${followingNote}` : line
      // University names can contain a province unrelated to the hospital's location.
      const explicitRegion = hospitalName.match(/^(河南省|陕西省|山东省|甘肃省|辽宁省|黑龙江省|新疆维吾尔自治区|广东省|浙江省|贵州省|四川省|海南省|河北省|内蒙古自治区|宁夏回族自治区|江西省|西藏自治区|上海市|重庆市)/u)?.[0]
      const hospitalRegion = region ?? explicitRegion
      const disorders: Report['disorders'] = section === 'cptsd' ? ['cptsd'] : section === 'osdd/did' ? ['osdd', 'did'] : ['other']

      reports.push({
        id: `kdocs-crolzfweu2gy-p${page.page}-l${index + 1}`,
        platform: 'web',
        source_channel: 'browser_session',
        source_url: document.url,
        source_post_id: 'crOlzFWeu2GY',
        published_at_precision: 'unknown',
        ...(hospitalRegion ? { hospital_region: hospitalRegion } : {}),
        hospital_name_raw: hospitalName,
        ...(doctorNames.length ? { doctor_name_raw: doctorNames.join('、') } : {}),
        disorders,
        ...(section === '人格障碍' ? { source_topics: ['人格障碍'] } : {}),
        stage: 'unknown',
        experience: null,
        evidence_quote: quote,
        evidence_context: {
          note_title: document.title,
          index_in_capture: `第${page.page}页 · ${section} · 第${index + 1}${followingNote ? `–${index + 2}` : ''}段`,
          capture_scope: SOURCE_CAPTURE,
        },
        evidence_source: 'article',
        verification: { level: 'unverified' },
        extraction: { tool: 'kdocs-browser-transcription', captured_at: document.captured_at },
        flags: { contains_minor: false, contains_selfharm_detail: false, sensitive: false },
        status: 'published',
      })
    }
  }
  return reports
}

export function reportsWithLocations(document: SourceDocument): Report[] {
  const reports = reportsFromDocument(document)
  if (!existsSync(LOCATION_EVIDENCE)) return reports
  const run = readJson<LocationRun>(LOCATION_EVIDENCE)
  if (run.source_url !== SOURCE_URL) throw new Error('定位依据必须对应当前主线来源')
  return linkLocationReports(reports, run)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const document = readJson<SourceDocument>(resolve(SOURCE_CAPTURE))
  if (document.url !== SOURCE_URL || document.pages.length !== document.page_count) {
    throw new Error('来源链接或分页数量不符')
  }
  const output = reportsFileSchema.parse({
    schema_version: '1.0.0',
    updated_at: document.captured_at,
    items: reportsWithLocations(document),
  })
  writeJson(CURATED_FILES.reports, output)
  console.log(`✓ 新源文本入库：${document.page_count} 页，${output.items.length} 条机构名单，保留 ${output.items.filter(report => report.hospital_id).length} 条定位关联`)
}
