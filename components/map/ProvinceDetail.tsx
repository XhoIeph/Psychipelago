'use client'

import { ArrowLeft, MapPin } from 'lucide-react'
import type { MapHospital, MapProvinceStat } from './types'

export function ProvinceDetail({
  provinceName,
  stat,
  hospitals,
  onBackToCountry,
  onZoomToProvince,
  onSelectHospital,
}: {
  provinceName: string
  stat: MapProvinceStat | undefined
  hospitals: MapHospital[]
  onBackToCountry: () => void
  onZoomToProvince: () => void
  onSelectHospital: (id: string) => void
}) {
  const hasData = (stat?.reports ?? 0) > 0 || hospitals.length > 0

  return (
    <div className="tc-detail">
      <nav className="tc-breadcrumb" aria-label="位置">
        <button type="button" onClick={onBackToCountry}>全国</button>
        <span className="tc-breadcrumb-sep" aria-hidden="true">›</span>
        <span aria-current="page">{provinceName}</span>
      </nav>
      <button type="button" className="tc-detail-back" onClick={onBackToCountry}><ArrowLeft size={16} aria-hidden="true" />返回 全国</button>
      <h2 className="tc-detail-title">{provinceName}</h2>

      {hasData ? (
        <>
          <p className="tc-small tc-muted">{hospitals.length} 家机构</p>

          <div className="tc-hospital-actions"><button type="button" className="tc-button tc-button--active" onClick={onZoomToProvince}>
            <MapPin size={16} aria-hidden="true" />在地图上定位
          </button></div>

          {hospitals.length > 0 && (
            <section className="tc-detail-section">
              <h3>机构</h3>
              <ul className="tc-hospital-list">
                {hospitals.map((hospital) => (
                  <li key={hospital.id}>
                    <button
                      type="button"
                      className="tc-hospital-row"
                      onClick={() => onSelectHospital(hospital.id)}
                    >
                      <span className="tc-hospital-row-name">{hospital.name}</span>
                      <span className="tc-hospital-row-count">{hospital.leads} 条线索</span>
                    </button>
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
