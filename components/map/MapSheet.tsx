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
import { ChevronLeft, Search, SlidersHorizontal, X } from 'lucide-react'
import { DisorderChips } from '@/components/DisorderChips'
import type { DisorderGroup } from '@/components/HospitalExplorer'
import { animatePanelDrill } from '@/lib/panel-motion'
import { advanceGesture, beginGesture, resolveTap, type DragGesture } from '@/lib/sheet-drag'
import type { SearchResult, SheetSearchGroup } from './types'

/** 底卡标题的字号档位：全国与搜索结果最小，医院/省份次之，医生名最大。 */
export type SheetLevel = 'country' | 'province' | 'hospital' | 'doctor' | 'search'

/** 三档高度；peek 随内容，由 MapSheet 量出来再上报。 */
export type SheetStop = 'peek' | 'medium' | 'large'

export type SheetHeights = Record<SheetStop, number>

const STOP_ORDER: SheetStop[] = ['peek', 'medium', 'large']
// peek = 把手 + 搜索行 + 筛选条 + 头部 + 这条余量，层级换字号或藏起搜索行都要重量。
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
  /** 搜索框失焦且焦点确实离开底卡时调用；卡内点击不算。返回是否真的收档。 */
  onDismiss?: () => boolean
  query: string
  onQueryChange: (value: string) => void
  results: SheetSearchGroup[]
  activeResult: number
  onActiveResultChange: (index: number) => void
  onRunResult: (result: SearchResult) => void
  /** 搜索无结果时的文案；筛选态下由上层换成「试试取消筛选」的提示。 */
  emptyText?: string
  /** 搜索行下面的病症筛选条：只有全国/省份层且没有搜索词时渲染。 */
  disorderGroups: DisorderGroup[]
  selectedDisorders: string[]
  onToggleDisorder: (id: string) => void
  children: ReactNode
}

