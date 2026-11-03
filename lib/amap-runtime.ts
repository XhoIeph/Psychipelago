import { gsap } from 'gsap'
import type { MapHospital, MapProvinceStat } from '../components/map/types'
import { MAP_MAX_ZOOM, MapPoint, project, unproject, fitMapBounds, type GeoPoint, type MapCamera } from './map-camera'
import { CHINA_BOUNDS, constrainChinaCenter } from './map-sidebar'
import { gcjCoordinateTree, type CoordinateTree } from './map-coordinates'
import { mapNodeLayout } from './map-nodes'
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
  selectHospital(id: string): void
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
  let renderedLevel: number | undefined
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
  function renderNodes(level: number) {
    renderedLevel = level
    const layout = mapNodeLayout(options.hospitals, hospital => project(hospital, level))
    const keys = new Set(layout.map(entry => entry.key))
    motion.add(() => {
      for (const entry of layout) {
        let node = liveNodes.get(entry.key)
        if (!node) {
          const single = entry.members.length === 1
          const element = document.createElement('button')
          element.type = 'button'
          // 地图点与侧栏列表是同一批内容，键盘搬运走画布容器；点本身不进 Tab 序。
          element.tabIndex = -1
          element.className = `tc-map-node ${single ? 'tc-hospital-pin' : 'tc-cluster-pin'}`
          element.dataset.nodeKey = entry.key
          element.dataset.nodeInstance = String(++instance)
          element.dataset.nodeLat = String(entry.lat)
          element.dataset.nodeLng = String(entry.lng)
          const body = document.createElement('span')
          body.className = single ? 'tc-pin-body' : 'tc-cluster-body'
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
            if (single) options.selectHospital(entry.members[0].id)
            else if (camera.getZoom() < MAP_MAX_ZOOM - .001) moveTo({ lat: entry.lat, lng: entry.lng }, Math.min(MAP_MAX_ZOOM, Math.floor(camera.getZoom()) + 2))
            else {
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
        node.element.setAttribute('aria-label', entry.members.length === 1 ? entry.members[0].name : `${entry.members.length} 家医院，${level >= MAP_MAX_ZOOM ? '查看医院' : '点击放大'}`)
        if (nodesOn) node.marker.show()
        gsap.to(node.element.firstElementChild, { autoAlpha: 1, scale: 1, duration: reduced() ? 0 : .32, overwrite: true })
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
  function update() {
    if (disposed) return
    const zoom = camera.getZoom(), detailed = showMapNodes(zoom, nodesOn)
    if (detailed !== nodesOn) {
      nodesOn = detailed
      container.classList.toggle('tc-mapapp-canvas--nodes', detailed)
      for (const node of liveNodes.values()) { node.element.inert = !detailed; if (detailed) node.marker.show() }
      if (!detailed) for (const polygon of provinces.values()) polygon.show()
      motion.add(() => {
        gsap.to(opacity, { density: detailed ? 0 : 1, nodes: detailed ? 1 : 0, duration: reduced() ? 0 : .28, overwrite: true,
          onUpdate() { densityOpacity(); container.style.setProperty('--tc-nodes-opacity', String(opacity.nodes)) },
          onComplete() { if (nodesOn) { for (const polygon of provinces.values()) polygon.hide() } else { for (const node of liveNodes.values()) node.marker.hide() } },
        })
      })
    }
    const level = Math.max(NODE_ZOOM_THRESHOLD, Math.floor(zoom + 1e-7))
    if (nodesOn && level !== renderedLevel) renderNodes(level)
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
        const polygon = new sdk.Polygon()
        polygon.setOptions({ path: gcjCoordinateTree(feature.geometry.coordinates) as AMap.LngLatLike[][][],
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
      map.destroy()
    },
  }
}
