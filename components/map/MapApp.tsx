'use client'

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { hospitalSearchText, matchesSearch } from '@/lib/search'
import { knownText } from '@/lib/hospital-row'
import { aggregateDoctorLeads, splitDoctorNames } from '@/lib/doctor-leads'
import { displayDisorderLabels, disorderDisplayLabel, disorderDisplayRank, DISORDER_FILTER_GROUPS } from '@/lib/disorder-labels'
import { loadAmap } from '@/lib/amap-loader'
import { createAmapRuntime } from '@/lib/amap-runtime'
import { applyTheme, readTheme, type Theme } from '@/lib/theme'
import type { MapCamera } from '@/lib/map-camera'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { sidebarCameraFrame } from '@/lib/map-sidebar'
import type { Disorder, Doctor, Hospital, Province, Report } from '@/lib/schema'
import { HospitalExplorer, type DisorderGroup, type ResultFilter } from '@/components/HospitalExplorer'
import { Sidebar, type SidebarTabId } from './Sidebar'
import { MapSheet, type SheetHeights, type SheetLevel, type SheetStop } from './MapSheet'
import { ThemeToggle } from './ThemeToggle'
import { HospitalDetail } from './HospitalDetail'
import { DoctorDetail, type DoctorDisorderStat } from './DoctorDetail'
import { ProvinceDetail } from './ProvinceDetail'
import type { MapHospital, MapLead, MapProvinceStat, SearchGroup, SearchResult } from './types'
import { ClipboardList, Info, LocateFixed, Menu, Search, X } from 'lucide-react'

/** 友链：桌面按钮、手机图标、关于卡正文三处共用同一地址。 */
const SCALE_URL = 'https://psymetra.underlined.ink'

const HOSPITAL_ZOOM = 10
// 桌面侧栏宽度：默认 380，可拖 280–520，且不超过视口 42%（再宽地图就没地方了）。
const SIDEBAR_DEFAULT = 380
const SIDEBAR_MIN = 280
const SIDEBAR_MAX = 520
const SIDEBAR_STORAGE_KEY = 'tc.sidebar.width'
const sidebarWidthCap = (viewport: number) =>
  Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, Math.round((viewport || 1440) * .42)))
const clampSidebarWidth = (value: number) =>
  Math.max(SIDEBAR_MIN, Math.min(sidebarWidthCap(window.innerWidth), Math.round(value)))
// 省简称：卡片返回行、医院 meta 与搜索结果副标题都用它。模块级别放，
// 免得放在组件体后半段被 useMemo 的闭包提前调用（const 的 TDZ 只在生产包里炸）。
function provinceShortName(provinces: readonly Province[], adcode: string): string {
  return provinces.find((province) => province.adcode === adcode)?.short_name ?? ''
}
gsap.registerPlugin(useGSAP)
// 掉帧时不拉长动画时间：dock 入场 0.68 秒在节流或卡顿的机器上不该拖成二十秒。
gsap.ticker.lagSmoothing(0)

// 两张角标卡（关于 / 量表）共用同一套开关节奏：出现 320ms、关闭 130ms 都由
// `.tc-project-card` 的 CSS 决定，这里只负责状态、互斥与关闭后的焦点归还。
const CARD_CLOSE_MS = 130
type CornerCardId = 'about' | 'scale'

function useCornerCards(isDesktopRef: { current: boolean }) {
  const [openCard, setOpenCard] = useState<CornerCardId | null>(null)
  const [closingCard, setClosingCard] = useState<CornerCardId | null>(null)
  const openCardRef = useRef<CornerCardId | null>(null)
  const timers = useRef<Partial<Record<CornerCardId, number>>>({})
  const triggers = useRef<Partial<Record<CornerCardId, { desktop: HTMLElement | null; mobile: HTMLElement | null }>>>({})

  const registerTrigger = useCallback((id: CornerCardId, slot: 'desktop' | 'mobile') => (node: HTMLElement | null) => {
    const entry = triggers.current[id] ?? { desktop: null, mobile: null }
    entry[slot] = node
    triggers.current[id] = entry
  }, [])

  const open = useCallback((id: CornerCardId) => {
    if (openCardRef.current === id) return
    const previous = openCardRef.current
    if (previous) {
      // 互斥切换：上一张照常播 130ms 关闭动画，但不再抢焦点。
      window.clearTimeout(timers.current[previous])
      setClosingCard(previous)
      timers.current[previous] = window.setTimeout(() => {
        setClosingCard((current) => (current === previous ? null : current))
      }, CARD_CLOSE_MS)
    }
    openCardRef.current = id
    setOpenCard(id)
  }, [])

  const close = useCallback((id: CornerCardId, restoreFocus = true) => {
    if (openCardRef.current !== id) return
    openCardRef.current = null
    window.clearTimeout(timers.current[id])
    setClosingCard(id)
    timers.current[id] = window.setTimeout(() => {
      setOpenCard((current) => (current === id ? null : current))
      setClosingCard((current) => (current === id ? null : current))
      if (!restoreFocus) return
      const target = triggers.current[id]
      const trigger = isDesktopRef.current ? target?.desktop : target?.mobile
      trigger?.focus({ preventScroll: true })
    }, CARD_CLOSE_MS)
  }, [isDesktopRef])

  const toggle = useCallback((id: CornerCardId) => {
    if (openCardRef.current === id) close(id)
    else open(id)
  }, [close, open])

  useEffect(() => () => {
    for (const timer of Object.values(timers.current)) window.clearTimeout(timer)
  }, [])

  return { openCard, closingCard, open, close, toggle, registerTrigger }
}

type Props = {
  provinces: Province[]
  mapHospitals: MapHospital[]
  leadsByHospital: Record<string, MapLead[]>
  provinceStats: Record<string, MapProvinceStat>
  hospitals: Hospital[]
  reports: Report[]
  disorders: Disorder[]
  reportProvince: Record<string, string>
  reportCounts: Record<string, number>
  doctorProfiles: Doctor[]
}

