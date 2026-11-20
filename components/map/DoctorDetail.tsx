'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Doctor } from '@/lib/schema'
import type { MapHospital } from './types'

export type DoctorDisorderStat = { id: string; label: string; count: number }

export function DoctorDetail({
  name,
  hospital,
  disorders,
  profile,
  onBackToHospital,
}: {
  name: string
  hospital: MapHospital
  disorders: DoctorDisorderStat[]
  profile: Doctor | null
  onBackToHospital: () => void
}) {
  // 没有收录的字段写「无」并压成次一级颜色，不能留空行。
  const field = (value: string | undefined | null) => {
    const trimmed = value?.trim()
    return trimmed ? { text: trimmed, empty: false } : { text: '无', empty: true }
  }
  // 「评价」一律渲染：有评价显示原文，没有写「无」；与线索原文重复时两处文本相同，
  // 评价节不能凭空消失。数据侧的 evaluation_echoes_report 只留作分析，不在渲染里读。
  const clinic = field(profile?.department)
  const note = field(profile?.note)
  // `evaluation_items` 是纯增量字段（没评价的医生没有这个键），每位医生可能有多条评价。
  const ratingItems = ((profile as (Doctor & { evaluation_items?: { text?: string }[] }) | null)?.evaluation_items ?? [])
    .map((item) => item.text?.trim())
    .filter((text): text is string => Boolean(text))

  return (
    <div className="tc-detail tc-doctor-detail">
      <header className="tc-level-head tc-level-head--doctor">
        <button type="button" className="tc-detail-back" aria-label={`返回 ${hospital.name}`} onClick={onBackToHospital}>
          <ChevronLeft aria-hidden="true" />
          <span>{hospital.name}</span>
        </button>
        <h2 className="tc-detail-title" tabIndex={-1}>{name}</h2>
      </header>

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

      <div className="tc-doctor-meta-list">
        <p className="tc-doctor-meta tc-doctor-meta--clinic">
          <span className="tc-doctor-meta-label">门诊</span>
          <span className={clinic.empty ? 'tc-doctor-meta-value is-empty' : 'tc-doctor-meta-value'}>{clinic.text}</span>
        </p>
        <p className="tc-doctor-meta tc-doctor-meta--origin tc-doctor-origin">
          <button type="button" className="tc-doctor-origin-link" aria-label={`返回 ${hospital.name}`} onClick={onBackToHospital}>
            <span className="tc-doctor-meta-label">所在医院</span>
            <span className="tc-doctor-meta-value">{hospital.name}</span>
            <ChevronRight className="tc-row-chev" size={16} aria-hidden="true" />
          </button>
        </p>
        <p className="tc-doctor-meta tc-doctor-meta--note">
          <span className="tc-doctor-meta-label">备注</span>
          <span className={note.empty ? 'tc-doctor-meta-value is-empty' : 'tc-doctor-meta-value'}>{note.text}</span>
        </p>
      </div>

      <section className="tc-detail-section tc-doctor-rating">
        <h3>评价<span className="tc-detail-count">{ratingItems.length} 条</span></h3>
        {ratingItems.length === 0 ? (
          <p className="tc-quote tc-doctor-rating-empty">无</p>
        ) : (
          ratingItems.map((text, index) => (
            <article className="tc-rating-card" key={`${index}-${text.slice(0, 12)}`}>
              <p className="tc-quote">{text}</p>
            </article>
          ))
        )}
      </section>
    </div>
  )
}
