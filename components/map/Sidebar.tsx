'use client'

import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react'
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
      <div className="tc-sidebar-head">
        <div className="tc-row tc-row--between">
          <Brand height={44} className="tc-brand--map" />
          {onClose && (
            <button type="button" className="tc-sidebar-close" onClick={onClose} aria-label="收起侧边栏">
              <X size={20} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {detail ? (
        <div className="tc-sidebar-body"><PanelMotion motionKey={detailKey ?? 'detail'} slideIndex={detailDepth ?? 1}>{detail}</PanelMotion></div>
      ) : (
        <>
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
            <PanelMotion motionKey={tab} slideIndex={slideIndex}>{tabs[tab]}</PanelMotion>
          </div>
        </>
      )}
    </aside>
  )
}
