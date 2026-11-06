'use client'

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { Check, ChevronLeft, Search, SlidersHorizontal, X } from 'lucide-react'
import type { SearchResult, SheetSearchGroup } from './types'

/** 底卡标题的字号档位：全国与搜索结果最小，医院/省份次之，医生名最大。 */
export type SheetLevel = 'country' | 'province' | 'hospital' | 'doctor' | 'search'

/** 三档高度；peek 随内容，由 MapSheet 量出来再上报。 */
export type SheetStop = 'peek' | 'medium' | 'large'

export type SheetHeights = Record<SheetStop, number>

/** 筛选面板的一行：病症名与命中的医院数。 */
export type SheetFilter = { id: string; label: string; count: number }

const STOP_ORDER: SheetStop[] = ['peek', 'medium', 'large']
// peek = 把手 + 搜索行 + 头部 + 这条余量，层级换字号或藏起搜索行都要重量。
const PEEK_GAP = 6

type Props = {
  level: SheetLevel
  title: string
  /** 标题下的计数行；没有数字可报的层级传 null。 */
  meta: ReactNode
  stop: SheetStop
  /** 详情层没有 peek：最低只能到 medium。 */
  minStop?: SheetStop
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
  /** 空态正文会把层级名再说一遍：这时卡头只留计数，藏掉返回行与标题。 */
  hideHead?: boolean
  /** 搜索框失焦且焦点确实离开底卡时调用；卡内点击不算。 */
  onDismiss?: () => void
  query: string
  onQueryChange: (value: string) => void
  results: SheetSearchGroup[]
  activeResult: number
  onActiveResultChange: (index: number) => void
  onRunResult: (result: SearchResult) => void
  /** 筛选入口：只有在全国/省份列表层才给。 */
  filters?: SheetFilter[]
  selectedFilters?: string[]
  onToggleFilter?: (id: string) => void
  filterOpen?: boolean
  onFilterOpenChange?: (open: boolean) => void
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

/** 只在与当前层级允许的档位里找最近的落点。 */
function nearestStop(height: number, heights: SheetHeights, allowed: SheetStop[]): SheetStop {
  let best: SheetStop = allowed[0]
  let distance = Number.POSITIVE_INFINITY
  for (const stop of allowed) {
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
  minStop = 'peek',
  heights,
  onStopChange,
  onPeekHeight,
  onLiveHeight,
  onDragChange,
  backLabel,
  onBack,
  hideHead = false,
  onDismiss,
  query,
  onQueryChange,
  results,
  activeResult,
  onActiveResultChange,
  onRunResult,
  filters = [],
  selectedFilters = [],
  onToggleFilter,
  filterOpen = false,
  onFilterOpenChange,
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
  // 卡内按下的指针在抬起前不算失焦：点结果行、拖把手时卡片不能先缩回 peek。
  const pointerInsideRef = useRef(false)
  // 只收回「因为聚焦才抬起来」的那一档；用户自己拖上来的卡不动。
  const focusRaisedRef = useRef(false)
  const [inputFocused, setInputFocused] = useState(false)
  // 分组保持搜索结果的原顺序，拍平后的下标与 MapApp 的 activeResult 一致。
  const flat = results.flatMap((entry) => entry.items)
  const searching = query.trim().length > 0
  const isDetail = level === 'hospital' || level === 'doctor'
  const minIndex = STOP_ORDER.indexOf(minStop)
  const allowed = STOP_ORDER.slice(minIndex)
  // 详情层即使外面还写着 peek，落到高度上也按 medium 算。
  const effectiveStop = STOP_ORDER.indexOf(stop) < minIndex ? minStop : stop
  const targetHeight = heights[effectiveStop]
  const filterActive = selectedFilters.length > 0
  const filterCount = filters.filter((item) => selectedFilters.includes(item.id)).length
  const filterLabel = filterCount === 0
    ? '按病症筛选'
    : `${filters.filter((item) => selectedFilters.includes(item.id)).map((item) => item.label).join('、')}，点击展开筛选`
  const eng = filterActive || filterOpen || inputFocused || searching

  const writeHeight = useCallback((height: number) => {
    const sheet = sheetRef.current
    if (!sheet) return
    sheet.style.height = `${height}px`
    onLiveHeight(height)
  }, [onLiveHeight])

  // 指针抬起（不论落在哪）就清掉卡内标记；按下与抬起之间不做 focus 判断。
  useEffect(() => {
    const release = () => { pointerInsideRef.current = false }
    document.addEventListener('pointerup', release, true)
    document.addEventListener('pointercancel', release, true)
    return () => {
      document.removeEventListener('pointerup', release, true)
      document.removeEventListener('pointercancel', release, true)
    }
  }, [])

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

  // 换层级后，之前的「聚焦抬起」不再作数。搜索只是给当前层叠了一层结果，
  // country ↔ search 来回切换时不能把聚焦抬起来的这一档弄丢，否则清空搜索再失焦就缩不回 peek。
  const previousLevelRef = useRef<SheetLevel>(level)
  useLayoutEffect(() => {
    const previous = previousLevelRef.current
    previousLevelRef.current = level
    if (previous === level) return
    if (previous === 'search' || level === 'search') return
    focusRaisedRef.current = false
  }, [level])

  // 详情层没有 peek 这一档：把手、键盘、拖拽都只能落在 medium 及以上。
  const cycleStop = (): SheetStop => {
    const index = allowed.indexOf(effectiveStop)
    return allowed[(index + 1) % allowed.length]
  }

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
    const height = Math.min(heights.large, Math.max(heights[minStop], drag.startHeight + dy))
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
      // 没拖动就是点头部：在层级允许的档位里循环。
      next = cycleStop()
    } else {
      next = nearestStop(sheet.offsetHeight + velocity * 0.22, heights, allowed)
    }
    // 用户手动换过档，这张卡不再算「聚焦抬起」。
    focusRaisedRef.current = false
    // 落点可能与当前档位相同（拖回原位），也要把高度交还给过渡。
    writeHeight(heights[next])
    onStopChange(next)
  }

  const onGrabKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const index = allowed.indexOf(effectiveStop)
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      const next = event.key === 'ArrowUp'
        ? Math.min(allowed.length - 1, index + 1)
        : Math.max(0, index - 1)
      if (next !== index) {
        focusRaisedRef.current = false
        onStopChange(allowed[next])
      }
    } else if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault()
      focusRaisedRef.current = false
      onStopChange(cycleStop())
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
      className={`sheet is-${level}${isDetail ? ' is-detail' : ''}${filterActive ? ' is-filtering' : ''}${hideHead ? ' is-empty' : ''}`}
      aria-labelledby={titleId}
      onPointerDownCapture={() => { pointerInsideRef.current = true }}
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
      <div className={eng ? 'searchrow is-eng' : 'searchrow'} ref={searchRowRef}>
        <div className="sfield">
          <Search className="sq" size={17} aria-hidden="true" />
          <input
            type="search"
            value={query}
            placeholder="搜索省份 / 医院 / 病症"
            aria-label="搜索省份、医院、医生或病症"
            onChange={(event) => onQueryChange(event.target.value)}
            onFocus={() => {
              setInputFocused(true)
              // 原型在聚焦时把 peek 抬到 medium，否则结果区只剩几像素。
              if (stop === 'peek') {
                focusRaisedRef.current = true
                onStopChange('medium')
              }
            }}
            onBlur={(event) => {
              setInputFocused(false)
              // 指针还按在卡里（点结果行、点筛钮）就不算失去焦点。
              if (pointerInsideRef.current) return
              const next = event.relatedTarget
              if (next instanceof Node && sheetRef.current?.contains(next)) return
              // 只收回因聚焦抬起来的那一档。
              if (!focusRaisedRef.current) return
              focusRaisedRef.current = false
              onDismiss?.()
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
        {onFilterOpenChange && (
          <button
            type="button"
            className={`fbtn${filterCount > 0 ? ' has' : ''}`}
            aria-label={filterLabel}
            aria-expanded={filterOpen}
            aria-controls={`${titleId}-filters`}
            onClick={() => {
              const next = !filterOpen
              if (next && stop === 'peek') onStopChange('medium')
              onFilterOpenChange(next)
            }}
          >
            <SlidersHorizontal size={19} aria-hidden="true" />
            <span className="cnt">{filterCount}</span>
          </button>
        )}
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
      <div
        className="sheet-body"
        ref={bodyRef}
        onFocusCapture={(event) => {
          // 键盘 Tab 进正文（省份行、医院行）时把手抬到 medium；鼠标点不算，
          // 否则在 peek 下点不到的东西正好被一层「点了才抬」盖住。
          if (stop !== 'peek') return
          const target = event.target
          if (target instanceof HTMLElement && target.matches(':focus-visible')) onStopChange('medium')
        }}
      >
        {filters.length > 0 && onToggleFilter && (
          <div
            id={`${titleId}-filters`}
            className={filterOpen ? 'fpanel is-open' : 'fpanel'}
            aria-label="按病症筛选"
            aria-hidden={!filterOpen}
          >
            <div className="fp-inner">
              <ul>
                {filters.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="fp-row"
                      role="checkbox"
                      aria-checked={selectedFilters.includes(item.id)}
                      onClick={() => onToggleFilter(item.id)}
                    >
                      <span>{item.label}</span>
                      <Check className="tick" size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
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
