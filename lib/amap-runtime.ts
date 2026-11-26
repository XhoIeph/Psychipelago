import { gsap } from 'gsap'
import type { MapHospital, MapProvinceStat } from '../components/map/types'
import { MAP_MAX_ZOOM, MapPoint, project, unproject, fitMapBounds, fitProvinceFrame, type GeoPoint, type MapCamera, type MapPadding } from './map-camera'
import { CHINA_BOUNDS, constrainChinaCenter } from './map-sidebar'
import { gcjCoordinateTree, type CoordinateTree } from './map-coordinates'
import { mapNodeLayout, NODE_SPACING } from './map-nodes'
import { NODE_ZOOM_THRESHOLD, showMapNodes } from './map-mode'
import { attachMapWheelZoom } from './map-wheel-zoom'
import { attachMapPointer } from './map-pointer'
import { showPinOrbit } from './map-pin-orbit'
import type { Theme } from './theme'
import { DENSITY_OPACITY, densityColor, densityLimits } from './map-density'

export type { Theme }
const PROVINCE_HIT_ZOOM = 8
const palettes: Record<Theme, { hitFill: string; hitStroke: string; hitOpacity: number; missOpacity: number; stroke: string }> = {
  light: { hitFill: '#3b634b', hitStroke: 'rgba(59,99,75,.5)', hitOpacity: .26, missOpacity: .04, stroke: '#78a88e' },
  dark: { hitFill: '#8fd7a8', hitStroke: 'rgba(143,215,168,.5)', hitOpacity: .24, missOpacity: .02, stroke: '#4a5f57' },
}
type Geometry = { features: { properties: { adcode: string | number; name?: string }; geometry: { type?: string; coordinates: CoordinateTree } }[] }
type LiveNode = { marker: AMap.Marker; element: HTMLButtonElement; members: MapHospital[]; exit?: gsap.core.Tween }
/** 省面可能是 MultiPolygon：每个多边形单独建实例，飞地与岛屿才不会连成一整块。 */
type ProvinceEntry = {
  shapes: AMap.Polygon[]
  rings: number[][][][]
  hoverPath: Path2D
  bounds: { southWest: GeoPoint; northEast: GeoPoint; center: GeoPoint }
  mainBounds: [GeoPoint, GeoPoint]
}
type ProvinceLift = { path: Path2D; x: number; y: number; span: number; opacity: number; spread: number }
const provinceLight = {
  light: ['rgba(197,242,213,.56)', 'rgba(197,242,213,.31)'],
  dark: ['rgba(143,215,168,.36)', 'rgba(143,215,168,.20)'],
}
type AmapTileCoord = { x: number; y: number; z: number; key: string }
type AmapInternalSource = {
  a_?: boolean
  aa?: { bounds: unknown; optimalZoom: number }
  sa?: AmapTileCoord[]
  ha?: (bounds: unknown, zoom: number) => AmapTileCoord[]
  ra?: (optimalZoom: number) => number
  _overlays?: { _needUpdate?: boolean }[]
}
type AmapInternalMap = AMap.Map & {
  complete?: boolean
  render?: () => void
  Mv?: { Yh?: Record<string, AmapInternalSource> }
  bZ?: { dynamic?: { get?: (key: string) => unknown } }
}

