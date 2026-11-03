'use client'

import { useMemo, useRef, useState } from 'react'
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
  activeDisorder: string | null
  onSelectDisorder: (id: string) => void
  /** 清空病症（与搜索话题）条件 */
  onClearFilters: () => void
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
  activeDisorder,
  onSelectDisorder,
  onClearFilters,
  resultFilter = null,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  // 选完病症仍然是省份列表，只是收窄到有该病线索的省。
  const matched = useMemo(
    () => (activeDisorder ? new Set(disorderGroups.find((group) => group.id === activeDisorder)?.hospitalIds ?? []) : null),
    [activeDisorder, disorderGroups])

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
  const searchList = !activeDisorder && resultFilter
    ? hospitals.filter((hospital) => resultFilter.hospitalIds.includes(hospital.id))
    : null

  const activeGroup = activeDisorder ? disorderGroups.find((group) => group.id === activeDisorder) : undefined
  const conditionCount = activeGroup || searchList ? 1 : 0

  if (hospitals.length === 0) {
    return (
      <div className="tc-empty">
        <p>这家医院还没有地图坐标。</p>
      </div>
    )
  }

  const resetFilters = () => {
    onClearFilters()
    // 清除筛选按钮随条件消失，焦点不能掉到 body：交回入口。
    requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('.tc-filter-toggle')?.focus())
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
    <div ref={rootRef} className={variant === 'compact' ? 'tc-compact' : undefined}>
      <div className="tc-results-heading" role="status" aria-live="polite">
        {activeGroup ? (
          <>
            <span><strong>{provinceRows.reduce((sum, row) => sum + row.count, 0)}</strong> 家医院 · {activeGroup.leads} 条线索</span>
            <span>{activeGroup.label}</span>
          </>
        ) : searchList ? (
          <>
            <span><strong>{searchList.length}</strong> 家医院 · {resultFilter?.hint}</span>
            <span>{resultFilter?.label}</span>
          </>
        ) : (
          <>
            <span><strong>{hospitals.length}</strong> 家医院</span>
            <span>全国收录</span>
          </>
        )}
      </div>

      <FilterPanel
        compact
        label={activeGroup?.label ?? '按病症筛选'}
        hint={conditionCount > 0 ? '已筛选' : '全部地区'}
      >
        <ul className="tc-disorder-options">
          {disorderGroups.map((group) => (
            <li key={group.id}>
              <button
                type="button"
                className="tc-disorder-option"
                data-disorder={group.id}
                aria-pressed={activeDisorder === group.id}
                onClick={() => onSelectDisorder(group.id)}
              >
                <span className="tc-disorder-name">{group.label}</span>
                {activeDisorder === group.id && <span className="tc-disorder-check" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
        {conditionCount > 0 && (
          <button type="button" className="tc-filter-reset" onClick={resetFilters}>清除筛选</button>
        )}
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
