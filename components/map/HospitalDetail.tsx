'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, MapPin } from 'lucide-react'
import { LeadEvidence } from '@/components/LeadEvidence'
import type { MapHospital, MapLead } from './types'
import { STAGE_LABELS } from './types'

export function HospitalDetail({
  hospital,
  leads,
  onClose,
  onLocate,
}: {
  hospital: MapHospital
  leads: MapLead[]
  onClose: () => void
  onLocate: () => void
}) {
  return (
    <div className="tc-detail">
      <button type="button" className="tc-detail-back" onClick={onClose}><ArrowLeft size={16} aria-hidden="true" />返回浏览</button>
      <h2 className="tc-detail-title">{hospital.name}</h2>
      <div className="tc-hospital-actions">
        <button type="button" className="tc-button tc-button--active" onClick={onLocate}>
          <MapPin size={16} aria-hidden="true" />在地图上定位
        </button>
        <Link className="tc-detail-link" href={`/hospitals/${hospital.id}/`}>医院详细信息<ArrowUpRight size={16} aria-hidden="true" /></Link>
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
            <LeadEvidence sourceLabel={lead.sourceLabel} url={lead.url} quote={lead.quote} contextNote={lead.contextNote} />
          </article>
        ))
      )}
      </section>
    </div>
  )
}
