import { gsap } from 'gsap'
import type { MapHospital, MapProvinceStat } from '../components/map/types'
import { MAP_MAX_ZOOM, MapPoint, project, unproject, fitMapBounds, type GeoPoint, type MapCamera } from './map-camera'
import { CHINA_BOUNDS, constrainChinaCenter } from './map-sidebar'
import { gcjCoordinateTree, type CoordinateTree } from './map-coordinates'
import { mapNodeLayout, NODE_SPACING } from './map-nodes'
import { NODE_ZOOM_THRESHOLD, showMapNodes } from './map-mode'
import { attachMapWheelZoom } from './map-wheel-zoom'
import { attachMapPointer } from './map-pointer'
import type { Theme } from './theme'

export type { Theme }
// 密度色阶与筛选色的夜间值来自 DARK-THEME-v1.md §4：两色线性插值，只有一个数组常量。
// 夜间五档按线性光插值取中间值：sRGB 直接插值会让最低两档在深底上几乎贴在一起。
const densityRamp: Record<Theme, readonly string[]> = {
  light: ['#ffffff', '#cfe3d3', '#a3cdb0', '#74b189', '#4f9166', '#2f6349'],
  dark: ['#16311f', '#16311f', '#2a5237', '#3a6d49', '#4a8759', '#5aa06a'],
}
const densityIndex = (count: number) => (count <= 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : count <= 7 ? 3 : count <= 10 ? 4 : 5)
const densityColor = (theme: Theme, count: number) => densityRamp[theme][densityIndex(count)]
const palettes: Record<Theme, { hitFill: string; hitStroke: string; hitOpacity: number; missOpacity: number; blockOpacity: number; stroke: string }> = {
  light: { hitFill: '#3b634b', hitStroke: 'rgba(59,99,75,.5)', hitOpacity: .26, missOpacity: .04, blockOpacity: .55, stroke: '#78a88e' },
  dark: { hitFill: '#8fd7a8', hitStroke: 'rgba(143,215,168,.5)', hitOpacity: .24, missOpacity: .02, blockOpacity: .9, stroke: '#4a5f57' },
}
type Geometry = { features: { properties: { adcode: string | number; name?: string }; geometry: { type?: string; coordinates: CoordinateTree } }[] }
type LiveNode = { marker: AMap.Marker; element: HTMLButtonElement; members: string[]; exit?: gsap.core.Tween }
/** 省面可能是 MultiPolygon：每个多边形单独建实例，飞地与岛屿才不会连成一整块。 */
type ProvinceEntry = {
  shapes: AMap.Polygon[]
  bounds: { southWest: GeoPoint; northEast: GeoPoint; center: GeoPoint }
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
  const map = new sdk.Map(container, {
    mapStyle: options.theme === 'dark' ? 'amap://styles/grey' : 'amap://styles/whitesmoke',
    // 标注层压在矢量色块之上：否则省份密度填充会把底图文字染成灰绿。
    labelzIndex: 130,
    viewMode: '2D', center: [105, 35.5], zoom: 4, zooms: [2, MAP_MAX_ZOOM],
    animateEnable: false, jogEnable: false, scrollWheel: false, rotateEnable: false, pitchEnable: false,
    dragEnable: false, touchZoom: false, keyboardEnable: false, doubleClickZoom: false,
  })
  map.addControl(new sdk.Scale({ position: 'LB', offset: [20, 28] }))
  let size = new MapPoint(container.clientWidth, container.clientHeight)
  let minZoom = 2
  let disposed = false
  let cameraTween: gsap.core.Tween | undefined
  const liveNodes = new Map<string, LiveNode>()
  const provinces = new Map<string, ProvinceEntry>()
  let nodesOn = false
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
  function syncSelection() {
    for (const node of liveNodes.values()) {
      const selected = node.members.includes(options.selected() ?? '')
      node.element.classList.toggle('tc-pin--selected', selected)
      node.marker.setzIndex(selected ? 1000 : 200)
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
          element.title = entry.members.map(item => item.name).join('、')
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
          node = { marker, element, members: entry.members.map(member => member.id) }
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
    const hit = filterHits ? filterHits.has(adcode) : null
    const style = hit === true
      ? { fillColor: palette.hitFill, fillOpacity: palette.hitOpacity, strokeColor: palette.hitStroke, strokeWeight: 1, strokeOpacity: 1 }
      : hit === false
        ? { fillColor: densityColor(theme, reports), fillOpacity: palette.missOpacity, strokeColor: palette.stroke, strokeWeight: 1.1, strokeOpacity: .25 }
        : { fillColor: densityColor(theme, reports), fillOpacity: reports > 0 ? palette.blockOpacity : 0, strokeColor: palette.stroke, strokeWeight: 1.1, strokeOpacity: 1 }
    style.fillOpacity *= opacity.density
    style.strokeOpacity *= opacity.density
    for (const shape of entry.shapes) shape.setOptions(style)
  }
  function paintProvinces() {
    for (const adcode of provinces.keys()) paintProvince(adcode)
  }

  function update() {
    if (disposed) return
    const zoom = camera.getZoom(), detailed = showMapNodes(zoom, nodesOn)
    if (detailed !== nodesOn) {
      nodesOn = detailed
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
              for (const entry of provinces.values()) for (const shape of entry.shapes) shape.hide()
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
        const nextScope = options.province() ?? null
        const entry = lastScope !== nextScope || zoomMoved || renderedZoom === undefined
        lastScope = nextScope
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
  function countryFrame() {
    const wide = size.x >= 1000
    const bounds: [GeoPoint, GeoPoint] = CHINA_BOUNDS.map(([lat, lng]) => ({ lat, lng })) as [GeoPoint, GeoPoint]
    // The phone canvas no longer sits under floating bars, so it needs a small uniform pad, not 136px.
    return fitMapBounds(bounds, size, wide ? options.inset() : 0, wide ? [80, 70, 16, 16] : [12, 12, 12, 12])
  }
  function country(animate = true) {
    const frame = countryFrame()
    setMinZoom(frame.zoom)
    if (animate) animateTo(frame.center, frame.zoom)
    else camera.move(frame.center, frame.zoom)
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
  function onInput(event: Event) { interrupt(); if (event.type !== 'wheel') wheel.cancel() }
  function pinToOrigin() { container.scrollTop = 0; container.scrollLeft = 0 }
  container.addEventListener('wheel', onInput, { passive: true, capture: true })
  container.addEventListener('pointerdown', onInput, true)
  container.addEventListener('keydown', onInput, true)
  container.addEventListener('scroll', pinToOrigin, { passive: true })
  container.addEventListener('focusin', pinToOrigin)
  const pointer = attachMapPointer(camera)
  map.on('zoomchange', update)
  map.on('complete', options.ready)
  map.on('click', (event) => {
    // 图钉是我们盖在地图上的 DOM；点它时别把点击再当成「点空白」处理一遍。
    const target = event.originEvent?.target as HTMLElement | null | undefined
    if (target?.closest?.('.tc-map-node')) return
    options.onMapClick()
  })
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
    /** 主题切换：底图样式与省面色一起换；不做整屏过渡，避免两套主题混一帧。 */
    setTheme(next: Theme) {
      if (next === theme) return
      theme = next
      map.setMapStyle(next === 'dark' ? 'amap://styles/grey' : 'amap://styles/whitesmoke')
      paintProvinces()
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
    province(adcode: string, inset: number) {
      const entry = provinces.get(adcode)
      if (!entry) return
      const { southWest, northEast, center } = entry.bounds
      const frame = fitMapBounds([{ lat: southWest.lat, lng: southWest.lng }, { lat: northEast.lat, lng: northEast.lng }], size, 0, size.x >= 1000 ? [84, 70, 20, 20] : [12, 12, 12, 12])
      moveTo({ lat: center.lat, lng: center.lng }, Math.max(NODE_ZOOM_THRESHOLD, frame.zoom), inset)
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
        let minLng = Number.POSITIVE_INFINITY, minLat = Number.POSITIVE_INFINITY
        let maxLng = Number.NEGATIVE_INFINITY, maxLat = Number.NEGATIVE_INFINITY
        for (const polygon of coordinates) {
          // 洞是外环之后的独立环：整棵环树交给 SDK，河北才不会把北京天津盖掉。
          const rings = gcjCoordinateTree(polygon) as number[][][]
          for (const ring of rings) {
            for (const [lng, lat] of ring) {
              minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng)
              minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat)
            }
          }
          const shape = new sdk.Polygon()
          shape.setOptions({ path: rings as unknown as AMap.LngLatLike[][][],
            fillColor: densityColor(theme, options.stats[adcode]?.reports ?? 0), fillOpacity: 0,
            strokeColor: palettes[theme].stroke, strokeWeight: 1.1, zIndex: 20, bubble: false, cursor: 'pointer',
          })
          shape.on('click', () => {
            // 大卡时地图只剩一条缝，省界几乎盖满；这一下是在说「把卡让开」，不是「跳去这个省」。
            if (options.sheetLarge()) { options.onMapClick(); return }
            if (!nodesOn) options.selectProvince(adcode)
          })
          shapes.push(shape)
          map.add(shape)
          if (nodesOn) shape.hide()
        }
        if (shapes.length === 0) continue
        provinces.set(adcode, {
          shapes,
          bounds: {
            southWest: { lng: minLng, lat: minLat },
            northEast: { lng: maxLng, lat: maxLat },
            center: { lng: (minLng + maxLng) / 2, lat: (minLat + maxLat) / 2 },
          },
        })
      }
      paintProvinces()
    },
    destroy() {
      disposed = true; cameraTween?.kill(); resize.disconnect(); pointer.dispose(); wheel.dispose(); motion.revert()
      container.removeEventListener('wheel', onInput, true)
      container.removeEventListener('pointerdown', onInput, true)
      container.removeEventListener('keydown', onInput, true)
      container.removeEventListener('scroll', pinToOrigin)
      container.removeEventListener('focusin', pinToOrigin)
      map.destroy()
    },
  }
}
