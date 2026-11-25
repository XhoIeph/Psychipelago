import { gsap } from 'gsap'

const svg = 'http://www.w3.org/2000/svg'
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(value, high))
const springRoom = 1.02

function fitOrbit(labels: readonly { halfWidth: number; halfHeight: number }[], maxX: number, maxY: number) {
  const pairs = labels.flatMap((a, i) => labels.slice(i + 1).map((b, j) => {
    // The distance vector between any two steps traces an ellipse of its own.
    // Keep the entire rectangle of conflicting offsets inside that ellipse.
    const chord = 2 * Math.sin(Math.PI * (j + 1) / labels.length)
    return { x: (a.halfWidth + b.halfWidth + 5) / chord, y: (a.halfHeight + b.halfHeight + 5) / chord }
  }))
  let best: { x: number; y: number } | undefined
  let bestCost = Infinity
  for (let x = Math.min(92, maxX); x <= maxX; x += 1) {
    let y = Math.min(55, maxY)
    for (const pair of pairs) {
      const clearance = 1 - (pair.x / x) ** 2
      y = clearance > 0 ? Math.max(y, pair.y / Math.sqrt(clearance)) : Infinity
    }
    const cost = (x / 92) ** 2 + (y / 55) ** 2
    if ((x / 92) ** 2 >= bestCost) break
    if (y <= maxY && cost < bestCost) {
      best = { x, y }
      bestCost = cost
    }
  }
  return best
}

