'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type Ref } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { Brand } from '@/components/Brand'
import { PanelMotion } from '@/components/PanelMotion'
import { X } from 'lucide-react'

export type SidebarTabId = 'hospitals' | 'submit'

const TABS: { id: SidebarTabId; label: string }[] = [
  { id: 'hospitals', label: '医院' },
  { id: 'submit', label: '投稿' },
]
gsap.registerPlugin(useGSAP)

/**
 * MapApp owns the mobile modal focus cycle; the sidebar keeps tab navigation intact.
 */
export function Sidebar({
  id,
  open,
  tabs,
  detail,
  detailKey,
  detailDepth,
  onClose,
  panelRef,
  activeTab,
  onTabChange,
  modal = false,
  width,
  minWidth = 280,
  maxWidth = 520,
  onResize,
  onResizeCommit,
  onResizeReset,
  themeToggle,
}: {
  id?: string
  open: boolean
  tabs: Record<SidebarTabId, ReactNode>
  detail: ReactNode | null
  /** 详情态的身份（province:xxx / hospital:xxx / doctor:xxx），变化时重跑进场动画 */
  detailKey?: string
  /** 详情层级：省 1、机构 2、医生 3；返回时层级变小，动画方向随之反向 */
  detailDepth?: number
  onClose?: () => void
  panelRef?: Ref<HTMLElement>
  /** 受控标签（地图全局搜索需要切换到指定标签）；不传时组件自管 */
  activeTab?: SidebarTabId
  onTabChange?: (tab: SidebarTabId) => void
  /** 手机抽屉打开时它是模态对话框；桌面停靠态只是普通区域。 */
  modal?: boolean
  /** 停靠宽度；不传或不传 onResize 时不渲染把手。 */
  width?: number
  minWidth?: number
  maxWidth?: number
  /** 拖动与键盘调宽途中，逐次把宽度交回去。 */
  onResize?: (width: number) => void
  /** 松手或键盘调整结束：这里才该写存储、让地图重新取景。 */
  onResizeCommit?: (width: number) => void
  /** 双击或回车回到默认宽度。 */
  onResizeReset?: () => void
  /** 桌面端主题开关：放在品牌行右端，不覆盖地图。 */
  themeToggle?: ReactNode
}) {
  const [internalTab, setInternalTab] = useState<SidebarTabId>('hospitals')
  const tab = activeTab ?? internalTab
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const navRef = useRef<HTMLElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const slideIndex = TABS.findIndex(item => item.id === tab)

  useGSAP(() => {
    const indicator = indicatorRef.current
    if (!indicator) return
    const target = { xPercent: slideIndex * 100, x: slideIndex * 4 }
    if (!indicator.style.transform || window.matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.set(indicator, target)
    else gsap.to(indicator, { ...target, duration: .26, ease: 'power3.out', overwrite: true })
  }, { scope: navRef, dependencies: [tab, !!detail] })

  const setTab = (next: SidebarTabId) => {
    setInternalTab(next)
    onTabChange?.(next)
  }

  useEffect(() => {
    const panel = new URLSearchParams(window.location.search).get('panel')
    if (panel && TABS.some(item => item.id === panel)) setTab(panel as SidebarTabId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const moveTab = (delta: number) => {
    const index = TABS.findIndex(item => item.id === tab)
    const next = TABS[(index + delta + TABS.length) % TABS.length]
    setTab(next.id)
    tabRefs.current[next.id]?.focus()
  }

  // 拉伸把手：拖动 1:1 跟手，键盘按 16px 一档；宽度本身由 MapApp 存。
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const widthRef = useRef(width ?? 380)
  widthRef.current = width ?? 380
  const clampWidth = (value: number) => Math.max(minWidth, Math.min(maxWidth, Math.round(value)))

  useEffect(() => () => { document.body.classList.remove('tc-sidebar-resizing') }, [])

  const commitWidth = (next: number) => {
    onResize?.(next)
    onResizeCommit?.(next)
  }

  const beginResize = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { startX: event.clientX, startWidth: widthRef.current }
    document.body.classList.add('tc-sidebar-resizing')
  }

  const moveResize = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    onResize?.(clampWidth(drag.startWidth + event.clientX - drag.startX))
  }

  const endResize = () => {
    if (!dragRef.current) return
    dragRef.current = null
    document.body.classList.remove('tc-sidebar-resizing')
    onResizeCommit?.(widthRef.current)
  }

  const onResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); commitWidth(clampWidth(widthRef.current - 16)) }
    else if (event.key === 'ArrowRight') { event.preventDefault(); commitWidth(clampWidth(widthRef.current + 16)) }
    else if (event.key === 'Home') { event.preventDefault(); commitWidth(clampWidth(minWidth)) }
    else if (event.key === 'End') { event.preventDefault(); commitWidth(clampWidth(maxWidth)) }
    else if (event.key === 'Enter') { event.preventDefault(); onResizeReset?.() }
  }

  return (
    <aside
      id={id}
      ref={panelRef}
      className={`tc-sidebar${open ? '' : ' tc-sidebar--closed'}`}
      role={modal ? 'dialog' : undefined}
      aria-modal={modal ? true : undefined}
      aria-label="地图侧边栏"
      inert={!open}
    >
      {/* 把手放在最前面：它绝对定位、视觉位置不变，但 Tab 顺序变成「顶栏 → 把手 → 页签 → 列表」，
          否则键盘用户要按三十多次才够得到。 */}
      {onResize && (
        <div
          className="tc-sidebar-resize"
          role="separator"
          aria-orientation="vertical"
          aria-label="调整侧栏宽度"
          aria-controls={id}
          aria-valuenow={Math.round(width ?? 380)}
          aria-valuemin={minWidth}
          aria-valuemax={maxWidth}
          tabIndex={0}
          onPointerDown={beginResize}
          onPointerMove={moveResize}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          onDoubleClick={() => onResizeReset?.()}
          onKeyDown={onResizeKeyDown}
        >
          <span aria-hidden="true" />
        </div>
      )}

      <div className="tc-sidebar-head">
        <div className="tc-row tc-row--between">
          <Brand height={44} className="tc-brand--map" />
          <div className="tc-sidebar-head-actions">
            {themeToggle}
            {onClose && (
              <button type="button" className="tc-sidebar-close" onClick={onClose} aria-label="收起侧边栏">
                <X size={20} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>

      <nav ref={navRef} className="tc-sidebar-tabs" role="tablist" aria-label="侧边栏功能">
        <span ref={indicatorRef} className="tc-sidebar-tab-indicator" aria-hidden="true" />
        {TABS.map((item) => (
          <button
            key={item.id}
            ref={(node) => { tabRefs.current[item.id] = node }}
            type="button"
            role="tab"
            id={`tc-sidebar-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls="tc-sidebar-panel"
            tabIndex={tab === item.id ? 0 : -1}
            className={`tc-sidebar-tab${tab === item.id ? ' tc-sidebar-tab--active' : ''}`}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') { event.preventDefault(); moveTab(1) }
              else if (event.key === 'ArrowLeft') { event.preventDefault(); moveTab(-1) }
              else if (event.key === 'Home') { event.preventDefault(); setTab(TABS[0].id); tabRefs.current[TABS[0].id]?.focus() }
              else if (event.key === 'End') { event.preventDefault(); setTab(TABS[TABS.length - 1].id); tabRefs.current[TABS[TABS.length - 1].id]?.focus() }
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="tc-sidebar-body" role="tabpanel" id="tc-sidebar-panel" aria-labelledby={`tc-sidebar-tab-${tab}`}>
        {/* 详情属于「医院」页签：切到投稿时让位给该页签内容，切回来还是原样。 */}
        {detail && tab === 'hospitals' ? (
          <PanelMotion motionKey={detailKey ?? 'detail'} slideIndex={detailDepth ?? 1}>{detail}</PanelMotion>
        ) : (
          <PanelMotion motionKey={tab} slideIndex={slideIndex}>{tabs[tab]}</PanelMotion>
        )}
      </div>
    </aside>
  )
}
