import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CHINA_BOUNDS, chinaCameraBounds, constrainChinaCenter, sidebarCameraFrame } from '../lib/map-sidebar.ts'
import { MapPoint, project as projectCamera, unproject } from '../lib/map-camera.ts'
import { attachMapPointer } from '../lib/map-pointer.ts'
import { groupMapNodes, mapNodeLayout, NODE_SPACING } from '../lib/map-nodes.ts'
import { mapHospitalInputs } from '../lib/map-coordinates.ts'

const camera = {
  getMaxZoom: () => 12,
  project: (point, zoom) => ({
    x: point.lng * 2 ** zoom,
    y: point.lat * 2 ** zoom,
    subtract([x, y]) { return { x: this.x - x, y: this.y - y } },
  }),
  unproject: (point, zoom) => ({ lng: point.x / 2 ** zoom, lat: point.y / 2 ** zoom }),
}

test('侧栏缩放可逆，地理锚点始终位于剩余视区中央', () => {
  const anchor = { lng: 105, lat: 35 }
  for (const inset of [0, 40, 150, 280, 380]) {
    const frame = sidebarCameraFrame(camera, anchor, 1280, 0, inset, 6, 4, 380)
    const focus = camera.project(anchor, frame.zoom)
    const center = camera.project(frame.center, frame.zoom)
    assert.ok(Math.abs(focus.x - center.x + 640 - (1280 + inset) / 2) < 1e-8)
    assert.equal(focus.y - center.y, 0)
    const reverse = sidebarCameraFrame(camera, anchor, 1280, inset, 0, frame.zoom, frame.minZoom)
    assert.ok(Math.abs(reverse.zoom - 6) < 1e-8)
    assert.ok(Math.abs(reverse.minZoom - 4) < 1e-8)
  }
})

test('中途换向从当前构图接续，不回到起点', () => {
  const anchor = { lng: 105, lat: 35 }
  const partial = sidebarCameraFrame(camera, anchor, 1280, 0, 180, 6, 4, 380)
  const start = sidebarCameraFrame(camera, anchor, 1280, 180, 180, partial.zoom, partial.minZoom, 0)
  assert.equal(start.zoom, partial.zoom)
  assert.equal(start.center.lng, partial.center.lng)
  const reversed = sidebarCameraFrame(camera, anchor, 1280, 180, 0, partial.zoom, partial.minZoom, 0)
  assert.equal(reversed.zoom, 6)
  assert.equal(reversed.minZoom, 4)
})

test('展开收回均落整数级，并保留最大缩放限制', () => {
  const anchor = { lng: 105, lat: 35 }
  assert.equal(sidebarCameraFrame(camera, anchor, 1280, 0, 380, 6, 4).zoom, 5)
  assert.equal(sidebarCameraFrame(camera, anchor, 1280, 380, 0, 12, 4).zoom, 12)
  assert.equal(sidebarCameraFrame(camera, anchor, 1280, 0, 380, 4, 4).zoom, 4)
  assert.equal(sidebarCameraFrame(camera, anchor, 1280, 380, 0, 4, 4).zoom, 4)
})

test('中国边界按剩余视区计算，全国下限居中、放大后不能移出省域范围', () => {
  for (const inset of [0, 180, 380]) {
    for (const zoom of [4, 10]) {
      const scale = 2 ** zoom
      const map = {
        getZoom: () => zoom,
        getSize: () => ({ x: 1280, y: 720 }),
        project: ([lat, lng]) => ({ x: lng * scale, y: -lat * scale }),
        unproject: ([x, y]) => ({ lat: -y / scale, lng: x / scale }),
      }
      const [nw, se] = chinaCameraBounds(map, inset)
      const minCenter = nw.lng + (1280 + inset) / 2 / scale
      const maxCenter = se.lng - (1280 - inset) / 2 / scale
      assert.ok(minCenter >= CHINA_BOUNDS[0][1])
      assert.ok(maxCenter <= CHINA_BOUNDS[1][1])
      assert.ok(minCenter <= maxCenter)
    }
  }
})

test('跨旧网格边界的近邻仍会聚合，所有分组保留原机构', () => {
  const hospitals = [{ id: 'a', x: 55, y: 20 }, { id: 'b', x: 57, y: 20 }, { id: 'c', x: 230, y: 20 }]
  const groups = groupMapNodes(hospitals, hospital => hospital)
  assert.deepEqual(groups.map(group => group.members.map(hospital => hospital.id)), [['a', 'b'], ['c']])
  assert.deepEqual(groupMapNodes([...hospitals].reverse(), hospital => hospital), groups)
  assert.deepEqual(hospitals.map(hospital => hospital.x), [55, 57, 230])
})