export function showPinOrbit(
  map: HTMLElement, markerPane: HTMLElement, pin: HTMLButtonElement, names: readonly string[], keywords: readonly string[], leftInset: number,
) {
  const viewport = map.getBoundingClientRect()
  const origin = markerPane.getBoundingClientRect()
  const icon = pin.getBoundingClientRect()
  const anchor = { x: icon.left + icon.width / 2 - origin.left, y: icon.top + icon.height / 2 - origin.top }
  const sheet = viewport.width < 1000 ? map.parentElement?.querySelector('.sheet')?.getBoundingClientRect() : undefined
  const left = viewport.left - origin.left + leftInset + 12, right = viewport.right - origin.left - 12
  const top = viewport.top - origin.top + (viewport.width >= 1000 ? 76 : 12)
  const bottom = (sheet?.top ?? viewport.bottom) - origin.top - 12

  const orbit = document.createElement('div')
  orbit.className = 'tc-pin-orbit'
  orbit.setAttribute('aria-hidden', 'true')
  orbit.style.setProperty('--tc-pin-orbit-card-width', `${(right - left) * .41}px`)
  const lines = document.createElementNS(svg, 'svg')
  lines.setAttribute('class', 'tc-pin-orbit-lines')
  lines.setAttribute('aria-hidden', 'true')
  // The SDK marker pane has zero size, so the sibling SVG needs its own viewport.
  lines.setAttribute('width', String(viewport.width))
  lines.setAttribute('height', String(viewport.height))
  markerPane.append(orbit, lines)
  function makeLabel(texts: readonly string[], isName: boolean) {
    const label = document.createElement('span')
    label.className = isName ? 'tc-pin-orbit-label tc-pin-orbit-name' : 'tc-pin-orbit-label'
    if (texts.length === 1) label.textContent = texts[0]
    else {
      label.classList.add('tc-pin-orbit-list')
      for (const text of texts) {
        const row = document.createElement('span')
        row.textContent = text
        label.append(row)
      }
    }
    const line = document.createElementNS(svg, 'line')
    lines.append(line)
    orbit.append(label)
    return {
      label, line, opacity: 0,
      halfWidth: label.offsetWidth / 2, halfHeight: label.offsetHeight / 2,
    }
  }
  let labels = [...names.map(name => makeLabel([name], true)), ...keywords.map(word => makeLabel([word], false))]
  pin.dataset.orbit = ''

  let halfWidth = Math.max(...labels.map(label => label.halfWidth))
  let halfHeight = Math.max(...labels.map(label => label.halfHeight))
  const fitted = fitOrbit(labels, ((right - left) / 2 - halfWidth) / springRoom, ((bottom - top) / 2 - halfHeight) / springRoom)
  if (!fitted) {
    orbit.replaceChildren()
    lines.replaceChildren()
    labels = [makeLabel([...names, ...keywords], true)]
    ;({ halfWidth, halfHeight } = labels[0])
  }
  const radiusX = fitted?.x ?? clamp(((right - left) / 2 - halfWidth) / springRoom, 0, 92)
  const radiusY = fitted?.y ?? clamp(((bottom - top) / 2 - halfHeight) / springRoom, 0, 55)
  const extentX = radiusX * springRoom + halfWidth, extentY = radiusY * springRoom + halfHeight
  const centerX = clamp(anchor.x, left + extentX, right - extentX)
  const centerY = clamp(anchor.y, top + extentY, bottom - extentY)
  // Camera input dismisses the orbit, so the visible pin bounds stay fixed while it spins.
  const pinBounds = Array.from(markerPane.querySelectorAll<HTMLElement>('.tc-map-node:not([inert]) > .pin, .tc-map-node:not([inert]) > .tc-cluster-body > strong'))
    .map(element => {
      const rect = element.getBoundingClientRect()
      return { left: rect.left - origin.left, right: rect.right - origin.left, top: rect.top - origin.top, bottom: rect.bottom - origin.top }
    })
    .filter(rect => rect.right > centerX - extentX && rect.left < centerX + extentX && rect.bottom > centerY - extentY && rect.top < centerY + extentY)
  const spin = { angle: 0, reach: 1 }
  function draw() {
    const { angle, reach } = spin
    labels.forEach(({ label, line, opacity, halfWidth, halfHeight }, i) => {
      const phase = -Math.PI / 2 + i * 2 * Math.PI / labels.length + angle
      const x = centerX + radiusX * Math.cos(phase) * reach
      const y = centerY + radiusY * Math.sin(phase) * reach
      const scale = Math.min(reach, 1)
      const w = halfWidth * scale, h = halfHeight * scale
      let overlap = 0
      for (const bounds of pinBounds) {
        const width = Math.min(x + w, bounds.right) - Math.max(x - w, bounds.left)
        const height = Math.min(y + h, bounds.bottom) - Math.max(y - h, bounds.top)
        if (width > 0 && height > 0) {
          const pinArea = (bounds.right - bounds.left) * (bounds.bottom - bounds.top)
          overlap = Math.max(overlap, Math.min(1, width * height / (.35 * Math.min(4 * w * h, pinArea))))
        }
      }
      label.style.transform = `translate3d(${x}px,${y}px,0) scale(${scale})`
      label.style.opacity = String(opacity * (1 - .44 * overlap))
      // End at the rims so the topmost line does not cross the pin's cross or the label text.
      const dx = x - anchor.x, dy = y - anchor.y
      const start = .44 / Math.max(Math.abs(dx) / icon.width, Math.abs(dy) / icon.height)
      const end = 1 - Math.min(w / Math.abs(dx), h / Math.abs(dy))
      if (start < end) {
        line.setAttribute('x1', String(anchor.x + dx * start))
        line.setAttribute('y1', String(anchor.y + dy * start))
        line.setAttribute('x2', String(anchor.x + dx * end))
        line.setAttribute('y2', String(anchor.y + dy * end))
      }
      line.style.opacity = String(start < end ? opacity * .62 : 0)
    })
  }

  const motion = gsap.matchMedia()
  motion.add({ reduced: '(prefers-reduced-motion: reduce)', full: '(prefers-reduced-motion: no-preference)' }, ({ conditions }) => {
    const instant = conditions?.reduced
    spin.angle = 0
    spin.reach = instant ? 1 : .85
    for (const label of labels) label.opacity = instant ? 1 : 0
    draw()
    if (instant) return
    const entrance = gsap.timeline()
    // A shared spring and matching scale preserve the fitted gaps during the entrance.
    entrance.to(spin, { reach: 1, duration: .36, ease: 'back.out(1.3)' }, 0)
    labels.forEach((label, i) => {
      const start = i * Math.min(.05, .2 / labels.length)
      entrance.to(label, { opacity: 1, duration: .14, ease: 'power2.out' }, start)
    })
    gsap.to(spin, { angle: Math.PI * 2, duration: 32, ease: 'none', repeat: -1, onUpdate: draw })
  })
  return () => {
    motion.revert()
    delete pin.dataset.orbit
    orbit.remove()
    lines.remove()
  }
}
