'use client'

import { useMemo } from 'react'
import { FilterPanel } from '@/components/FilterPanel'
import { hospitalRowMeta } from '@/lib/hospital-row'
import type { Hospital, Province } from '@/lib/schema'

/** 一个病症分组：筛选面板的一行，带上它命中的机构与线索数 */
export type DisorderGroup = {
  id: string
  label: string
  hospitalIds: string[]
  leads: number
}

/** 全局搜索命中来源话题时，机构栏目按命中集合列机构 */
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
  /** 面板里的病症分组 */
  disorderGroups: DisorderGroup[]
  /** 已选病症（可多选，点同一行取消） */
  selectedDisorders: string[]
  onToggleDisorder: (id: string) => void
  /** 选中病症时并集命中的线索条数（按条去重） */
  activeLeads?: number | null
  resultFilter?: ResultFilter | null
}

export function HospitalExplorer({
  hospitals,
  provinces,
  reportCounts,
  variant = 'page',
  onSelectHospital,
  onSelectProvince,
  disorderGroups,
  selectedDisorders,
  onToggleDisorder,
  activeLeads = null,
  resultFilter = null,
}: Props) {
  const selectedSet = useMemo(() => new Set(selectedDisorders), [selectedDisorders])
  // 选完病症仍然是省份列表，只是收窄到有命中线索的省；多选取并集。
  const matched = useMemo(() => {
    if (selectedDisorders.length === 0) return null
    const ids = new Set<string>()
    for (const group of disorderGroups) {
      if (!selectedSet.has(group.id)) continue
      for (const id of group.hospitalIds) ids.add(id)
    }
    return ids
  }, [disorderGroups, selectedDisorders, selectedSet])

  const provinceRows = useMemo(() => {
    const matchedByProvince = new Map<string, number>()
    for (const hospital of hospitals) {
      if (matched && !matched.has(hospital.id)) continue
      matchedByProvince.set(hospital.adcode, (matchedByProvince.get(hospital.adcode) ?? 0) + 1)
    }
    return provinces
      .map((province) => ({
        adcode: province.adcode,
        name: province.short_name,
        count: matchedByProvince.get(province.adcode) ?? 0,
      }))
      .filter((row) => row.count > 0)
  }, [hospitals, provinces, matched])

  // 搜索命中话题时仍按命中集合列机构；病症不换页面。
  const searchList = selectedDisorders.length === 0 && resultFilter
    ? hospitals.filter((hospital) => resultFilter.hospitalIds.includes(hospital.id))
    : null

  const selectedLabels = disorderGroups.filter((group) => selectedSet.has(group.id)).map((group) => group.label)
  const toggleLabel = selectedLabels.length === 0
    ? '按病症筛选'
    : selectedLabels.length === 1
      ? selectedLabels[0]
      : `${selectedLabels.length} 个病症`

  if (hospitals.length === 0) {
    return (
      <div className="tc-empty">
        <p>这家医院还没有地图坐标。</p>
      </div>
    )
  }

  // 筛选结果与省份详情里的机构行同一套：名称一行、城市与条数一行，行间 1px 分隔线。
  const rows = (items: Hospital[]) => (
    <ul className="tc-hospital-list">
      {items.map((hospital) => (
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

  return (
    <div className={variant === 'compact' ? 'tc-compact' : undefined}>
      <div className="tc-results-heading" role="status" aria-live="polite">
        {matched && activeLeads != null ? (
          <span><strong>{provinceRows.reduce((sum, row) => sum + row.count, 0)}</strong> 家医院 · {activeLeads} 条线索</span>
        ) : searchList ? (
          <span><strong>{searchList.length}</strong> 家医院 · {resultFilter?.hint}</span>
        ) : (
          <>
            <span><strong>{hospitals.length}</strong> 家医院</span>
            <span>全国收录</span>
          </>
        )}
      </div>

      <FilterPanel
        compact
        label={toggleLabel}
        hint={selectedLabels.length > 0 ? '已筛选' : '全部地区'}
      >
        <ul className="tc-disorder-options">
          {disorderGroups.map((group) => (
            <li key={group.id}>
              <button
                type="button"
                className="tc-disorder-option"
                data-disorder={group.id}
                aria-pressed={selectedSet.has(group.id)}
                onClick={() => onToggleDisorder(group.id)}
              >
                <span className="tc-disorder-name">{group.label}</span>
                {selectedSet.has(group.id) && <span className="tc-disorder-check" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      </FilterPanel>

      {searchList ? (
        searchList.length === 0 ? (
          <div className="tc-empty">
            <p>没有符合这个条件的医院记录。</p>
          </div>
        ) : rows(searchList)
      ) : (
        <ul className="tc-province-list">
          {provinceRows.map((row) => (
            <li key={row.adcode}>
              <button type="button" className="tc-province-row" data-province={row.adcode} onClick={() => onSelectProvince?.(row.adcode)}>
                <span className="tc-province-name">{row.name}</span>
                <span className="tc-province-count">{row.count} 家</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
