'use client'

import { Check } from 'lucide-react'

type ChipGroup = {
  id: string
  label: string
}

/**
 * 病症筛选条：点位式多选，点同一项取消。
 * 桌面全国层、省层和手机底卡共用同一个组件，选中态由 aria-pressed 交给 CSS。
 */
export function DisorderChips({
  groups,
  selected,
  onToggle,
}: {
  groups: ChipGroup[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="tc-disorder-chips" role="group" aria-label="按病症筛选">
      {groups.map((group) => (
        <button
          key={group.id}
          type="button"
          className="tc-disorder-chip"
          data-disorder={group.id}
          aria-pressed={selected.includes(group.id)}
          onClick={() => onToggle(group.id)}
        >
          <Check aria-hidden="true" />
          {group.label}
        </button>
      ))}
    </div>
  )
}