export function MapApp(props: Props) {
  const shellRef = useRef<HTMLDivElement | null>(null)
  const dockRef = useRef({ progress: 0, inset: 0 })
  const dockDesktopRef = useRef(false)
  const dockTweenRef = useRef<gsap.core.Tween | null>(null)
  const navigationInsetRef = useRef<number | undefined>(undefined)
  const cancelDockCameraRef = useRef<(() => void) | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapCamera | null>(null)
  const runtimeRef = useRef<ReturnType<typeof createAmapRuntime> | null>(null)
  const cancelWheelRef = useRef<(() => void) | undefined>(undefined)
  const propsRef = useRef(props)
  propsRef.current = props
  const sidebarRef = useRef<HTMLElement | null>(null)
  const burgerRef = useRef<HTMLButtonElement | null>(null)
  const projectRef = useRef<HTMLDivElement | null>(null)
  const aboutButtonRef = useRef<HTMLButtonElement | null>(null)
  const aboutIconRef = useRef<HTMLButtonElement | null>(null)
  const scaleButtonRef = useRef<HTMLButtonElement | null>(null)
  const scaleIconRef = useRef<HTMLAnchorElement | null>(null)
  const desktopRef = useRef(false)

  // The server and phones start map-first; desktop docking follows after hydration.
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null)
  const [selectedProvinceAdcode, setSelectedProvinceAdcode] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [mapError, setMapError] = useState('')
  const [mapReady, setMapReady] = useState(false)
  const [limits, setLimits] = useState({ atMin: true, atMax: false })
  const [cluster, setCluster] = useState<{ members: MapHospital[]; key: string; x: number; y: number } | null>(null)
  const clusterRef = useRef<HTMLDivElement | null>(null)
  const focusDetailRef = useRef(false)
  const [activeResult, setActiveResult] = useState(-1)
  const [sidebarTab, setSidebarTab] = useState<SidebarTabId>('hospitals')
  // A disorder or source-topic search lists the hospitals that mention it, in the institution panel.
  const [resultFilter, setResultFilter] = useState<ResultFilter | null>(null)
  // 常驻筛选卡片当前选中的分组（cptsd / osdd-did / pd），再点一次同一行取消。
  const [selectedDisorders, setSelectedDisorders] = useState<string[]>([])
  // The doctor detail is a sibling of the institution detail, not a modal or a route.
  const [selectedDoctor, setSelectedDoctor] = useState<{ hospitalId: string; name: string } | null>(null)
  const doctorReturnFocusRef = useRef<string | null>(null)
  // 返回省份列表时要还原焦点的那个省，从省行进入时记下。
  const provinceReturnFocusRef = useRef<string | null>(null)
  // 从省详情的医院行进入医院后，返回时把焦点还给那一行。
  const hospitalReturnFocusRef = useRef<string | null>(null)
  // 底卡的档位：peek 随内容，medium/large 按视口定。高度由 MapSheet 量、MapApp 只算让位。
  const [sheetStop, setSheetStop] = useState<SheetStop>('peek')
  const [peekHeight, setPeekHeight] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  // 点钉进详情时，钉在画布里的 y：让位目标是这枚钉，不是层级锚点。
  const [pinFocusY, setPinFocusY] = useState<number | null>(null)
  // 桌面侧栏宽度：默认 380，可拖 280–520（且不超过视口 42%），写进 localStorage。
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
  // 相机当前是按多宽的侧栏取的景；改宽时用它算需要平移多少。
  const sidebarInsetRef = useRef(0)
  const [viewportWidth, setViewportWidth] = useState(0)
  // 主题：初始化脚本已把 data-theme 写在 <html> 上，这里只负责切换与写回存储。
  const [theme, setTheme] = useState<Theme>('light')
  const themeRef = useRef<Theme>('light')

  useEffect(() => {
    const initial = document.documentElement.dataset.theme === 'dark' ? 'dark' : readTheme()
    themeRef.current = initial
    setTheme(initial)
    applyTheme(initial, false)
  }, [])

  const toggleTheme = useCallback(() => {
    const next: Theme = themeRef.current === 'dark' ? 'light' : 'dark'
    themeRef.current = next
    setTheme(next)
    applyTheme(next)
    runtimeRef.current?.setTheme(next)
  }, [])

  useEffect(() => {
    const update = () => {
      setViewportHeight(window.innerHeight)
      setViewportWidth(window.innerWidth)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // 视口变窄时把宽度夹回上限，但不动存储：窗口再放宽仍回到用户拖过的值。
  useEffect(() => {
    setSidebarWidth((current) => clampSidebarWidth(current))
  }, [viewportWidth])

  // 下次打开还原上次拖的宽度；没有记录就用 380。
  useEffect(() => {
    const saved = Number(window.localStorage.getItem(SIDEBAR_STORAGE_KEY))
    if (Number.isFinite(saved) && saved > 0) setSidebarWidth(clampSidebarWidth(saved))
  }, [])

  // 宽度只写 CSS 变量：侧栏自身、顶栏、图例与地图 logo 都吃同一个值。
  useLayoutEffect(() => {
    shellRef.current?.style.setProperty('--tc-sidebar-w', `${sidebarWidth}px`)
  }, [sidebarWidth])

  // 拖动途中只走 CSS，不碰相机；松手才写存储、重量画布，并把取景中心重新对准可见带。
  const applySidebarWidth = useCallback((value: number, commit: boolean) => {
    const next = clampSidebarWidth(value)
    setSidebarWidth(next)
    if (desktopRef.current && sidebarOpen) {
      dockRef.current.inset = next
      shellRef.current?.style.setProperty('--tc-sidebar-offset', `${next}px`)
    }
    if (!commit) return
    const fromInset = sidebarInsetRef.current
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
    runtimeRef.current?.remeasure()
    const map = mapRef.current
    if (!map || Math.abs(fromInset - dockRef.current.inset) < 1) return
    // 全国层由 remeasure 重新取景；其他层级保持视野内容，只把中心从旧可见带挪到新的可见带。
    if (map.getZoom() > map.getMinZoom() + .001) {
      const width = map.getSize().x
      const anchor = map.unproject(map.project(map.getCenter(), map.getZoom()).add([fromInset / 2, 0]), map.getZoom())
      const frame = sidebarCameraFrame(map, anchor, width, fromInset, dockRef.current.inset, map.getZoom(), map.getMinZoom(), dockRef.current.inset)
      runtimeRef.current?.setMinZoom(frame.minZoom)
      map.move(frame.center, frame.zoom)
    }
    sidebarInsetRef.current = dockRef.current.inset
  }, [sidebarOpen])

  // 关于 / 量表两张卡共用一套状态机（互斥、关闭动画、焦点归还）。
  const { openCard, closingCard, close: closeCardById, toggle: toggleCard, registerTrigger } = useCornerCards(desktopRef)
  useEffect(() => {
    if (!openCard || closingCard === openCard) return
    const onPointerDown = (event: PointerEvent) => {
      if (projectRef.current?.contains(event.target as Node)) return
      closeCardById(openCard)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [openCard, closingCard, closeCardById])

  const handlePeekHeight = useCallback((height: number) => {
    setPeekHeight((current) => (current === height ? current : height))
  }, [])

  // 浮动控件（版权、回到全国）贴在卡沿上，拖动时也要跟手。
  const handleLiveHeight = useCallback((height: number) => {
    shellRef.current?.style.setProperty('--tc-sheet-live', `${Math.round(height)}px`)
  }, [])

  // 拖动期间暂停浮动控件的 height 过渡，否则它们会追着卡片跑。
  const handleSheetDragChange = useCallback((dragging: boolean) => {
    const shell = shellRef.current
    if (!shell) return
    if (dragging) shell.dataset.sheetDragging = 'true'
    else delete shell.dataset.sheetDragging
  }, [])

  const selectedRef = useRef<string | null>(null)
  selectedRef.current = selectedHospitalId
  const provinceRef = useRef<string | null>(null)
  provinceRef.current = selectedProvinceAdcode
  const activeIdsRef = useRef<Set<string> | null>(null)

  // 手机端的抽屉由底卡取代；桌面关闭侧栏只需要收起停靠状态。
  const closeDrawer = () => setSidebarOpen(false)

  useEffect(() => {
    runtimeRef.current?.syncSelection()
    // 从省详情返回省份列表：焦点回到刚才点开的那一行，不掉到侧栏 tab。
    const returnProvince = provinceReturnFocusRef.current
    if (!selectedHospitalId && !selectedProvinceAdcode && !selectedDoctor && returnProvince) {
      provinceReturnFocusRef.current = null
      sidebarRef.current?.querySelector<HTMLButtonElement>(`[data-province="${CSS.escape(returnProvince)}"]`)?.focus({ preventScroll: true })
      return
    }
    // 从医院详情返回省详情：焦点回到刚才点开的那家医院，不掉到「返回 全国」。
    const returnHospital = hospitalReturnFocusRef.current
    if (!selectedHospitalId && selectedProvinceAdcode && returnHospital) {
      hospitalReturnFocusRef.current = null
      sidebarRef.current?.querySelector<HTMLButtonElement>(`[data-hospital-id="${CSS.escape(returnHospital)}"]`)?.focus({ preventScroll: true })
      return
    }
    if (focusDetailRef.current) {
      focusDetailRef.current = false
      sidebarRef.current?.querySelector<HTMLButtonElement>('.tc-detail-back')?.focus({ preventScroll: true })
      return
    }
    // Returning from a doctor detail puts focus back on the name that opened it.
    const returnName = doctorReturnFocusRef.current
    if (!selectedDoctor && returnName) {
      doctorReturnFocusRef.current = null
      sidebarRef.current?.querySelector<HTMLButtonElement>(`[data-doctor-name="${CSS.escape(returnName)}"]`)?.focus({ preventScroll: true })
    }
  }, [selectedHospitalId, selectedProvinceAdcode, selectedDoctor, cluster])

  useEffect(() => {
    if (!cluster) return
    clusterRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
  }, [cluster])

  useGSAP(() => {
    const shell = shellRef.current
    if (!shell) return
    dockTweenRef.current?.kill()
    cancelDockCameraRef.current?.()
    const dock = dockRef.current
    if (dockDesktopRef.current !== isDesktop) dock.inset = 0
    dockDesktopRef.current = isDesktop
    const map = mapRef.current
    const fromInset = dock.inset
    const inset = isDesktop && sidebarOpen ? sidebarRef.current?.offsetWidth ?? 380 : 0
    const width = map?.getSize().x ?? shell.clientWidth
    const anchor = map?.unproject(map.project(map.getCenter(), map.getZoom()).add([fromInset / 2, 0]), map.getZoom())
    const startZoom = map?.getZoom() ?? 0
    const startMinZoom = map?.getMinZoom() ?? 0
    let moving = !!map && fromInset !== inset && navigationInsetRef.current !== inset && !runtimeRef.current?.isNavigating()
    navigationInsetRef.current = undefined
    const finishCamera = () => {
      if (moving && map) {
        moving = false
        map.endMove()
      }
      // 记住「相机是按多宽的侧栏取的景」，改宽时要靠它算平移量。
      sidebarInsetRef.current = dock.inset
    }
    if (moving) {
      cancelWheelRef.current?.()
      runtimeRef.current?.interrupt()
      map?.beginMove()
    }
    cancelDockCameraRef.current = finishCamera
    dockTweenRef.current = gsap.to(dock, {
      progress: sidebarOpen ? 1 : 0,
      inset,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.68,
      ease: 'power3.inOut',
      onUpdate: () => {
        shell.style.setProperty('--tc-sidebar-progress', String(dock.progress))
        shell.style.setProperty('--tc-sidebar-offset', `${dock.inset}px`)
        if (moving && map && anchor) {
          const frame = sidebarCameraFrame(map, anchor, width, fromInset, dock.inset, startZoom, startMinZoom, inset)
          runtimeRef.current?.setMinZoom(frame.minZoom)
          map.move(frame.center, frame.zoom)
        }
      },
      onComplete: finishCamera,
    })
  }, { scope: shellRef, dependencies: [sidebarOpen, isDesktop, mapReady, mapError] })

  // Desktop docks by default; phones keep the first view on the map.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1000px)')
    const apply = () => {
      desktopRef.current = mq.matches
      setIsDesktop(mq.matches)
      setSidebarOpen(mq.matches || new URLSearchParams(window.location.search).has('panel'))
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const selectHospital = (id: string, fromPin?: { y: number }) => {
    const hospital = propsRef.current.mapHospitals.find(item => item.id === id)
    if (!hospital) return
    setCluster(null)
    setSelectedDoctor(null)
    setSelectedHospitalId(id)
    setSelectedProvinceAdcode(null)
    setPinFocusY(fromPin?.y ?? null)
    navigationInsetRef.current = desktopRef.current ? 380 : 0
    if (desktopRef.current) setSidebarOpen(true)
    // 点钉进详情只让位、不移动镜头：钉就是用户点的那个点，再居中会把人带走。
    if (fromPin && !desktopRef.current) return
    runtimeRef.current?.moveTo(hospital, Math.max(mapRef.current?.getZoom() ?? 0, HOSPITAL_ZOOM), desktopRef.current ? 380 : 0)
  }

  // 再点一次已选中的钉＝取消选中：回该省列表，但不动镜头——人还在原地看着这枚钉。
  // 只给图钉用；侧栏行、定位按钮仍走 selectHospital，不会把详情关掉。
  const deselectHospital = (id: string) => {
    const hospital = propsRef.current.mapHospitals.find(item => item.id === id)
    if (!hospital) return
    hospitalReturnFocusRef.current = id
    setSelectedProvinceAdcode(hospital.adcode)
    setSelectedHospitalId(null)
    setSelectedDoctor(null)
    setPinFocusY(null)
  }

  const pickHospital = (id: string, fromPin?: { y: number }) => {
    // runtime 初始化闭包拿不到最新 state，只能读 ref。
    if (selectedRef.current === id) {
      deselectHospital(id)
      return
    }
    selectHospital(id, fromPin)
  }

  const selectProvince = (adcode: string) => {
    setCluster(null)
    setSelectedDoctor(null)
    setSelectedProvinceAdcode(adcode)
    setSelectedHospitalId(null)
    setPinFocusY(null)
    navigationInsetRef.current = desktopRef.current ? 380 : 0
    if (desktopRef.current) setSidebarOpen(true)
    runtimeRef.current?.province(adcode, desktopRef.current ? 380 : 0)
  }

  // Sidebar lists move focus into the detail they open; map clicks keep their own focus.
  const openProvince = (adcode: string) => {
    provinceReturnFocusRef.current = adcode
    hospitalReturnFocusRef.current = null
    focusDetailRef.current = true
    selectProvince(adcode)
  }

  const openHospital = (id: string) => {
    hospitalReturnFocusRef.current = id
    focusDetailRef.current = true
    selectHospital(id)
  }

  // A doctor detail keeps the institution selected behind it, so Back lands on the same institution.
  const openDoctor = (name: string, hospitalId: string) => {
    focusDetailRef.current = true
    setSelectedDoctor({ hospitalId, name })
  }

  const backToHospital = () => {
    doctorReturnFocusRef.current = selectedDoctor?.name ?? null
    setSelectedDoctor(null)
  }

  useEffect(() => {
    let disposed = false
    let runtime: ReturnType<typeof createAmapRuntime> | undefined
    async function setup() {
      try {
        const sdk = await loadAmap()
        if (disposed || !containerRef.current) return
        runtime = createAmapRuntime(sdk, containerRef.current, {
          hospitals: propsRef.current.mapHospitals, stats: propsRef.current.provinceStats,
          inset: () => dockRef.current.inset, selected: () => selectedRef.current,
          province: () => provinceRef.current,
          activeIds: () => activeIdsRef.current,
          selectHospital: pickHospital, selectProvince, interruptDock: () => cancelDockCameraRef.current?.(),
          limits: (atMin, atMax) => setLimits(previous => previous.atMin === atMin && previous.atMax === atMax ? previous : { atMin, atMax }),
          closeCluster: () => setCluster(null),
          cluster: (members, key, x, y) => {
            const size = runtime!.camera.getSize()
            setCluster({ members, key, x: Math.max(dockRef.current.inset + 16, Math.min(size.x - 296, x - 140)), y: Math.max(84, Math.min(size.y - 320, y - 40)) })
          },
          ready: () => { if (!disposed) setMapReady(true) },
          onMapClick: () => mapClickRef.current(),
          sheetLarge: () => sheetStopRef.current === 'large',
          theme: themeRef.current,
        })
        runtimeRef.current = runtime
        mapRef.current = runtime.camera
        cancelWheelRef.current = runtime.cancelWheel
        await runtime.loadDensity()
      } catch (error) { if (!disposed) setMapError(error instanceof Error ? error.message : String(error)) }
    }
    void setup()
    return () => {
      disposed = true
      cancelDockCameraRef.current?.()
      runtime?.destroy()
      runtimeRef.current = null
      mapRef.current = null
      cancelWheelRef.current = undefined
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const backToCountry = () => {
    setSelectedDoctor(null)
    setSelectedHospitalId(null)
    setSelectedProvinceAdcode(null)
    setPinFocusY(null)
    setCluster(null)
    runtimeRef.current?.country()
  }

  const zoomBy = (step: number) => {
    const map = mapRef.current
    if (!map) return
    const anchor = map.unproject(map.project(map.getCenter(), map.getZoom()).add([dockRef.current.inset / 2, 0]), map.getZoom())
    runtimeRef.current?.moveTo(anchor, Math.round(map.getZoom()) + step)
  }

  const closeCluster = () => {
    const trigger = Array.from(containerRef.current?.querySelectorAll<HTMLButtonElement>('[data-node-key]') ?? []).find(node => node.dataset.nodeKey === cluster?.key)
    setCluster(null)
    trigger?.focus({ preventScroll: true })
  }

  // 常驻筛选的三个分组：家数按不同机构计，不按线索条数；没有线索的分组不出现。
  const disorderIndex = useMemo(() => {
    return DISORDER_FILTER_GROUPS.map((group) => {
      const wanted = new Set<string>(group.ids)
      const reports = props.reports.filter((report) => report.disorders.some((id) => wanted.has(id)))
      const hospitalIds = [...new Set(reports
        .map((report) => report.hospital_id)
        .filter((id): id is string => Boolean(id)))]
      return { id: group.id, label: group.label, leads: reports.length, hospitalIds }
    }).filter((option) => option.leads > 0)
  }, [props.reports])

  const disorderGroups = useMemo<DisorderGroup[]>(
    () => disorderIndex.map((group) => ({ id: group.id, label: group.label, hospitalIds: group.hospitalIds, leads: group.leads })),
    [disorderIndex])

  // 选中的病症可以多个：医院取并集，线索按条去重（osdd/did 是同一批线索的两个标签）。
  const selectedSet = useMemo(() => new Set(selectedDisorders), [selectedDisorders])
  const activeHospitalIds = useMemo(() => {
    if (selectedDisorders.length === 0) return null
    const ids = new Set<string>()
    for (const group of disorderGroups) {
      if (!selectedSet.has(group.id)) continue
      for (const id of group.hospitalIds) ids.add(id)
    }
    return ids
  }, [disorderGroups, selectedDisorders.length, selectedSet])
  activeIdsRef.current = activeHospitalIds
  const activeDisorderIds = useMemo(() => {
    if (selectedDisorders.length === 0) return null
    const ids = new Set<string>()
    for (const group of DISORDER_FILTER_GROUPS) {
      if (!selectedSet.has(group.id)) continue
      for (const id of group.ids) ids.add(id)
    }
    return ids
  }, [selectedDisorders.length, selectedSet])
  // 详情层与列表层要用同一份命中集合：省列表的 leadCountFor 是按线索过滤的，
  // 详情里若仍取 leadsByHospital 的全量，条数和内容都会对不上。
  const matchingLeadIds = useMemo(() => {
    if (!activeDisorderIds) return null
    return new Set(props.reports
      .filter((report) => report.disorders.some((id) => activeDisorderIds.has(id)))
      .map((report) => report.id))
  }, [props.reports, activeDisorderIds])
  const activeLeads = activeDisorderIds
    ? props.reports.filter((report) => report.disorders.some((id) => activeDisorderIds.has(id))).length
    : null
  const leadCountFor = (hospitalId: string) => activeDisorderIds
    ? props.reports.filter((report) => report.hospital_id === hospitalId && report.disorders.some((id) => activeDisorderIds.has(id))).length
    : props.reportCounts[hospitalId] ?? 0

  // 任何进入筛选的入口都走这里：不先回全国列表，筛选结果会挂在旧详情下面（面包屑还在）。
  const enterFilter = (filter: ResultFilter | null, disorderIds: string[]) => {
    setSelectedDoctor(null)
    setSelectedHospitalId(null)
    setSelectedProvinceAdcode(null)
    setPinFocusY(null)
    setCluster(null)
    doctorReturnFocusRef.current = null
    setResultFilter(filter)
    setSelectedDisorders(disorderIds)
    setSidebarTab('hospitals')
    if (desktopRef.current) setSidebarOpen(true)
    runtimeRef.current?.country()
  }

  // 点一下选中、再点同一个取消；面板不收起，内容区只把省份列表收窄到命中集合。
  const toggleDisorder = (id: string) => {
    if (!disorderGroups.some((group) => group.id === id)) return
    const next = selectedSet.has(id) ? selectedDisorders.filter((item) => item !== id) : [...selectedDisorders, id]
    setSelectedDoctor(null)
    setSelectedHospitalId(null)
    // 手机底卡的筛选作用在当前层级：在省里筛就留在省里，等结果筛空再给空态。
    if (desktopRef.current) {
      setSelectedProvinceAdcode(null)
      setPinFocusY(null)
      setCluster(null)
    }
    doctorReturnFocusRef.current = null
    setResultFilter(null)
    setSelectedDisorders(next)
    setSidebarTab('hospitals')
    if (desktopRef.current) setSidebarOpen(true)
  }

  // Search keeps the same region, institution, doctor and disorder entry points.
  const searchResults = useMemo<SearchResult[]>(() => {
    const q = query.trim()
    if (!q) return []
    const results: SearchResult[] = []
    for (const province of propsRef.current.provinces) {
      if (matchesSearch(`${province.name} ${province.short_name}`, q)) {
        results.push({
          key: `province-${province.adcode}`,
          group: '省份',
          label: province.name,
          sub: '省份概要',
          run: () => selectProvince(province.adcode),
        })
      }
      if (results.filter((item) => item.group === '省份').length >= 3) break
    }
    // 筛选态下搜索层也要用命中集合：结果行的「线索 N 条」必须等于点进去详情的 N 条。
    const reports = propsRef.current.reports
    const hitLeadIds = activeDisorderIds
      ? new Set(reports
        .filter((report) => report.disorders.some((id) => activeDisorderIds.has(id)))
        .map((report) => report.id))
      : null
    const leadCountOf = (hospitalId: string) => hitLeadIds
      ? reports.filter((report) => report.hospital_id === hospitalId && hitLeadIds.has(report.id)).length
      : propsRef.current.reportCounts[hospitalId] ?? 0

    const hospitals: SearchResult[] = []
    for (const hospital of propsRef.current.hospitals) {
      const haystack = hospitalSearchText(hospital, propsRef.current.reports)
      if (matchesSearch(haystack, q)) {
        const count = leadCountOf(hospital.id)
        // 命中 0 条的机构在筛选态下不出现在结果里，与省份列表同一规则。
        if (!hitLeadIds || count > 0) {
          hospitals.push({
            key: `hospital-${hospital.id}`,
            group: '医院',
            label: hospital.name,
            sub: `${provinceShortName(propsRef.current.provinces, hospital.adcode)} · 线索 ${count} 条`,
            run: () => selectHospital(hospital.id),
          })
        }
      }
      if (hospitals.length >= 4) break
    }
    results.push(...hospitals)

    // Share doctor aggregation with both browsing surfaces.
    const doctors: SearchResult[] = []
    const doctorKeys = new Set<string>()
    for (const group of aggregateDoctorLeads(propsRef.current.hospitals, propsRef.current.reports, q)) {
      for (const entry of group.entries) {
        const hitReportIds = hitLeadIds
          ? entry.reportIds.filter((id) => hitLeadIds.has(id))
          : entry.reportIds
        if (!hitReportIds.length) continue
        const key = `doctor-${entry.hospitalId ?? entry.hospitalName}-${entry.name}`
        if (doctorKeys.has(key)) continue
        doctorKeys.add(key)
        doctors.push({
          key,
          group: '医生',
          label: entry.name,
          sub: `${entry.hospitalName} · ${group.label} · 线索 ${hitReportIds.length} 条`,
          run: () => {
            if (entry.hospitalId) {
              focusDetailRef.current = true
              selectHospital(entry.hospitalId)
              setSelectedDoctor({ hospitalId: entry.hospitalId, name: entry.name })
              return
            }
            // A lead without a linked record resolves to the institutions that carry its name.
            const hospitalIds = propsRef.current.hospitals
              .filter((hospital) => hospital.name === entry.hospitalName)
              .map((hospital) => hospital.id)
            enterFilter({ label: entry.name, hint: `线索 ${hitReportIds.length} 条`, hospitalIds }, [])
          },
        })
        if (doctors.length >= 2) break
      }
      if (doctors.length >= 2) break
    }
    results.push(...doctors)

    // 病症按显示标签分组：源文档只有 cptsd / osdd-did / 人格障碍 三段，osdd 与 did 合成一行。
    const disorderBuckets = new Map<string, { label: string; ids: string[]; haystack: string[] }>()
    for (const disorder of propsRef.current.disorders) {
      const label = disorderDisplayLabel(disorder.id)
      const bucket = disorderBuckets.get(label) ?? { label, ids: [], haystack: [] }
      bucket.ids.push(disorder.id)
      bucket.haystack.push(disorder.name_zh, disorder.name_en, disorder.id)
      disorderBuckets.set(label, bucket)
    }
    const disorders: SearchResult[] = []
    for (const bucket of disorderBuckets.values()) {
      if (!matchesSearch(bucket.haystack.join(' '), q)) continue
      const hits = propsRef.current.reports.filter((report) =>
        report.disorders.some((id) => bucket.ids.includes(id)))
      disorders.push({
        key: `disorder-${bucket.label}`,
        group: '病症',
        label: bucket.label,
        sub: `${hits.length} 条线索`,
        run: () => {
          // 搜索命中的病症点亮面板里对应那一行，内容区回到省份列表。
          const groupId = DISORDER_FILTER_GROUPS.find((item) => item.label === bucket.label)?.id
          if (groupId) enterFilter(null, [groupId])
        },
      })
    }
    const sourceTopics = new Set(propsRef.current.reports.flatMap((report) => report.source_topics ?? []))
    // 话题与病症共用一个组：同名时只留病症那行，否则「人格障碍」会出现两次。
    const groupedLabels = new Set(disorders.map((item) => item.label))
    for (const topic of sourceTopics) {
      if (!matchesSearch(topic, q)) continue
      if (groupedLabels.has(topic)) continue
      groupedLabels.add(topic)
      const count = propsRef.current.reports.filter((report) => report.source_topics?.includes(topic)).length
      disorders.push({
        key: `topic-${topic}`,
        group: '病症',
        label: topic,
        sub: `${count} 条线索`,
        run: () => {
          const hospitalIds = [...new Set(propsRef.current.reports
            .filter((report) => report.source_topics?.includes(topic) && report.hospital_id)
            .map((report) => report.hospital_id as string))]
          enterFilter({ label: topic, hint: `${count} 条线索`, hospitalIds }, [])
        },
      })
    }
    // Every group keeps a slot so a disorder or source-topic hit is always reachable.
    const provinceHits = results.filter((item) => item.group === '省份').slice(0, 2)
    return [...provinceHits, ...hospitals.slice(0, 4), ...doctors.slice(0, 2), ...disorders.slice(0, 2)]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeDisorderIds])

  const grouped = useMemo(() => {
    const order: SearchGroup[] = ['省份', '医院', '医生', '病症']
    return order
      .map((group) => ({ group, items: searchResults.filter((item) => item.group === group) }))
      .filter((entry) => entry.items.length > 0)
  }, [searchResults])

  const runResult = (result: SearchResult) => {
    result.run()
    setQuery('')
    setActiveResult(-1)
  }

  const selectedHospital = props.mapHospitals.find((item) => item.id === selectedHospitalId) ?? null
  const selectedProvince = props.provinces.find((item) => item.adcode === selectedProvinceAdcode) ?? null
  const selectedLeadsAll = selectedHospital ? (props.leadsByHospital[selectedHospital.id] ?? []) : []
  const selectedLeads = matchingLeadIds
    ? selectedLeadsAll.filter((lead) => matchingLeadIds.has(lead.id))
    : selectedLeadsAll

  const doctorHospital = selectedDoctor
    ? props.mapHospitals.find((item) => item.id === selectedDoctor.hospitalId) ?? null
    : null

  const doctorLeadsAll = useMemo(() => {
    if (!selectedDoctor) return []
    return (props.leadsByHospital[selectedDoctor.hospitalId] ?? []).filter((lead) =>
      splitDoctorNames(lead.doctorName).includes(selectedDoctor.name))
  }, [selectedDoctor, props.leadsByHospital])
  const doctorLeads = matchingLeadIds
    ? doctorLeadsAll.filter((lead) => matchingLeadIds.has(lead.id))
    : doctorLeadsAll

  const doctorDisorders = useMemo<DoctorDisorderStat[]>(() => {
    if (!selectedDoctor) return []
    const reportIds = new Set(doctorLeadsAll.map((lead) => lead.id))
    // 按显示标签计数：osdd 与 did 合成一条，同一条线索不会在两个标签下各记一次。
    const counts = new Map<string, number>()
    for (const report of props.reports) {
      if (!reportIds.has(report.id)) continue
      for (const label of displayDisorderLabels(report.disorders)) counts.set(label, (counts.get(label) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => disorderDisplayRank(a[0]) - disorderDisplayRank(b[0]))
      .map(([label, count]) => ({ id: label, label, count }))
  }, [selectedDoctor, doctorLeadsAll, props.reports])

  // The record section only exists when doctors.json actually holds this person.
  const doctorProfile = selectedDoctor
    ? props.doctorProfiles.find((item) => item.hospital_id === selectedDoctor.hospitalId && item.name === selectedDoctor.name) ?? null
    : null

  // Back navigation walks one level up: institution → province → the browsing tabs.
  const focusActiveTab = () => requestAnimationFrame(() => sidebarRef.current?.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')?.focus({ preventScroll: true }))

  const backToProvince = (adcode: string) => {
    focusDetailRef.current = true
    selectProvince(adcode)
  }

  // 返回全国时，若刚从某省进来就把焦点放回那一行；焦点落地交给下面的 effect，不抢到 tab 上。
  const backToCountryFromDetail = () => {
    backToCountry()
  }

  // 省详情与底卡计数共用同一份筛选后的医院列表。
  const provinceHospitals = selectedProvince
    ? props.mapHospitals
      .filter((item) => item.adcode === selectedProvince.adcode && (!activeHospitalIds || activeHospitalIds.has(item.id)))
      .map((item) => (activeHospitalIds ? { ...item, leads: leadCountFor(item.id) } : item))
    : []

  // 该省本来有没有收录：决定「筛选筛空了」和「本来就没有」两句文案用哪句。
  const provinceHasRecords = selectedProvince
    ? (props.provinceStats[selectedProvince.adcode]?.reports ?? 0) > 0
      || props.mapHospitals.some((item) => item.adcode === selectedProvince.adcode)
    : false
  const clearDisorderFilter = () => setSelectedDisorders([])

  // 手机底卡与桌面侧栏共用详情组件；卡头的返回行只写上一层名字。
  const renderDetail = (mobile: boolean) => selectedDoctor && doctorHospital ? (
    <DoctorDetail
      name={selectedDoctor.name}
      hospital={doctorHospital}
      leads={doctorLeads}
      disorders={doctorDisorders}
      profile={doctorProfile}
      onBackToHospital={backToHospital}
    />
  ) : selectedHospital ? (
    <HospitalDetail
      hospital={selectedHospital}
      leads={selectedLeads}
      provinceName={provinceShortName(props.provinces, selectedHospital.adcode)}
      doctorProfiles={props.doctorProfiles}
      onBackToProvince={() => backToProvince(selectedHospital.adcode)}
      onLocate={() => selectHospital(selectedHospital.id)}
      onSelectDoctor={(name) => openDoctor(name, selectedHospital.id)}
    />
  ) : selectedProvince ? (
    <ProvinceDetail
      provinceName={selectedProvince.short_name}
      provinceFullName={selectedProvince.name}
      stat={props.provinceStats[selectedProvince.adcode]}
      hospitals={provinceHospitals}
      onBackToCountry={backToCountryFromDetail}
      onZoomToProvince={() => selectProvince(selectedProvince.adcode)}
      onSelectHospital={openHospital}
      disorderGroups={disorderGroups}
      selectedDisorders={selectedDisorders}
      onToggleDisorder={toggleDisorder}
      filteredEmpty={mobile && selectedDisorders.length > 0 && provinceHasRecords && provinceHospitals.length === 0}
      onClearFilter={clearDisorderFilter}
      variant={mobile ? 'sheet' : 'sidebar'}
    />
  ) : null

  const detailNode = renderDetail(false)
  const mobileDetailNode = renderDetail(true)

  // 详情态身份 + 层级：侧栏用它决定进场动画的 key 与方向（省 1、机构 2、医生 3）。
  const detailState = selectedDoctor
    ? { key: `doctor:${selectedDoctor.hospitalId}:${selectedDoctor.name}`, depth: 3 }
    : selectedHospital
      ? { key: `hospital:${selectedHospital.id}`, depth: 2 }
      : selectedProvince
        ? { key: `province:${selectedProvince.adcode}`, depth: 1 }
        : { key: 'none', depth: 1 }

  const tabs: Record<SidebarTabId, ReactNode> = {
    hospitals: (
      <Suspense fallback={<p className="tc-small tc-muted">加载中……</p>}>
        <HospitalExplorer
          hospitals={props.hospitals}
          provinces={props.provinces}
          reportCounts={props.reportCounts}
          variant="compact"
          onSelectHospital={openHospital}
          onSelectProvince={openProvince}
          disorderGroups={disorderGroups}
          selectedDisorders={selectedDisorders}
          onToggleDisorder={toggleDisorder}
          activeLeads={activeLeads}
          totalLeads={props.reports.length}
          resultFilter={resultFilter}
        />
      </Suspense>
    ),
    submit: (
      <div className="tc-stack">
        <p className="tc-submit-placeholder">这里还没定好（；´д｀）ゞ</p>
      </div>
    ),
  }

  const mobileExplorer = (
    <Suspense fallback={<p className="tc-small tc-muted">加载中……</p>}>
      <HospitalExplorer
        hospitals={props.hospitals}
        provinces={props.provinces}
        reportCounts={props.reportCounts}
        variant="compact"
        onSelectHospital={openHospital}
        onSelectProvince={openProvince}
        disorderGroups={disorderGroups}
        selectedDisorders={selectedDisorders}
        onToggleDisorder={toggleDisorder}
        activeLeads={activeLeads}
        totalLeads={props.reports.length}
        resultFilter={resultFilter}
        hideHeading
        hideChips
        onClearFilter={clearDisorderFilter}
        sheetEmpty
      />
    </Suspense>
  )

  // 底卡的标题跟着当前层级走；搜索时让位给查询词，计数只报能在结果里看到的省份与医院。
  const searching = query.trim().length > 0
  const sheetLevel: SheetLevel = searching
    ? 'search'
    : selectedDoctor
      ? 'doctor'
      : selectedHospital
        ? 'hospital'
        : selectedProvince
          ? 'province'
          : 'country'
  // 已经在全国层、没放大、也没有聚合钉摊开时，「回到全国」没有可回的地方。
  const canReset = sheetLevel !== 'country' || cluster !== null || !limits.atMin
  // 卡头标题只跟层级走，搜索态也不例外（参考页 titleOf(t) 与查询词无关）。
  // 搜索时 v3.css 把 sheet-head 整块隐藏，这一行只影响读屏读到的区块名。
  const sheetTitle = selectedDoctor?.name ?? selectedHospital?.name ?? selectedProvince?.short_name ?? '全国'
  // 卡头计数：全国/省报医院与线索，医院层报城市·地址·条数，医生层不报。
  const hospitalSheetMeta = selectedHospital
    ? [
      knownText(selectedHospital.city) || provinceShortName(props.provinces, selectedHospital.adcode),
      knownText(selectedHospital.address),
      `${selectedLeads.length} 条线索`,
    ].filter(Boolean).join(' · ')
    : ''
  const sheetMeta = searching ? null : sheetLevel === 'country' ? (
    <><b>{activeHospitalIds ? activeHospitalIds.size : props.hospitals.length}</b> 家医院 · <b>{activeLeads ?? props.reports.length}</b> 条线索</>
  ) : sheetLevel === 'province' ? (
    <><b>{provinceHospitals.length}</b> 家医院 · <b>{provinceHospitals.reduce((sum, item) => sum + item.leads, 0)}</b> 条线索</>
  ) : sheetLevel === 'hospital' ? (
    hospitalSheetMeta
  ) : null

  const sheetViewport = viewportHeight || 844
  const sheetHeights = useMemo<SheetHeights>(() => ({
    peek: peekHeight || 140,
    medium: Math.min(424, Math.max(240, sheetViewport - 160)),
    large: Math.min(736, Math.max(320, sheetViewport - 108)),
  }), [peekHeight, sheetViewport])

  // 可见带是顶部浮层下沿到卡沿；带中心对准画面中心，卡抬起来地图跟着上移。
  // 搜索层不改地图画面，锚点按实际所在层级取；从图钉进来的详情改用这枚钉的屏幕位置。
  const mapViewLevel: 'country' | 'province' = selectedProvinceAdcode ? 'province' : 'country'
  const sheetShift = useMemo(() => {
    const bandTop = 98
    const bandBottom = Math.max(bandTop + 240, sheetViewport - sheetHeights[sheetStop])
    const band = (bandTop + bandBottom) / 2
    const anchor = pinFocusY ?? (mapViewLevel === 'country' ? 412 : 410)
    return Math.round(Math.max(-320, Math.min(220, band - anchor)))
  }, [mapViewLevel, pinFocusY, sheetHeights, sheetStop, sheetViewport])

  useLayoutEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    if (isDesktop) {
      shell.style.removeProperty('--tc-map-shift')
      shell.style.removeProperty('--tc-sheet-live')
      return
    }
    shell.style.setProperty('--tc-map-shift', `${sheetShift}px`)
    // 首帧底卡的 layout effect 早于 shellRef 挂上，这里补一次实时高度；
    // 拖动中的逐帧高度仍由 MapSheet 直接写。
    shell.style.setProperty('--tc-sheet-live', `${sheetHeights[sheetStop]}px`)
  }, [isDesktop, sheetHeights, sheetShift, sheetStop])

  // 档位同步给样式：large 时关于图标与「回到全国」藏起来，不占位也不可点。
  useLayoutEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    if (isDesktop) delete shell.dataset.sheetStop
    else shell.dataset.sheetStop = sheetStop
  }, [isDesktop, sheetStop])

  // 选中钉时把其余钉压到 42%，让「卡里的详情」和「地图上的这枚钉」对得上。
  useEffect(() => {
    containerRef.current?.classList.toggle('tc-mapapp-canvas--pinned', pinFocusY !== null)
  }, [pinFocusY])

  // 筛选联动地图：命中的省提亮，其余被半透明压层盖住（覆盖层由 runtime 自绘）。
  // 手机与桌面共用同一套 paintProvince，桌面只是取景不同，别另写一套。
  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime || !mapReady) return
    if (!activeHospitalIds) {
      runtime.setFilterHits(null)
      return
    }
    const adcodes = new Set<string>()
    for (const hospital of props.mapHospitals) {
      if (activeHospitalIds.has(hospital.id)) adcodes.add(hospital.adcode)
    }
    runtime.setFilterHits([...adcodes])
  }, [activeHospitalIds, mapReady, props.mapHospitals])

  // 详情层也能落到 peek（V3-11）：换档不按层级夹。
  const detailSheet = sheetLevel === 'hospital' || sheetLevel === 'doctor'
  const applySheetStop = useCallback((next: SheetStop) => setSheetStop(next), [])

  // 736 时地图只剩 108px，点它得有点回应，否则「底卡非模态、地图始终可用」不成立：
  // 只从 large 收一档到 medium，medium / peek 不动，详情层也只收档不退层。
  const sheetStopRef = useRef<SheetStop>('peek')
  sheetStopRef.current = sheetStop
  const mapClickRef = useRef(() => {})
  mapClickRef.current = () => {
    if (desktopRef.current || sheetStopRef.current !== 'large') return
    applySheetStop('medium')
  }

  // 换层级时换档：详情之间互跳保持当前档位（736 进医生仍是 736、返回医院也还是 736）；
  // 但 peek 下正文看不见，任何路径到详情都至少抬到 medium。
  // 进省、回全国、搜索进出照旧走 medium。
  const previousSheetLevelRef = useRef<SheetLevel>('country')
  useEffect(() => {
    const previous = previousSheetLevelRef.current
    previousSheetLevelRef.current = sheetLevel
    if (previous === sheetLevel) return
    const isDetailLevel = (level: SheetLevel) => level === 'hospital' || level === 'doctor'
    if (isDetailLevel(previous) && isDetailLevel(sheetLevel) && sheetStopRef.current !== 'peek') return
    if (sheetLevel === 'province') applySheetStop('medium')
    else if (sheetLevel === 'hospital' || sheetLevel === 'doctor') applySheetStop('medium')
    else if (sheetLevel === 'country' && previous !== 'search') applySheetStop('medium')
  }, [applySheetStop, sheetLevel])

  // 换层级时把焦点交给新层级的标题：返回一层后焦点掉到 body，键盘用户就丢了位置。
  // 进搜索层不抢（输入框要留在手上）；清词后输入框还握着焦点也不抢。
  // 放到下一帧再聚焦：底卡换档的过渡要和焦点无关地先起步，别让聚焦的样式计算挤在起始帧前面。
  const previousFocusLevelRef = useRef<SheetLevel | null>(null)
  useLayoutEffect(() => {
    const previous = previousFocusLevelRef.current
    previousFocusLevelRef.current = sheetLevel
    if (previous === null || previous === sheetLevel || isDesktop) return
    if (sheetLevel === 'search') return
    const active = document.activeElement
    if (active instanceof HTMLElement && active.closest('.sheet') && active.matches('input, textarea')) return
    // 手机底卡的可见标题在卡头；正文里的 .tc-level-head 在 sheet 内是 display:none，点了也不会真的获得焦点。
    const frame = requestAnimationFrame(() => {
      shellRef.current?.querySelector<HTMLElement>('.sheet .head-title')?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [isDesktop, sheetLevel])

  const sheetBackLabel = selectedDoctor
    ? props.mapHospitals.find((item) => item.id === selectedDoctor.hospitalId)?.name
    : selectedHospital
      ? provinceShortName(props.provinces, selectedHospital.adcode)
      : selectedProvince
        ? '全国'
        : undefined
  const sheetBack = selectedDoctor
    ? backToHospital
    : selectedHospital
      ? () => backToProvince(selectedHospital.adcode)
      : selectedProvince
        ? backToCountry
        : undefined

  // 搜索失焦：有关键词或筛选条件时保留当前档位；回到聚焦前的档位由 MapSheet 自己还原。
  // 点结果行、拖把手这类焦点暂时跑开的场景由 MapSheet 用 relatedTarget 和指针状态挡掉。
  const dismissSearchSheet = () => {
    if (query.trim()) return false
    if (resultFilter || selectedDisorders.length > 0) return false
    if (sheetLevel !== 'country') return false
    return true
  }

  // Escape 的优先级：关于 → 搜索 → 详情退一层（大卡先落到中档）→ 列表收一档。
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      const target = event.target
      if (target instanceof HTMLElement && (target.closest('input, textarea, select') || target.isContentEditable)) return
      // 两张角标卡在同一层：先关当前开着的那张，再轮到搜索、详情、列表。
      if (openCard) {
        closeCardById(openCard)
        return
      }
      if (isDesktop) return
      if (query) {
        setQuery('')
        setActiveResult(-1)
        return
      }
      if (detailSheet) {
        if (sheetStop === 'large') applySheetStop('medium')
        else if (selectedDoctor) backToHospital()
        else if (selectedHospital) backToProvince(selectedHospital.adcode)
        return
      }
      // 列表层一次收一档；全国 peek 不动，省层 peek 退回全国，别停在没出口的地方。
      if (sheetStop === 'large') applySheetStop('medium')
      else if (sheetStop === 'medium') applySheetStop('peek')
      else if (sheetLevel === 'province') backToCountry()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openCard, applySheetStop, backToCountry, backToHospital, backToProvince, closeCardById, detailSheet, isDesktop, query, selectedDoctor, selectedHospital, sheetLevel, sheetStop])

  return (
    <div ref={shellRef} className="tc-mapapp">
      <div ref={containerRef} className="tc-mapapp-canvas" role="application" aria-label="全国就诊资源与线索地图" />
      {!mapReady && !mapError && <div className="tc-map-loading" role="status">正在加载全国地图…</div>}
      {mapError && (
        <div className="tc-mapapp-error" role="alert">
          地图加载失败：{mapError}（其余数据仍可在侧边栏浏览）
        </div>
      )}

      {cluster && <div ref={clusterRef} className="tc-map-cluster-list" role="dialog" aria-label="选择医院" style={{ left: cluster.x, top: cluster.y }} onKeyDown={event => {
        if (event.key !== 'Escape') return
        event.stopPropagation()
        closeCluster()
      }}>
        <div className="tc-row tc-row--between"><strong>选择医院</strong><button type="button" className="tc-linklike" onClick={closeCluster}>关闭</button></div>
        {cluster.members.map(hospital => <button key={hospital.id} type="button" className="tc-mapapp-result" onClick={() => { focusDetailRef.current = true; selectHospital(hospital.id) }}>{hospital.name}</button>)}
      </div>}

      <div className="tc-mapapp-topbar">
        <button
          ref={burgerRef}
          type="button"
          className="tc-mapapp-burger"
          aria-label={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
          aria-expanded={sidebarOpen}
          aria-controls="tc-map-sidebar"
          onClick={() => setSidebarOpen((value) => !value)}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <div className="tc-mapapp-search">
          <Search size={19} className="tc-search-icon" aria-hidden="true" />
          <input
            type="search"
            value={query}
            placeholder="搜索省份 / 医院 / 病症"
            aria-label="搜索省份、医院、医生或病症"
            role="combobox"
            aria-expanded={searchResults.length > 0}
            aria-controls="tc-map-search-results"
            aria-autocomplete="list"
            aria-activedescendant={activeResult >= 0 ? `tc-search-option-${activeResult}` : undefined}
            onChange={(event) => { setQuery(event.target.value); setActiveResult(-1) }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActiveResult((index) => Math.min(searchResults.length - 1, index + 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActiveResult((index) => Math.max(-1, index - 1))
              } else if (event.key === 'Enter') {
                const target = searchResults[activeResult] ?? searchResults[0]
                if (target) runResult(target)
              } else if (event.key === 'Escape') {
                if (searchResults.length > 0) {
                  event.stopPropagation()
                  setQuery('')
                  setActiveResult(-1)
                }
              }
            }}
          />
          {query && <button type="button" className="tc-search-clear" aria-label="清除搜索" onClick={() => { setQuery(''); setActiveResult(-1) }}><X size={16} aria-hidden="true" /></button>}
          {query.trim() && searchResults.length === 0 && (
            <div className="tc-mapapp-no-results" role="status">
              {activeDisorderIds
                ? '当前筛选下没有匹配结果，试试取消病症筛选。'
                : '没有找到匹配结果，试试省份、医院或医生名称。'}
            </div>
          )}
          {searchResults.length > 0 && (
            <ul className="tc-mapapp-results" id="tc-map-search-results" role="listbox" aria-label="搜索结果">
              {grouped.map((entry) => (
                <li key={entry.group} role="group" aria-label={entry.group}>
                  <p className="tc-mapapp-results-group">{entry.group}</p>
                  <ul className="tc-plainlist">
                    {entry.items.map((result) => {
                      const index = searchResults.indexOf(result)
                      return (
                        <li key={result.key} role="option" id={`tc-search-option-${index}`} aria-selected={index === activeResult}>
                          <button
                            type="button"
                            className={index === activeResult ? 'tc-mapapp-result tc-mapapp-result--active' : 'tc-mapapp-result'}
                            onMouseEnter={() => setActiveResult(index)}
                            onClick={() => runResult(result)}
                          >
                            <strong>{result.label}</strong>
                            <small>{result.sub}</small>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="tc-project-corner" ref={projectRef}>
          <button
            ref={(node) => { scaleButtonRef.current = node; registerTrigger('scale', 'desktop')(node) }}
            type="button"
            className="tc-mapapp-ctl tc-mapapp-scale-link"
            aria-expanded={openCard === 'scale'}
            aria-controls="tc-scale-card"
            onClick={() => toggleCard('scale')}
          >量表测试</button>
          <button
            ref={(node) => { aboutButtonRef.current = node; registerTrigger('about', 'desktop')(node) }}
            type="button"
            className="tc-mapapp-ctl tc-mapapp-about"
            aria-expanded={openCard === 'about'}
            aria-controls="tc-project-card"
            onClick={() => toggleCard('about')}
          >关于项目</button>
          {/* 手机顶栏只留图标入口：同样先弹卡，卡里的「了解我们」才去 /about。 */}
          <button
            ref={(node) => { aboutIconRef.current = node; registerTrigger('about', 'mobile')(node) }}
            type="button"
            className="tc-about-icon"
            aria-label="关于项目"
            aria-expanded={openCard === 'about'}
            aria-controls="tc-project-card"
            onClick={() => toggleCard('about')}
          >
            <Info size={20} aria-hidden="true" />
          </button>
          {/* 手机：关于 → 量表 → 夜间，同一列 44×44；桌面主题按钮在侧栏顶部。 */}
          <a
            ref={(node) => { scaleIconRef.current = node; registerTrigger('scale', 'mobile')(node) }}
            className="tc-scale-icon"
            href={SCALE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="量表测试"
            aria-expanded={openCard === 'scale'}
            aria-controls="tc-scale-card"
            onClick={(event) => { event.preventDefault(); toggleCard('scale') }}
          >
            <ClipboardList size={20} aria-hidden="true" />
          </a>
          {!isDesktop && <ThemeToggle theme={theme} onToggle={toggleTheme} />}
          {(openCard === 'about' || closingCard === 'about') && (
            <section id="tc-project-card" className={closingCard === 'about' ? 'tc-project-card is-closing' : 'tc-project-card'} aria-label="关于项目">
              <div className="tc-row tc-row--between"><strong>TraumaCompass</strong></div>
              <p>本项目旨在为CPTSD/BPD人群提供全国就诊地图，帮助更多人治疗心理创伤与障碍</p>
              <Link className="tc-card-action" href="/about/">了解我们</Link>
            </section>
          )}
          {(openCard === 'scale' || closingCard === 'scale') && (
            <section id="tc-scale-card" className={closingCard === 'scale' ? 'tc-project-card is-closing' : 'tc-project-card'} aria-label="量表测试">
              <p>
                免费量表测试看这里！→
                <a href={SCALE_URL} target="_blank" rel="noopener noreferrer">PSYMETRA</a>
                ←
              </p>
            </section>
          )}
        </div>
      </div>

      {isDesktop && (
        <Sidebar
          id="tc-map-sidebar"
          panelRef={sidebarRef}
          open={sidebarOpen}
          tabs={tabs}
          detail={detailNode}
          detailKey={detailState.key}
          detailDepth={detailState.depth}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          modal={false}
          onClose={closeDrawer}
          width={sidebarWidth}
          minWidth={SIDEBAR_MIN}
          maxWidth={sidebarWidthCap(viewportWidth)}
          onResize={(next) => applySidebarWidth(next, false)}
          onResizeCommit={(next) => applySidebarWidth(next, true)}
          onResizeReset={() => applySidebarWidth(SIDEBAR_DEFAULT, true)}
          themeToggle={<ThemeToggle theme={theme} onToggle={toggleTheme} />}
        />
      )}

      {!isDesktop && (
        <MapSheet
          level={sheetLevel}
          title={sheetTitle}
          meta={sheetMeta}
          stop={sheetStop}
          heights={sheetHeights}
          onStopChange={applySheetStop}
          onPeekHeight={handlePeekHeight}
          onLiveHeight={handleLiveHeight}
          onDragChange={handleSheetDragChange}
          backLabel={sheetBackLabel}
          onBack={sheetBack}
          onDismiss={dismissSearchSheet}
          query={query}
          onQueryChange={(value) => {
            setQuery(value)
            setActiveResult(-1)
          }}
          results={grouped}
          activeResult={activeResult}
          onActiveResultChange={setActiveResult}
          onRunResult={runResult}
          emptyText={activeDisorderIds ? '当前筛选下没有匹配结果，试试取消病症筛选。' : undefined}
          disorderGroups={disorderGroups}
          selectedDisorders={selectedDisorders}
          onToggleDisorder={toggleDisorder}
        >
          {mobileDetailNode ?? mobileExplorer}
        </MapSheet>
      )}

      <div className="tc-mapapp-legend">
        <span>线索密度</span>
        <span className="tc-ramp" aria-hidden="true" />
      </div>

      <div className="tc-map-zoom" aria-label="地图缩放">
        <button type="button" aria-label="放大地图" disabled={!mapReady || limits.atMax} onClick={() => zoomBy(1)}>+</button>
        <button type="button" aria-label="缩小地图" disabled={!mapReady || limits.atMin} onClick={() => zoomBy(-1)}>−</button>
      </div>
      <div className={isDesktop && !canReset ? 'tc-mapapp-actions is-collapsed' : 'tc-mapapp-actions'}>
        <button type="button" className="tc-mapapp-ctl" onClick={backToCountry} title="回到全国视图" aria-label="回到全国视图">
          <LocateFixed size={18} aria-hidden="true" />
          <span className="tc-mapapp-ctl-label">回到全国</span>
        </button>
      </div>
    </div>
  )
}
