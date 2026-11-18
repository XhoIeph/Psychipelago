import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { acceptsManualCoordinate, gcj02ToWgs84, withManualCoordinates } from '../scripts/lib/hospitals.ts'

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const hospitals = read('../data/curated/hospitals.json').items

const geocoded = hospitals.find(hospital => hospital.coordinates_source === 'geocoded')

/** 造一条人工选定记录：location 是高德原样返回的 GCJ-02「经度,纬度」。 */
function pick(poiId, location, hospital = geocoded) {
  return {
    hospital_id: hospital.id,
    name: hospital.name,
    status: 'geocoded',
    queried_at: '2026-11-11',
    query: { keywords: hospital.name, city: '' },
    candidates: [],
    shortlist: [],
    chosen: {
      id: poiId,
      name: '候选点',
      address: '某路 1 号',
      location,
      pname: '北京市',
      cityname: '北京市',
      adcode: '110000',
      typecode: '090100',
    },
    picked: { by: 'manual', at: '2026-11-11' },
  }
}

test('自动定位过的机构不接受人工选点，省级近似值与空坐标接受', () => {
  assert.equal(acceptsManualCoordinate(geocoded), false, 'geocoded 有地址依据，不该被图上一个点盖掉')
  assert.equal(
    acceptsManualCoordinate({ ...geocoded, coordinates_source: 'province-centroid' }),
    true,
    'province-centroid 只是省中心占位，人工精确选点严格更好',
  )
  assert.equal(acceptsManualCoordinate({ ...geocoded, coordinates: null }), true, '没有坐标的机构要靠人工点上图')
})

test('geocoded 的机构人工选点不生效，坐标与来源都保持原样', () => {
  const before = structuredClone(geocoded)
  const [result] = withManualCoordinates([geocoded], [pick('BPICK0001', '116.412345,39.912345')])
  assert.deepEqual(result.coordinates, before.coordinates)
  assert.equal(result.coordinates_source, 'geocoded')
})

test('province-centroid 的机构会被人工选点覆盖，来源改成 manual', () => {
  const approximate = { ...geocoded, coordinates: { lat: 39.9, lng: 116.4 }, coordinates_source: 'province-centroid' }
  const [result] = withManualCoordinates([approximate], [pick('BPICK0002', '116.412345,39.912345')])
  const [lng, lat] = gcj02ToWgs84(116.412345, 39.912345)
  assert.deepEqual(result.coordinates, { lat, lng })
  assert.equal(result.coordinates_source, 'manual', '人工点的坐标来源必须标成 manual，不能沿用 province-centroid')
})

test('空坐标的机构补上人工选点，来源 manual', () => {
  const empty = { ...geocoded, coordinates: null, coordinates_source: undefined }
  const [result] = withManualCoordinates([empty], [pick('BPICK0003', '116.412345,39.912345')])
  const [lng, lat] = gcj02ToWgs84(116.412345, 39.912345)
  assert.deepEqual(result.coordinates, { lat, lng })
  assert.equal(result.coordinates_source, 'manual')
})

test('同一家机构连选两个落点，后一个生效', () => {
  const empty = { ...geocoded, coordinates: null, coordinates_source: undefined }
  const [first] = withManualCoordinates([empty], [pick('BPICK0004', '116.412345,39.912345')])
  const [second] = withManualCoordinates([first], [pick('BPICK0005', '121.473701,31.230416')])
  const [lngA, latA] = gcj02ToWgs84(116.412345, 39.912345)
  const [lngB, latB] = gcj02ToWgs84(121.473701, 31.230416)
  assert.deepEqual(first.coordinates, { lat: latA, lng: lngA })
  assert.deepEqual(second.coordinates, { lat: latB, lng: lngB }, '选错了要能重选，不能被上一次的选择锁住')
  assert.equal(second.coordinates_source, 'manual')
})

test('自动定位过的机构连选两个落点也都不生效', () => {
  const [first] = withManualCoordinates([geocoded], [pick('BPICK0006', '116.412345,39.912345')])
  const [second] = withManualCoordinates([first], [pick('BPICK0007', '121.473701,31.230416')])
  assert.deepEqual(first.coordinates, geocoded.coordinates)
  assert.deepEqual(second.coordinates, geocoded.coordinates)
  assert.equal(second.coordinates_source, 'geocoded')
})
