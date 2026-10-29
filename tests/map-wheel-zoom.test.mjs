import test from 'node:test'
import assert from 'node:assert/strict'
import { attachMapWheelZoom } from '../lib/map-wheel-zoom.ts'
import { showMapNodes } from '../lib/map-mode.ts'

class Point {
  constructor(x, y) { this.x = x; this.y = y }
  add(p) { return new Point(this.x + p.x, this.y + p.y) }
  subtract(p) { return new Point(this.x - p.x, this.y - p.y) }
  multiplyBy(n) { return new Point(this.x * n, this.y * n) }
  divideBy(n) { return this.multiplyBy(1 / n) }
}

function fixture(reducedMotion = false) {
  let now = 0
  let id = 0
  let prevented = 0
  const frames = new Map()
  const listeners = new Map()
  const moves = []
  let starts = 0
  let ends = 0
  globalThis.window = { matchMedia: () => ({ matches: reducedMotion }) }
  Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => now } })
  globalThis.requestAnimationFrame = (callback) => { frames.set(++id, callback); return id }
  globalThis.cancelAnimationFrame = (frame) => frames.delete(frame)
  const map = {
    zoom: 6,
    center: { lat: 35, lng: 105 },
    size: new Point(1000, 600),
    getContainer: () => ({
      addEventListener: (name, callback) => listeners.set(name, callback),
      removeEventListener: (name) => listeners.delete(name),
    }),
    getZoom() { return this.zoom },
    getMinZoom: () => 4,
    getMaxZoom: () => 12,
    getSize() { return this.size },
    mouseEventToContainerPoint: (event) => event.point,
    project({ lat, lng }, zoom) {
      const scale = 256 * 2 ** zoom
      const sin = Math.sin(lat * Math.PI / 180)
      return new Point(scale * (lng + 180) / 360, scale * (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)))
    },
    unproject(point, zoom) {
      const scale = 256 * 2 ** zoom
      return { lng: point.x / scale * 360 - 180,
        lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * point.y / scale))) * 180 / Math.PI }
    },
    containerPointToLatLng(point) {
      return this.unproject(this.project(this.center, this.zoom).add(point.subtract(this.size.divideBy(2))), this.zoom)
    },
    latLngToContainerPoint(latlng) {
      return this.project(latlng, this.zoom).subtract(this.project(this.center, this.zoom)).add(this.size.divideBy(2))
    },
    beginMove() { starts++ },
    move(center, zoom, data) {
      this.center = center; this.zoom = zoom
      moves.push({ center, zoom, data })
    },
    endMove() { ends++ },
  }
  const controller = attachMapWheelZoom(map)
  return {
    map, moves, frames, listeners, controller,
    wheel(deltaY, extra = {}) {
      listeners.get('wheel')({ deltaY, deltaX: 0, deltaMode: 0, ctrlKey: false,
        point: new Point(800, 200), preventDefault: () => prevented++, ...extra })
    },
    flush(ms = 16) {
      now += ms
      const pending = [...frames.values()]
      frames.clear()
      pending.forEach((callback) => callback(now))
    },
    settle() {
      for (let i = 0; frames.size && i < 100; i++) this.flush()
      assert.equal(frames.size, 0, '动画应及时结束')
    },
    get prevented() { return prevented },
    get starts() { return starts },
    get ends() { return ends },
  }
}

function assertAnchor(f, latlng, point) {
  const actual = f.map.latLngToContainerPoint(latlng)
  assert.ok(Math.hypot(actual.x - point.x, actual.y - point.y) < 1e-7,
    `地理锚点漂移: ${actual.x - point.x}, ${actual.y - point.y}`)
}