test('近邻只聚合，不靠移动单点制造间距', () => {
  const hospitals = Array.from({ length: 75 }, (_, index) => ({ id: String(index), x: index % 15 * 30, y: Math.floor(index / 15) * 30 }))
  const groups = groupMapNodes(hospitals, hospital => hospital)
  assert.equal(groups.flatMap(group => group.members).length, 75)
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      assert.ok(Math.hypot(groups[i].x - groups[j].x, groups[i].y - groups[j].y) >= NODE_SPACING)
    }
  }
})

function project(hospital, zoom) {
  const scale = 256 * 2 ** zoom
  const sin = Math.sin(hospital.lat * Math.PI / 180)
  return { x: scale * (hospital.lng + 180) / 360,
    y: scale * (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) }
}

function assertNodeCoordinates(hospitals) {
  const before = structuredClone(hospitals)
  const locations = new Map()
  let singles = 0
  for (const zoom of [7, 8, 9, 10, 10.5, 11, 12, 11, 10, 9, 7, 12]) {
    const layout = mapNodeLayout(hospitals, hospital => project(hospital, zoom))
    assert.deepEqual(layout.flatMap(node => node.members.map(hospital => hospital.id)).sort(), hospitals.map(hospital => hospital.id).sort())
    for (const node of layout) {
      const position = [node.lat, node.lng]
      if (node.members.length === 1) {
        const hospital = node.members[0]
        assert.deepEqual(position, [hospital.lat, hospital.lng])
        singles++
      }
      if (locations.has(node.key)) assert.deepEqual(position, locations.get(node.key))
      locations.set(node.key, position)
    }
  }
  assert.deepEqual(hospitals, before)
  return singles
}

test('合成机构跨级、反向缩放保持原坐标，覆盖单点与聚合', () => {
  // Algorithm coverage must survive an empty source inventory during curation.
  const hospitals = [
    { id: 'sample-west', lat: 30, lng: 90 },
    { id: 'sample-east', lat: 30, lng: 115 },
    { id: 'sample-near-east', lat: 30.00001, lng: 115.00001 },
  ]
  assert.ok(assertNodeCoordinates(hospitals) > 0)
})

test('当前有效机构跨级、反向缩放保持原坐标，成员不遗漏', () => {
  const source = JSON.parse(readFileSync(new URL('../data/curated/hospitals.json', import.meta.url), 'utf8'))
  const reports = JSON.parse(readFileSync(new URL('../data/curated/reports.json', import.meta.url), 'utf8'))
  const locations = JSON.parse(readFileSync(new URL('../data/evidence/locations/amap-2026-10-27.json', import.meta.url), 'utf8'))
  const hospitals = mapHospitalInputs(source.items, reports.items, locations.results)
  assertNodeCoordinates(hospitals)
})

test('空机构库存返回空布局，不投影或生成占位节点', () => {
  const projectEmpty = () => assert.fail('Empty inventory must not be projected')
  assert.deepEqual(groupMapNodes([], projectEmpty), [])
  assert.deepEqual(mapNodeLayout([], projectEmpty), [])
})

test('同址机构保留聚合，不生成扇形假位置', () => {
  const hospitals = ['a', 'b', 'c'].map(id => ({ id, lat: 28.19, lng: 112.98 }))
  for (const zoom of [7, 10, 12]) {
    const [node] = mapNodeLayout(hospitals, hospital => project(hospital, zoom))
    assert.equal(node.members.length, 3)
    assert.ok(Math.abs(node.lat - 28.19) < 1e-12)
    assert.ok(Math.abs(node.lng - 112.98) < 1e-12)
  }
})

