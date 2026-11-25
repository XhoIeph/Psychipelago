'use client'

import { useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { DisorderChips } from '@/components/DisorderChips'
import { hospitalRowMeta } from '@/lib/hospital-row'
import type { Hospital, Province } from '@/lib/schema'

/** 一个病症分组：筛选条的一枚点位，带上它命中的机构与线索数 */
export type DisorderGroup = {
  id: string
  label: string
  hospitalIds: string[]
  leads: number
}

/** 全局搜索命中来源话题时，机构栏目按命中集合列机构 */
export type ResultFilter = {
  hospitalIds: string[]
}

/** 省级行政区的固定分组顺序：空组不渲染。 */
const REGION_ORDER = ['华北', '东北', '华东', '华中', '华南', '西南', '西北', '港澳台'] as const

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
  /** 筛选条里的病症分组 */
  disorderGroups: DisorderGroup[]
  /** 已选病症（可多选，点同一项取消） */
  selectedDisorders: string[]
  onToggleDisorder: (id: string) => void
  resultFilter?: ResultFilter | null
  /** The mobile sheet supplies its own heading. */
  hideHeading?: boolean
  /** 手机底卡的筛选条挂在卡的搜索行下面，正文里不重复渲染。 */
  hideChips?: boolean
  /** 筛选后一个省都不剩时的清空入口。 */
  onClearFilter?: () => void
  /** sheet：手机底卡里的空态用无边框排版，桌面仍是 .tc-empty。 */
  sheetEmpty?: boolean
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
  resultFilter = null,
  hideHeading = false,
  hideChips = false,
  onClearFilter,
  sheetEmpty = false,
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
        region: province.region,
        count: matchedByProvince.get(province.adcode) ?? 0,
      }))
      .filter((row) => row.count > 0)
  }, [hospitals, provinces, matched])

  // 省名按大区分组：组内保持 adcode 顺序，空组不渲染。
  const regionRows = useMemo(() => {
    const byRegion = new Map<string, typeof provinceRows>()
    for (const row of provinceRows) {
      const list = byRegion.get(row.region) ?? []
      list.push(row)
      byRegion.set(row.region, list)
    }
    return REGION_ORDER
      .map((region) => ({ region, rows: byRegion.get(region) ?? [] }))
      .filter((group) => group.rows.length > 0)
  }, [provinceRows])

  // 搜索命中话题时仍按命中集合列机构；病症不换页面。
  const searchList = selectedDisorders.length === 0 && resultFilter
    ? hospitals.filter((hospital) => resultFilter.hospitalIds.includes(hospital.id))
    : null

  if (hospitals.length === 0) {
    return (
      <div className="tc-empty">
        <p>这家医院还没有地图坐标。</p>
      </div>
    )
  }

  // 机构行：名称一行、城市与条数一行，行尾一枚右箭头。
  const rows = (items: Hospital[]) => (
    <ul className="tc-hospital-list">
      {items.map((hospital) => (
        <li key={hospital.id}>
          <button
            type="button"
            className="tc-hospital-row"
            data-hospital-id={hospital.id}
            onClick={() => onSelectHospital?.(hospital.id)}
          >
            <span className="tc-row-text">
              <span className="tc-hospital-row-name">{hospital.name}</span>
              <span className="tc-hospital-row-meta">{hospitalRowMeta(hospital.city, reportCounts[hospital.id] ?? 0)}</span>
            </span>
            <ChevronRight className="tc-row-chev" size={16} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <div className={variant === 'compact' ? 'tc-compact' : undefined}>
      {!hideChips && (
        <DisorderChips
          groups={disorderGroups}
          selected={selectedDisorders}
          onToggle={onToggleDisorder}
        />
      )}

      {!hideHeading && (
        <header className="tc-level-head tc-level-head--country">
          <h2 className="tc-detail-title" tabIndex={-1}>全国</h2>
        </header>
      )}

      {searchList ? (
        searchList.length === 0 ? (
          <div className="tc-empty">
            <p>没有符合这个条件的医院记录。</p>
          </div>
        ) : rows(searchList)
      ) : matched && provinceRows.length === 0 ? (
        sheetEmpty ? (
          <div className="empty">
            <h3>这次筛选没有匹配的医院</h3>
            <div className="acts">
              <button type="button" className="btn acc" onClick={onClearFilter}>清除病症筛选</button>
            </div>
          </div>
        ) : (
          <div className="tc-empty">
            <h3>这次筛选没有匹配的医院</h3>
            <div className="tc-empty-acts">
              <button type="button" className="tc-button tc-button--active" onClick={onClearFilter}>清除病症筛选</button>
            </div>
          </div>
        )
      ) : (
        <div className="tc-regions">
          {regionRows.map((group) => (
            <section className="tc-region" key={group.region} aria-label={group.region}>
              <h3 className="tc-region-label">{group.region}</h3>
              <ul className="tc-province-list">
                {group.rows.map((row) => (
                  <li key={row.adcode}>
                    <button
                      type="button"
                      className="tc-province-row"
                      data-province={row.adcode}
                      onClick={() => onSelectProvince?.(row.adcode)}
                    >
                      <span className="tc-province-name">{row.name}</span>
                      <span className="tc-province-count">{row.count} 家</span>
                      <ChevronRight className="tc-row-chev" size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
