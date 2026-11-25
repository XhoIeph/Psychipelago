import { MapPoint, type MapCamera } from './map-camera.ts'

// A single input owner prevents SDK overscroll and competing post-drag corrections.
export function attachMapPointer(map: MapCamera, onTap?: (event: PointerEvent) => void) {
  const container = map.getContainer()
  const pointers = new Map<number, MapPoint>()
  let frame: number | undefined
  let origin: { zoom: number; anchor: ReturnType<MapCamera['getCenter']>; distance: number }
  let offset = new MapPoint(0, 0)
  let firstPoint: MapPoint
  let moved = false, suppressClick = false
  const interactive = (target: EventTarget | null) => target instanceof Element && !!target.closest('button,a,input,select,summary')
  const position = (event: PointerEvent) => new MapPoint(event.clientX, event.clientY).subtract(offset)
  const midpoint = () => {
    const [a, b] = [...pointers.values()]
    return b ? a.add(b).divideBy(2) : a
  }
  const distance = () => {
    const [a, b] = [...pointers.values()]
    return b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
  }
  const snapshot = () => {
    origin = { zoom: map.getZoom(), anchor: map.containerPointToLatLng(midpoint()), distance: distance() }
  }
  const draw = () => {
    frame = undefined
    const zoom = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), origin.zoom + (origin.distance ? Math.log2(distance() / origin.distance) : 0)))
    const requested = map.unproject(map.project(origin.anchor, zoom).subtract(midpoint().subtract(map.getSize().divideBy(2))), zoom)
    map.move(requested, zoom)
    const clipped = map.project(map.getCenter(), zoom).subtract(map.project(requested, zoom))
    // Rebase at the edge so reversing the pointer responds immediately, without a dead zone.
    if (Math.hypot(clipped.x, clipped.y) > .05) snapshot()
  }
  const down = (event: PointerEvent) => {
    if (!pointers.size) suppressClick = false
    if (interactive(event.target) || (event.pointerType === 'mouse' && event.button !== 0)) return
    if (!pointers.size) {
      const rect = container.getBoundingClientRect()
      offset = new MapPoint(rect.left, rect.top)
      firstPoint = position(event)
      moved = false
      container.focus({ preventScroll: true })
      map.beginMove()
    }
    if (pointers.size === 2) return
    pointers.set(event.pointerId, position(event))
    if (pointers.size === 2) moved = true
    snapshot()
  }
  const move = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return
    event.preventDefault()
    pointers.set(event.pointerId, position(event))
    const point = position(event)
    // Capture only intentional drags so taps keep their original targets.
    if (!moved && Math.hypot(point.x - firstPoint.x, point.y - firstPoint.y) <= 3) return
    moved = true
    for (const id of pointers.keys()) if (!container.hasPointerCapture(id)) container.setPointerCapture(id)
    if (frame === undefined) frame = requestAnimationFrame(draw)
  }
  const up = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return
    if (frame !== undefined) { cancelAnimationFrame(frame); draw() }
    pointers.delete(event.pointerId)
    if (container.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId)
    if (pointers.size) snapshot()
    else {
      suppressClick = moved
      map.endMove()
      // The SDK can cancel touchstart and suppress the resulting DOM click.
      if (!moved && event.type === 'pointerup') onTap?.(event)
    }
  }
  const zoomAt = (point: MapPoint, change: number) => {
    const anchor = map.containerPointToLatLng(point)
    const zoom = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), Math.round(map.getZoom()) + change))
    map.beginMove()
    map.move(map.unproject(map.project(anchor, zoom).subtract(point.subtract(map.getSize().divideBy(2))), zoom), zoom)
    map.endMove()
  }
  const doubleClick = (event: MouseEvent) => {
    if (interactive(event.target)) return
    event.preventDefault()
    zoomAt(map.mouseEventToContainerPoint(event), event.shiftKey ? -1 : 1)
  }
  const keyDown = (event: KeyboardEvent) => {
    if (interactive(event.target) || event.ctrlKey || event.metaKey || event.altKey) return
    const pan: Record<string, [number, number]> = { ArrowLeft: [-80, 0], ArrowRight: [80, 0], ArrowUp: [0, -80], ArrowDown: [0, 80] }
    if (['+', '=', '-'].includes(event.key)) { event.preventDefault(); zoomAt(map.getSize().divideBy(2), event.key === '-' ? -1 : 1) }
    else if (pan[event.key]) {
      event.preventDefault(); map.beginMove()
      map.move(map.unproject(map.project(map.getCenter(), map.getZoom()).add(pan[event.key]), map.getZoom()), map.getZoom())
      map.endMove()
    }
  }
  const click = (event: MouseEvent) => { if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false } }
  container.addEventListener('pointerdown', down, true)
  container.addEventListener('pointermove', move, true)
  container.addEventListener('pointerup', up, true)
  container.addEventListener('pointercancel', up, true)
  container.addEventListener('dblclick', doubleClick, true)
  container.addEventListener('keydown', keyDown, true)
  container.addEventListener('click', click, true)
  return {
    dispose() {
      if (frame !== undefined) cancelAnimationFrame(frame)
      for (const id of pointers.keys()) if (container.hasPointerCapture(id)) container.releasePointerCapture(id)
      pointers.clear()
      container.removeEventListener('pointerdown', down, true)
      container.removeEventListener('pointermove', move, true)
      container.removeEventListener('pointerup', up, true)
      container.removeEventListener('pointercancel', up, true)
      container.removeEventListener('dblclick', doubleClick, true)
      container.removeEventListener('keydown', keyDown, true)
      container.removeEventListener('click', click, true)
    },
  }
}
