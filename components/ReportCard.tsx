import type { Disorder, Report } from '@/lib/schema'
import {
  formatCost,
  formatPublishedAt,
  formatReportSource,
  formatRegion,
} from '@/lib/format'
import { LeadEvidence } from './LeadEvidence'

const STAGE_LABELS: Record<string, string> = {
  seeking: '求医中',
  consulted: '已就诊',
  assessed: '已做评估',
  diagnosed: '自称已确诊',
  treated: '已接受治疗',
  unknown: '阶段未知',
}

export function ReportCard({
  report,
  onSelectHospital,
}: {
  report: Report
  disorders: Disorder[]
  onSelectHospital?: (id: string) => void
}) {
  const cost = formatCost(report.cost_cny)
  const publishedAt = formatPublishedAt(report.published_at, report.published_at_precision)

  return (
    <article className="tc-report">
      {(report.stage !== 'unknown' || publishedAt || report.context_incomplete) && (
        <div className="tc-row tc-small tc-muted">
          {report.stage !== 'unknown' && <span>{STAGE_LABELS[report.stage] ?? report.stage}</span>}
          {publishedAt && <span>{publishedAt}</span>}
          {report.context_incomplete && <span>上下文不完整</span>}
        </div>
      )}
      <LeadEvidence
        sourceLabel={formatReportSource(report)}
        url={report.source_url}
        quote={report.evidence_quote}
        contextNote={report.evidence_context?.parent_excerpt ? `该评论回复的原话：「${report.evidence_context.parent_excerpt}」` : undefined}
        fullText={report.evidence_full_text && report.evidence_full_text.length > report.evidence_quote.length ? report.evidence_full_text : undefined}
      />
      {(report.hospital_region || report.self_reported_region || cost) && (
      <div className="tc-row tc-meta">
        {(report.hospital_region || report.self_reported_region) && <span>{formatRegion(report)}</span>}
        {cost && <span>费用自述：{cost}</span>}
      </div>
      )}
      {onSelectHospital && report.hospital_id && (
        <button type="button" className="tc-detail-link" onClick={() => onSelectHospital(report.hospital_id!)}>查看医院</button>
      )}
    </article>
  )
}
