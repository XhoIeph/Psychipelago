const timeStep = 1000 / 60
const settlingTime = 720
const brushRadius = 192

type Point = { x: number; y: number }

export function createLiquidSurface(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')!
  let width = 0, height = 0
  let surface: Float32Array, nextSurface: Float32Array, velocity: Float32Array, image: ImageData
  let last: Point | undefined, cursor: Point | undefined
  let frame = 0, lastFrame = 0, lastStroke = -Infinity, elapsed = 0
  let pageTop = 0

  function clearField() {
    surface?.fill(0)
    nextSurface?.fill(0)
    velocity?.fill(0)
    context.clearRect(0, 0, width, height)
    lastStroke = -Infinity
  }

  function pushWater(from: Point, to: Point, rect: DOMRect, cell: number) {
    const dx = (to.x - from.x) / cell, dy = (to.y - from.y) / cell
    const distance = Math.hypot(dx, dy)
    if (distance < .24) return false
    const ux = dx / distance, uy = dy / distance
    const radius = brushRadius / cell
    const endX = (to.x - rect.left) / cell, endY = (to.y - pageTop) / cell
    const length = Math.min(distance, 116 / cell)
    const startX = endX - ux * length, startY = endY - uy * length
    const force = Math.min(.86, .36 + distance * .044)
    const left = Math.max(1, Math.floor(Math.min(startX, endX) - radius))
    const right = Math.min(width - 2, Math.ceil(Math.max(startX, endX) + radius))
    const top = Math.max(1, Math.floor(Math.min(startY, endY) - radius))
    const bottom = Math.min(height - 2, Math.ceil(Math.max(startY, endY) + radius))
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const px = x - startX, py = y - startY
        const along = px * ux + py * uy
        const across = (py * ux - px * uy) / radius
        const outside = (along - Math.max(0, Math.min(length, along))) / radius
        const falloff = Math.max(0, 1 - across * across - outside * outside)
        if (falloff === 0) continue
        // The pointer displaces the surface most at contact. The raised shoulders are weaker.
        const pressure = (across * across * 2.2 - .65) * falloff ** 3
        const i = y * width + x
        velocity[i] = Math.max(-.46, Math.min(.46, velocity[i] + pressure * force))
      }
    }
    return true
  }

  function render(now: number) {
    frame = 0
    const rect = canvas.getBoundingClientRect()
    const cell = Math.max(6, Math.max(rect.width, rect.height) / 256)
    const columns = Math.max(3, Math.round(rect.width / cell))
    const rows = Math.max(3, Math.round(rect.height / cell))
    if (columns !== width || rows !== height) {
      width = canvas.width = columns
      height = canvas.height = rows
      surface = new Float32Array(width * height)
      nextSurface = new Float32Array(width * height)
      velocity = new Float32Array(width * height)
      image = context.createImageData(width, height)
      lastStroke = -Infinity
    }
    const top = rect.top + window.scrollY
    if (lastStroke === -Infinity) {
      pageTop = top
    } else {
      // Keep the water fixed to the page as the viewport moves across it.
      const shift = Math.trunc((top - pageTop) / cell)
      if (shift) {
        const offset = Math.min(height, Math.abs(shift)) * width
        for (const field of [surface, velocity]) {
          if (shift > 0) {
            field.copyWithin(0, offset)
            field.fill(0, field.length - offset)
          } else {
            field.copyWithin(offset, 0, field.length - offset)
            field.fill(0, 0, offset)
          }
          field.fill(0, 0, width)
          field.fill(0, field.length - width)
        }
        pageTop += shift * cell
      }
    }

    elapsed += lastFrame ? Math.min(now - lastFrame, timeStep * 2) : timeStep
    lastFrame = now
    if (elapsed >= timeStep) {
      if (cursor && last && pushWater(last, cursor, rect, cell)) {
        last = cursor
        lastStroke = now
      }
      cursor = undefined
      if (now - lastStroke >= settlingTime) {
        clearField()
        lastFrame = elapsed = 0
        return
      }
      while (elapsed >= timeStep) {
        // The Courant limit for this 2D stencil is .5. Strong damping absorbs repeated input.
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const i = y * width + x, h = surface[i]
            const laplacian = surface[i - 1] + surface[i + 1] + surface[i - width] + surface[i + width] - 4 * h
            velocity[i] = (velocity[i] + .24 * laplacian) * .81
            nextSurface[i] = (h + velocity[i]) * .966
          }
        }
        const swap = surface
        surface = nextSurface
        nextSurface = swap
        elapsed -= timeStep
      }

      const dark = document.documentElement.dataset.theme === 'dark'
      const highlight = dark ? [146, 211, 182] : [255, 255, 251]
      const trough = dark ? [8, 25, 19] : [145, 199, 175]
      const decay = Math.min(1, (settlingTime - (now - lastStroke)) / 270)
      const pixels = image.data
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const i = y * width + x
          const normal = (surface[i + 1] - surface[i - 1]) * .68 + surface[i + width] - surface[i - width]
          const reflection = surface[i] + normal * .65
          const lit = reflection > 0
          const color = lit ? highlight : trough
          const intensity = Math.abs(reflection)
          const pixel = i * 4
          pixels[pixel] = color[0]
          pixels[pixel + 1] = color[1]
          pixels[pixel + 2] = color[2]
          pixels[pixel + 3] = (lit ? 100 : 80) * intensity / (intensity + .36) * decay
        }
      }
      context.putImageData(image, 0, 0)
    }
    frame = requestAnimationFrame(render)
  }

  return {
    move(x: number, y: number) {
      const point = { x, y: y + window.scrollY }
      if (!last) { last = point; return }
      cursor = point
      if (!frame) frame = requestAnimationFrame(render)
    },
    leave() { cursor = last = undefined },
    reset() {
      cancelAnimationFrame(frame)
      frame = lastFrame = elapsed = 0
      cursor = last = undefined
      clearField()
    },
  }
}
