'use client'

import { useId, type ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import type { SearchResult, SheetSearchGroup } from './types'

/** 底卡标题的字号档位：全国与搜索结果最小，医院/省份次之，医生名最大。 */
export type SheetLevel = 'country' | 'province' | 'hospital' | 'doctor' | 'search'

type Props = {
  level: SheetLevel
  title: string
  /** 标题下的计数行；没有数字可报的层级传 null。 */
  meta: ReactNode
  query: string
  onQueryChange: (value: string) => void
  results: SheetSearchGroup[]
  activeResult: number
  onActiveResultChange: (index: number) => void
  onRunResult: (result: SearchResult) => void
  /** 搜索框为空时的浏览内容：某一级的详情，或全国医院列表。 */
  children: ReactNode
}

/**
 * 手机端常驻底卡：把手、搜索、层级标题、滚动正文。
 * 桌面侧栏不经过这里；三档高度、拖动和地图让位属于后续批次。
 */
export function MapSheet({
  level,
  title,
  meta,
  query,
  onQueryChange,
  results,
  activeResult,
  onActiveResultChange,
  onRunResult,
  children,
}: Props) {
  const titleId = useId()
  // 分组保持搜索结果的原顺序，拍平后的下标与 MapApp 的 activeResult 一致。
  const flat = results.flatMap((entry) => entry.items)
  const searching = query.trim().length > 0

  return (
    <section className="sheet" aria-labelledby={titleId}>
      <div className="grab" aria-hidden="true"><i /></div>
      <div className="searchrow">
        <div className="sfield">
          <Search className="sq" size={17} aria-hidden="true" />
          <input
            type="search"
            value={query}
            placeholder="搜索省份 / 医院 / 病症"
            aria-label="搜索省份、医院、医生或病症"
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                onActiveResultChange(Math.min(flat.length - 1, activeResult + 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                onActiveResultChange(Math.max(-1, activeResult - 1))
              } else if (event.key === 'Enter') {
                const target = flat[activeResult] ?? flat[0]
                if (target) onRunResult(target)
              } else if (event.key === 'Escape' && query) {
                event.stopPropagation()
                onQueryChange('')
                onActiveResultChange(-1)
              }
            }}
          />
          {query && (
            <button
              type="button"
              className="sclear"
              aria-label="清除搜索"
              onClick={() => {
                onQueryChange('')
                onActiveResultChange(-1)
              }}
            >
              <X size={15} aria-hidden="true" />
            </button>
          )}
        </div>
        {/* 第 4 批的筛选钮 .fbtn 放在这里；这批只在搜索框右侧留出空位。 */}
      </div>
      <header className="sheet-head">
        <h2 id={titleId} className={`head-title head-title--${level}`}>{title}</h2>
        {meta ? <div className="head-meta">{meta}</div> : null}
      </header>
      <div className="sheet-body">
        {searching ? (
          results.length > 0 ? (
            <div className="sheet-search">
              {results.map((entry) => (
                <div key={entry.group}>
                  <p className="sr-label">{entry.group}</p>
                  {entry.items.map((result) => {
                    const index = flat.indexOf(result)
                    return (
                      <button
                        key={result.key}
                        type="button"
                        className={index === activeResult ? 'sr-row sr-row--active' : 'sr-row'}
                        onClick={() => onRunResult(result)}
                        onMouseEnter={() => onActiveResultChange(index)}
                      >
                        <span className="sr-name">{result.label}</span>
                        <span className="sr-meta">{result.sub}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          ) : (
            <p className="sr-empty">没有找到匹配结果，试试省份、医院或医生名称。</p>
          )
        ) : (
          children
        )}
      </div>
    </section>
  )
}
