import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mapHospitalInputs, wgs84ToGcj02, gcjCoordinateTree } from '../lib/map-coordinates.ts'
import { gcj02ToWgs84 } from '../scripts/geocode-hospitals.ts'
import { LOCATION_EVIDENCE } from '../scripts/lib/amap.ts'
import { MAP_MAX_ZOOM, MapPoint, project, unproject, fitMapBounds } from '../lib/map-camera.ts'
import { constrainChinaCenter } from '../lib/map-sidebar.ts'

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const hospitals = read('../data/curated/hospitals.json').items
const reports = read('../data/curated/reports.json').items.filter(report => report.status === 'published')
const saved = read(`../${LOCATION_EVIDENCE}`).results

test('每个有坐标的机构在地图上恰好一个点，点的线索数总和等于库里的已发布关联数', () => {
  const before = structuredClone(hospitals)
  const points = mapHospitalInputs(hospitals, reports, saved)
  const located = hospitals.filter(hospital => hospital.coordinates).map(hospital => hospital.id).sort()
  assert.deepEqual(points.map(point => point.id).sort(), located, '有坐标的机构与地图点必须一一对应')
  // 不写死数字：控制台撤下一条线索会让已发布数从 326 变 325，常数一定过期。
  const publishedWithHospital = reports.filter(report => report.hospital_id).length
  assert.equal(points.reduce((sum, point) => sum + point.leads, 0), publishedWithHospital)
  for (const point of points) {
    const source = saved.find(result => result.status === 'geocoded' && `kdocs-amap-${result.chosen.id.toLowerCase()}` === point.id)
    assert.deepEqual([point.lng, point.lat], source.chosen.location.split(',').map(Number))
  }
  assert.deepEqual(hospitals, before)
  // 成对回归：同一份数据少一条线索，断言必须变红。少了这一条，上面两行就可能两边一起自动
  // 跟着变、等于没断言。
  const dropped = mapHospitalInputs(hospitals, reports.slice(1), saved).reduce((sum, point) => sum + point.leads, 0)
  assert.notEqual(dropped, publishedWithHospital, '少一条线索时线索总数必须对不上')
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
    // 取景约束只要求中国至少留 48px 在屏内，往四个方向拖到极限都不能把中国整个推出去。
    const nw = project({ lat: bounds[1].lat, lng: bounds[0].lng }, frame.zoom)
    const se = project({ lat: bounds[0].lat, lng: bounds[1].lng }, frame.zoom)
    for (const target of [{ lat: 35, lng: 0 }, { lat: 35, lng: 180 }, { lat: 0, lng: 105 }, { lat: 70, lng: 105 }]) {
      const mid = project(constrainChinaCenter(camera, target, 48), frame.zoom)
      const visibleW = Math.min(width, se.x - (mid.x - width / 2)) - Math.max(0, nw.x - (mid.x - width / 2))
      const visibleH = Math.min(height, se.y - (mid.y - height / 2)) - Math.max(0, nw.y - (mid.y - height / 2))
      assert.ok(visibleW >= 47.9 && visibleH >= 47.9, `${width}×${height} 拖到 ${target.lat},${target.lng} 后中国只剩 ${visibleW}×${visibleH}`)
    }
  }
})

test('小范围构图不再被旧12级截断，仍遵守统一20级上限', () => {
  const frame=fitMapBounds([{lat:40.8168,lng:111.69},{lat:40.8168001,lng:111.6900001}],new MapPoint(1280,720),380,[0,0,0,0])
  assert.equal(frame.zoom,MAP_MAX_ZOOM)
  assert.equal(frame.zoom,20)
})
