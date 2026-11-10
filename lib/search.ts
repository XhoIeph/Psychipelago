import type { Hospital, Report } from './schema'

export function normalizeSearch(text: string): string {
  return text.toLowerCase().replace(/孤独症|自闭症|autism/gi, 'asd').replace(/复杂性创伤后应激障碍/g, 'cptsd').replace(/边缘型人格障碍/g, 'bpd')
}

export function matchesSearch(text: string, query: string): boolean {
  const haystack = normalizeSearch(text)
  const terms = normalizeSearch(query).split(/[\s,，、;；]+/u).filter(Boolean)
  return terms.every(term => haystack.includes(term))
}

/** 命中层级：0 名称 / 别名，1 省份 / 城市，2 科室、服务说明、病症，3 只有线索原文。数字越小越相关。 */
export function searchTier(query: string, tiers: readonly string[]): number {
  const index = tiers.findIndex((text) => matchesSearch(text, query))
  return index === -1 ? tiers.length : index
}

/** 医院检索文本按相关性分四层，供搜索结果排序；顺序与 searchTier 的层级一致。 */
export function hospitalSearchTiers(hospital: Hospital, reports: Report[]): string[] {
  const related = reports.filter(report => report.hospital_id === hospital.id)
  return [
    [hospital.name, ...hospital.aliases].join(' '),
    [hospital.province, hospital.city].join(' '),
    [...hospital.departments, ...hospital.trauma_service.evidence].join(' '),
    related.flatMap(report => [report.evidence_quote, report.evidence_full_text ?? '', report.doctor_name_raw ?? '', ...report.disorders]).join(' '),
  ]
}
