import type { GeoPoint, MapCamera, MapPoint } from './map-camera.ts'

// Fractional frames keep the cursor anchor fixed; each gesture settles at an integer zoom.
export function attachMapWheelZoom(map: MapCamera) {
  const container = map.getContainer()
  let frame: number | undefined
  let delta = 0
  let lastInputAt = -Infinity
  let targetZoom: number | undefined
  let lastDirection = 0
  let anchor: MapPoint
  let anchorLatLng: GeoPoint
  let active = false
  let lastFrameAt = 0

  const reset = () => {
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
    delta = 0
    targetZoom = undefined
    lastDirection = 0
    active = false
  }

  const draw = (zoom: number) => {
    const offset = anchor.subtract(map.getSize().divideBy(2))
    const center = map.unproject(map.project(anchorLatLng, zoom).subtract(offset), zoom)
    map.move(center, zoom)
  }

  const cancel = () => {
    const wasActive = active
    if (wasActive) draw(Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), Math.round(map.getZoom()))))
    reset()
    if (wasActive) map.endMove()
  }

  const apply = (now: number) => {
    frame = undefined
    const steps = Math.trunc(delta / 100)
    delta %= 100
    const current = map.getZoom()
    if (steps) {
      const direction = -Math.sign(steps)
      // Reverse from the visible camera instead of completing the previous target.
      if (targetZoom === undefined || direction !== lastDirection) {
        targetZoom = direction > 0 ? Math.floor(current) : Math.ceil(current)
      }
      lastDirection = direction
      // Bound the lead so a fast wheel does not leave a long animation queue.
      targetZoom = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(),
        Math.max(Math.floor(current) - 1, Math.min(Math.ceil(current) + 1, targetZoom - steps)),
      ))
    }
    if (targetZoom === undefined || (!active && targetZoom === current)) return

    if (!active) {
      map.beginMove()
      active = true
      lastFrameAt = now - 16
    }
    const elapsed = Math.min(64, Math.max(0, now - lastFrameAt))
    lastFrameAt = now
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const next = reducedMotion ? targetZoom : current + (targetZoom - current) * (1 - Math.exp(-elapsed / 55))
    const done = Math.abs(targetZoom - next) < 0.001
    // Derive every frame from the same geographic anchor, not the viewport center.
    draw(done ? targetZoom : next)
    if (done) {
      reset()
      map.endMove()
    } else {
      frame = requestAnimationFrame(apply)
    }
  }

  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return
    event.preventDefault()
    const now = performance.now()
    if (now - lastInputAt > 180) {
      delta = 0
      if (!active) {
        targetZoom = undefined
        lastDirection = 0
      }
    }
    lastInputAt = now
    const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 600 : 1)
    if (delta && Math.sign(delta) !== Math.sign(pixels)) delta = 0
    delta += pixels
    anchor = map.mouseEventToContainerPoint(event)
    anchorLatLng = map.containerPointToLatLng(anchor)
    if (frame === undefined) frame = requestAnimationFrame(apply)
  }

  container.addEventListener('wheel', onWheel, { passive: false })
  container.addEventListener('pointerdown', cancel)
  container.addEventListener('keydown', cancel)
  return {
    cancel,
    dispose: () => {
      cancel()
      container.removeEventListener('wheel', onWheel)
      container.removeEventListener('pointerdown', cancel)
      container.removeEventListener('keydown', cancel)
    },
  }
}
