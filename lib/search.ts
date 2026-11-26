import type { Hospital, Report } from './schema'

const wordSegmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' })
const searchSeparators = /[\p{White_Space}\p{P}\p{S}]+/u
const compactSeparators = /[\p{White_Space}\p{P}\p{S}]/gu

/**
 * 检索归一化。
 *
 * 病症标签会折回公开数据里的 id；之后再移除空白和标点，让连写关键词与字段间的空格
 * 不影响命中。中文连写查询用 Intl.Segmenter 切词，连续单字姓名会合并回一个词。
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

function compactSearch(text: string): string {
  return normalizeSearch(text).replace(compactSeparators, '')
}

function searchTerms(query: string): string[] {
  const parts = normalizeSearch(query).split(searchSeparators).filter(Boolean)
  const terms: string[] = []
  for (const part of parts) {
    let singleHanRun = ''
    const flushHanRun = () => {
      if (singleHanRun) terms.push(singleHanRun)
      singleHanRun = ''
    }
    for (const { segment, isWordLike } of wordSegmenter.segment(part)) {
      if (!isWordLike) {
        flushHanRun()
        continue
      }
      if ([...segment].length === 1 && /^\p{Script=Han}$/u.test(segment)) {
        singleHanRun += segment
      } else {
        flushHanRun()
        terms.push(segment)
      }
    }
    flushHanRun()
  }
  return terms.map((term) => term.replace(compactSeparators, '')).filter(Boolean)
}

export function matchesSearch(text: string, query: string): boolean {
  if (!query.trim()) return true
  const haystack = compactSearch(text)
  const terms = searchTerms(query)
  return terms.length > 0 && terms.every((term) => haystack.includes(term))
}

/** 越小越相关；字段按名称、省市、服务信息、线索内容排列。 */
export function searchRelevance(query: string, fields: readonly string[]): number {
  const terms = searchTerms(query)
  if (!terms.length) return Number.POSITIVE_INFINITY
  const searchableFields = fields.map(compactSearch)
  const fieldRanks = terms.map((term) => searchableFields.findIndex((field) => field.includes(term)))
  if (fieldRanks.some((rank) => rank < 0)) return Number.POSITIVE_INFINITY

  const maxRank = Math.max(...fieldRanks)
  const averageRank = fieldRanks.reduce((sum, rank) => sum + rank, 0) / fieldRanks.length
  const phrase = compactSearch(query)
  const exactPhraseMatch = phrase && searchableFields.some((field) => field.includes(phrase))
  return maxRank * 100 + averageRank * 10 + (exactPhraseMatch ? 0 : 1)
}

/** 返回所有关键词命中的最弱字段层级，字段级别见 searchRelevance。 */
export function searchTier(query: string, tiers: readonly string[]): number {
  const terms = searchTerms(query)
  if (!terms.length) return tiers.length
  const fieldRanks = terms.map((term) => tiers.findIndex((text) => compactSearch(text).includes(term)))
  if (fieldRanks.some((rank) => rank < 0)) return tiers.length
  return Math.max(...fieldRanks)
}

/** 医院检索文本按相关性分层，供搜索结果排序。 */
export function hospitalSearchTiers(hospital: Hospital, reports: Report[]): string[] {
  const related = reports.filter(report => report.hospital_id === hospital.id)
  return [
    [hospital.name, ...hospital.aliases].join(' '),
    [hospital.province, hospital.city].join(' '),
    [...hospital.departments, ...hospital.trauma_service.evidence].join(' '),
    related.flatMap(report => [
      report.evidence_quote,
      report.evidence_full_text ?? '',
      report.doctor_name_raw ?? '',
      ...(report.disorders ?? []),
      ...(report.source_topics ?? []),
    ]).join(' '),
  ]
}
