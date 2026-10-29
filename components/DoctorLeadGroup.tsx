import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import type { DoctorLeadGroup as Group } from '@/lib/doctor-leads'

export function DoctorLeadGroup({ group, searching, children }: {
  group: Group
  searching: boolean
  children: ReactNode
}) {
  return (
    <details className="tc-doctor-group" open={searching || undefined}>
      <summary>
        <h2>{group.label}</h2>
        <span className="tc-doctor-group-count" aria-label={`${group.leadCount} 条医生线索`}>{group.leadCount}</span>
        <ChevronDown className="tc-doctor-group-chevron" size={18} aria-hidden="true" />
      </summary>
      <div className="tc-doctor-group-body">{children}</div>
    </details>
  )
}
