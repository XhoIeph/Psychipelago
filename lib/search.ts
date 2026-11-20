import type { Hospital, Report } from './schema'

/**
 * 检索归一化。
 *
 * 界面上病症标签用的是通行缩写（PTSD/C-PTSD、OSDD/DID，见 `disorder-labels.ts`），
 * 数据里存的却是 id（`cptsd`、`osdd`/`did`）。用户照着标签输入时必须也能命中，
 * 所以先把标签整串折回 id，再按空白与标点切词；斜杠不参与切词，否则
 * 「OSDD/DID」会被切成空词。
 */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/孤独症|自闭症|autism/gi, 'asd')
    .replace(/复杂性创伤后应激障碍/g, 'cptsd')
    .replace(/边缘型人格障碍/g, 'bpd')
    .replace(/ptsd\s*\/\s*c-ptsd|c-ptsd/g, 'cptsd')
    .replace(/osdd\s*\/\s*did/g, 'osdd')
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
