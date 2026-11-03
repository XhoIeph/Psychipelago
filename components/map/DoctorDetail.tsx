'use client'

import { ArrowLeft } from 'lucide-react'
import { LeadEvidence } from '@/components/LeadEvidence'
import type { Doctor } from '@/lib/schema'
import type { MapHospital, MapLead } from './types'
import { STAGE_LABELS } from './types'

export type DoctorDisorderStat = { id: string; label: string; count: number }

export function DoctorDetail({
  name,
  hospital,
  leads,
  disorders,
  profile,
  onBackToHospital,
  onBackToCountry,
  onBackToProvince,
}: {
  name: string
  hospital: MapHospital
  leads: MapLead[]
  disorders: DoctorDisorderStat[]
  profile: Doctor | null
  onBackToHospital: () => void
  onBackToCountry: () => void
  onBackToProvince: () => void
}) {
  return (
    <div className="tc-detail tc-doctor-detail">
      <nav className="tc-breadcrumb" aria-label="位置">
        <button type="button" onClick={onBackToCountry}>全国</button>
        <span className="tc-breadcrumb-sep" aria-hidden="true">›</span>
        <button type="button" onClick={onBackToProvince}>{hospital.province}</button>
        <span className="tc-breadcrumb-sep" aria-hidden="true">›</span>
        <button type="button" onClick={onBackToHospital}>{hospital.name}</button>
        <span className="tc-breadcrumb-sep" aria-hidden="true">›</span>
        <span aria-current="page">{name}</span>
      </nav>
      <button type="button" className="tc-detail-back" onClick={onBackToHospital}><ArrowLeft size={16} aria-hidden="true" />返回 {hospital.name}</button>
      <h2 className="tc-detail-title">{name}</h2>
      <p className="tc-doctor-meta tc-doctor-meta--note">
        <span className="tc-doctor-meta-label">备注</span>
        <span className="tc-doctor-meta-value">{profile?.note?.trim() || '无'}</span>
      </p>
      <p className="tc-doctor-origin">
        所在医院
        <button type="button" onClick={onBackToHospital}>{hospital.name}</button>
      </p>
      {disorders.length > 0 && (
        <ul className="tc-doctor-disorders" aria-label="关联病症">
          {disorders.map((disorder) => (
            <li key={disorder.id}>
              <span>{disorder.label}</span>
              <span>{disorder.count} 条</span>
            </li>
          ))}
        </ul>
      )}
      <section className="tc-detail-section">
        <h3>线索原文<span className="tc-detail-count">{leads.length} 条</span></h3>
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
      <p className="tc-doctor-meta tc-doctor-meta--rating">
        <span className="tc-doctor-meta-label">评价</span>
        <span className="tc-doctor-meta-value">{profile?.evaluation?.trim() || '无'}</span>
      </p>
      {profile && (
        <section className="tc-detail-section tc-doctor-profile">
          <h3>档案</h3>
          <p className="tc-small">{profile.title} · {profile.department}</p>
          {profile.specialties.length > 0 && <p className="tc-small">擅长：{profile.specialties.join('、')}</p>}
          {profile.credentials.length > 0 && (
            <ul className="tc-small tc-muted">
              {profile.credentials.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
          {profile.profile_urls.map((url) => (
            <a key={url} className="tc-evidence-source" href={url} target="_blank" rel="noopener noreferrer">官方页面</a>
          ))}
          <p className="tc-meta">最后核对：{profile.last_verified_at}</p>
        </section>
      )}
    </div>
  )
}
