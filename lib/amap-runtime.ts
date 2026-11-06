import { gsap } from 'gsap'
import type { MapHospital, MapProvinceStat } from '../components/map/types'
import { MAP_MAX_ZOOM, MapPoint, project, unproject, fitMapBounds, type GeoPoint, type MapCamera } from './map-camera'
import { CHINA_BOUNDS, constrainChinaCenter } from './map-sidebar'
import { gcjCoordinateTree, type CoordinateTree } from './map-coordinates'
import { mapNodeLayout, NODE_SPACING } from './map-nodes'
import { NODE_ZOOM_THRESHOLD, showMapNodes } from './map-mode'
import { attachMapWheelZoom } from './map-wheel-zoom'
import { attachMapPointer } from './map-pointer'

const colors = ['#ffffff', '#b9e6c8', '#7dd3a4', '#4dbb83', '#2f9e68', '#147a52']
const densityColor = (count: number) => colors[count <= 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : count <= 7 ? 3 : count <= 10 ? 4 : 5]
type Geometry = { features: { properties: { adcode: string | number }; geometry: { coordinates: CoordinateTree } }[] }
type LiveNode = { marker: AMap.Marker; element: HTMLButtonElement; members: string[]; exit?: gsap.core.Tween }

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
}) {
  const map = new sdk.Map(container, {
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
  const provinces = new Map<string, AMap.Polygon>()
  let nodesOn = false
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
      const wide = size.x >= 1000
      const target = constrainChinaCenter({ ...camera, getZoom: () => zoom }, point, wide ? options.inset() : 0, wide ? 0 : 48)
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
  function renderNodes(zoom: number) {
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
      for (const entry of layout) {
        let node = liveNodes.get(entry.key)
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
          gsap.set(body, { autoAlpha: 0, scale: .92 })
        }
        node.exit?.kill(); node.exit = undefined
        node.element.inert = !nodesOn
        node.element.setAttribute('aria-label', entry.members.length === 1
          ? `${entry.members[0].name} · ${entry.members[0].leads} 条线索`
          : `${entry.members.length} 家医院，${camera.getZoom() >= MAP_MAX_ZOOM - .001 ? '查看医院' : '点击放大'}`)
        if (nodesOn) node.marker.show()
        gsap.to(node.element.firstElementChild, { autoAlpha: 1, scale: 1, duration: reduced() ? 0 : .4, overwrite: true })
      }
      for (const [key, node] of liveNodes) {
        if (keys.has(key) || node.exit) continue
        node.element.inert = true
        node.exit = gsap.to(node.element.firstElementChild, { autoAlpha: 0, scale: .92, duration: reduced() ? 0 : .32, overwrite: true,
          onComplete: () => { map.remove(node.marker); liveNodes.delete(key) } })
      }
    })
    syncSelection()
  }
  const opacity = { density: 1, nodes: 0 }
  function densityOpacity() {
    for (const [adcode, polygon] of provinces) polygon.setOptions({ fillOpacity: opacity.density * (options.stats[adcode]?.reports ? .55 : 0), strokeOpacity: opacity.density })
  }

  // 筛选联动：AMap 的省面只当密度底色，压层与命中省另画一层 SVG，
  // 这样「盖住底图、只留几个省提亮」不用逐面改 Polygon，也不会跟密度动画打架。
  const SVG_NS = 'http://www.w3.org/2000/svg'
  const geoLayer = document.createElementNS(SVG_NS, 'svg')
  geoLayer.setAttribute('class', 'tc-map-geo geo')
  geoLayer.setAttribute('aria-hidden', 'true')
  const veil = document.createElementNS(SVG_NS, 'rect')
  veil.setAttribute('class', 'veil')
  veil.setAttribute('width', '100%')
  veil.setAttribute('height', '100%')
  geoLayer.append(veil)
  const hitsLayer = document.createElementNS(SVG_NS, 'g')
  hitsLayer.setAttribute('class', 'hits')
  geoLayer.append(hitsLayer)
  container.append(geoLayer)
  const provinceRings = new Map<string, number[][][][]>()
  const hitPaths = new Map<string, SVGPathElement>()
  let filterHits: Set<string> | null = null

  function drawFilter() {
    const active = !!filterHits && filterHits.size > 0 && !nodesOn
    geoLayer.classList.toggle('is-on', active)
    if (!active) {
      for (const path of hitPaths.values()) path.remove()
      hitPaths.clear()
      return
    }
    const zoom = camera.getZoom()
    const origin = project(camera.getCenter(), zoom).subtract(size.divideBy(2))
    for (const adcode of filterHits!) {
      const rings = provinceRings.get(adcode)
      if (!rings) continue
      let d = ''
      for (const polygon of rings) {
        for (const ring of polygon) {
          for (let index = 0; index < ring.length; index++) {
            const point = project({ lng: ring[index][0], lat: ring[index][1] }, zoom).subtract(origin)
            d += `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`
          }
          d += 'Z'
        }
      }
      let path = hitPaths.get(adcode)
      if (!path) {
        path = document.createElementNS(SVG_NS, 'path')
        path.setAttribute('class', 'hit')
        hitsLayer.append(path)
        hitPaths.set(adcode, path)
      }
      path.setAttribute('d', d)
    }
    for (const [adcode, path] of hitPaths) {
      if (filterHits!.has(adcode)) continue
      path.remove()
      hitPaths.delete(adcode)
    }
  }

  function update() {
    if (disposed) return
    const zoom = camera.getZoom(), detailed = showMapNodes(zoom, nodesOn)
    if (detailed !== nodesOn) {
      nodesOn = detailed
      container.classList.toggle('tc-mapapp-canvas--nodes', detailed)
      for (const node of liveNodes.values()) { node.element.inert = !detailed; if (detailed) node.marker.show() }
      if (!detailed) {
        for (const polygon of provinces.values()) polygon.show()
        // 全国层不出图钉：手机回到全国就把节点整个拿掉，别留隐藏的 .pin 在 DOM 里。
        if (size.x < 1000) {
          for (const [key, node] of liveNodes) { map.remove(node.marker); liveNodes.delete(key) }
          renderedZoom = undefined
          renderedSignature = ''
        }
      }
      motion.add(() => {
        gsap.to(opacity, { density: detailed ? 0 : 1, nodes: detailed ? 1 : 0, duration: reduced() ? 0 : .28, overwrite: true,
          onUpdate() { densityOpacity(); container.style.setProperty('--tc-nodes-opacity', String(opacity.nodes)) },
          onComplete() { if (nodesOn) { for (const polygon of provinces.values()) polygon.hide() } else { for (const node of liveNodes.values()) node.marker.hide() } },
        })
      })
    }
    // 合并按真实缩放算，屏幕内的钉子集按中心算；相机补间中先不动，落点后再重排。
    if (nodesOn && (!cameraTween || renderedZoom === undefined)) {
      const zoomMoved = Math.abs(zoom - (renderedZoom ?? zoom + 1)) >= .25
      if (zoomMoved || nodeSignature(zoom) !== renderedSignature) renderNodes(zoom)
    }
    const atMin = zoom <= minZoom + .001, atMax = zoom >= MAP_MAX_ZOOM - .001
    drawFilter()
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
  const resize = new ResizeObserver(() => {
    const wasCountry = camera.getZoom() <= minZoom + .001
    size = new MapPoint(container.clientWidth, container.clientHeight)
    setMinZoom(countryFrame().zoom)
    if (wasCountry) country(false)
    else camera.move(center(), camera.getZoom())
    update()
  })
  resize.observe(container)
  country(false)
  update()

  return {
    camera, syncSelection, cancelWheel: wheel.cancel, interrupt, isNavigating: () => !!cameraTween,
    setMinZoom,
    moveTo, country,
    /** 手机筛选联动：传命中省 adcode，其余被压层盖住；null 取消。 */
    setFilterHits(adcodes: string[] | null) {
      filterHits = adcodes && adcodes.length ? new Set(adcodes) : null
      drawFilter()
      // 钉跟筛选走：命中集合变了就重排，别等下一次相机移动。
      renderedSignature = ''
      update()
    },
    province(adcode: string, inset: number) {
      const bounds = provinces.get(adcode)?.getBounds()
      if (!bounds) return
      const sw = bounds.getSouthWest(), ne = bounds.getNorthEast()
      const frame = fitMapBounds([{ lat: sw.getLat(), lng: sw.getLng() }, { lat: ne.getLat(), lng: ne.getLng() }], size, 0, size.x >= 1000 ? [84, 70, 20, 20] : [12, 12, 12, 12])
      const midpoint = bounds.getCenter()
      moveTo({ lat: midpoint.getLat(), lng: midpoint.getLng() }, Math.max(NODE_ZOOM_THRESHOLD, frame.zoom), inset)
    },
    async loadDensity() {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/geo/china-provinces.json`)
      if (!response.ok) throw new Error(`省界加载失败：HTTP ${response.status}`)
      const geo: Geometry = await response.json()
      if (disposed) return
      for (const feature of geo.features) {
        const adcode = String(feature.properties.adcode)
        if (adcode.endsWith('_JD')) continue
        const rings = gcjCoordinateTree(feature.geometry.coordinates) as number[][][][]
        provinceRings.set(adcode, rings)
        const polygon = new sdk.Polygon()
        polygon.setOptions({ path: rings as AMap.LngLatLike[][][],
          fillColor: densityColor(options.stats[adcode]?.reports ?? 0), fillOpacity: .55,
          strokeColor: '#78a88e', strokeWeight: 1.1, zIndex: 20, bubble: false, cursor: 'pointer',
        })
        polygon.on('click', () => { if (!nodesOn) options.selectProvince(adcode) })
        provinces.set(adcode, polygon)
        map.add(polygon)
        if (nodesOn) polygon.hide()
      }
      densityOpacity()
    },
    destroy() {
      disposed = true; cameraTween?.kill(); resize.disconnect(); pointer.dispose(); wheel.dispose(); motion.revert()
      container.removeEventListener('wheel', onInput, true)
      container.removeEventListener('pointerdown', onInput, true)
      container.removeEventListener('keydown', onInput, true)
      container.removeEventListener('scroll', pinToOrigin)
      container.removeEventListener('focusin', pinToOrigin)
      geoLayer.remove()
      map.destroy()
    },
  }
}
