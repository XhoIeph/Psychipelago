/** 地图应用内部使用的轻量数据形状（服务端页面组装后传入） */

export type MapProvince = {
  adcode: string
  name: string
  short_name: string
}

export type MapHospital = {
  id: string
  name: string
  adcode: string
  province: string
  city: string
  /** 机构地址，卡片第二行跟在城市后面；没收录的机构不出现 */
  address?: string
  category: string
  level: string
  // Only map inputs use the saved Amap GCJ-02 coordinates; curated coordinates remain WGS84.
  lat: number
  lng: number
  coordinateSource?: string
  leads: number
}

export type MapLead = {
  id: string
  quote: string
  contextNote?: string
  stage: string
  publishedAt?: string
  /** 只有公开来源才给外链；原始表格的地址属于不外流的材料，站点上一律不出现 */
  url?: string
  /** 长评价的完整原文；比 quote 长时才给，供「展开原文」使用 */
  fullText?: string
  /** 线索原文里的医生姓名，照录 `doctor_name_raw`；没有姓名时不出现 */
  doctorName?: string
  /** 线索原文标注的病症 id（cptsd / osdd / did / pd…），用于卡片上的病症标签；旧数据可能没有 */
  disorders?: string[]
}

export type MapProvinceStat = {
  reports: number
  hospitals: number
  withEvidence: number
  cptsd: number
  bpd: number
}

export type SearchGroup = '省份' | '医院' | '医生' | '病症'

/** 顶栏下拉与手机底卡共用同一条搜索结果；run 负责进入对应的省、医院、医生或筛选。 */
export type SearchResult = {
  key: string
  group: SearchGroup
  label: string
  sub: string
  run: () => void
}

/** 底卡里按省、医院、医生、病症分组的搜索结果，组内顺序与全局顺序一致。 */
export type SheetSearchGroup = {
  group: SearchGroup
  items: SearchResult[]
}

export const STAGE_LABELS: Record<string, string> = {
  seeking: '求医中',
  consulted: '已就诊',
  assessed: '已做评估',
  diagnosed: '自称已确诊',
  treated: '已接受治疗',
  unknown: '阶段未知',
}
