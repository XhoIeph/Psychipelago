'use client'

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { hospitalSearchText, matchesSearch } from '@/lib/search'
import { aggregateDoctorLeads } from '@/lib/doctor-leads'
import { loadAmap } from '@/lib/amap-loader'
import { createAmapRuntime } from '@/lib/amap-runtime'
import type { MapCamera } from '@/lib/map-camera'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { sidebarCameraFrame } from '@/lib/map-sidebar'
import type { Disorder, Hospital, Province, Report } from '@/lib/schema'
import { HospitalExplorer, type ResultFilter } from '@/components/HospitalExplorer'
import { Sidebar, type SidebarTabId } from './Sidebar'
import { HospitalDetail } from './HospitalDetail'
import { ProvinceDetail } from './ProvinceDetail'
import type { MapHospital, MapLead, MapProvinceStat } from './types'
import { ListFilter, LocateFixed, Menu, Search, X } from 'lucide-react'

const HOSPITAL_ZOOM = 10
gsap.registerPlugin(useGSAP)

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
}

type SearchGroup = '省份' | '机构' | '医生' | '病症'

type SearchResult = {
  key: string
  group: SearchGroup
  label: string
  sub: string
  run: () => void
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

  const selectedRef = useRef<string | null>(null)
  selectedRef.current = selectedHospitalId

  useEffect(() => {
    runtimeRef.current?.syncSelection()
    if (focusDetailRef.current) {
      focusDetailRef.current = false
      sidebarRef.current?.querySelector<HTMLButtonElement>('.tc-detail-back')?.focus({ preventScroll: true })
    }
  }, [selectedHospitalId, selectedProvinceAdcode, cluster])

  useEffect(() => {
    if (!cluster) return
    clusterRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
  }, [cluster])

  useGSAP(() => {
    const shell = shellRef.current
    if (!shell || (!mapReady && !mapError)) return
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

  // The mobile drawer owns focus while open and restores its trigger on Escape.
  useEffect(() => {
    if (!sidebarOpen || isDesktop) return
    const panel = sidebarRef.current
    // Prefer the active tab so arrow-key navigation remains available.
    const activeTab = panel?.querySelector<HTMLElement>('.tc-sidebar-tab[tabindex="0"]')
    const fallback = panel?.querySelector<HTMLElement>(
      'button, a[href], input, select, [tabindex]:not([tabindex="-1"])',
    )
    // Focus follows the React commit that removes inert, not the animation end.
    const focusFrame = requestAnimationFrame(() => (activeTab ?? fallback)?.focus({ preventScroll: true }))
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const controls = Array.from(panel?.parentElement?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input, select, summary, [tabindex="0"]',
        ) ?? []).filter((node) => node.getClientRects().length > 0 && !node.closest('[inert]') && node.tabIndex >= 0)
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
        return
      }
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setSidebarOpen(false)
      burgerRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', onKey)
    }
  }, [sidebarOpen, isDesktop])

  const selectHospital = (id: string) => {
    const hospital = propsRef.current.mapHospitals.find(item => item.id === id)
    if (!hospital) return
    setCluster(null)
    setSelectedHospitalId(id)
    setSelectedProvinceAdcode(null)
    navigationInsetRef.current = desktopRef.current ? 380 : 0
    setSidebarOpen(true)
    runtimeRef.current?.moveTo(hospital, Math.max(mapRef.current?.getZoom() ?? 0, HOSPITAL_ZOOM), desktopRef.current ? 380 : 0)
  }

  const selectProvince = (adcode: string) => {
    setCluster(null)
    setSelectedProvinceAdcode(adcode)
    setSelectedHospitalId(null)
    navigationInsetRef.current = desktopRef.current ? 380 : 0
    setSidebarOpen(true)
    runtimeRef.current?.province(adcode, desktopRef.current ? 380 : 0)
  }

  // Sidebar lists move focus into the detail they open; map clicks keep their own focus.
  const openProvince = (adcode: string) => {
    focusDetailRef.current = true
    selectProvince(adcode)
  }

  const openHospital = (id: string) => {
    focusDetailRef.current = true
    selectHospital(id)
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
    setSelectedHospitalId(null)
    setSelectedProvinceAdcode(null)
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
          group: '机构',
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
            if (entry.hospitalId) { selectHospital(entry.hospitalId); return }
            // Until the doctor panel lands, a lead without a linked record resolves to its institution.
            const hospitalIds = propsRef.current.hospitals
              .filter((hospital) => hospital.name === entry.hospitalName)
              .map((hospital) => hospital.id)
            setResultFilter({ label: entry.name, hint: `线索 ${entry.leadCount} 条`, hospitalIds })
            setSidebarTab('hospitals')
            setSidebarOpen(true)
          },
        })
        if (doctors.length >= 2) break
      }
      if (doctors.length >= 2) break
    }
    results.push(...doctors)

    const disorders: SearchResult[] = []
    for (const disorder of propsRef.current.disorders) {
      if (!matchesSearch(`${disorder.name_zh} ${disorder.name_en} ${disorder.id}`, q)) continue
      const count = propsRef.current.reports.filter((report) => report.disorders.includes(disorder.id)).length
      disorders.push({
        key: `disorder-${disorder.id}`,
        group: '病症',
        label: disorder.id === 'other' ? disorder.name_zh : `${disorder.name_zh}（${disorder.id.toUpperCase()}）`,
        sub: `${count} 条线索`,
        run: () => {
          const hospitalIds = [...new Set(propsRef.current.reports
            .filter((report) => report.disorders.includes(disorder.id) && report.hospital_id)
            .map((report) => report.hospital_id as string))]
          setResultFilter({ label: disorder.name_zh, hint: `${count} 条线索`, hospitalIds })
          setSidebarTab('hospitals')
          setSidebarOpen(true)
        },
      })
    }
    const sourceTopics = new Set(propsRef.current.reports.flatMap((report) => report.source_topics ?? []))
    for (const topic of sourceTopics) {
      if (!matchesSearch(topic, q)) continue
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
          setResultFilter({ label: topic, hint: `${count} 条线索`, hospitalIds })
          setSidebarTab('hospitals')
          setSidebarOpen(true)
        },
      })
    }
    // Every group keeps a slot so a disorder or source-topic hit is always reachable.
    const provinceHits = results.filter((item) => item.group === '省份').slice(0, 2)
    return [...provinceHits, ...hospitals.slice(0, 4), ...doctors.slice(0, 2), ...disorders.slice(0, 2)]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const grouped = useMemo(() => {
    const order: SearchGroup[] = ['省份', '机构', '医生', '病症']
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

  // Back navigation walks one level up: institution → province → the browsing tabs.
  const focusActiveTab = () => requestAnimationFrame(() => sidebarRef.current?.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')?.focus({ preventScroll: true }))

  const backToProvince = (adcode: string) => {
    focusDetailRef.current = true
    selectProvince(adcode)
  }

  const backToCountryFromDetail = () => {
    backToCountry()
    focusActiveTab()
  }

  const detailNode = selectedHospital ? (
    <HospitalDetail
      hospital={selectedHospital}
      leads={selectedLeads}
      provinceName={selectedHospital.province}
      onBackToProvince={() => backToProvince(selectedHospital.adcode)}
      onBackToCountry={backToCountryFromDetail}
      onLocate={() => selectHospital(selectedHospital.id)}
    />
  ) : selectedProvince ? (
    <ProvinceDetail
      provinceName={selectedProvince.name}
      stat={props.provinceStats[selectedProvince.adcode]}
      hospitals={props.mapHospitals.filter((item) => item.adcode === selectedProvince.adcode)}
      onBackToCountry={backToCountryFromDetail}
      onZoomToProvince={() => selectProvince(selectedProvince.adcode)}
      onSelectHospital={openHospital}
    />
  ) : null

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
          resultFilter={resultFilter}
          onClearResult={() => setResultFilter(null)}
        />
      </Suspense>
    ),
    submit: (
      <div className="tc-stack">
        <h3>提交线索</h3>
        <p className="tc-small tc-muted">提供《就诊地图10.25》中的位置和原文。请勿提交病历、联系方式或其他个人信息。</p>
        <a className="tc-button tc-button--active" href="https://github.com/XhoIeph/TraumaCompass/issues/new?template=lead.yml" target="_blank" rel="noopener noreferrer">在 GitHub 提交线索</a>
        <p className="tc-meta">需要 GitHub 账号。提交后内容将公开可见。</p>
      </div>
    ),
  }

  return (
    <div ref={shellRef} className={`tc-mapapp${sidebarOpen ? ' tc-mapapp--open' : ''}${query.trim() ? ' tc-mapapp--searching' : ''}`} role={sidebarOpen && !isDesktop ? 'dialog' : undefined} aria-modal={sidebarOpen && !isDesktop ? true : undefined} aria-label={sidebarOpen && !isDesktop ? '浏览就诊资源' : undefined}>
      <div ref={containerRef} className="tc-mapapp-canvas" role="application" aria-label="全国就诊资源与线索地图" inert={sidebarOpen && !isDesktop} />
      {!mapReady && !mapError && <div className="tc-map-loading" role="status">正在加载全国地图…</div>}
      {mapError && (
        <div className="tc-mapapp-error" role="alert">
          地图加载失败：{mapError}（其余数据仍可在侧边栏浏览）
        </div>
      )}

      {cluster && <div ref={clusterRef} className="tc-map-cluster-list" role="dialog" aria-label="选择机构" style={{ left: cluster.x, top: cluster.y }} onKeyDown={event => {
        if (event.key !== 'Escape') return
        event.stopPropagation()
        closeCluster()
      }}>
        <div className="tc-row tc-row--between"><strong>选择机构</strong><button type="button" className="tc-linklike" onClick={closeCluster}>关闭</button></div>
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
            placeholder="搜索省份 / 机构 / 病症"
            aria-label="搜索省份、机构、医生或病症"
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
          {query.trim() && searchResults.length === 0 && <div className="tc-mapapp-no-results" role="status">没有找到匹配结果，试试省份、机构或医生名称。</div>}
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
      </div>

      <div className="tc-mapapp-backdrop" aria-hidden="true" onClick={() => { setSidebarOpen(false); burgerRef.current?.focus() }} />

      <Sidebar
        id="tc-map-sidebar"
        panelRef={sidebarRef}
        open={sidebarOpen}
        tabs={tabs}
        detail={detailNode}
        activeTab={sidebarTab}
        onTabChange={setSidebarTab}
        onClose={() => { setSidebarOpen(false); if (!desktopRef.current) burgerRef.current?.focus() }}
      />

      <div className="tc-project-corner" ref={projectRef}>
        <button ref={aboutButtonRef} type="button" className="tc-mapapp-ctl" aria-expanded={aboutOpen} aria-controls="tc-project-card" onClick={() => setAboutOpen((v) => !v)}>关于项目</button>
        {aboutOpen && <section id="tc-project-card" className="tc-project-card" aria-label="关于项目">
          <div className="tc-row tc-row--between"><strong>TraumaCompass</strong><button type="button" className="tc-linklike" onClick={() => { setAboutOpen(false); aboutButtonRef.current?.focus() }}>关闭</button></div>
          <p>本项目旨在为CPTSD/BPD人群提供全国就诊地图，帮助更多人治疗心理创伤与障碍</p>
          <Link className="tc-card-action" href="/about/">了解我们</Link>
        </section>}
      </div>

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
      {!sidebarOpen && <button type="button" className="tc-mobile-browse" onClick={() => setSidebarOpen(true)} aria-controls="tc-map-sidebar">
        <ListFilter size={18} aria-hidden="true" />浏览机构与线索
      </button>}
    </div>
  )
}
