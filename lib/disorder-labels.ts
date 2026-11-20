import type { DisorderId } from './schema'

/**
 * 病症标签的显示口径
 *
 * 源文档的三段标题是 cptsd / osdd-did / 人格障碍。界面上的标签必须跟数据口径对得上，
 * 不能直接拿 `disorders.json` 的 `name_zh`：那是 ICD-11 术语写法
 * （「复杂性创伤后应激障碍」「部分解离性身份障碍」），比源文档长得多，
 * 也会让同一批线索在两个地方出现两种叫法。
 *
 * cptsd 与 osdd/did 两段用通行缩写 PTSD/C-PTSD、OSDD/DID，「人格障碍」保持中文；
 * 数据 id 一律不动，只换显示。
 *
 * osdd 与 did 合成一个标签：源文档把它们写在同一段里，
 * 数据上 36 条线索同时带这两个 id，分开显示会变成两张同名卡。
 */
export const DISORDER_DISPLAY_LABELS: Record<DisorderId, string> = {
  cptsd: 'PTSD/C-PTSD',
  bpd: 'bpd',
  osdd: 'OSDD/DID',
  did: 'OSDD/DID',
  ptsd: 'ptsd',
  pd: '人格障碍',
  other: '其他',
}

/** 显示顺序：与源文档段落顺序一致，兜底的「其他」放最后 */
export const DISORDER_DISPLAY_ORDER: readonly string[] = [
  'PTSD/C-PTSD',
  'bpd',
  'OSDD/DID',
  'ptsd',
  '人格障碍',
  '其他',
]

/** 单个 id → 显示标签；未知 id 保持原样，便于发现数据里的新值 */
export function disorderDisplayLabel(id: string): string {
  return (DISORDER_DISPLAY_LABELS as Record<string, string>)[id] ?? id
}

/**
 * 一条线索的病症 id → 去重后的显示标签。
 * osdd 与 did 在这里被合成一个，所以同一条线索不会出现两行同名。
 */
export function displayDisorderLabels(ids: readonly string[] | undefined): string[] {
  const source = ids?.length ? ids : ['other']
  const labels: string[] = []
  for (const id of source) {
    const label = disorderDisplayLabel(id)
    if (!labels.includes(label)) labels.push(label)
  }
  return labels
}

export function disorderDisplayRank(label: string): number {
  const index = DISORDER_DISPLAY_ORDER.indexOf(label)
  return index === -1 ? DISORDER_DISPLAY_ORDER.length : index
}

/**
 * 机构面板顶部常驻筛选的三个可筛分组。
 * `id` 是按钮上的 `data-disorder`（osdd 与 did 合成一组，所以是 `osdd-did`），
 * `ids` 是落回数据时要匹配的原始 id。
 */
export type DisorderFilterGroup = {
  id: 'cptsd' | 'osdd-did' | 'pd'
  ids: readonly DisorderId[]
  label: string
}

export const DISORDER_FILTER_GROUPS: readonly DisorderFilterGroup[] = [
  { id: 'cptsd', ids: ['cptsd'], label: DISORDER_DISPLAY_LABELS.cptsd },
  { id: 'osdd-did', ids: ['osdd', 'did'], label: DISORDER_DISPLAY_LABELS.osdd },
  { id: 'pd', ids: ['pd'], label: DISORDER_DISPLAY_LABELS.pd },
]