function pointerFixture() {
  const listeners = new Map(), captures = new Set(), frames = new Map(), paints = []
  let frame = 0, starts = 0, ends = 0
  globalThis.Element = class { closest() { return null } }
  globalThis.requestAnimationFrame = callback => { frames.set(++frame, callback); return frame }
  globalThis.cancelAnimationFrame = id => frames.delete(id)
  const container = {
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name),
    getBoundingClientRect: () => ({ left:0, top:0 }), focus() {},
    setPointerCapture: id => captures.add(id), hasPointerCapture: id => captures.has(id), releasePointerCapture: id => captures.delete(id),
  }
  const map = {
    zoom:6, center:{lat:35,lng:105}, project:projectCamera, unproject,
    getContainer:()=>container, getSize:()=>new MapPoint(1000,600), getZoom(){return this.zoom}, getMinZoom:()=>4, getMaxZoom:()=>12,
    getCenter(){return this.center},
    containerPointToLatLng(point){return unproject(projectCamera(this.center,this.zoom).add(point.subtract(this.getSize().divideBy(2))),this.zoom)},
    mouseEventToContainerPoint:event=>new MapPoint(event.clientX,event.clientY),
    beginMove(){starts++}, endMove(){ends++},
    move(center,zoom){this.zoom=zoom;this.center=constrainChinaCenter(this,center,0);paints.push({...this.center,zoom})},
  }
  const controller=attachMapPointer(map)
  return {map,listeners,captures,frames,paints,controller,get starts(){return starts},get ends(){return ends},
    event(name,extra={}){listeners.get(name)({pointerId:1,pointerType:'mouse',button:0,clientX:500,clientY:300,preventDefault(){},stopPropagation(){},...extra})},
    flush(){const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback())},
  }
}

test('拖动在每次绘制前限位，松手不回跳，碰边后反向立即响应', () => {
  const f=pointerFixture()
  f.event('pointerdown')
  f.event('pointermove',{clientX:10000});f.flush()
  const edge=f.map.center.lng
  f.event('pointermove',{clientX:9990});f.flush()
  assert.ok(f.map.center.lng>edge,'Reversing at the edge must not wait through the clipped distance')
  f.event('pointermove',{clientX:-20000});f.flush()
  const before={...f.map.center}
  f.event('pointerup')
  assert.deepEqual(f.map.center,before)
  assert.ok(f.paints.every(point=>point.lng>=73&&point.lng<=135.5&&point.lat>=17.5&&point.lat<=53.8))
  assert.equal(f.starts,1);assert.equal(f.ends,1)
  f.controller.dispose()
})

test('双指围绕中点缩放，抬起一指继续平移不跳变', () => {
  const f=pointerFixture()
  f.event('pointerdown',{pointerType:'touch',clientX:400})
  f.event('pointerdown',{pointerId:2,pointerType:'touch',clientX:600})
  const anchor={...f.map.center}
  f.event('pointermove',{clientX:300});f.event('pointermove',{pointerId:2,clientX:700});f.flush()
  assert.equal(f.map.zoom,7)
  assert.ok(Math.abs(f.map.center.lng-anchor.lng)<1e-10)
  f.event('pointerup',{pointerId:2})
  const before=projectCamera(f.map.center,7)
  f.event('pointermove',{clientX:310});f.flush()
  const after=projectCamera(f.map.center,7)
  assert.ok(Math.abs(after.x-before.x+10)<1e-8)
  f.event('pointerup');f.controller.dispose()
  assert.equal(f.starts,1);assert.equal(f.ends,1)
  assert.equal(f.listeners.size,0);assert.equal(f.frames.size,0);assert.equal(f.captures.size,0)
})

test('省份轻点不被捕获，拖动不误触，图钉与控件仍接收点击', () => {
  const f=pointerFixture()
  let stopped=0
  const click={stopPropagation(){stopped++}}
  f.event('pointerdown');f.event('pointermove',{clientX:502});f.event('pointerup');f.event('click',click)
  assert.equal(f.captures.size,0);assert.equal(f.paints.length,0);assert.equal(stopped,0)
  f.event('pointerdown');f.event('pointermove',{clientX:510});f.flush();f.event('pointerup');f.event('click',click)
  assert.equal(stopped,1)
  const control=new Element();control.closest=()=>control
  f.event('pointerdown',{target:control});f.event('click',{...click,target:control})
  assert.equal(stopped,1);assert.equal(f.starts,2)
  f.controller.dispose()
})

test('双击保留鼠标地理锚点，键盘保留平移和缩放入口', () => {
  const f=pointerFixture(), point=new MapPoint(600,300)
  const anchor=f.map.containerPointToLatLng(point)
  f.event('dblclick',{clientX:600})
  assert.equal(f.map.zoom,7)
  const screen=projectCamera(anchor,7).subtract(projectCamera(f.map.center,7)).add(f.map.getSize().divideBy(2))
  assert.ok(Math.abs(screen.x-point.x)<1e-8)
  f.event('keydown',{key:'+'});assert.equal(f.map.zoom,8)
  const before=projectCamera(f.map.center,8)
  f.event('keydown',{key:'ArrowRight'})
  assert.ok(Math.abs(projectCamera(f.map.center,8).x-before.x-80)<1e-8)
  f.controller.dispose()
})
