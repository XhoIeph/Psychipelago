'use client'

import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { ChevronLeft, Search, X } from 'lucide-react'
import type { SearchResult, SheetSearchGroup } from './types'

/** 底卡标题的字号档位：全国与搜索结果最小，医院/省份次之，医生名最大。 */
export type SheetLevel = 'country' | 'province' | 'hospital' | 'doctor' | 'search'

/** 三档高度；peek 随内容，由 MapSheet 量出来再上报。 */
export type SheetStop = 'peek' | 'medium' | 'large'

export type SheetHeights = Record<SheetStop, number>

const STOP_ORDER: SheetStop[] = ['peek', 'medium', 'large']
// peek = 把手 + 搜索行 + 头部 + 这条余量，层级换字号或藏起搜索行都要重量。
const PEEK_GAP = 6

type Props = {
  level: SheetLevel
  title: string
  /** 标题下的计数行；没有数字可报的层级传 null。 */
  meta: ReactNode
  stop: SheetStop
  heights: SheetHeights
  onStopChange: (stop: SheetStop) => void
  /** peek 实测高度变化时上报，MapApp 用它算地图让位。 */
  onPeekHeight: (height: number) => void
  /** 当前高度（拖动中逐帧）变化时上报，浮动控件靠它贴着卡沿。 */
  onLiveHeight: (height: number) => void
  /** 拖拽起止，MapApp 用它暂停浮动控件的过渡，避免拖动时掉队。 */
  onDragChange?: (dragging: boolean) => void
  /** 详情层返回目标的名字；列表层不传。 */
  backLabel?: string
  onBack?: () => void
  query: string
  onQueryChange: (value: string) => void
  results: SheetSearchGroup[]
  activeResult: number
  onActiveResultChange: (index: number) => void
  onRunResult: (result: SearchResult) => void
  children: ReactNode
}

type DragState = {
  pointerId: number
  startY: number
  startHeight: number
  moved: number
  /** 最近 120ms 的指针位置，用来算松手速度。 */
  samples: { t: number; y: number }[]
}

function nearestStop(height: number, heights: SheetHeights): SheetStop {
  let best: SheetStop = 'peek'
  let distance = Number.POSITIVE_INFINITY
  for (const stop of STOP_ORDER) {
    const next = Math.abs(heights[stop] - height)
    if (next < distance) {
      distance = next
      best = stop
    }
  }
  return best
}

/**
 * 手机端常驻底卡：把手、搜索、层级标题、滚动正文。
 * 三档高度与拖拽都在这里；地图让位由 MapApp 写 --tc-map-shift。桌面侧栏不经过这里。
 */
