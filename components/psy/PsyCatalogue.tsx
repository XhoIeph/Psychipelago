'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'

export type PsyScale = {
  id: string
  name: string
  fullName: string
  englishName: string
  category: string
  duration: number | null
  questionCount: number
  description: string
  crisis: boolean
}

/**
 * 量表库的分类：与 PSYMETRA 首页一致，用「包含」匹配，
 * 所以「创伤」会同时收进创伤经历 / 创伤解离 / 创伤应激三组。
 * 这里只做筛选，不改数据里的 category 原文。
 */
const FILTERS: ReadonlyArray<{ id: string; label: string; match: string }> = [
  { id: 'all', label: '全部量表', match: '' },
  { id: 'symptom', label: '综合症状', match: '综合症状' },
  { id: 'depression', label: '抑郁', match: '抑郁' },
  { id: 'anxiety', label: '焦虑', match: '焦虑' },
  { id: 'ocd', label: '强迫', match: '强迫' },
  { id: 'bipolar', label: '双相', match: '双相' },
  { id: 'crisis', label: '危机', match: '危机' },
  { id: 'trauma', label: '创伤', match: '创伤' },
  { id: 'personality', label: '人格', match: '人格' },
  { id: 'neuro', label: '神经发育', match: '神经发育' },
  { id: 'sleep', label: '睡眠质量', match: '睡眠质量' },
  { id: 'eating', label: '进食障碍', match: '进食障碍' },
  { id: 'addiction', label: '成瘾', match: '成瘾' },
  { id: 'support', label: '社会支持', match: '社会支持' },
]

export function PsyCatalogue({ items }: { items: PsyScale[] }) {
  const [active, setActive] = useState('all')
  const filter = FILTERS.find((f) => f.id === active) ?? FILTERS[0]

  const visible = useMemo(
    () => (filter.match ? items.filter((item) => item.category.includes(filter.match)) : items),
    [items, filter.match]
  )

  return (
    <div className="tc-psy">
      <div className="tc-psy-filters" role="group" aria-label="按分类筛选量表">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className="tc-psy-chip"
            data-filter={f.id}
            aria-pressed={f.id === active}
            onClick={() => setActive(f.id)}
          >
            {f.label}
            {f.id !== 'all' && (
              <span className="tc-psy-chip-count" aria-hidden="true">
                {items.filter((i) => i.category.includes(f.match)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <p className="tc-psy-count" role="status" aria-live="polite">
        {filter.id === 'all' ? `共 ${items.length} 个量表` : `${filter.label} · ${visible.length} 个量表`}
      </p>

      {visible.length === 0 ? (
        <p className="tc-psy-empty">这个分类下还没有量表。</p>
      ) : (
        <ul className="tc-psy-grid" key={active}>
          {visible.map((item, index) => (
            <li key={item.id} style={{ '--i': Math.min(index, 12) } as CSSProperties}>
              <Link href={`/psy/${item.id}/`} className="tc-psy-card">
                <h2 className="tc-psy-card-name">{item.name}</h2>
                {(item.fullName || item.englishName) && (
                  <p className="tc-psy-card-sub">
                    {[item.fullName, item.englishName].filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className="tc-psy-card-desc">{item.description}</p>
                <div className="tc-psy-card-foot">
                  <p className="tc-psy-card-meta">
                    <span>{item.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.questionCount} 题</span>
                    {item.duration ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>约 {item.duration} 分钟</span>
                      </>
                    ) : null}
                  </p>
                  <span className="tc-psy-card-cta">
                    开始作答
                    <ChevronRight size={16} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
