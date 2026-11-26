'use client'

import { Children, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

type Point = { x: number; y: number }

type Island = {
  element: HTMLElement
  homeX: number
  homeY: number
  radiusX: number
  radiusY: number
  coast: Point[]
  spans: { min: number; max: number }[]
  x: number
  y: number
  lastX: number
  lastY: number
  vx: number
  vy: number
}

const s = Math.SQRT1_2
const contactAxes = [[1, 0], [0, 1], [s, s], [s, -s]] as const

function containsPoint(coast: Point[], x: number, y: number) {
  let inside = false
  for (let i = 0, j = coast.length - 1; i < coast.length; j = i++) {
    const a = coast[j], b = coast[i]
    if ((a.y > y) !== (b.y > y) && x < a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y)) inside = !inside
  }
  return inside
}

function shoresOverlap(a: Island, b: Island, dx: number, dy: number) {
  for (let axis = 0; axis < 2; axis++) {
    const p = a.spans[axis], q = b.spans[axis], d = axis === 0 ? dx : dy
    if (p.max <= q.min + d || q.max + d <= p.min) return false
  }
  const p = a.coast, q = b.coast
  const left = b.spans[0].min + dx, right = b.spans[0].max + dx
  const top = b.spans[1].min + dy, bottom = b.spans[1].max + dy
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const u = p[j], v = p[i]
    const minX = Math.min(u.x, v.x), maxX = Math.max(u.x, v.x)
    const minY = Math.min(u.y, v.y), maxY = Math.max(u.y, v.y)
    if (maxX < left || minX > right || maxY < top || minY > bottom) continue
    for (let k = 0, l = q.length - 1; k < q.length; l = k++) {
      const x1 = q[l].x + dx, x2 = q[k].x + dx
      const y1 = q[l].y + dy, y2 = q[k].y + dy
      if (Math.max(x1, x2) < minX || Math.min(x1, x2) > maxX ||
          Math.max(y1, y2) < minY || Math.min(y1, y2) > maxY) continue
      const r1 = (v.x - u.x) * (y1 - u.y) - (v.y - u.y) * (x1 - u.x)
      const r2 = (v.x - u.x) * (y2 - u.y) - (v.y - u.y) * (x2 - u.x)
      const t1 = (x2 - x1) * (u.y - y1) - (y2 - y1) * (u.x - x1)
      const t2 = (x2 - x1) * (v.y - y1) - (y2 - y1) * (v.x - x1)
      if (r1 * r2 <= 0 && t1 * t2 <= 0) return true
    }
  }
  return containsPoint(p, q[0].x + dx, q[0].y + dy) || containsPoint(q, p[0].x - dx, p[0].y - dy)
}

