'use client'

import { Fragment, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { hospitalSearchText, matchesSearch } from '@/lib/search'
import { aggregateDoctorLeads, splitDoctorNames } from '@/lib/doctor-leads'
import { displayDisorderLabels, disorderDisplayLabel, disorderDisplayRank, DISORDER_FILTER_GROUPS } from '@/lib/disorder-labels'
import { loadAmap } from '@/lib/amap-loader'
import { createAmapRuntime } from '@/lib/amap-runtime'
import type { MapCamera } from '@/lib/map-camera'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { sidebarCameraFrame } from '@/lib/map-sidebar'
import type { Disorder, Doctor, Hospital, Province, Report } from '@/lib/schema'
import { HospitalExplorer, type DisorderGroup, type ResultFilter } from '@/components/HospitalExplorer'
import { Sidebar, type SidebarTabId } from './Sidebar'
import { MapSheet, type SheetHeights, type SheetLevel, type SheetStop } from './MapSheet'
import { HospitalDetail } from './HospitalDetail'
import { DoctorDetail, type DoctorDisorderStat } from './DoctorDetail'
import { ProvinceDetail } from './ProvinceDetail'
import type { MapHospital, MapLead, MapProvinceStat, SearchGroup, SearchResult } from './types'
import { Info, LocateFixed, Menu, Search, X } from 'lucide-react'

const HOSPITAL_ZOOM = 10
gsap.registerPlugin(useGSAP)
// 掉帧时不拉长动画时间：dock 入场 0.68 秒在节流或卡顿的机器上不该拖成二十秒。
gsap.ticker.lagSmoothing(0)

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
  const desktopRef = useRef(false)

  // The server and phones start map-first; desktop docking follows after hydration.
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null)
  const [selectedProvinceAdcode, setSelectedProvinceAdcode] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [mapError, setMapError] = useState('')
  const [mapReady, setMapReady] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
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
  const [filterOpen, setFilterOpen] = useState(false)
  const [peekHeight, setPeekHeight] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  // 点钉进详情时，钉在画布里的 y：让位目标是这枚钉，不是层级锚点。
  const [pinFocusY, setPinFocusY] = useState<number | null>(null)

  useEffect(() => {
    const update = () => setViewportHeight(window.innerHeight)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

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

  useEffect(() => {
    if (!aboutOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !projectRef.current?.contains(event.target)) setAboutOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setAboutOpen(false)
      aboutButtonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [aboutOpen])

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
          selectHospital, selectProvince, interruptDock: () => cancelDockCameraRef.current?.(),
          limits: (atMin, atMax) => setLimits(previous => previous.atMin === atMin && previous.atMax === atMax ? previous : { atMin, atMax }),
          closeCluster: () => setCluster(null),
          cluster: (members, key, x, y) => {
            const size = runtime!.camera.getSize()
            setCluster({ members, key, x: Math.max(dockRef.current.inset + 16, Math.min(size.x - 296, x - 140)), y: Math.max(84, Math.min(size.y - 320, y - 40)) })
          },
          ready: () => { if (!disposed) setMapReady(true) },
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
    const hospitals: SearchResult[] = []
    for (const hospital of propsRef.current.hospitals) {
      const haystack = hospitalSearchText(hospital, propsRef.current.reports)
      if (matchesSearch(haystack, q)) {
        hospitals.push({
          key: `hospital-${hospital.id}`,
          group: '医院',
          label: hospital.name,
          sub: `${hospital.city && hospital.city !== hospital.province ? `${hospital.province} · ${hospital.city}` : hospital.province} · 线索 ${propsRef.current.reportCounts[hospital.id] ?? 0} 条`,
          run: () => selectHospital(hospital.id),
        })
      }
      if (hospitals.length >= 4) break
    }
    results.push(...hospitals)

    // Share doctor aggregation with both browsing surfaces.
    const doctors: SearchResult[] = []
    const doctorKeys = new Set<string>()
    for (const group of aggregateDoctorLeads(propsRef.current.hospitals, propsRef.current.reports, q)) {
      for (const entry of group.entries) {
        const key = `doctor-${entry.hospitalId ?? entry.hospitalName}-${entry.name}`
        if (doctorKeys.has(key)) continue
        doctorKeys.add(key)
        doctors.push({
          key,
          group: '医生',
          label: entry.name,
          sub: `${entry.hospitalName} · ${group.label} · 线索 ${entry.leadCount} 条`,
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
            enterFilter({ label: entry.name, hint: `线索 ${entry.leadCount} 条`, hospitalIds }, [])
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
  }, [query])

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
  const selectedLeads = selectedHospital ? (props.leadsByHospital[selectedHospital.id] ?? []) : []

  const doctorHospital = selectedDoctor
    ? props.mapHospitals.find((item) => item.id === selectedDoctor.hospitalId) ?? null
    : null

  const doctorLeads = useMemo(() => {
    if (!selectedDoctor) return []
    return (props.leadsByHospital[selectedDoctor.hospitalId] ?? []).filter((lead) =>
      splitDoctorNames(lead.doctorName).includes(selectedDoctor.name))
  }, [selectedDoctor, props.leadsByHospital])

  const doctorDisorders = useMemo<DoctorDisorderStat[]>(() => {
    if (!selectedDoctor) return []
    const reportIds = new Set(doctorLeads.map((lead) => lead.id))
    // 按显示标签计数：osdd 与 did 合成一条，同一条线索不会在两个标签下各记一次。
    const counts = new Map<string, number>()
    for (const report of props.reports) {
      if (!reportIds.has(report.id)) continue
      for (const label of displayDisorderLabels(report.disorders)) counts.set(label, (counts.get(label) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => disorderDisplayRank(a[0]) - disorderDisplayRank(b[0]))
      .map(([label, count]) => ({ id: label, label, count }))
  }, [selectedDoctor, doctorLeads, props.reports])

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

  // 手机底卡与桌面侧栏共用详情组件；手机隐藏已经搬到卡头部的家数/标题重复行。
  const renderDetail = (mobile: boolean) => selectedDoctor && doctorHospital ? (
    <DoctorDetail
      name={selectedDoctor.name}
      hospital={doctorHospital}
      leads={doctorLeads}
      disorders={doctorDisorders}
      profile={doctorProfile}
      onBackToHospital={backToHospital}
      onBackToProvince={() => backToProvince(doctorHospital.adcode)}
      onBackToCountry={backToCountryFromDetail}
    />
  ) : selectedHospital ? (
    <HospitalDetail
      hospital={selectedHospital}
      leads={selectedLeads}
      provinceName={selectedHospital.province}
      onBackToProvince={() => backToProvince(selectedHospital.adcode)}
      onBackToCountry={backToCountryFromDetail}
      onLocate={() => selectHospital(selectedHospital.id)}
      onSelectDoctor={(name) => openDoctor(name, selectedHospital.id)}
    />
  ) : selectedProvince ? (
    <ProvinceDetail
      provinceName={selectedProvince.name}
      stat={props.provinceStats[selectedProvince.adcode]}
      hospitals={provinceHospitals}
      onBackToCountry={backToCountryFromDetail}
      onZoomToProvince={() => selectProvince(selectedProvince.adcode)}
      onSelectHospital={openHospital}
      hideCount={mobile}
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

  // 手机底卡的筛选入口在搜索行右侧：同样的分组，不再重复正文里的旧面板。
  const sheetFilters = disorderGroups.map((group) => ({
    id: group.id,
    label: group.label,
    count: group.hospitalIds.length,
  }))

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
        resultFilter={resultFilter}
        hideHeading
        hideFilterPanel
        showFilteredNote
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
  const sheetTitle = searching
    ? query.trim()
    : selectedDoctor?.name ?? selectedHospital?.name ?? selectedProvince?.name ?? '医院与线索'
  // 搜索头部只数会在结果里出现的东西：省份 → 医院 → 医生，病症是标签不是实体。
  const searchProvinceHits = grouped.find((entry) => entry.group === '省份')?.items.length ?? 0
  const searchHospitalHits = grouped.find((entry) => entry.group === '医院')?.items.length ?? 0
  const searchDoctorHits = grouped.find((entry) => entry.group === '医生')?.items.length ?? 0
  const sheetCounts = searching
    ? [
      ...(searchProvinceHits > 0 ? [{ value: searchProvinceHits, unit: '个省份' }] : []),
      ...(searchHospitalHits > 0 ? [{ value: searchHospitalHits, unit: '家医院' }] : []),
      ...(searchDoctorHits > 0 ? [{ value: searchDoctorHits, unit: '位医生' }] : []),
    ]
    : sheetLevel === 'country'
      ? [
        { value: activeHospitalIds ? activeHospitalIds.size : props.hospitals.length, unit: '家医院' },
        { value: activeLeads ?? props.reports.length, unit: '条线索' },
      ]
      : sheetLevel === 'province'
        ? [{ value: provinceHospitals.length, unit: '家医院' }]
        : []
  const sheetMeta = sheetCounts.length > 0 ? (
    <>
      {sheetCounts.map((part, index) => (
        <Fragment key={part.unit}>{index > 0 ? ' · ' : ''}<b>{part.value}</b> {part.unit}</Fragment>
      ))}
    </>
  ) : null
  // 省层正文是空态时，卡头的返回行和层级名会把同一件事说三遍，藏起来只留计数。
  const sheetEmpty = sheetLevel === 'province' && provinceHospitals.length === 0

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

  // 选中钉时把其余钉压到 42%，让「卡里的详情」和「地图上的这枚钉」对得上。
  useEffect(() => {
    containerRef.current?.classList.toggle('tc-mapapp-canvas--pinned', pinFocusY !== null)
  }, [pinFocusY])

  // 筛选联动地图：命中的省提亮，其余被半透明压层盖住（覆盖层由 runtime 自绘）。
  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime || isDesktop || !mapReady) return
    if (!activeHospitalIds) {
      runtime.setFilterHits(null)
      return
    }
    const adcodes = new Set<string>()
    for (const hospital of props.mapHospitals) {
      if (activeHospitalIds.has(hospital.id)) adcodes.add(hospital.adcode)
    }
    runtime.setFilterHits([...adcodes])
  }, [activeHospitalIds, isDesktop, mapReady, props.mapHospitals])

  // 详情层没有 peek 这一档（A24）：所有换档都从这里过，任何调用方都绕不过去。
  const detailSheet = sheetLevel === 'hospital' || sheetLevel === 'doctor'
  const applySheetStop = useCallback((next: SheetStop) => {
    setSheetStop(detailSheet && next === 'peek' ? 'medium' : next)
  }, [detailSheet])

  // 换层级时换档：进省看列表用 medium，进详情看内容用 large；搜索不动档位。
  const previousSheetLevelRef = useRef<SheetLevel>('country')
  useEffect(() => {
    const previous = previousSheetLevelRef.current
    previousSheetLevelRef.current = sheetLevel
    if (previous === sheetLevel) return
    setFilterOpen(false)
    if (sheetLevel === 'province') applySheetStop('medium')
    // 点钉进来的详情用 medium，让地图露出更多；从列表或搜索进来的看内容用 large。
    else if (sheetLevel === 'hospital' || sheetLevel === 'doctor') applySheetStop(pinFocusY !== null ? 'medium' : 'large')
    else if (sheetLevel === 'country' && previous !== 'search') applySheetStop('medium')
  }, [applySheetStop, pinFocusY, sheetLevel])

  const sheetBackLabel = selectedDoctor
    ? props.mapHospitals.find((item) => item.id === selectedDoctor.hospitalId)?.name
    : selectedHospital?.province ?? (selectedProvince ? '全国' : undefined)
  const sheetBack = selectedDoctor
    ? backToHospital
    : selectedHospital
      ? () => backToProvince(selectedHospital.adcode)
      : selectedProvince
        ? backToCountry
        : undefined

  // 搜索失焦：只收回因聚焦抬起来的那一档；详情层根本没有 peek 可退。
  // 点结果行、拖把手这类焦点暂时跑开的场景由 MapSheet 用 relatedTarget 和指针状态挡掉。
  const dismissSearchSheet = () => {
    if (query.trim()) return
    if (resultFilter || selectedDisorders.length > 0) return
    if (sheetLevel !== 'country') return
    applySheetStop('peek')
  }

  // Escape 的优先级：清搜索词 → 关筛选面板 → 详情退一层（大卡先落到中档）→ 列表收一档。
  useEffect(() => {
    if (isDesktop) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      const target = event.target
      if (target instanceof HTMLElement && (target.closest('input, textarea, select') || target.isContentEditable)) return
      if (query) {
        setQuery('')
        setActiveResult(-1)
        return
      }
      if (filterOpen) {
        setFilterOpen(false)
        return
      }
      if (detailSheet) {
        if (sheetStop === 'large') applySheetStop('medium')
        else if (selectedDoctor) backToHospital()
        else if (selectedHospital) backToProvince(selectedHospital.adcode)
        return
      }
      // 列表层一次收一档；全国 peek 无处可收，就停在这里。
      if (sheetStop === 'large') applySheetStop('medium')
      else if (sheetStop === 'medium') applySheetStop('peek')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [applySheetStop, backToHospital, backToProvince, detailSheet, filterOpen, isDesktop, query, selectedDoctor, selectedHospital, sheetStop])

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
          {query.trim() && searchResults.length === 0 && <div className="tc-mapapp-no-results" role="status">没有找到匹配结果，试试省份、医院或医生名称。</div>}
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
          <button ref={aboutButtonRef} type="button" className="tc-mapapp-ctl tc-mapapp-about" aria-expanded={aboutOpen} aria-controls="tc-project-card" onClick={() => setAboutOpen((v) => !v)}>关于项目</button>
          {/* 手机顶栏只留这个图标入口；关于页是独立路由，不再展开卡片。 */}
          <Link className="tc-about-icon" href="/about/" aria-label="关于项目"><Info size={20} aria-hidden="true" /></Link>
          {aboutOpen && <section id="tc-project-card" className="tc-project-card" aria-label="关于项目">
            <div className="tc-row tc-row--between"><strong>TraumaCompass</strong></div>
            <p>本项目旨在为CPTSD/BPD人群提供全国就诊地图，帮助更多人治疗心理创伤与障碍</p>
            <Link className="tc-card-action" href="/about/">了解我们</Link>
          </section>}
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
        />
      )}

      {!isDesktop && (
        <MapSheet
          level={sheetLevel}
          title={sheetTitle}
          meta={sheetMeta}
          stop={sheetStop}
          minStop={detailSheet ? 'medium' : 'peek'}
          heights={sheetHeights}
          onStopChange={applySheetStop}
          onPeekHeight={handlePeekHeight}
          onLiveHeight={handleLiveHeight}
          onDragChange={handleSheetDragChange}
          backLabel={sheetBackLabel}
          onBack={sheetBack}
          hideHead={sheetEmpty}
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
          filters={sheetLevel === 'country' || sheetLevel === 'province' ? sheetFilters : []}
          selectedFilters={selectedDisorders}
          onToggleFilter={toggleDisorder}
          filterOpen={filterOpen}
          onFilterOpenChange={setFilterOpen}
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
      <div className="tc-mapapp-actions">
        <button type="button" className="tc-mapapp-ctl" onClick={backToCountry} title="回到全国视图" aria-label="回到全国视图">
          <LocateFixed size={18} aria-hidden="true" />
          <span className="tc-mapapp-ctl-label">回到全国</span>
        </button>
      </div>
    </div>
  )
}
