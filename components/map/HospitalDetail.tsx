'use client'

import { ArrowLeft, MapPin } from 'lucide-react'
import { LeadEvidence } from '@/components/LeadEvidence'
import { splitDoctorNames } from '@/lib/doctor-leads'
import type { MapHospital, MapLead } from './types'
import { STAGE_LABELS } from './types'

export function HospitalDetail({
  hospital,
  leads,
  provinceName,
  onBackToProvince,
  onBackToCountry,
  onLocate,
  onSelectDoctor,
}: {
  hospital: MapHospital
  leads: MapLead[]
  provinceName: string
  onBackToProvince: () => void
  onBackToCountry: () => void
  onLocate: () => void
  onSelectDoctor: (name: string) => void
}) {
  return (
    <div className="tc-detail">
      <nav className="tc-breadcrumb" aria-label="位置">
        <button type="button" onClick={onBackToCountry}>全国</button>
        <span className="tc-breadcrumb-sep" aria-hidden="true">›</span>
        <button type="button" onClick={onBackToProvince}>{provinceName}</button>
        <span className="tc-breadcrumb-sep" aria-hidden="true">›</span>
        <span aria-current="page">{hospital.name}</span>
      </nav>
      <button type="button" className="tc-detail-back" onClick={onBackToProvince}><ArrowLeft size={16} aria-hidden="true" />返回 {provinceName}</button>
      <h2 className="tc-detail-title">{hospital.name}</h2>
      <div className="tc-hospital-actions">
        <button type="button" className="tc-button tc-button--active" onClick={onLocate}>
          <MapPin size={16} aria-hidden="true" />在地图上定位
        </button>
      </div>
      <section className="tc-detail-section">
      <h3>就诊线索<span className="tc-detail-count">{leads.length} 条</span></h3>
      {leads.length === 0 ? (
        <p className="tc-small tc-muted">暂无关联线索。</p>
      ) : (
        leads.map((lead) => (
          <article key={lead.id} className="tc-report">
            {(lead.stage !== 'unknown' || lead.publishedAt) && (
              <div className="tc-row tc-small tc-muted">
                {lead.stage !== 'unknown' && <span>{STAGE_LABELS[lead.stage] ?? lead.stage}</span>}
                {lead.publishedAt && <span>{lead.publishedAt}</span>}
              </div>
            )}
            {lead.doctorName && (
              <p className="tc-lead-doctor">
                {splitDoctorNames(lead.doctorName).map((name, index) => (
                  <span key={name}>
                    {index > 0 && <span aria-hidden="true">、</span>}
                    <button type="button" className="tc-doctor-link" data-doctor-name={name} onClick={() => onSelectDoctor(name)}>{name}</button>
                  </span>
                ))}
              </p>
            )}
            <LeadEvidence sourceLabel={lead.sourceLabel} url={lead.url} quote={lead.quote} contextNote={lead.contextNote} />
          </article>
        ))
      )}
      </section>
    </div>
  )
}