export function MapSheet({
  level,
  title,
  meta,
  stop,
  heights,
  onStopChange,
  onPeekHeight,
  onLiveHeight,
  onDragChange,
  backLabel,
  onBack,
  query,
  onQueryChange,
  results,
  activeResult,
  onActiveResultChange,
  onRunResult,
  children,
}: Props) {
  const titleId = useId()
  const sheetRef = useRef<HTMLElement | null>(null)
  const grabRef = useRef<HTMLDivElement | null>(null)
  const searchRowRef = useRef<HTMLDivElement | null>(null)
  const headRef = useRef<HTMLElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const peekRef = useRef(0)
  // 分组保持搜索结果的原顺序，拍平后的下标与 MapApp 的 activeResult 一致。
  const flat = results.flatMap((entry) => entry.items)
  const searching = query.trim().length > 0
  const isDetail = level === 'hospital' || level === 'doctor'
  const targetHeight = heights[stop]

  const writeHeight = useCallback((height: number) => {
    const sheet = sheetRef.current
    if (!sheet) return
    sheet.style.height = `${height}px`
    onLiveHeight(height)
  }, [onLiveHeight])

  // 目标档位变了才写高度；拖动过程中由指针事件直接写，不让 React 抢。
  useLayoutEffect(() => {
    if (dragRef.current) return
    writeHeight(targetHeight)
  }, [writeHeight, targetHeight])

  // peek 随层级字号、搜索行显隐和折行变化，量出来再上报；仍在 peek 时立刻贴合。
  useLayoutEffect(() => {
    const grab = grabRef.current
    const head = headRef.current
    if (!grab || !head) return
    const measure = () => {
      // 桌面首帧也会挂载一次，display:none 时全部为 0，别把 0 当成 peek。
      if (!grab.offsetHeight) return
      const search = searchRowRef.current
      const next = Math.round(grab.offsetHeight + (search?.offsetHeight ?? 0) + head.offsetHeight + PEEK_GAP)
      if (next <= 0 || next === peekRef.current) return
      peekRef.current = next
      onPeekHeight(next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(grab)
    observer.observe(head)
    if (searchRowRef.current) observer.observe(searchRowRef.current)
    return () => observer.disconnect()
  }, [level, onPeekHeight, title])

  // 换层级（含进详情、回列表）时正文回到顶部，别停在上一个层级的位置。
  useLayoutEffect(() => {
    const body = bodyRef.current
    if (body) body.scrollTop = 0
  }, [level, title])

  const beginDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    const target = event.target
    // 头部里的返回按钮和输入框不是拖拽区。
    if (target instanceof Element && target.closest('button, a, input')) return
    const sheet = sheetRef.current
    if (!sheet) return
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: sheet.offsetHeight,
      moved: 0,
      samples: [{ t: performance.now(), y: event.clientY }],
    }
    // 跟手拖动不加过渡，松手再交还给档位动画。
    sheet.style.transition = 'none'
    onDragChange?.(true)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const moveDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dy = drag.startY - event.clientY
    drag.moved = Math.max(drag.moved, Math.abs(dy))
    const height = Math.min(heights.large, Math.max(heights.peek, drag.startHeight + dy))
    writeHeight(height)
    const now = performance.now()
    drag.samples.push({ t: now, y: event.clientY })
    while (drag.samples.length > 2 && now - drag.samples[0].t > 120) drag.samples.shift()
  }

  const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    const sheet = sheetRef.current
    if (!sheet) return
    sheet.style.transition = ''
    onDragChange?.(false)
    let velocity = 0
    if (drag.samples.length > 1) {
      const first = drag.samples[0]
      const last = drag.samples[drag.samples.length - 1]
      const elapsed = last.t - first.t
      if (elapsed > 8) velocity = -((last.y - first.y) / elapsed) * 1000
    }
    let next: SheetStop
    if (drag.moved < 6 && Math.abs(velocity) < 120) {
      // 没拖动就是点头部：按 peek → medium → large 循环。
      next = STOP_ORDER[(STOP_ORDER.indexOf(stop) + 1) % STOP_ORDER.length]
    } else {
      next = nearestStop(sheet.offsetHeight + velocity * 0.22, heights)
    }
    // 落点可能与当前档位相同（拖回原位），也要把高度交还给过渡。
    writeHeight(heights[next])
    onStopChange(next)
  }

  const onGrabKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const index = STOP_ORDER.indexOf(stop)
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      const next = event.key === 'ArrowUp' ? Math.min(2, index + 1) : Math.max(0, index - 1)
      if (next !== index) onStopChange(STOP_ORDER[next])
    } else if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault()
      onStopChange(STOP_ORDER[(index + 1) % 3])
    }
  }

  const dragProps = {
    onPointerDown: beginDrag,
    onPointerMove: moveDrag,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  }

  return (
    <section
      ref={sheetRef}
      className={`sheet is-${level}${isDetail ? ' is-detail' : ''}`}
      aria-labelledby={titleId}
    >
      <div
        ref={grabRef}
        className="grab"
        role="button"
        tabIndex={0}
        aria-label="调整下方信息栏高度"
        onKeyDown={onGrabKeyDown}
        {...dragProps}
      >
        <i aria-hidden="true" />
      </div>
      <div className="searchrow" ref={searchRowRef}>
        <div className="sfield">
          <Search className="sq" size={17} aria-hidden="true" />
          <input
            type="search"
            value={query}
            placeholder="搜索省份 / 医院 / 病症"
            aria-label="搜索省份、医院、医生或病症"
            onChange={(event) => onQueryChange(event.target.value)}
            onFocus={() => {
              // 原型在聚焦时把 peek 抬到 medium，否则结果区只剩几像素。
              if (stop === 'peek') onStopChange('medium')
            }}
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
      <header className="sheet-head" ref={headRef} {...dragProps}>
        {backLabel && onBack && (
          <div className="head-back">
            <button type="button" className="back-btn" aria-label={`返回${backLabel}`} onClick={onBack}>
              <ChevronLeft size={15} aria-hidden="true" />
              <span>返回 {backLabel}</span>
            </button>
          </div>
        )}
        <h2 id={titleId} className={`head-title head-title--${level}`}>{title}</h2>
        {meta ? <div className="head-meta">{meta}</div> : null}
      </header>
      <div className="sheet-body" ref={bodyRef}>
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
