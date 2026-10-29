'use client'

import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { formatReportSource } from '@/lib/format'
import { LeadEvidence } from './LeadEvidence'
import type { DoctorLead } from '@/lib/doctor-leads'
import type { Report } from '@/lib/schema'

export function DoctorLeadItem({ entry, reports, onSelectHospital }: {
  entry: DoctorLead
  reports: Report[]
  onSelectHospital?: (id: string) => void
}) {
  const related = reports.filter((report) => entry.reportIds.includes(report.id))
  const hospitalId = entry.hospitalId

  return (
    <details className="tc-doctor-result">
      <summary>
        <strong>{entry.name}</strong>
        <small>{entry.hospitalName} · {entry.leadCount} 条线索</small>
        <ChevronDown className="tc-doctor-chevron" size={16} aria-hidden="true" />
      </summary>
      <div className="tc-doctor-result-body">
        {related.map((report) => (
          <div key={report.id} className="tc-doctor-evidence">
            <LeadEvidence
              sourceLabel={formatReportSource(report)}
              url={report.source_url}
              quote={report.evidence_quote}
              contextNote={report.evidence_context?.parent_excerpt ? `该评论回复的原话：「${report.evidence_context.parent_excerpt}」` : undefined}
              fullText={report.evidence_full_text}
            />
          </div>
        ))}
        {onSelectHospital && hospitalId ? (
          <button type="button" className="tc-linklike" onClick={() => onSelectHospital(hospitalId)}>在地图查看机构</button>
        ) : hospitalId ? (
          <Link href={`/hospitals/${hospitalId}/`}>查看机构 →</Link>
        ) : null}
      </div>
    </details>
  )
}
