'use client'

import { useMemo } from 'react'
import { FilterPanel } from '@/components/FilterPanel'
import { hospitalBrowseMeta, hospitalRowMeta } from '@/lib/hospital-row'
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
  /** 底卡头部已经报了总数，正文不再重复同一行。 */
  hideHeading?: boolean
  /** 手机端筛选入口在搜索行右侧，正文里不再放旧的面板。 */
  hideFilterPanel?: boolean
  /** 筛选把一部分省挡在列表外时，末尾补一句它们去哪了。 */
  showFilteredNote?: boolean
  /** 筛选后一个省都不剩时的清空入口。 */
  onClearFilter?: () => void
  /** sheet：手机底卡里的空态用无边框排版，桌面仍是 .tc-empty。 */
  sheetEmpty?: boolean
  /** 手机全国层直接列医院，不再先列省份；桌面侧栏仍按省份分组。 */
  hospitalList?: boolean
  /** 每家医院能对上的筛选分组数与线索数：列表排序与第二行文案共用。 */
  hospitalStats?: Record<string, { categories: number; leads: number }>
  /** 医院列表上方的排序说明。 */
  sortNote?: boolean
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
  hideHeading = false,
  hideFilterPanel = false,
  showFilteredNote = false,
  onClearFilter,
  sheetEmpty = false,
  hospitalList = false,
  hospitalStats = {},
  sortNote = false,
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

  // 手机全国层直接排医院：可确诊病症类别数 → 线索条数 → 名称。
  // 类别数是分组命中的数量，不是评分；列表上方还要写明排序依据。
  const hospitalRows = useMemo(() => {
    const list = matched ? hospitals.filter((hospital) => matched.has(hospital.id)) : hospitals
    return [...list].sort((a, b) => {
      const left = hospitalStats[a.id]
      const right = hospitalStats[b.id]
      const categories = (right?.categories ?? 0) - (left?.categories ?? 0)
      if (categories !== 0) return categories
      const leads = (right?.leads ?? reportCounts[b.id] ?? 0) - (left?.leads ?? reportCounts[a.id] ?? 0)
      if (leads !== 0) return leads
      return a.name.localeCompare(b.name, 'zh-Hans-CN')
    })
  }, [hospitalStats, hospitals, matched, reportCounts])

  const provinceRows = useMemo(() => {    const matchedByProvince = new Map<string, number>()
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

  // 有医院的省总数：筛选后用来交代「另外几个省被挡在外面」。
  const provinceTotal = useMemo(() => new Set(hospitals.map((hospital) => hospital.adcode)).size, [hospitals])
  const hiddenProvinces = matched ? Math.max(0, provinceTotal - provinceRows.length) : 0

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
            data-hospital-id={hospital.id}
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
      {!hideHeading && (
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
      )}

      {!hideFilterPanel && (
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
      )}

      {searchList ? (
        searchList.length === 0 ? (
          <div className="tc-empty">
            <p>没有符合这个条件的医院记录。</p>
          </div>
        ) : rows(searchList)
      ) : matched && (hospitalList ? hospitalRows.length === 0 : provinceRows.length === 0) ? (
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
      ) : hospitalList ? (
        <>
          {sortNote && <p className="list-note">按可确诊病症类别数、线索条数排序。</p>}
          <ul className="tc-hospital-list">
            {hospitalRows.map((hospital) => {
              const stats = hospitalStats[hospital.id]
              return (
                <li key={hospital.id}>
                  <button
                    type="button"
                    className="tc-hospital-row"
                    data-hospital-id={hospital.id}
                    onClick={() => onSelectHospital?.(hospital.id)}
                  >
                    <span className="tc-hospital-row-name">{hospital.name}</span>
                    <span className="tc-hospital-row-meta">
                      {hospitalBrowseMeta(hospital.province, stats?.categories ?? 0, stats?.leads ?? reportCounts[hospital.id] ?? 0)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
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

      {showFilteredNote && hiddenProvinces > 0 && (
        <p className="list-note">另外 {hiddenProvinces} 个省份没有符合条件的线索。</p>
      )}
    </div>
  )
}
