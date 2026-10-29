import test from 'node:test'
import assert from 'node:assert/strict'
import { locationTargets, selectPoi, searchAmap, linkLocationReports } from '../scripts/lib/amap.ts'
import { gcj02ToWgs84, hospitalsFromRun } from '../scripts/geocode-hospitals.ts'

const target = { name: '北京回龙观医院', region: '', report_ids: ['kdocs-test-p1-l1'] }
const poi = { id: 'B001', name: '首都医科大学附属北京回龙观医院', location: '116.3,40.1', address: '南店路7号', pname: '北京市', cityname: '北京市', adcode: '', typecode: '090210' }

test('source rows create targets even with no institution or coordinates', () => {
  assert.deepEqual(locationTargets([{ id: 'a', hospital_name_raw: '北京回龙观医院' }, { id: 'b', hospital_name_raw: '北京回龙观医院' }]), [{ name: '北京回龙观医院', region: '', report_ids: ['a', 'b'] }])
  assert.equal(selectPoi(target, [poi]).chosen.id, 'B001')
})

test('an explicit region cannot match another province and absent adcode is not a missing position', () => {
  assert.equal(selectPoi({ ...target, region: '河南省' }, [poi]).status, 'not_found')
  assert.equal(selectPoi({ ...target, region: '北京市' }, [poi]).status, 'geocoded')
})

test('an unspecified campus uses the institution representative; explicit campus never falls back', () => {
  assert.equal(selectPoi(target, [poi, { ...poi, id: 'B002' }]).selection_rule, 'base-name')
  const campuses = [{ ...poi, name: '北京大学第六医院海淀院区' }, { ...poi, id: 'B002', name: '北京大学第六医院昌平院区' }]
  assert.equal(selectPoi({ ...target, name: '北京大学第六医院' }, campuses).chosen.id, 'B001')
  assert.equal(selectPoi({ ...target, name: '北京大学第六医院（海淀院区）' }, campuses).chosen.id, 'B001')
  assert.equal(selectPoi({ ...target, chosen: poi }, []).chosen, undefined)
  assert.equal(selectPoi({ ...target, name: '北京大学第六医院（昌平院区）' }, [campuses[0]]).chosen, undefined)
})

test('hospital matching excludes shops and does not erase institution-defining province names', () => {
  assert.equal(selectPoi({ ...target, name: '广东省精神卫生中心', region: '广东省' }, [{ ...poi, name: '精神卫生中心', pname: '广东省' }]).chosen, undefined)
  assert.equal(selectPoi(target, [{ ...poi, name: '北京回龙观医院超市', typecode: '090601' }]).chosen, undefined)
  const base = { ...poi, name: '厦门大学附属中山医院', pname: '福建省', typecode: '090101' }
  assert.equal(selectPoi({ ...target, name: base.name }, [base, { ...base, id: 'SHOP', name: `${base.name}本部食堂` }]).chosen.id, 'B001')
  const second = { ...poi, name: '兰州大学第二医院', pname: '甘肃省' }
  assert.equal(selectPoi({ ...target, name: second.name }, [second, { ...second, id: 'OTHER', name: '兰州大学第一医院院本部' }]).chosen.id, 'B001')
})

test('an explicit visiting hospital cannot use the employing hospital location', () => {
  const source = { ...target, name: '苏州广济医院（在吴中人民医院出诊）' }
  const home = { ...poi, name: '苏州市广济医院', pname: '江苏省', cityname: '苏州市' }
  assert.equal(selectPoi(source, [home]).chosen, undefined)
  const visit = { ...home, id: 'VISIT', name: '苏州市吴中人民医院' }
  assert.equal(selectPoi(source, [home, visit]).chosen.id, 'VISIT')
  assert.equal(selectPoi(source, [home, visit]).selection_rule, 'visit-site')
})

test('Macao-administered campus keeps the source administrative region and the original provider label', () => {
  const source = { name: '澳门大学心理学系诊所', region: '澳门', report_ids: ['um-source'] }
  const building = { ...poi, name: '澳门大学社会科学学院(由澳门特别行政区实施管辖)', pname: '广东省', cityname: '珠海市', address: '澳门氹仔大学大马路1号', typecode: '141201' }
  const result = selectPoi(source, [building])
  assert.equal(result.selection_rule, 'institution-building')
  assert.equal(result.chosen.pname, '广东省')
  const hospital = hospitalsFromRun({ generated_at: '2026-10-27T00:00:00Z', results: [result] })[0]
  assert.equal(hospital.adcode, '820000')
  assert.equal(hospital.name, source.name)
})

test('quota and permission failures are reported, not treated as no matches or silently retried', async () => {
  let requests = 0
  await assert.rejects(searchAmap('test-key', '测试医院', '', async () => {
    requests++
    return Response.json({ status: '0', info: 'DAILY_QUERY_OVER_LIMIT', infocode: '10003' })
  }), /HTTP 200, status=0, infocode=10003, info=DAILY_QUERY_OVER_LIMIT/)
  assert.equal(requests, 1)
  await assert.rejects(searchAmap('test-key', '测试医院', '', async () => new Response('', { status: 403 })), /HTTP 403/)
})

test('network errors never print the credential-bearing request URL', async () => {
  try {
    await searchAmap('private-test-key', '测试医院', '', async () => { throw new Error('https://restapi.amap.com/?key=private-test-key') })
    assert.fail('network error must reject')
  } catch (error) {
    assert.match(error.message, /高德网络请求失败/)
    assert.doesNotMatch(error.message, /private-test-key|https:/)
  }
})

test('a successful empty search is a valid institution-level result', async () => {
  assert.deepEqual(await searchAmap('test-key', '测试医院', '', async () => Response.json({ status: '1', info: 'OK', infocode: '10000', count: '0', pois: [] })), { pois: [], requests: 1 })
})

test('linking changes only hospital_id, and rejects incomplete or stale source mappings', () => {
  const reports = [{ id: 'kdocs-test-p1-l1', hospital_name_raw: target.name, evidence_quote: '逐字原文', verification: { level: 'unverified' } }]
  const run = { generated_at: '2026-10-27T00:00:00Z', source_url: 'https://www.kdocs.cn/l/crOlzFWeu2GY', requests: 1, results: [selectPoi(target, [poi])] }
  const linked = linkLocationReports(reports, run)
  assert.deepEqual(linked[0], { ...reports[0], hospital_id: 'kdocs-amap-b001' })
  assert.equal(reports[0].hospital_id, undefined)
  assert.throws(() => linkLocationReports(reports, { ...run, results: [] }), /覆盖全部/)
  assert.throws(() => linkLocationReports(reports, { ...run, results: [{ ...run.results[0], report_ids: ['old-id'] }] }), /对应不符/)
  const hospitals = hospitalsFromRun(run)
  assert.equal(hospitals[0].adcode, '110000')
  assert.deepEqual(hospitals[0].coordinates, { lng: gcj02ToWgs84(116.3, 40.1)[0], lat: gcj02ToWgs84(116.3, 40.1)[1] })
  assert.deepEqual(hospitals[0].official_sources, [])
  assert.equal(hospitals[0].trauma_service.cptsd_assessment, 'unknown')
})