test('模式在缩放途中切换，不等 zoomend；临界区小幅换向不会闪烁', () => {
  const f = fixture()
  let nodes = false
  f.wheel(-100)
  for (let i = 0; !nodes && i < 30; i++) {
    f.flush()
    nodes = showMapNodes(f.map.zoom, nodes)
  }
  assert.equal(nodes, true)
  assert.equal(f.ends, 0)
  for (const zoom of [6.84, 6.75, 6.8, 6.6]) assert.equal(showMapNodes(zoom, true), true)
  assert.equal(showMapNodes(6.55, true), false)
  assert.equal(showMapNodes(6.84, false), false)
  f.controller.dispose()
})

test('四个偏心位置的锚点在放大、缩小的每一帧都固定，而不只检查终点', () => {
  for (const point of [new Point(100, 80), new Point(900, 80), new Point(100, 520), new Point(900, 520)]) {
    for (const delta of [-100, 100]) {
      const f = fixture()
      const latlng = f.map.containerPointToLatLng(point)
      f.wheel(delta, { point })
      for (let i = 0; f.frames.size && i < 100; i++) {
        f.flush()
        assertAnchor(f, latlng, point)
      }
      assert.equal(f.map.zoom, delta < 0 ? 7 : 5)
      assert.equal(f.starts, 1)
      assert.equal(f.ends, 1)
    }
  }
})

test('16ms 后的新输入立即接续，且始终只有一个动画循环', () => {
  const f = fixture()
  f.wheel(-100); f.flush()
  const first = f.map.zoom
  f.wheel(-100); f.flush()
  assert.ok(f.map.zoom > first)
  assert.equal(f.frames.size, 1)
  f.settle()
  assert.equal(f.map.zoom, 8)
  assert.equal(f.starts, 1)
  assert.equal(f.ends, 1)
})

test('帧内合并输入、保留小增量，并限制高速滚动的目标距离', () => {
  const f = fixture()
  f.wheel(-40); f.wheel(-30)
  assert.equal(f.frames.size, 1)
  f.flush(); assert.equal(f.moves.length, 0)
  f.wheel(-30); f.flush()
  f.wheel(-2400); f.flush()
  f.settle()
  assert.equal(f.map.zoom, 8)
})

test('换向立即从当前画面回退，不先完成旧目标', () => {
  const f = fixture()
  f.wheel(-200); f.flush()
  const turningZoom = f.map.zoom
  f.wheel(100); f.flush()
  assert.ok(f.map.zoom < turningZoom)
  f.settle()
  assert.equal(f.map.zoom, 6)
})

test('动画中换鼠标位置，以新位置下的地点为锚点，适配侧栏改变后的容器尺寸', () => {
  const f = fixture()
  f.map.size = new Point(620, 740)
  f.wheel(-100); f.flush()
  const point = new Point(140, 530)
  const latlng = f.map.containerPointToLatLng(point)
  f.wheel(-100, { point })
  while (f.frames.size) { f.flush(); assertAnchor(f, latlng, point) }
  assert.equal(f.map.zoom, 8)
})

test('保留上下限、Ctrl 和横向手势', () => {
  const f = fixture()
  f.map.zoom = 4
  f.wheel(100); f.flush(); assert.equal(f.moves.length, 0)
  f.map.zoom = 12
  f.wheel(-100); f.flush(); assert.equal(f.moves.length, 0)
  const prevented = f.prevented
  f.wheel(100, { ctrlKey: true }); f.wheel(1, { deltaX: 100 }); f.flush()
  assert.equal(f.prevented, prevented)
  assert.equal(f.moves.length, 0)
})

test('减少动态效果时一次到位，中断回到整数级并正确清理', () => {
  const reduced = fixture(true)
  reduced.wheel(-100); reduced.flush()
  assert.equal(reduced.map.zoom, 7)
  assert.equal(reduced.frames.size, 0)
  const f = fixture()
  f.wheel(-100); f.flush()
  f.controller.cancel()
  assert.ok(Number.isInteger(f.map.zoom))
  assert.equal(f.frames.size, 0)
  assert.equal(f.ends, 1)
  f.wheel(-100); f.controller.cancel(); f.flush()
  assert.equal(f.frames.size, 0)
  f.controller.dispose()
  assert.equal(f.listeners.size, 0)
})
