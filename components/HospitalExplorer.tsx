'use client'

import { useMemo } from 'react'
import type { Hospital, Province } from '@/lib/schema'
import { MapPin } from 'lucide-react'

const SERVICE_LABELS: Record<string, string> = {
  yes: '明确依据',
  claimed: '间接证据',
  unknown: '未知',
  no: '无',
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
  /** compact：适配侧边栏窄面板的卡片布局（默认 page 不变） */
  variant?: 'page' | 'compact'
  /** Keep institution selection inside the map instead of leaving its context. */
  onSelectHospital?: (id: string) => void
  /** 省份列表行：进入该省概要（侧栏内） */
  onSelectProvince?: (adcode: string) => void
  resultFilter?: ResultFilter | null
  onClearResult?: () => void
}

export function HospitalExplorer({
  hospitals,
  provinces,
  reportCounts,
  variant = 'page',
  onSelectHospital,
  onSelectProvince,
  resultFilter = null,
  onClearResult,
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

  const cards = (list: Hospital[]) => (
    <div className={`tc-grid tc-grid--cards${variant === 'compact' ? ' tc-grid--compact' : ''}`}>
      {list.map((hospital) => (
        <article className="tc-card tc-hospital-card" key={hospital.id}>
          <div className="tc-hospital-location"><MapPin size={16} aria-hidden="true" />{hospital.province}{hospital.city === hospital.province ? '' : ` · ${hospital.city}`}</div>
          <h2>
            {onSelectHospital ? <button type="button" className="tc-linklike" aria-label={`查看机构：${hospital.name}`} onClick={() => onSelectHospital(hospital.id)}>{hospital.name}</button> : hospital.name}
          </h2>
          {(hospital.level !== '未知' || hospital.category !== '其他') && <p className="tc-small tc-muted">
            {[hospital.level !== '未知' && hospital.level, hospital.category !== '其他' && hospital.category].filter(Boolean).join(' · ')}
          </p>}
          {hospital.departments.some(item => item !== '未录入') && <p className="tc-hospital-departments">
            科室：{hospital.departments.filter(item => item !== '未录入').join('、')}
          </p>}
          {(hospital.trauma_service.cptsd_assessment !== 'unknown' || hospital.trauma_service.cptsd_bpd_diagnosis !== 'unknown') && <div className="tc-row tc-small">
            {hospital.trauma_service.cptsd_assessment !== 'unknown' && <span className="tc-badge tc-badge--neutral">
              CPTSD 评估：{SERVICE_LABELS[hospital.trauma_service.cptsd_assessment]}
            </span>}
            {hospital.trauma_service.cptsd_bpd_diagnosis !== 'unknown' && <span className="tc-badge tc-badge--neutral">
              CPTSD/BPD 诊断：{SERVICE_LABELS[hospital.trauma_service.cptsd_bpd_diagnosis]}
            </span>}
          </div>}
          <div className="tc-hospital-card-footer">
            <span className="tc-meta"><b>{reportCounts[hospital.id] ?? 0}</b> 条线索{hospital.official_sources.length > 0 && ` · ${hospital.official_sources.length} 个官方来源`}</span>
            {!onSelectHospital && <span className="tc-hospital-card-hint" aria-hidden="true">详情</span>}
          </div>
        </article>
      ))}
    </div>
  )

  if (resultFilter && matched) {
    return (
      <div>
        <div className="tc-results-heading" role="status" aria-live="polite">
          <span><strong>{matched.length}</strong> 家机构</span>
          <span>{resultFilter.label} · {resultFilter.hint}</span>
        </div>
        {onClearResult && (
          <div className="tc-hospital-actions">
            <button type="button" className="tc-button" onClick={onClearResult}>清除筛选</button>
          </div>
        )}
        {matched.length === 0 ? (
          <div className="tc-empty">
            <p>没有符合这个条件的机构记录。</p>
          </div>
        ) : cards(matched)}
      </div>
    )
  }

  return (
    <div>
      <div className="tc-results-heading" role="status" aria-live="polite">
        <span><strong>{hospitals.length}</strong> 家机构</span>
        <span>全国收录</span>
      </div>
      <ul className="tc-province-list">
        {provinceRows.map((row) => (
          <li key={row.adcode}>
            <button type="button" className="tc-province-row" onClick={() => onSelectProvince?.(row.adcode)}>
              <span className="tc-province-name">{row.name}</span>
              <span className="tc-province-count">{row.count} 家机构</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
