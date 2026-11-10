import test from 'node:test'
import assert from 'node:assert/strict'
import { CHINA_BOUNDS, constrainChinaCenter } from '../lib/map-sidebar.ts'
import { MapPoint, project, unproject } from '../lib/map-camera.ts'

const makeMap = (width, height, zoom) => ({
  getZoom: () => zoom,
  getSize: () => new MapPoint(width, height),
  project,
  unproject,
})

const clampAt = (width, height, zoom, center) => constrainChinaCenter(makeMap(width, height, zoom), center)

test('手机竖屏 zoom 5：中心能落在广东，不再被抬到 34° 以北', () => {
  // 报障组合：390×844、zoom 5，旧规则把中心纬度锁在 34.11–41.38，广东 23.13 进不去。
  const guangdong = clampAt(390, 844, 5, { lat: 23.13, lng: 113.26 })
  assert.ok(Math.abs(guangdong.lat - 23.13) < 1e-6, `广东纬度应原样保留，实测 ${guangdong.lat}`)
  assert.ok(Math.abs(guangdong.lng - 113.26) < 1e-6, `经度应原样保留，实测 ${guangdong.lng}`)
})

test('从 zoom 7 连续缩小到 zoom 5：同一个中心不被弹回北方', () => {
  const start = { lat: 23.13, lng: 113.26 }
  const z7 = clampAt(390, 844, 7, start)
  const z6 = clampAt(390, 844, 6, start)
  const z5 = clampAt(390, 844, 5, start)
  assert.ok(Math.abs(z7.lat - z6.lat) < 0.01, `z7→z6 中心纬度跳动 ${z7.lat}→${z6.lat}`)
  assert.ok(Math.abs(z6.lat - z5.lat) < 0.01, `z6→z5 中心纬度跳动 ${z6.lat}→${z5.lat}`)
  assert.ok(Math.abs(z5.lat - 23.13) < 0.01, `缩小后中心应留在广东附近，实测 ${z5.lat}`)
})

test('zoom 3 全国视图：四向仍能拖，且中国至少留 48px 在屏内', () => {
  const south = clampAt(390, 844, 3, { lat: 0, lng: 105 })
  const north = clampAt(390, 844, 3, { lat: 70, lng: 105 })
  assert.ok(north.lat - south.lat > 25, `南北仍应可拖，实测 ${north.lat - south.lat}`)

  const west = clampAt(390, 844, 3, { lat: 35, lng: 0 })
  const east = clampAt(390, 844, 3, { lat: 35, lng: 180 })
  assert.ok(east.lng - west.lng > 25, `东西仍应可拖，实测 ${east.lng - west.lng}`)

  for (const center of [south, north, west, east]) {
    const visible = visibleChina(390, 844, 3, center)
    assert.ok(visible.width >= 47.9, `中国应至少留 48px 宽在屏内，实测 ${visible.width}`)
    assert.ok(visible.height >= 47.9, `中国应至少留 48px 高在屏内，实测 ${visible.height}`)
  }
})

// 中国投影框与视口的交集尺寸，用来验证「至少留 keep 像素」这条规则。
function visibleChina(width, height, zoom, center) {
  const map = makeMap(width, height, zoom)
  const nw = project([CHINA_BOUNDS[1][0], CHINA_BOUNDS[0][1]], zoom)
  const se = project([CHINA_BOUNDS[0][0], CHINA_BOUNDS[1][1]], zoom)
  const mid = project(center, zoom)
  const left = mid.x - width / 2, top = mid.y - height / 2
  return {
    width: Math.max(0, Math.min(width, se.x - left) - Math.max(0, nw.x - left)),
    height: Math.max(0, Math.min(height, se.y - top) - Math.max(0, nw.y - top)),
  }
}