export function ContributorIslands({ children }: { children: ReactNode }) {
  const field = useRef<HTMLUListElement>(null)
  const cards = Children.toArray(children)
  const count = cards.length
  const [order, setOrder] = useState<number[]>()

  useLayoutEffect(() => {
    // The static markup has a stable order for hydration. Each visit gets its own home positions.
    const next = Array.from({ length: count }, (_, i) => i)
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[next[i], next[j]] = [next[j], next[i]]
    }
    setOrder(next)
  }, [count])

  useEffect(() => {
    if (!order) return
    const sea = field.current!
    const islands: Island[] = Array.from(sea.querySelectorAll<HTMLElement>('.tc-contributor-island'), element => ({
      element, homeX: 0, homeY: 0, radiusX: 0, radiusY: 0, coast: [], spans: [], x: 0, y: 0, lastX: 0, lastY: 0, vx: 0, vy: 0,
    }))
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let drag: { body: Island; pointerId: number; originX: number; originY: number; x: number; y: number } | undefined
    let width = 0
    let height = 0
    let visible = false
    let frame = 0
    let lastTime = 0
    const inset = 10

    function bound(body: Island) {
      const x = Math.max(body.radiusX + inset - body.homeX, Math.min(body.x, width - body.radiusX - inset - body.homeX))
      const y = Math.max(body.radiusY + inset - body.homeY, Math.min(body.y, height - body.radiusY - inset - body.homeY))
      if ((body.x - x) * body.vx > 0) body.vx *= -0.35
      if ((body.y - y) * body.vy > 0) body.vy *= -0.35
      body.x = x
      body.y = y
    }

    function measure() {
      width = sea.clientWidth
      height = sea.clientHeight
      const seaRect = sea.getBoundingClientRect()
      for (const body of islands) {
        const { element } = body
        const rect = element.getBoundingClientRect()
        const [paintX = 0, paintY = 0] = element.style.translate.split(' ').map(value => parseFloat(value) || 0)
        body.radiusX = rect.width / 2
        body.radiusY = rect.height / 2
        body.homeX = rect.left - seaRect.left - paintX + body.radiusX
        body.homeY = rect.top - seaRect.top - paintY + body.radiusY
        const shore = element.querySelector<SVGPathElement>('defs path')!
        const view = shore.ownerSVGElement!.viewBox.baseVal
        const length = shore.getTotalLength()
        // Only the beach is solid; the translucent shoal can overlap another island's water.
        body.coast = Array.from({ length: 80 }, (_, i) => {
          const p = shore.getPointAtLength(length * i / 80)
          return { x: (p.x - view.x) * rect.width / view.width - body.radiusX, y: (p.y - view.y) * rect.height / view.height - body.radiusY }
        })
        body.spans = contactAxes.map(([nx, ny]) => {
          const projections = body.coast.map(p => p.x * nx + p.y * ny)
          return { min: Math.min(...projections), max: Math.max(...projections) }
        })
        bound(body)
      }
      if (!resolveContacts()) {
        for (const body of islands) {
          body.x = body.y = body.vx = body.vy = 0
          bound(body)
        }
        resolveContacts()
      }
      paint()
    }

    function travel(body: Island, nx: number, ny: number) {
      const x = body.homeX + body.x
      const y = body.homeY + body.y
      return Math.max(0, Math.min(
        nx > 0 ? (width - body.radiusX - inset - x) / nx : nx < 0 ? (x - body.radiusX - inset) / -nx : Infinity,
        ny > 0 ? (height - body.radiusY - inset - y) / ny : ny < 0 ? (y - body.radiusY - inset) / -ny : Infinity,
      ))
    }

    function separate(a: Island, b: Island, dx: number, dy: number, nx: number, ny: number, upper: number) {
      const retreat = travel(a, -nx, -ny)
      const advance = travel(b, nx, ny)
      let clear = Math.min(upper + 0.25, retreat + advance)
      if (clear <= 0 || (clear <= upper && shoresOverlap(a, b, dx + clear * nx, dy + clear * ny))) return false
      let solid = 0
      while (clear - solid > 0.25) {
        const mid = (solid + clear) / 2
        if (shoresOverlap(a, b, dx + mid * nx, dy + mid * ny)) solid = mid
        else clear = mid
      }
      const overlap = Math.min(clear + 0.1, retreat + advance)

      const share = drag?.body === a ? 0.26 : drag?.body === b ? 0.74 : 0.5
      const moveA = Math.max(overlap - advance, Math.min(retreat, overlap * share))
      const moveB = overlap - moveA
      a.x -= moveA * nx
      a.y -= moveA * ny
      b.x += moveB * nx
      b.y += moveB * ny
      const impulse = Math.max(0, (a.vx - b.vx) * nx + (a.vy - b.vy) * ny) * 1.08
      a.vx -= impulse * share * nx
      a.vy -= impulse * share * ny
      b.vx += impulse * (1 - share) * nx
      b.vy += impulse * (1 - share) * ny
      return true
    }

    function resolveContacts() {
      for (let pass = 0; pass < 32; pass++) {
        let contact = false
        for (let i = 0; i < islands.length; i++) {
          const a = islands[i]
          for (let j = i + 1; j < islands.length; j++) {
            const b = islands[j]
            const dx = b.homeX + b.x - a.homeX - a.x
            const dy = b.homeY + b.y - a.homeY - a.y
            if (!shoresOverlap(a, b, dx, dy)) continue
            contact = true
            const contacts = contactAxes.map(([nx, ny], axis) => {
              const delta = dx * nx + dy * ny
              const p = a.spans[axis], q = b.spans[axis]
              const forward = p.max - q.min - delta
              const backward = q.max + delta - p.min
              return forward <= backward ? { nx, ny, upper: forward } : { nx: -nx, ny: -ny, upper: backward }
            })
            // Projection distances bound the search; they never trigger contact on their own.
            contacts.sort((a, b) => a.upper - b.upper)
            contacts.some(({ nx, ny, upper }) => separate(a, b, dx, dy, nx, ny, upper))
          }
        }
        if (!contact) return true
      }
      return false
    }

    function settle() {
      if (resolveContacts()) return
      // Do not paint a squeezed frame when a chain of islands cannot separate in the available space.
      for (const body of islands) {
        body.x = body.lastX
        body.y = body.lastY
        body.vx = body.vy = 0
      }
    }

    function paint() {
      for (const body of islands) body.element.style.translate = `${body.x.toFixed(2)}px ${body.y.toFixed(2)}px`
    }

    function tick(now: number) {
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.032) : 1 / 60
      lastTime = now
      islands.forEach((body, i) => {
        body.lastX = body.x
        body.lastY = body.y
        const pull = drag?.body === body ? drag : undefined
        if (pull) {
          const friction = Math.exp(-17 * dt)
          body.vx = (body.vx + (pull.x - body.x) * 110 * dt) * friction
          body.vy = (body.vy + (pull.y - body.y) * 110 * dt) * friction
        } else {
          const flow = 1 - Math.exp(-2.4 * dt)
          body.vx += (Math.sin(now / 3320 + i * 1.9) * 7 - body.vx) * flow
          body.vy += (Math.cos(now / 2830 + i * 2.3) * 6 - body.vy) * flow
        }
        body.x += body.vx * dt
        body.y += body.vy * dt
        bound(body)
      })
      settle()
      paint()
      frame = requestAnimationFrame(tick)
    }

    function sync() {
      if (visible && !reduced.matches) {
        if (!frame) frame = requestAnimationFrame(tick)
        return
      }
      cancelAnimationFrame(frame)
      frame = lastTime = 0
      if (reduced.matches) {
        for (const body of islands) body.vx = body.vy = 0
        paint()
      }
    }

    function grab(event: PointerEvent) {
      if (event.pointerType !== 'mouse' || event.button !== 0 || drag) return
      const beach = (event.target as Element).closest('.tc-contributor-beach')
      if (!beach) return
      const body = islands.find(island => island.element.contains(beach))
      if (!body) return
      event.preventDefault()
      drag = { body, pointerId: event.pointerId, originX: event.pageX - body.x, originY: event.pageY - body.y, x: body.x, y: body.y }
      body.element.dataset.grabbed = ''
      sea.setPointerCapture(event.pointerId)
    }

    function move(event: PointerEvent) {
      if (drag?.pointerId !== event.pointerId) return
      const { homeX, homeY, radiusX, radiusY } = drag.body
      drag.x = Math.max(radiusX + inset - homeX, Math.min(event.pageX - drag.originX, width - radiusX - inset - homeX))
      drag.y = Math.max(radiusY + inset - homeY, Math.min(event.pageY - drag.originY, height - radiusY - inset - homeY))
      if (reduced.matches) {
        for (const body of islands) {
          body.lastX = body.x
          body.lastY = body.y
        }
        drag.body.x = drag.x
        drag.body.y = drag.y
        bound(drag.body)
        settle()
        paint()
      }
    }

    function release(event: PointerEvent) {
      if (drag?.pointerId !== event.pointerId) return
      delete drag.body.element.dataset.grabbed
      const speed = Math.hypot(drag.body.vx, drag.body.vy)
      if (speed > 360) {
        drag.body.vx *= 360 / speed
        drag.body.vy *= 360 / speed
      }
      drag = undefined
    }

    measure()
    const size = new ResizeObserver(measure)
    size.observe(sea)
    islands.forEach(({ element }) => size.observe(element))
    const viewport = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      sync()
    })
    viewport.observe(sea)
    reduced.addEventListener('change', sync)
    sea.addEventListener('pointerdown', grab)
    sea.addEventListener('pointermove', move)
    sea.addEventListener('lostpointercapture', release)
    return () => {
      cancelAnimationFrame(frame)
      viewport.disconnect()
      size.disconnect()
      reduced.removeEventListener('change', sync)
      sea.removeEventListener('pointerdown', grab)
      sea.removeEventListener('pointermove', move)
      sea.removeEventListener('lostpointercapture', release)
      for (const { element } of islands) {
        element.style.removeProperty('translate')
        delete element.dataset.grabbed
      }
    }
  }, [order])

  return <ul ref={field} className="tc-contributor-sea" role="list">{order ? order.map(i => cards[i]) : cards}</ul>
}
