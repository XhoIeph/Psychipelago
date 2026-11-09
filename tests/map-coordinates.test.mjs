import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mapHospitalInputs, wgs84ToGcj02, gcjCoordinateTree } from '../lib/map-coordinates.ts'
import { gcj02ToWgs84 } from '../scripts/geocode-hospitals.ts'
import { MAP_MAX_ZOOM, MapPoint, project, unproject, fitMapBounds } from '../lib/map-camera.ts'
import { chinaCameraBounds } from '../lib/map-sidebar.ts'

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const hospitals = read('../data/curated/hospitals.json').items
const reports = read('../data/curated/reports.json').items.filter(report => report.status === 'published')
const saved = read('../data/evidence/locations/amap-2026-11-09.json').results

test('127 个地图位置直接使用已保存 GCJ-02，272 条关联不变且不修改业务 WGS84', () => {
  const before = structuredClone(hospitals)
  const points = mapHospitalInputs(hospitals, reports, saved)
  assert.equal(points.length, 127)
  assert.equal(points.reduce((sum, point) => sum + point.leads, 0), 272)
  for (const point of points) {
    const source = saved.find(result => result.status === 'geocoded' && `kdocs-amap-${result.chosen.id.toLowerCase()}` === point.id)
    assert.deepEqual([point.lng, point.lat], source.chosen.location.split(',').map(Number))
  }
  assert.deepEqual(hospitals, before)
})

test('省界只在地图适配层转 GCJ-02，与已有逆转换相符', () => {
  for (const [lng, lat] of [[116.4,39.9], [121.5,31.2], [87.6,43.8], [113.5,22.2]]) {
    const gcj = wgs84ToGcj02(lng, lat)
    const wgs = gcj02ToWgs84(gcj[0], gcj[1])
    assert.ok(Math.abs(wgs[0] - lng) < .000002)
    assert.ok(Math.abs(wgs[1] - lat) < .000002)
  }
  const original = [[[[116.4,39.9],[116.5,40]]]]
  const converted = gcjCoordinateTree(original)
  assert.deepEqual(converted[0][0][0], wgs84ToGcj02(116.4,39.9))
  assert.deepEqual(original[0][0][0], [116.4,39.9])
  assert.deepEqual(wgs84ToGcj02(0,0), [0,0])
})

test('投影世界宽度与官方 SDK z5 的 8192px 相同，往返无缩放偏移', () => {
  assert.equal(4 * (project([0,90],5).x - project([0,0],5).x),8192)
  for (const zoom of [2,3,6.7,10,12,15,20]) {
    const point = { lat:39.9, lng:116.4 }, actual = unproject(project(point,zoom),zoom)
    assert.ok(Math.abs(actual.lat-point.lat) < 1e-10)
    assert.ok(Math.abs(actual.lng-point.lng) < 1e-10)
  }
})

test('全国构图装入桌面与窄屏，边界约束不产生反向区间', () => {
  const bounds = [{lat:17.5,lng:73},{lat:53.8,lng:135.5}]
  for (const [width,height,inset] of [[1280,720,380],[390,844,0],[320,720,0]]) {
    const size = new MapPoint(width,height)
    const frame = fitMapBounds(bounds,size,inset,[80,136,16,16])
    const camera = { project,unproject,getSize:()=>size,getZoom:()=>frame.zoom }
    for (const point of bounds) {
      const screen = project(point,frame.zoom).subtract(project(frame.center,frame.zoom)).add(size.divideBy(2))
      assert.ok(screen.x >= inset+15 && screen.x <= width-15)
      assert.ok(screen.y >= 79 && screen.y <= height-135)
    }
    const [nw,se] = chinaCameraBounds(camera,inset)
    assert.ok(nw.lng < se.lng && nw.lat > se.lat)
  }
})

test('小范围构图不再被旧12级截断，仍遵守统一20级上限', () => {
  const frame=fitMapBounds([{lat:40.8168,lng:111.69},{lat:40.8168001,lng:111.6900001}],new MapPoint(1280,720),380,[0,0,0,0])
  assert.equal(frame.zoom,MAP_MAX_ZOOM)
  assert.equal(frame.zoom,20)
})
