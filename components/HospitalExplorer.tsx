'use client'

import { useMemo } from 'react'
import { hospitalRowMeta } from '@/lib/hospital-row'
import type { Hospital, Province } from '@/lib/schema'

/** 病症筛选卡片的一行：只有名称，家数不在筛选里出现（数量看结果表头） */
export type DisorderOption = {
  id: string
  label: string
}

/** 全局搜索命中病症或来源话题时，机构栏目按命中集合列机构 */
export type ResultFilter = {
  label: string
  hint: string
  hospitalIds: string[]
}

type Props = {
  hospitals: Hospital[]
  provinces: Province[]
  reportCounts: Record<string, number>
  /** compact：适配侧边栏窄面板的布局（默认 page 不变） */
  variant?: 'page' | 'compact'
  /** Keep institution selection inside the map instead of leaving its context. */
  onSelectHospital?: (id: string) => void
  /** 省份列表行：进入该省概要（侧栏内） */
  onSelectProvince?: (adcode: string) => void
  /** 常驻的病症筛选：三个可筛分组，按当前数据算家数 */
  disorderOptions: DisorderOption[]
  activeDisorder: string | null
  onSelectDisorder: (id: string) => void
  resultFilter?: ResultFilter | null
}

export function HospitalExplorer({
  hospitals,
  provinces,
  reportCounts,
  variant = 'page',
  onSelectHospital,
  onSelectProvince,
  disorderOptions,
  activeDisorder,
  onSelectDisorder,
  resultFilter = null,
}: Props) {
  const provinceRows = useMemo(() => {
    const counts = new Map<string, number>()
    for (const hospital of hospitals) counts.set(hospital.adcode, (counts.get(hospital.adcode) ?? 0) + 1)
    return provinces
      .map((province) => ({
        adcode: province.adcode,
        name: province.short_name,
        count: counts.get(province.adcode) ?? 0,
      }))
      .filter((row) => row.count > 0)
  }, [hospitals, provinces])

  const matched = useMemo(() => {
    if (!resultFilter) return null
    const ids = new Set(resultFilter.hospitalIds)
    return hospitals.filter((hospital) => ids.has(hospital.id))
  }, [hospitals, resultFilter])

  if (hospitals.length === 0) {
    return (
      <div className="tc-empty">
        <p>机构尚未定位。</p>
      </div>
    )
  }

  // 常驻：筛选态下也留着，取消就是再点一次同一行。
  const filterCard = disorderOptions.length > 0 && (
    <section className="tc-disorder-filter" aria-label="按病症筛选">
      <p className="tc-disorder-filter-title">按病症筛选</p>
      <ul className="tc-disorder-options">
        {disorderOptions.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              className="tc-disorder-option"
              data-disorder={option.id}
              aria-pressed={activeDisorder === option.id}
              onClick={() => onSelectDisorder(option.id)}
            >
              <span className="tc-disorder-name">{option.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )

  // 筛选结果与省份详情里的机构行同一套：名称一行、条数一行，行间 1px 分隔线。
  const rows = (list: Hospital[]) => (
    <ul className="tc-hospital-list">
      {list.map((hospital) => (
        <li key={hospital.id}>
          <button
            type="button"
            className="tc-hospital-row"
            onClick={() => onSelectHospital?.(hospital.id)}
          >
            <span className="tc-hospital-row-name">{hospital.name}</span>
            <span className="tc-hospital-row-meta">{hospitalRowMeta(hospital.city, reportCounts[hospital.id] ?? 0)}</span>
          </button>
        </li>
      ))}
    </ul>
  )

  if (resultFilter && matched) {
    return (
      <div className={variant === 'compact' ? 'tc-compact' : undefined}>
        <div className="tc-results-heading" role="status" aria-live="polite">
          <span><strong>{matched.length}</strong> 家机构 · {resultFilter.hint}</span>
          <span>{resultFilter.label}</span>
        </div>
        {filterCard}
        {matched.length === 0 ? (
          <div className="tc-empty">
            <p>没有符合这个条件的机构记录。</p>
          </div>
        ) : rows(matched)}
      </div>
    )
  }

  return (
    <div className={variant === 'compact' ? 'tc-compact' : undefined}>
      <div className="tc-results-heading" role="status" aria-live="polite">
        <span><strong>{hospitals.length}</strong> 家机构</span>
        <span>全国收录</span>
      </div>
      {filterCard}
      <ul className="tc-province-list">
        {provinceRows.map((row) => (
          <li key={row.adcode}>
            <button type="button" className="tc-province-row" onClick={() => onSelectProvince?.(row.adcode)}>
              <span className="tc-province-name">{row.name}</span>
              <span className="tc-province-count">{row.count} 家</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