type DragState = {
  pointerId: number
  startY: number
  startHeight: number
  /** 阈值与点击语义都在这份手势状态里，规则见 `lib/sheet-drag.ts`。 */
  gesture: DragGesture
  /** 从输入框按下时先不让它原生聚焦，松手没拖动再手动聚焦。 */
  field: HTMLInputElement | null
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
 * 手机端常驻底卡：把手、搜索、病症筛选、层级标题、滚动正文。
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
  onDismiss,
  query,
  onQueryChange,
  results,
  activeResult,
  onActiveResultChange,
  onRunResult,
  emptyText = '没有找到匹配结果，试试省份、医院或医生名称。',
  disorderGroups,
  selectedDisorders,
  onToggleDisorder,
  children,
}: Props) {
  const titleId = useId()
  const sheetRef = useRef<HTMLElement | null>(null)
  const grabRef = useRef<HTMLDivElement | null>(null)
  const searchRowRef = useRef<HTMLDivElement | null>(null)
  const headRef = useRef<HTMLElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const peekRef = useRef(0)
  // 卡内按下的指针在抬起前不算失焦：点结果行、拖把手时卡片不能先缩回 peek。
  const pointerInsideRef = useRef(false)
  // 搜索聚焦前的档位：失焦或点「取消」时回到这里，而不是一律压回 peek。
  const stopBeforeFocusRef = useRef<SheetStop | null>(null)
  const [inputFocused, setInputFocused] = useState(false)
  // 鼠标按下卡片里的按钮时输入框先失焦；指针停在搜索行里就先保持展开。
  const [rowPointerInside, setRowPointerInside] = useState(false)
  // 病症标签默认收起，由搜索行右侧的按钮展开：常驻标签占掉太多高度。
  const [chipsOpen, setChipsOpen] = useState(false)

  // 分组保持搜索结果的原顺序，拍平后的下标与 MapApp 的 activeResult 一致。
  const flat = results.flatMap((entry) => entry.items)
  const searching = query.trim().length > 0
  const isDetail = level === 'hospital' || level === 'doctor'
  const effectiveStop = stop
  const targetHeight = heights[effectiveStop]
  const eng = inputFocused || rowPointerInside || searching
  // 聚焦或有关键词时给出「取消」：清词、失焦、回到聚焦前的档位。
  const showCancel = inputFocused || searching
  const showChips = !searching && (level === 'country' || level === 'province')
  const chipsId = `${titleId}-chips`
  const selectedCount = selectedDisorders.length

  const writeHeight = useCallback((height: number) => {
    const sheet = sheetRef.current
    if (!sheet) return
    sheet.style.height = `${height}px`
    onLiveHeight(height)
  }, [onLiveHeight])

  const cancelSearch = () => {
    onQueryChange('')
    onActiveResultChange(-1)
    setInputFocused(false)
    const restore = stopBeforeFocusRef.current
    stopBeforeFocusRef.current = null
    inputRef.current?.blur()
    if (restore && restore !== stop) onStopChange(restore)
  }

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

  // peek 随层级字号、筛选条和搜索行显隐、折行变化，量出来再上报；仍在 peek 时立刻贴合。
  useLayoutEffect(() => {
    const grab = grabRef.current
    const head = headRef.current
    if (!grab || !head) return
    const measure = () => {
      // 桌面首帧也会挂载一次，display:none 时全部为 0，别把 0 当成 peek。
      if (!grab.offsetHeight) return
      const search = searchRowRef.current
      const chips = sheetRef.current?.querySelector<HTMLElement>('.chipdrawer')
      const next = Math.round(
        grab.offsetHeight + (search?.offsetHeight ?? 0) + (chips?.offsetHeight ?? 0) + head.offsetHeight + PEEK_GAP,
      )
      if (next <= 0 || next === peekRef.current) return
      peekRef.current = next
      onPeekHeight(next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(grab)
    observer.observe(head)
    if (searchRowRef.current) observer.observe(searchRowRef.current)
    const chips = sheetRef.current?.querySelector<HTMLElement>('.chipdrawer')
    if (chips) observer.observe(chips)
    return () => observer.disconnect()
  }, [chipsOpen, level, onPeekHeight, searching, title, selectedDisorders])

  // 进搜索层就收起标签：结果区要整块留出来，展开的标签只会挤掉结果。
  useLayoutEffect(() => {
    if (searching) setChipsOpen(false)
  }, [searching])

  // Esc 先把展开的标签收起来，第二下再交给原有的层级退出手势。
  useEffect(() => {
    if (!chipsOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setChipsOpen(false)
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [chipsOpen])

  // 换层级（含进详情、回列表）时正文回到顶部，别停在上一个层级的位置。
  useLayoutEffect(() => {
    const body = bodyRef.current
    if (body) body.scrollTop = 0
  }, [level, title])

  // 换层级后，之前的「聚焦抬起」不再作数。搜索只是给当前层叠了一层结果，
  // country ↔ search 来回切换时不能把聚焦抬起来的这一档弄丢，否则清空搜索再失焦就缩不回去。
  const previousLevelRef = useRef<SheetLevel>(level)
  useLayoutEffect(() => {
    const previous = previousLevelRef.current
    previousLevelRef.current = level
    if (previous === level) return
    if (previous === 'search' || level === 'search') return
    stopBeforeFocusRef.current = null
  }, [level])

  // 换层级时下方栏的内容沿层深方向滑进来：参数与桌面 `PanelMotion` 一致（20px、0.6 淡入、
  // 0.22s power3.out），reduced-motion 时不动。只包头部与正文这两块已有节点，不再套一层 div——
  // `.sheet` 是 flex 列，`.sheet-body` 靠 flex:1 撑开，加包裹层会改掉滚动容器的位置。
  // 拖动换档、搜索输入、筛选条开关都不改 level，因此不会重播。
  const previousMotionLevelRef = useRef<SheetLevel | null>(null)
  const previousMotionDepthRef = useRef(0)
  useLayoutEffect(() => {
    const depthOf = (value: SheetLevel): number => (
      value === 'province' ? 1 : value === 'hospital' ? 2 : value === 'doctor' ? 3 : 0
    )
    const previousLevel = previousMotionLevelRef.current
    previousMotionLevelRef.current = level
    const depth = depthOf(level)
    const previousDepth = previousMotionDepthRef.current
    previousMotionDepthRef.current = depth
    // 首屏、层级没变、搜索层进出都不播。
    if (previousLevel === null || previousLevel === level) return
    if (previousLevel === 'search' || level === 'search') return
    const targets = [headRef.current, bodyRef.current].filter((node): node is HTMLElement => Boolean(node))
    if (targets.length === 0) return
    const direction = Math.sign(depth - previousDepth) || 1
    return animatePanelDrill(targets, { direction })
  }, [level])

  // 把手、键盘换档：没有详情层的最低档限制了，三档都能落。
  const cycleStop = (): SheetStop => {
    const index = STOP_ORDER.indexOf(effectiveStop)
    return STOP_ORDER[(index + 1) % STOP_ORDER.length]
  }

  const beginDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const target = event.target
    // 按钮和下拉不参与拖拽；输入框要能从这里拖底卡，所以只在移动超过阈值后才接管。
    if (target instanceof Element && target.closest('button, a, select, textarea')) return
    const sheet = sheetRef.current
    if (!sheet) return
    const inSearchRow = target instanceof Element && !!target.closest('.searchrow')
    // 输入框的默认动作是按下即聚焦，聚焦会把卡抬到 large；先拦下来，等松手没拖动再手动归还焦点。
    const field = target instanceof Element ? target.closest('input') : null
    const gesture = beginGesture({
      button: event.button,
      inSearchRow,
      isField: field !== null,
    })
    if (!gesture) return
    if (field) event.preventDefault()
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: sheet.offsetHeight,
      gesture,
      field: field instanceof HTMLInputElement ? field : null,
      samples: [{ t: performance.now(), y: event.clientY }],
    }
    // 立刻抓住指针：第一步位移可能就把指针带到把手/搜索行外，等越过 6px 再抓会丢 move 事件，
    // 拖拽永远进不了 active。抓指针不影响点击语义——没超过阈值松手仍走聚焦/换档分支。
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const moveDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dy = drag.startY - event.clientY
    const advanced = advanceGesture(drag.gesture, dy)
    drag.gesture = advanced.gesture
    if (advanced.activated) {
      // 接管后不要再让输入框选字；touch-action:none 在 CSS 里已经挡住页面滚动。
      event.preventDefault()
      const sheet = sheetRef.current
      if (sheet) sheet.style.transition = 'none'
      onDragChange?.(true)
    }
    if (!drag.gesture.active) return
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
    const tap = resolveTap(drag.gesture)
    if (tap !== 'none') {
      // 点按：输入框只归还焦点（聚焦会把卡抬到 large），把手和标题照旧循环换档。
      if (tap === 'focus' && drag.field) drag.field.focus()
      if (tap === 'cycle') {
        const tapped = cycleStop()
        stopBeforeFocusRef.current = null
        writeHeight(heights[tapped])
        onStopChange(tapped)
      }
      return
    }
    sheet.style.transition = ''
    onDragChange?.(false)
    let velocity = 0
    if (drag.samples.length > 1) {
      const first = drag.samples[0]
      const last = drag.samples[drag.samples.length - 1]
      const elapsed = last.t - first.t
      if (elapsed > 8) velocity = -((last.y - first.y) / elapsed) * 1000
    }
    const next = nearestStop(sheet.offsetHeight + velocity * 0.22, heights, STOP_ORDER)
    // 用户手动换过档，这张卡不再算「聚焦抬起」。
    stopBeforeFocusRef.current = null
    // 落点可能与当前档位相同（拖回原位），也要把高度交还给过渡。
    writeHeight(heights[next])
    onStopChange(next)
  }

  const onGrabKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const index = STOP_ORDER.indexOf(effectiveStop)
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      const next = event.key === 'ArrowUp'
        ? Math.min(STOP_ORDER.length - 1, index + 1)
        : Math.max(0, index - 1)
      if (next !== index) {
        stopBeforeFocusRef.current = null
        onStopChange(STOP_ORDER[next])
      }
    } else if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault()
      stopBeforeFocusRef.current = null
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
      className={`sheet is-${level}${isDetail ? ' is-detail' : ''}`}
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
      <div
        className={eng ? 'searchrow is-eng' : 'searchrow'}
        ref={searchRowRef}
        onPointerDownCapture={() => setRowPointerInside(true)}
        onPointerLeave={() => setRowPointerInside(false)}
        {...dragProps}
      >
        <div className="sfield">
          <Search className="sq" size={17} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            placeholder="搜索省份 / 医院 / 病症"
            aria-label="搜索省份、医院、医生或病症"
            onChange={(event) => onQueryChange(event.target.value)}
            onFocus={() => {
              setInputFocused(true)
              // 聚焦时把卡抬到 large：结果区要给「至少两条完整医院行」留出高度。
              if (stopBeforeFocusRef.current === null) stopBeforeFocusRef.current = effectiveStop
              if (effectiveStop !== 'large') onStopChange('large')
            }}
            onBlur={(event) => {
              setInputFocused(false)
              // 指针还按在卡里（点结果行）就不算失去焦点。
              if (pointerInsideRef.current) return
              const next = event.relatedTarget
              if (next instanceof Node && sheetRef.current?.contains(next)) return
              const restore = stopBeforeFocusRef.current
              if (restore === null) return
              // 有关键词/筛选时 onDismiss 会拒绝收档，这时保留标记，
              // 等条件消失后（比如点清除钮）下一次失焦仍能收回。
              if (!onDismiss?.()) return
              stopBeforeFocusRef.current = null
              if (restore !== effectiveStop) onStopChange(restore)
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
              } else if (event.key === 'Escape') {
                event.stopPropagation()
                cancelSearch()
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
                // 清除钮卸载后焦点会掉到 body，把焦点交还输入框，留给「取消」继续收档。
                inputRef.current?.focus()
              }}
            >
              <X size={15} aria-hidden="true" />
            </button>
          )}
        </div>
        {showChips && (
          <button
            type="button"
            className={chipsOpen ? 'chipbtn is-open' : 'chipbtn'}
            aria-label={selectedCount > 0 ? `筛选，已选 ${selectedCount} 项` : '筛选'}
            aria-expanded={chipsOpen}
            aria-controls={chipsId}
            onClick={() => setChipsOpen((open) => !open)}
          >
            <SlidersHorizontal size={17} aria-hidden="true" />
            {selectedCount > 0 && !chipsOpen ? (
              <span className="chipbtn-badge" aria-hidden="true">{selectedCount}</span>
            ) : null}
          </button>
        )}
        {showCancel && (
          <button
            type="button"
            className="sheet-cancel"
            onMouseDown={(event) => event.preventDefault()}
            onClick={cancelSearch}
          >
            取消
          </button>
        )}
      </div>
      {showChips && (
        <div id={chipsId} className={chipsOpen ? 'chipdrawer is-open' : 'chipdrawer'}>
          <div className="chipdrawer-inner">
            <DisorderChips
              groups={disorderGroups}
              selected={selectedDisorders}
              onToggle={onToggleDisorder}
            />
          </div>
        </div>
      )}
      <header className={`sheet-head sheet-head--${level}`} ref={headRef} {...dragProps}>
        {backLabel && onBack && (
          <div className="head-back">
            <button type="button" className="back-btn" aria-label={`返回 ${backLabel}`} onClick={onBack}>
              <ChevronLeft aria-hidden="true" />
              <span>{backLabel}</span>
            </button>
          </div>
        )}
        <h2 id={titleId} className={`head-title head-title--${level}`} tabIndex={-1}>{title}</h2>
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
            <p className="sr-empty">{emptyText}</p>
          )
        ) : (
          children
        )}
      </div>
    </section>
  )
}
