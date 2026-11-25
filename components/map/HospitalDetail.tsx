'use client'

import { ChevronLeft, MapPin } from 'lucide-react'
import { knownText } from '@/lib/hospital-row'
import { splitDoctorNames } from '@/lib/doctor-leads'
import { displayDisorderLabels } from '@/lib/disorder-labels'
import type { MapHospital, MapLead } from './types'

/** 没有 disorders 字段的旧线索不出标签，避免整站冒出一堆「其他」 */
function disorderLabelsOf(lead: MapLead): string[] {
  return lead.disorders?.length ? displayDisorderLabels(lead.disorders) : []
}

type LeadGroup = {
  key: string
  names: string[]
  tags: string[]
  leads: MapLead[]
}

/** 只取卡片要用的档案字段；`department` / `note` 可能缺省，由 knownText 兜底。 */
type DoctorCardProfile = {
  hospital_id: string
  name: string
  department?: string | null
  note?: string | null
}

/**
 * 医院页按医生合并成一张卡：同名医生的多条发言归进一组，组头只出一次医生名与病症标签。
 * 没有医生名的报价各自成组（组头只有标签），组内仍是一条发言一个 article.tc-report。
 */
function groupLeadsByDoctor(leads: MapLead[]): LeadGroup[] {
  const groups: LeadGroup[] = []
  const byName = new Map<string, LeadGroup>()

  for (const lead of leads) {
    const name = (lead.doctorName ?? '').trim()
    const tags = disorderLabelsOf(lead)

    if (!name) {
      // 没有医生名时各自成卡（不按原帖合并）。
      groups.push({ key: `anon:${lead.id}`, names: [], tags, leads: [lead] })
      continue
    }

    let group = byName.get(name)
    if (!group) {
      group = { key: `doctor:${name}`, names: splitDoctorNames(name), tags: [], leads: [] }
      byName.set(name, group)
      groups.push(group)
    }
    for (const tag of tags) {
      if (!group.tags.includes(tag)) group.tags.push(tag)
    }
    group.leads.push(lead)
  }

  return groups
}

export function HospitalDetail({
  hospital,
  leads,
  provinceName,
  doctorProfiles,
  onBackToProvince,
  onLocate,
  onSelectDoctor,
}: {
  hospital: MapHospital
  leads: MapLead[]
  /** 省份简称：返回按钮和没有城市时的兜底都写它。 */
  provinceName: string
  /** 医生档案：只用来取卡片的诊室与备注，按 hospital_id + 医生名查。 */
  doctorProfiles?: DoctorCardProfile[]
  onBackToProvince: () => void
  onLocate: () => void
  onSelectDoctor: (name: string) => void
}) {
  const meta = [knownText(hospital.city) || provinceName, knownText(hospital.address)]
    .filter(Boolean)
    .join(' · ')
  const profiles = new Map(
    (doctorProfiles ?? [])
      .filter((item) => item.hospital_id === hospital.id)
      .map((item) => [item.name, item] as const),
  )
  const profileFor = (names: string[]) => names.map((name) => profiles.get(name)).find(Boolean)
  return (
    <div className="tc-detail">
      <header className="tc-level-head tc-level-head--hospital">
        <button type="button" className="tc-detail-back" aria-label={`返回 ${provinceName}`} onClick={onBackToProvince}>
          <ChevronLeft aria-hidden="true" />
          <span>{provinceName}</span>
        </button>
        <h2 className="tc-detail-title" tabIndex={-1}>{hospital.name}</h2>
        <p className="tc-level-meta">{meta}</p>
      </header>
      <div className="tc-hospital-actions">
        <button type="button" className="tc-button tc-button--active" onClick={onLocate}>
          <MapPin size={16} aria-hidden="true" />在地图上定位
        </button>
      </div>
      <section className="tc-detail-section">
      <h3>医生线索</h3>
      {leads.length === 0 ? (
        <p className="tc-small tc-muted">暂无关联线索。</p>
      ) : (
        groupLeadsByDoctor(leads).map((group) => {
          const profile = profileFor(group.names)
          const department = knownText(profile?.department)
          const note = knownText(profile?.note)
          return (
            <section key={group.key} className="tc-doctor-card">
              {(group.names.length > 0 || group.tags.length > 0) && (
                <p className={group.names.length > 0 ? 'tc-lead-doctor' : 'tc-lead-doctor tc-lead-doctor--tags-only'}>
                  {group.names.map((name, index) => (
                    <span key={name}>
                      {index > 0 && <span aria-hidden="true">、</span>}
                      <button type="button" className="tc-doctor-link" data-doctor-name={name} onClick={() => onSelectDoctor(name)}>{name}</button>
                    </span>
                  ))}
                  {group.tags.map((label) => (
                    <span key={label} className="tc-lead-tag">{label}</span>
                  ))}
                </p>
              )}
              <p className={department ? 'tc-doctor-card-dept' : 'tc-doctor-card-dept is-empty'}>{department || '暂无门诊收录'}</p>
              <p className={note ? 'tc-doctor-card-note' : 'tc-doctor-card-note is-empty'}>{note || '暂无备注记录'}</p>
            </section>
          )
        })
      )}
      </section>
    </div>
  )
}