// The SDK owns geographic rendering; React owns the surrounding application and selection.
export function createAmapRuntime(sdk: typeof AMap, container: HTMLDivElement, options: {
  hospitals: MapHospital[]
  stats: Record<string, MapProvinceStat>
  inset(): number
  selected(): string | null
  /** 当前层级的省份 adcode；省内只画这个省的钉，全国层不画钉。 */
  province(): string | null
  /** 当前筛选命中的医院；null 表示没有筛选。省内图钉与头部「N 家医院」取同一份集合。 */
  activeIds(): Set<string> | null
  pinKeywords(hospitalId: string): string[]
  /** fromPin 表示由地图图钉触发：手机端只让位、不移动镜头。 */
  selectHospital(id: string, fromPin?: { y: number }): void
  selectProvince(adcode: string): void
  interruptDock(): void
  limits(atMin: boolean, atMax: boolean): void
  cluster(members: MapHospital[], key: string, x: number, y: number): void
  closeCluster(): void
  ready(): void
  /** 地图空白处被点击；拖动后高德不派发 click，所以这里天然只对应「点了一下」。 */
  onMapClick(): void
  /** 底卡正停在 large：此时点地图一律只收一档，省界也按「点空白」处理。 */
  sheetLarge(): boolean
  /** 初始主题；之后切换走 setTheme()。 */
  theme: Theme
}) {
  const countLimits = densityLimits(options.stats)
  let size = new MapPoint(container.clientWidth, container.clientHeight)
  function countryFrame() {
    const wide = size.x >= 1000
    const bounds: [GeoPoint, GeoPoint] = CHINA_BOUNDS.map(([lat, lng]) => ({ lat, lng })) as [GeoPoint, GeoPoint]
    // The phone canvas no longer sits under floating bars, so it needs a small uniform pad, not 136px.
    return fitMapBounds(bounds, size, wide ? options.inset() : 0, wide ? [80, 70, 16, 16] : [12, 12, 12, 12])
  }
  const initialFrame = countryFrame()
  let minZoom = initialFrame.zoom
  const initialTarget = constrainChinaCenter(
    {
      project,
      unproject,
      getSize: () => size,
      getZoom: () => initialFrame.zoom,
      getMinZoom: () => minZoom,
      getMaxZoom: () => MAP_MAX_ZOOM,
    } as MapCamera,
    initialFrame.center,
    48,
  )
  const map = new sdk.Map(container, {
    mapStyle: options.theme === 'dark' ? 'amap://styles/grey' : 'amap://styles/whitesmoke',
    // 标注层压在矢量色块之上：否则省份密度填充会把底图文字染成灰绿。
    labelzIndex: 130,
    viewMode: '2D',
    center: [initialTarget.lng, initialTarget.lat],
    zoom: initialFrame.zoom,
    zooms: [minZoom, MAP_MAX_ZOOM],
    animateEnable: false, jogEnable: false, scrollWheel: false, rotateEnable: false, pitchEnable: false,
    dragEnable: false, touchZoom: false, keyboardEnable: false, doubleClickZoom: false,
  })
  map.addControl(new sdk.Scale({ position: 'LB', offset: [20, 28] }))
  let disposed = false
  let cameraTween: gsap.core.Tween | undefined
  let densityLoaded = false
  let readyFired = false
  let readyRaf = 0
  let settledFrames = 0
  const internalMap = map as unknown as AmapInternalMap
  const liveNodes = new Map<string, LiveNode>()
  let pinOrbit: { node: LiveNode; hide(): void } | undefined
  const provinces = new Map<string, ProvinceEntry>()
  const liftCanvas = document.createElement('canvas')
  const liftContext = liftCanvas.getContext('2d')!
  let liftLayer: AMap.CanvasLayer | undefined
  const raised = new Map<string, ProvinceLift>()
  const hitCanvas = document.createElement('canvas').getContext('2d')!
  let hoveredProvince: string | undefined
  let nodesOn = false
  let provinceNodeZoom = NODE_ZOOM_THRESHOLD
  let lastScope: string | null = null
  let renderedZoom: number | undefined
  let renderedSignature = ''
  /** 画面中心平移后同一缩放的合并结果不变，但哪些钉在屏幕内会变，靠这个签重排。 */
  function nodeSignature(zoom: number) {
    const point = camera.getCenter()
    return `${zoom.toFixed(2)}|${point.lat.toFixed(3)}|${point.lng.toFixed(3)}|${size.x}x${size.y}|${options.province() ?? 'all'}`
  }
  let instance = 0
  let previousMin: boolean | undefined, previousMax: boolean | undefined
  const motion = gsap.context(() => {}, container)
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const center = (): GeoPoint => { const point = map.getCenter(); return { lat: point.getLat(), lng: point.getLng() } }
  const camera: MapCamera = {
    project, unproject, getContainer: () => container, getCenter: center,
    getSize: () => size, getZoom: () => map.getZoom(8), getMinZoom: () => minZoom, getMaxZoom: () => MAP_MAX_ZOOM,
    mouseEventToContainerPoint(event) { const rect = container.getBoundingClientRect(); return new MapPoint(event.clientX - rect.left, event.clientY - rect.top) },
    containerPointToLatLng(point) { return unproject(project(center(), camera.getZoom()).add(point.subtract(size.divideBy(2))), camera.getZoom()) },
    beginMove() { options.closeCluster() },
    move(point, zoom) {
      clearProvinceLift()
      clearPinOrbit()
      const target = constrainChinaCenter({ ...camera, getZoom: () => zoom }, point, 48)
      map.setZoomAndCenter(zoom, [target.lng, target.lat], true)
    },
    endMove() { update() },
  }
  function setMinZoom(value: number) {
    if (value === minZoom) return
    minZoom = value
    map.setZooms([value, MAP_MAX_ZOOM])
  }
  function syncPinOrder(node: LiveNode) {
    node.marker.setzIndex(node === pinOrbit?.node ? 1200 : node.element.classList.contains('tc-pin--selected') ? 1000 : 200)
  }
  function syncSelection() {
    const selectedId = options.selected()
    for (const node of liveNodes.values()) {
      const selected = node.members.some(member => member.id === selectedId)
      node.element.classList.toggle('tc-pin--selected', selected)
      if (selected && pinOrbit?.node === node) clearPinOrbit()
      else syncPinOrder(node)
    }
  }
  /** 聚合钉的放大步长看「簇内最近两钉」：刚好把它们拉开到合并阈值以上，上限 1.8 级。 */
  function clusterZoomStep(members: MapHospital[]) {
    const zoom = camera.getZoom()
    let nearest = Number.POSITIVE_INFINITY
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const a = project(members[i], zoom)
        const b = project(members[j], zoom)
        nearest = Math.min(nearest, Math.hypot(a.x - b.x, a.y - b.y))
      }
    }
    const step = Math.max(1.2, Math.log2(NODE_SPACING / Math.max(nearest, 1)) + .12)
    return Math.min(1.8, step)
  }
  function renderNodes(zoom: number, animateEntry: boolean) {
    // 只画屏幕内的钉：省内缩放时，其它省份的医院不该在 DOM 里挂着。
    const origin = project(camera.getCenter(), zoom).subtract(size.divideBy(2))
    renderedZoom = zoom
    renderedSignature = nodeSignature(zoom)
    // 进了某个省就只铺这个省的医院；全国层本来就不画钉。筛选中时与命中集合取交集，
    // 头部「N 家医院」为 0 就一枚钉也没有。
    const scope = options.province()
    const active = options.activeIds()
    const source = (scope ? options.hospitals.filter(hospital => hospital.adcode === scope) : options.hospitals)
      .filter(hospital => !active || active.has(hospital.id))
    const layout = mapNodeLayout(source, hospital => project(hospital, zoom).subtract(origin))
      .filter(entry => {
        const point = project({ lat: entry.lat, lng: entry.lng }, zoom).subtract(origin)
        return point.x > -48 && point.x < size.x + 48 && point.y > -48 && point.y < size.y + 48
      })
    const keys = new Set(layout.map(entry => entry.key))
    motion.add(() => {
      layout.forEach((entry, order) => {
        let node = liveNodes.get(entry.key)
        const created = !node
        if (!node) {
          const single = entry.members.length === 1
          const element = document.createElement('button')
          element.type = 'button'
          // 手机端图钉不进 Tab 序列，键盘路径走底卡列表：图钉在 DOM 顺序里排在底卡前面，
          // 同一家医院会在 Tab 顺序里出现两次；列表行本身 44px 带焦点环，已经是完整的键盘路径。
          element.tabIndex = -1
          element.className = `tc-map-node ${single ? 'tc-hospital-pin' : 'tc-cluster-pin'}`
          element.dataset.nodeKey = entry.key
          element.dataset.nodeInstance = String(++instance)
          element.dataset.nodeLat = String(entry.lat)
          element.dataset.nodeLng = String(entry.lng)
          const body = document.createElement('span')
          // .pin 是命中区与验收选择器的落点；::after 从边框内缘再向外 8px。
          body.className = `pin ${single ? 'tc-pin-body is-single' : 'tc-cluster-body'}`
          body.setAttribute('aria-hidden', 'true')
          const cross = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          cross.setAttribute('viewBox', '0 0 24 24')
          cross.setAttribute('class', 'tc-pin-cross')
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
          path.setAttribute('d', 'M9 2h6v7h7v6h-7v7H9v-7H2V9h7Z')
          path.setAttribute('fill', 'currentColor')
          cross.append(path)
          body.append(cross)
          if (!single) { const count = document.createElement('strong'); count.textContent = String(entry.members.length); body.append(count) }
          element.append(body)
          if (single) {
            // 名称标签只在 .tc-pin--selected 时由 CSS 显示；聚合钉不带标签。
            const label = document.createElement('span')
            label.className = 'tc-pin-label'
            label.setAttribute('aria-hidden', 'true')
            label.textContent = entry.members[0].name
            element.append(label)
          }
          element.addEventListener('click', event => {
            event.stopPropagation()
            if (single) {
              const point = map.lngLatToContainer([entry.lng, entry.lat])
              options.selectHospital(entry.members[0].id, { y: point.getY() })
            } else if (camera.getZoom() < MAP_MAX_ZOOM - .001) {
              animateTo(
                { lat: entry.lat, lng: entry.lng },
                Math.min(MAP_MAX_ZOOM, camera.getZoom() + clusterZoomStep(entry.members)),
              )
            } else {
              const point = map.lngLatToContainer([entry.lng, entry.lat])
              options.cluster(entry.members, entry.key, point.getX(), point.getY())
            }
          })
          const marker = new sdk.Marker({ position: [entry.lng, entry.lat], content: element, anchor: 'center', zIndex: 200, bubble: false })
          map.add(marker)
          node = { marker, element, members: entry.members }
          liveNodes.set(entry.key, node)
          // 新钉自己入场：换层级或拆聚合时从 .8 弹回 1，纯平移补进来的直接显示。
          if (animateEntry) gsap.set(body, { autoAlpha: 0, scale: .8 })
          else gsap.set(body, { autoAlpha: 1, scale: 1 })
        }
        node.exit?.kill(); node.exit = undefined
        node.element.inert = !nodesOn
        node.element.setAttribute('aria-label', entry.members.length === 1
          ? `${entry.members[0].name} · ${entry.members[0].leads} 条线索`
          : `${entry.members.length} 家医院，${camera.getZoom() >= MAP_MAX_ZOOM - .001 ? '查看医院' : '点击放大'}`)
        if (nodesOn) node.marker.show()
        if (created) {
          if (animateEntry) {
            gsap.to(node.element.firstElementChild, {
              autoAlpha: 1, scale: 1, duration: reduced() ? 0 : .38,
              delay: reduced() ? 0 : Math.min(order, 7) * .032, overwrite: true,
            })
          } else {
            gsap.set(node.element.firstElementChild, { autoAlpha: 1, scale: 1 })
          }
        }
      })
      for (const [key, node] of liveNodes) {
        if (keys.has(key) || node.exit) continue
        if (pinOrbit?.node === node) clearPinOrbit()
        node.element.inert = true
        node.exit = gsap.to(node.element.firstElementChild, { autoAlpha: 0, scale: .92, duration: reduced() ? 0 : .32, overwrite: true,
          onComplete: () => { map.remove(node.marker); liveNodes.delete(key) } })
      }
      // 自愈：入场/退场 tween 被打断后，节点会停在半透明，后续只有新建的钉才播入场，
      // 于是一枚钉会一直发灰。没有在播（或待播）的 tween 却不到 1 的，直接在位拉满。
      for (const node of liveNodes.values()) {
        if (node.exit) continue
        const body = node.element.firstElementChild
        if (!(body instanceof HTMLElement)) continue
        if (gsap.getTweensOf(body).length > 0) continue
        if (Number(getComputedStyle(body).opacity) < .985) gsap.set(body, { autoAlpha: 1, scale: 1 })
      }
    })
    syncSelection()
  }
  const opacity = { density: 1, nodes: 0 }
  let filterHits: Set<string> | null = null
  let theme: Theme = options.theme
  let provinceOutline: string | null = null

  /**
   * 这一省此刻的填充样式：密度态、命中态、未命中态都从这里出。
   * 进省/回全国的淡出系数（opacity.density）对三种状态一起生效，
   * 否则筛选色不跟地图一起退场，会和图钉层打架。
   */
  function paintProvince(adcode: string) {
    const entry = provinces.get(adcode)
    if (!entry) return
    const palette = palettes[theme]
    const reports = options.stats[adcode]?.reports ?? 0
    const fillColor = densityColor(theme, reports, countLimits)
    const hit = filterHits ? filterHits.has(adcode) : null
    const style = hit === true
      ? { fillColor: palette.hitFill, fillOpacity: palette.hitOpacity, strokeColor: palette.hitStroke, strokeWeight: 1, strokeOpacity: 1 }
      : hit === false
        ? { fillColor, fillOpacity: reports > 0 ? palette.missOpacity : 0, strokeColor: palette.stroke, strokeWeight: 1.1, strokeOpacity: .25 }
        : { fillColor, fillOpacity: reports > 0 ? DENSITY_OPACITY[theme] : 0, strokeColor: palette.stroke, strokeWeight: 1.1, strokeOpacity: 1 }
    style.fillOpacity *= opacity.density
    style.strokeOpacity *= opacity.density
    if (adcode === provinceOutline) {
      style.strokeColor = palette.stroke
      style.strokeOpacity = Math.max(style.strokeOpacity, .85)
    }
    for (const shape of entry.shapes) shape.setOptions(style)
  }
  function paintProvinces() {
    for (const adcode of provinces.keys()) paintProvince(adcode)
  }

  function clearProvinceLift() {
    hoveredProvince = undefined
    for (const highlight of raised.values()) gsap.killTweensOf(highlight)
    raised.clear()
    liftLayer?.hide()
  }

  function showProvinceLift() {
    liftCanvas.width = size.x
    liftCanvas.height = size.y
    const sw = map.containerToLngLat(new sdk.Pixel(0, size.y))
    const ne = map.containerToLngLat(new sdk.Pixel(size.x, 0))
    if (liftLayer) {
      liftLayer.setBounds(new sdk.Bounds(sw, ne))
      liftLayer.show()
    } else {
      // The SDK composites its image layers below native labels, within the same map canvas.
      liftLayer = new sdk.CanvasLayer({ canvas: liftCanvas, bounds: [sw.lng, sw.lat, ne.lng, ne.lat], zIndex: 110 })
      map.add(liftLayer)
    }
  }

  function drawProvinceLift() {
    liftContext.clearRect(0, 0, size.x, size.y)
    const [crest, edge] = provinceLight[theme]
    liftContext.lineJoin = 'round'
    liftContext.lineWidth = 1.5
    liftContext.strokeStyle = palettes[theme].hitFill
    for (const { path, x, y, span, opacity, spread } of raised.values()) {
      const light = liftContext.createRadialGradient(x, y, 0, x, y, span * spread)
      light.addColorStop(0, crest)
      light.addColorStop(1, edge)
      liftContext.globalAlpha = opacity
      liftContext.fillStyle = light
      liftContext.fill(path, 'evenodd')
      liftContext.stroke(path)
    }
  }

  function hoverProvince(adcode?: string) {
    if (adcode === hoveredProvince) return
    const leaving = hoveredProvince
    hoveredProvince = adcode
    const previous = leaving && raised.get(leaving)
    const instant = reduced()
    if (previous && leaving) {
      gsap.to(previous, {
        opacity: 0, duration: instant ? 0 : .19, ease: 'power2.out', overwrite: true, onUpdate: drawProvinceLift,
        onComplete() {
          raised.delete(leaving)
          if (!raised.size) liftLayer?.hide()
        },
      })
    }
    if (!adcode) return

    let highlight = raised.get(adcode)
    if (!highlight) {
      const entry = provinces.get(adcode)!
      const path = new Path2D()
      // The raster and polygons use the SDK's projection and the same rings, including holes.
      for (const polygon of entry.rings) for (const ring of polygon) {
        ring.forEach((position, index) => {
          const { x, y } = map.lngLatToContainer(position)
          if (index === 0) path.moveTo(x, y)
          else path.lineTo(x, y)
        })
        path.closePath()
      }
      const { center, southWest, northEast } = entry.bounds
      const anchor = map.lngLatToContainer([center.lng, center.lat])
      const low = map.lngLatToContainer([southWest.lng, southWest.lat])
      const high = map.lngLatToContainer([northEast.lng, northEast.lat])
      highlight = { path, x: anchor.x, y: anchor.y, span: Math.max(high.x - low.x, low.y - high.y), opacity: 0, spread: .28 }
      if (!raised.size) showProvinceLift()
      raised.set(adcode, highlight)
    }
    gsap.to(highlight, { opacity: 1, spread: .9, duration: instant ? 0 : .24, ease: 'power2.out', overwrite: true, onUpdate: drawProvinceLift })
  }

  function hitsMapControl(event: MouseEvent) {
    return (event.target as Element).closest('.amap-controls,.amap-logo,.amap-copyright,.tc-map-node')
  }

  function provinceAt(event: MouseEvent) {
    // Map labels can intercept SDK overlay events. Use the same geometry for hover and click.
    const pixel = camera.mouseEventToContainerPoint(event)
    const location = map.containerToLngLat(new sdk.Pixel(pixel.x, pixel.y))
    const lat = location.getLat(), lng = location.getLng()
    const point = project({ lat, lng }, PROVINCE_HIT_ZOOM)
    for (const [adcode, { bounds: { southWest, northEast }, hoverPath }] of provinces) {
      if (lat < southWest.lat || lat > northEast.lat || lng < southWest.lng || lng > northEast.lng) continue
      if (hitCanvas.isPointInPath(hoverPath, point.x, point.y, 'evenodd')) return adcode
    }
  }

  function clearPinOrbit() {
    if (!pinOrbit) return
    const { node, hide } = pinOrbit
    pinOrbit = undefined
    hide()
    syncPinOrder(node)
  }

  function trackMapPointer(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || event.buttons || cameraTween || options.sheetLarge()) return
    if (nodesOn) {
      const pin = (event.target as Element).closest<HTMLButtonElement>('.tc-map-node')
      if (pin && pin === pinOrbit?.node.element) return
      clearPinOrbit()
      if (!pin || pin.inert || pin.classList.contains('tc-pin--selected')) return
      const node = liveNodes.get(pin.dataset.nodeKey!)
      const markerPane = pin.closest<HTMLElement>('.amap-markers')
      if (node && markerPane) {
        const { members } = node
        const keywords = members.length === 1 ? options.pinKeywords(members[0].id) : []
        pinOrbit = { node, hide: showPinOrbit(container, markerPane, pin, members.map(member => member.name), keywords, options.inset()) }
        syncPinOrder(node)
      }
      return
    }
    hoverProvince(hitsMapControl(event) ? undefined : provinceAt(event))
  }

  function tapMap(event: PointerEvent) {
    if (event.defaultPrevented || hitsMapControl(event)) return
    const province = !nodesOn && !options.sheetLarge() ? provinceAt(event) : undefined
    if (province) options.selectProvince(province)
    else options.onMapClick()
  }

  function leaveMapCanvas() {
    hoverProvince()
    clearPinOrbit()
  }

  function update() {
    if (disposed) return
    const zoom = camera.getZoom()
    const scope = options.province()
    const threshold = scope || options.selected() ? provinceNodeZoom : NODE_ZOOM_THRESHOLD
    const detailed = showMapNodes(zoom, nodesOn, threshold)
    const outline = detailed ? scope : null
    if (outline !== provinceOutline) {
      const previous = provinceOutline
      provinceOutline = outline
      if (previous) {
        paintProvince(previous)
        if (detailed && opacity.density === 0) for (const shape of provinces.get(previous)?.shapes ?? []) shape.hide()
      }
      if (outline) {
        for (const shape of provinces.get(outline)?.shapes ?? []) shape.show()
        paintProvince(outline)
      }
    }
    if (detailed !== nodesOn) {
      nodesOn = detailed
      if (detailed) clearProvinceLift()
      else clearPinOrbit()
      container.classList.toggle('tc-mapapp-canvas--nodes', detailed)
      for (const node of liveNodes.values()) { node.element.inert = !detailed; if (detailed) node.marker.show() }
      if (!detailed) {
        for (const entry of provinces.values()) for (const shape of entry.shapes) shape.show()
        // 省面被 hide() 时 setOptions 不重绘，回全国要按当前状态重描一遍。
        paintProvinces()
        // 全国层不出图钉：手机回到全国就把节点整个拿掉，别留隐藏的 .pin 在 DOM 里。
        if (size.x < 1000) {
          for (const [key, node] of liveNodes) { map.remove(node.marker); liveNodes.delete(key) }
          renderedZoom = undefined
          renderedSignature = ''
        }
      }
      motion.add(() => {
        gsap.to(opacity, { density: detailed ? 0 : 1, nodes: detailed ? 1 : 0, duration: reduced() ? 0 : .28, overwrite: true,
          onUpdate() { paintProvinces(); container.style.setProperty('--tc-nodes-opacity', String(opacity.nodes)) },
          onComplete() {
            if (nodesOn) {
              for (const [adcode, entry] of provinces) {
                if (adcode !== provinceOutline) for (const shape of entry.shapes) shape.hide()
              }
            } else {
              for (const node of liveNodes.values()) node.marker.hide()
            }
          },
        })
      })
    }
    // 合并按真实缩放算，屏幕内的钉子集按中心算；相机补间中先不动，落点后再重排。
    if (nodesOn && (!cameraTween || renderedZoom === undefined)) {
      const zoomMoved = Math.abs(zoom - (renderedZoom ?? zoom + 1)) >= .25
      if (zoomMoved || nodeSignature(zoom) !== renderedSignature) {
        // 只有换层级或缩放把钉层重建时才播入场；纯平移补进来的钉子直接显示，避免拖动时乱闪。
        const entry = lastScope !== scope || zoomMoved || renderedZoom === undefined
        lastScope = scope
        renderNodes(zoom, entry)
      }
    }
    const atMin = zoom <= minZoom + .001, atMax = zoom >= MAP_MAX_ZOOM - .001
    if (atMin !== previousMin || atMax !== previousMax) {
      previousMin = atMin; previousMax = atMax
      options.limits(atMin, atMax)
    }
  }
  function interrupt() {
    options.interruptDock()
    if (cameraTween) { cameraTween.kill(); cameraTween = undefined; camera.endMove() }
    options.closeCluster()
  }
  function animateTo(point: GeoPoint, zoom: number) {
    interrupt(); wheel.cancel(); camera.beginMove()
    if (reduced()) { camera.move(point, zoom); camera.endMove(); return }
    const start = center(), state = { lat: start.lat, lng: start.lng, zoom: camera.getZoom() }
    cameraTween = gsap.to(state, { ...point, zoom, duration: .5, ease: 'power3.out',
      onUpdate: () => camera.move(state, state.zoom), onComplete: () => { cameraTween = undefined; camera.endMove() },
    })
  }
  function moveTo(point: GeoPoint, zoom: number, inset = options.inset()) {
    const targetZoom = Math.max(minZoom, Math.min(MAP_MAX_ZOOM, Math.round(zoom)))
    animateTo(unproject(project(point, targetZoom).subtract([inset / 2, 0]), targetZoom), targetZoom)
  }
  function country(animate = true) {
    provinceNodeZoom = NODE_ZOOM_THRESHOLD
    const frame = countryFrame()
    setMinZoom(frame.zoom)
    if (animate) animateTo(frame.center, frame.zoom)
    else camera.move(frame.center, frame.zoom)
  }
  function clearReadyWatchers() {
    if (readyRaf) {
      window.cancelAnimationFrame(readyRaf)
      readyRaf = 0
    }
  }
  function fireReady() {
    if (readyFired || disposed) return
    readyFired = true
    clearReadyWatchers()
    options.ready()
  }
  function isSourceTilesLoaded(src: AmapInternalSource | undefined) {
    if (!src || typeof src.ha !== 'function' || typeof src.ra !== 'function') return true
    if (!src.a_ || !src.aa) return false
    const z = src.ra(src.aa.optimalZoom)
    const required = src.ha(src.aa.bounds, z) ?? []
    const loaded = src.sa ?? []
    if (required.length === 0 || loaded.length < required.length) return false
    const keys = new Set(loaded.map((tile) => tile.key))
    return required.every((tile) => keys.has(tile.key))
  }
  function isInitialViewPainted() {
    if (!internalMap.complete || !densityLoaded || cameraTween) return false
    const yh = internalMap.Mv?.Yh
    if (yh) {
      const vec = Object.values(yh).find((src) => Array.isArray(src?._overlays))
      const overlays = vec?._overlays ?? []
      if (provinces.size > 0 && (overlays.length === 0 || overlays.some((item) => item && item._needUpdate))) {
        return false
      }
      if (!isSourceTilesLoaded(yh.nebula) || !isSourceTilesLoaded(yh.nebulaLabel)) {
        return false
      }
    }
    const dyn = internalMap.bZ?.dynamic
    if (dyn && typeof dyn.get === 'function') {
      if (!dyn.get('firstAllLoaded') || !dyn.get('firstLabelDataAllLoaded') || !dyn.get('firstPaint')) {
        return false
      }
    }
    return true
  }
  function pollInitialReady() {
    readyRaf = 0
    if (readyFired || disposed) return
    if (isInitialViewPainted()) {
      settledFrames += 1
      if (settledFrames >= 2) {
        fireReady()
        return
      }
    } else {
      settledFrames = 0
    }
    readyRaf = window.requestAnimationFrame(pollInitialReady)
  }
  function scheduleInitialReadyCheck() {
    if (readyFired || disposed) return
    if (!readyRaf) {
      readyRaf = window.requestAnimationFrame(pollInitialReady)
    }
  }
  container.tabIndex = 0
  // 高德在画布容器里注入的 iframe 与 .amap-maps 自带 tabindex，键盘会在两个看不见的
  // 元素上停两拍。画布本身可聚焦，这两个替身一律移出 Tab 序。
  const muffleMapInternals = () => {
    container.querySelectorAll<HTMLElement>('iframe, .amap-maps').forEach((node) => node.setAttribute('tabindex', '-1'))
  }
  muffleMapInternals()
  map.on('complete', muffleMapInternals)
  const wheel = attachMapWheelZoom(camera)
  function onInput(event: Event) { clearProvinceLift(); clearPinOrbit(); interrupt(); if (event.type !== 'wheel') wheel.cancel() }
  function pinToOrigin() { container.scrollTop = 0; container.scrollLeft = 0 }
  container.addEventListener('wheel', onInput, { passive: true, capture: true })
  container.addEventListener('pointerdown', onInput, true)
  container.addEventListener('pointermove', trackMapPointer, true)
  container.addEventListener('pointerleave', leaveMapCanvas)
  container.addEventListener('keydown', onInput, true)
  container.addEventListener('scroll', pinToOrigin, { passive: true })
  container.addEventListener('focusin', pinToOrigin)
  const pointer = attachMapPointer(camera, tapMap)
  map.on('zoomchange', update)
  map.on('complete', scheduleInitialReadyCheck)
  // 画布换了可见区域（侧栏改宽）也要走同一套重算：尺寸没变，但取景与最小缩放都跟着 inset 变。
  function remeasure() {
    const wasCountry = camera.getZoom() <= minZoom + .001
    size = new MapPoint(container.clientWidth, container.clientHeight)
    setMinZoom(countryFrame().zoom)
    if (wasCountry) country(false)
    else camera.move(center(), camera.getZoom())
    update()
  }
  const resize = new ResizeObserver(remeasure)
  resize.observe(container)
  country(false)
  update()

  return {
    camera, syncSelection, cancelWheel: wheel.cancel, interrupt, isNavigating: () => !!cameraTween,
    setMinZoom,
    setTheme(next: Theme) {
      if (next === theme) return
      theme = next
      map.setMapStyle(next === 'dark' ? 'amap://styles/grey' : 'amap://styles/whitesmoke')
      paintProvinces()
      if (raised.size) drawProvinceLift()
    },
    /** 侧栏宽度变了但画布尺寸没变：重算取景与最小缩放，等价于容器的 resize。 */
    remeasure,
    moveTo, country,
    /** 手机筛选联动：传命中省 adcode，逐个省面改样式；null 恢复密度色。 */
    setFilterHits(adcodes: string[] | null) {
      filterHits = adcodes && adcodes.length ? new Set(adcodes) : null
      paintProvinces()
      // 钉跟筛选走：命中集合变了就重排，别等下一次相机移动。
      renderedSignature = ''
      update()
    },
    province(adcode: string, inset: number, padding: MapPadding, animate = true) {
      const entry = provinces.get(adcode)
      if (!entry) return
      const active = options.activeIds()
      const pins = options.hospitals.filter(hospital => hospital.adcode === adcode && (!active || active.has(hospital.id)))
      const frame = fitProvinceFrame(entry.mainBounds, pins, size, inset, padding, minZoom)
      // Large provinces need usable pins even when their overview lands below the national density cutoff.
      provinceNodeZoom = Math.min(NODE_ZOOM_THRESHOLD, frame.zoom)
      if (animate) animateTo(frame.center, frame.zoom)
      else {
        camera.move(frame.center, frame.zoom)
        camera.endMove()
      }
    },
    async loadDensity() {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/geo/china-provinces.json`)
      if (!response.ok) throw new Error(`省界加载失败：HTTP ${response.status}`)
      const geo: Geometry = await response.json()
      if (disposed) return
      for (const feature of geo.features) {
        const adcode = String(feature.properties.adcode)
        if (adcode.endsWith('_JD')) continue
        // MultiPolygon 的每个多边形单独建实例：大陆、岛屿、飞地各自成面，洞跟着自己的外环走。
        const coordinates = feature.geometry.type === 'MultiPolygon'
          ? (feature.geometry.coordinates as unknown as CoordinateTree[])
          : [feature.geometry.coordinates]
        const shapes: AMap.Polygon[] = []
        const provinceRings: number[][][][] = []
        const hoverPath = new Path2D()
        let minLng = Number.POSITIVE_INFINITY, minLat = Number.POSITIVE_INFINITY
        let maxLng = Number.NEGATIVE_INFINITY, maxLat = Number.NEGATIVE_INFINITY
        let mainBounds: [GeoPoint, GeoPoint] | undefined
        let mainArea = -1
        for (const polygon of coordinates) {
          // 洞是外环之后的独立环：整棵环树交给 SDK，河北才不会把北京天津盖掉。
          const rings = gcjCoordinateTree(polygon) as number[][][]
          provinceRings.push(rings)
          let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity
          for (const [lng, lat] of rings[0]) {
            west = Math.min(west, lng); south = Math.min(south, lat)
            east = Math.max(east, lng); north = Math.max(north, lat)
          }
          // Distant offshore polygons belong to the density map, but should not set the overview scale.
          const area = (east - west) * (north - south)
          if (area > mainArea) {
            mainArea = area
            mainBounds = [{ lng: west, lat: south }, { lng: east, lat: north }]
          }
          for (const ring of rings) {
            ring.forEach(([lng, lat], index) => {
              minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng)
              minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat)
              const { x, y } = project([lat, lng], PROVINCE_HIT_ZOOM)
              if (index === 0) hoverPath.moveTo(x, y)
              else hoverPath.lineTo(x, y)
            })
            hoverPath.closePath()
          }
          const shape = new sdk.Polygon()
          shape.setOptions({ path: rings as unknown as AMap.LngLatLike[][][],
            fillOpacity: 0,
            strokeColor: palettes[theme].stroke, strokeWeight: 1.1, zIndex: 20, bubble: false, cursor: 'pointer',
          })
          shapes.push(shape)
          map.add(shape)
          if (nodesOn) shape.hide()
        }
        if (!mainBounds) continue
        provinces.set(adcode, {
          shapes,
          rings: provinceRings,
          hoverPath,
          mainBounds,
          bounds: {
            southWest: { lng: minLng, lat: minLat },
            northEast: { lng: maxLng, lat: maxLat },
            center: { lng: (minLng + maxLng) / 2, lat: (minLat + maxLat) / 2 },
          },
        })
      }
      paintProvinces()
      densityLoaded = true
      internalMap.render?.()
      scheduleInitialReadyCheck()
    },
    destroy() {
      disposed = true; clearReadyWatchers(); cameraTween?.kill(); resize.disconnect(); pointer.dispose(); wheel.dispose(); motion.revert()
      clearProvinceLift()
      clearPinOrbit()
      liftLayer?.destroy()
      container.removeEventListener('wheel', onInput, true)
      container.removeEventListener('pointerdown', onInput, true)
      container.removeEventListener('pointermove', trackMapPointer, true)
      container.removeEventListener('pointerleave', leaveMapCanvas)
      container.removeEventListener('keydown', onInput, true)
      container.removeEventListener('scroll', pinToOrigin)
      container.removeEventListener('focusin', pinToOrigin)
      map.destroy()
    },
  }
}
