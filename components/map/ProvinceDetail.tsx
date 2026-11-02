'use client'

import { ArrowLeft, MapPin } from 'lucide-react'
import type { MapHospital, MapProvinceStat } from './types'

export function ProvinceDetail({
  provinceName,
  stat,
  hospitals,
  onClose,
  onZoomToProvince,
  onSelectHospital,
}: {
  provinceName: string
  stat: MapProvinceStat | undefined
  hospitals: MapHospital[]
  onClose: () => void
  onZoomToProvince: () => void
  onSelectHospital: (id: string) => void
}) {
  const hasData = (stat?.reports ?? 0) > 0 || hospitals.length > 0

  return (
    <div className="tc-detail">
      <button type="button" className="tc-detail-back" onClick={onClose}><ArrowLeft size={16} aria-hidden="true" />返回浏览</button>
      <h2 className="tc-detail-title">{provinceName}</h2>

      {hasData ? (
        <>
          {(stat?.withEvidence ?? 0) > 0 && <p className="tc-small tc-muted">创伤服务证据 {stat?.withEvidence} 家</p>}
          {hospitals.length === 0 && (stat?.reports ?? 0) > 0 && <p className="tc-small tc-muted">{stat?.reports} 条就诊线索</p>}
          {(stat?.cptsd ?? 0) > 0 || (stat?.bpd ?? 0) > 0 ? (
            <p className="tc-small tc-muted">
              线索涉及：CPTSD {stat?.cptsd} 条 · BPD {stat?.bpd} 条
              <span className="tc-faint">（同一条线索可能同时涉及两者）</span>
            </p>
          ) : null}

          <div className="tc-hospital-actions"><button type="button" className="tc-button tc-button--active" onClick={onZoomToProvince}>
            <MapPin size={16} aria-hidden="true" />在地图上定位
          </button></div>

          {hospitals.length > 0 && (
            <section className="tc-detail-section">
              <h3>机构<span className="tc-detail-count">{hospitals.length} 家</span></h3>
              <ul className="tc-province-list">
                {hospitals.map((hospital) => (
                  <li key={hospital.id}>
                    <button
                      type="button"
                      className="tc-linklike"
                      onClick={() => onSelectHospital(hospital.id)}
                    >
                      {hospital.name}
                    </button>
                    <span className="tc-small tc-muted">{hospital.leads} 条</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <div className="tc-empty">
          <p>该省暂无已收录的线索与机构记录。</p>
        </div>
      )}
    </div>
  )
}
