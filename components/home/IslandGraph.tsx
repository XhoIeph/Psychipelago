'use client'

import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'

type Position = readonly [number, number]
type Region = 'trauma' | 'dissociation' | 'personality'
type Island = {
  id: string
  label: string
  description: string
  region: Region
  large?: boolean
  wide: Position
  narrow: Position
  links?: readonly string[]
}

const islands: readonly Island[] = [
  { id: 'ptsd', label: 'PTSD', description: '创伤后应激障碍的核心表现包括再体验、回避和持续的当前威胁感。', region: 'trauma', large: true, wide: [22, 25], narrow: [27, 14] },
  { id: 'cptsd', label: 'C-PTSD', description: '复杂性创伤后应激障碍还涉及情绪调节、负性自我概念及人际关系困难。', region: 'trauma', large: true, wide: [34, 37], narrow: [73, 16] },
  { id: 'replay', label: '再体验', description: '创伤可能借由闪回或噩梦，让人感觉事件正在重演。', region: 'trauma', wide: [9, 21], narrow: [16, 6], links: ['ptsd', 'cptsd'] },
  { id: 'avoidance', label: '回避', description: '避开可能勾起创伤记忆的想法、情境或活动。', region: 'trauma', wide: [25, 6], narrow: [48, 4], links: ['ptsd', 'cptsd'] },
  { id: 'threat', label: '威胁感', description: '危险已经过去，仍可能过度警觉或容易受惊。', region: 'trauma', wide: [41, 14], narrow: [83, 8], links: ['ptsd', 'cptsd'] },
  { id: 'affect', label: '情绪调节', description: '情绪反应很难平复，也可能表现为情感麻木。', region: 'trauma', wide: [13, 42], narrow: [18, 23], links: ['cptsd'] },
  { id: 'self', label: '负性自我概念', description: '持续觉得自己毫无价值或失败，常伴随与创伤有关的羞耻或内疚。', region: 'trauma', wide: [26, 52], narrow: [50, 25], links: ['cptsd'] },
  { id: 'relations', label: '关系困难', description: '与人保持亲近或维系关系可能变得困难。', region: 'trauma', wide: [44, 47], narrow: [82, 23], links: ['cptsd'] },
  { id: 'osdd', label: 'OSDD', description: '其他特定解离障碍指解离症状带来明显困扰或影响日常生活，且能说明为何未达到某一具体解离障碍的完整诊断标准。', region: 'dissociation', large: true, wide: [65, 30], narrow: [25, 38] },
  { id: 'did', label: 'DID', description: '解离性身份障碍涉及两个或以上不同的身份状态，以及身份感和行动主体感的中断。', region: 'dissociation', large: true, wide: [82, 28], narrow: [74, 38] },
  { id: 'dissociation', label: '解离体验', description: '记忆、感知或身份等原本相连的体验出现间断。', region: 'dissociation', wide: [69, 11], narrow: [50, 31], links: ['osdd', 'did'] },
  { id: 'identity', label: '身份状态', description: '不同的身份状态可能有各自体验、理解和回应世界的方式。', region: 'dissociation', wide: [86, 8], narrow: [17, 47], links: ['did'] },
  { id: 'agency', label: '主体感中断', description: '对自己的想法、感受或行动属于谁的体验发生明显变化。', region: 'dissociation', wide: [73, 46], narrow: [50, 49], links: ['did'] },
  { id: 'memory', label: '记忆空缺', description: '可能想不起一些日常事件或个人经历，空缺超出一般遗忘。', region: 'dissociation', wide: [91, 42], narrow: [83, 47], links: ['did'] },
  { id: 'pd', label: '人格障碍', description: '长期在理解自己、调节行为或与人相处方面遇到困难，程度和表现因人而异。', region: 'personality', large: true, wide: [53, 69], narrow: [50, 71] },
  { id: 'paranoid', label: '偏执型', description: '常对他人的动机抱有持续怀疑，并容易将中性行为理解为敌意。', region: 'personality', wide: [27, 70], narrow: [18, 58], links: ['pd'] },
  { id: 'schizoid', label: '分裂样', description: '较少寻求亲密关系，并常偏好独处。', region: 'personality', wide: [22, 88], narrow: [82, 58], links: ['pd'] },
  { id: 'dissocial', label: '反社会型', description: '表现为持续漠视他人感受和社会义务。', region: 'personality', wide: [31, 61], narrow: [18, 72], links: ['pd'] },
  { id: 'unstable', label: '情绪不稳定型', description: '常见情绪波动与冲动，分为冲动型和边缘型。', region: 'personality', wide: [54, 47], narrow: [50, 58], links: ['pd'] },
  { id: 'impulsive', label: '冲动型', description: '以情绪波动和难以控制冲动为主要特征。', region: 'personality', wide: [50, 32], narrow: [29, 53], links: ['unstable'] },
  { id: 'borderline', label: '边缘型', description: '自我认同和人际关系可能不稳定，也可能长期感到空虚。', region: 'personality', wide: [64, 41], narrow: [71, 53], links: ['unstable'] },
  { id: 'histrionic', label: '表演型', description: '可表现为强烈寻求关注、情绪表达夸张。', region: 'personality', wide: [68, 55], narrow: [82, 72], links: ['pd'] },
  { id: 'anankastic', label: '强迫型', description: '常因过度追求秩序、完美与控制而牺牲灵活性。', region: 'personality', wide: [83, 69], narrow: [18, 83], links: ['pd'] },
  { id: 'avoidant', label: '焦虑（回避）型', description: '可能渴望接近他人，却因担心批评或拒绝而避开交往。', region: 'personality', wide: [35, 84], narrow: [49, 85], links: ['pd'] },
  { id: 'dependent', label: '依赖型', description: '常把重要决定交给他人，并害怕独处或失去支持。', region: 'personality', wide: [46, 91], narrow: [82, 83], links: ['pd'] },
  { id: 'other', label: '其他特定类型', description: '适用于具有特定表现、但归不到其他已列类型的人格障碍。', region: 'personality', wide: [61, 90], narrow: [27, 94], links: ['pd'] },
  { id: 'unspecified', label: '未特定类型', description: '用于已识别出人格障碍、类型尚未明确的情况。', region: 'personality', wide: [72, 82], narrow: [74, 94], links: ['pd'] },
  { id: 'mixed', label: '混合型', description: '具有多种人格障碍的特征，难以归入任一单一类型。', region: 'personality', wide: [86, 90], narrow: [82, 64], links: ['pd'] },
]

const byId = new Map(islands.map(island => [island.id, island]))
const connections = islands.flatMap(from => (from.links ?? []).map(id => ({ from: from.id, to: id })))
const neighbors = new Map(islands.map(({ id }) => [id, connections.flatMap(({ from, to }) =>
  from === id ? [to] : to === id ? [from] : [],
)]))
const shore = 'M2 14c0-2 4-3 6-5 2-1 2-4 5-4 2 0 3 3 5 4 3 1 6 2 6 5 0 3-6 5-12 5S2 17 2 14ZM24 7c-1-2 2-4 4-3 3 1 3 4 1 5-2 1-4 0-5-2Z'

type Point = { x: number; y: number }
type LabelBounds = { width: number; height: number; top: number }
type Camera = Point & { zoom: number }
type ChartSize = { width: number; height: number }
type Pull = { pointer: number; id?: string; start: Point; offset: Point; camera: Camera; moved: boolean; target: Point; reduced: boolean }
const zero = { x: 0, y: 0 }
const overview = { ...zero, zoom: 1 }

export function IslandGraph() {
  const lineMask = useId()
  const chart = useRef<HTMLDivElement>(null)
  const pull = useRef<Pull | undefined>(undefined)
  const pointerType = useRef('')
  const frame = useRef(0)
  const bodies = useRef(new Map(islands.map(({ id }) => [id, { x: 0, y: 0, vx: 0, vy: 0 }])))
  const [size, setSize] = useState({ width: 1152, height: 600, narrow: false })
  const [labels, setLabels] = useState<Record<string, LabelBounds>>({})
  const [offsets, setOffsets] = useState<Record<string, Point>>({})
  const [camera, setCamera] = useState(overview)
  const [dragging, setDragging] = useState(false)
  const [hovered, setHovered] = useState<string>()
  const [focused, setFocused] = useState<string>()
  const [selected, setSelected] = useState<string>()
  const activeId = dragging ? pull.current?.id : hovered ?? focused ?? selected
  const active = activeId ? byId.get(activeId) : undefined
  const related = activeId ? neighbors.get(activeId)! : []

  useEffect(() => {
    const element = chart.current!
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height, narrow: matchMedia('(max-width: 760px)').matches })
      setCamera(overview)
    })
    observer.observe(element)
    const labelObserver = new ResizeObserver(entries => {
      const measured = entries.map(({ target, contentRect }) => {
        const label = target as HTMLSpanElement
        const node = label.parentElement!
        const shift = new DOMMatrixReadOnly(getComputedStyle(node).transform)
        return [node.dataset.island!, { width: contentRect.width, height: contentRect.height, top: label.offsetTop + shift.f }] as const
      })
      setLabels(current => ({ ...current, ...Object.fromEntries(measured) }))
    })
    element.querySelectorAll('.tc-island-node > span:not([hidden])').forEach(label => labelObserver.observe(label))
    function zoomWithWheel(event: WheelEvent) {
      // The graph is embedded in a scrolling page, so only the focused canvas owns the wheel.
      if (document.activeElement !== element || event.ctrlKey || matchMedia('(max-width: 760px)').matches) return
      event.preventDefault()
      const rect = element.getBoundingClientRect()
      setCamera(current => zoomAround(current, Math.exp(-event.deltaY * (event.deltaMode ? .045 : .0015)), {
        x: event.clientX - rect.left, y: event.clientY - rect.top,
      }, rect))
    }
    element.addEventListener('wheel', zoomWithWheel, { passive: false })
    return () => {
      observer.disconnect()
      labelObserver.disconnect()
      element.removeEventListener('wheel', zoomWithWheel)
      cancelAnimationFrame(frame.current)
    }
  }, [])

  const anchors = new Map(islands.map(island => {
    const [x, y] = size.narrow ? island.narrow : island.wide
    return [island.id, { x: x * size.width / 100, y: y * size.height / 100 }]
  }))

  function tick() {
    frame.current = 0
    const grabbed = pull.current
    const current = bodies.current
    const next: Record<string, Point> = {}
    let moving = false
    const held = grabbed?.moved && grabbed.id ? current.get(grabbed.id)! : undefined
    if (held && grabbed) Object.assign(held, grabbed.target, { vx: 0, vy: 0 })

    // The readable starting layout supplies the resting positions; each link behaves as a spring when displaced.
    for (const island of islands) {
      const body = current.get(island.id)!
      if (body === held) continue
      let ax = -body.x * .055
      let ay = -body.y * .055
      const point = anchors.get(island.id)!
      for (const id of neighbors.get(island.id)!) {
        const neighbor = current.get(id)!
        ax += (neighbor.x - body.x) * .045
        ay += (neighbor.y - body.y) * .045
      }
      for (const other of islands) {
        if (other === island) continue
        const otherBody = current.get(other.id)!
        if (otherBody.x === body.x && otherBody.y === body.y) continue
        const rest = anchors.get(other.id)!
        const dx = point.x + body.x - rest.x - otherBody.x
        const dy = point.y + body.y - rest.y - otherBody.y
        const distance = Math.hypot(dx, dy)
        const gap = Math.min(46, Math.hypot(point.x - rest.x, point.y - rest.y))
        if (distance > 0 && distance < gap) {
          const repel = (gap - distance) * .18 / distance
          ax += dx * repel
          ay += dy * repel
        }
      }
      body.vx = (body.vx + ax) * .76
      body.vy = (body.vy + ay) * .76
    }
    for (const [id, body] of current) {
      body.x += body.vx
      body.y += body.vy
      moving ||= Math.hypot(body.vx, body.vy) > .045 || (!held && Math.hypot(body.x, body.y) > .2)
      next[id] = { x: body.x, y: body.y }
    }
    if (moving || held) setOffsets(next)
    else {
      current.forEach(body => Object.assign(body, zero, { vx: 0, vy: 0 }))
      setOffsets({})
    }
    if (moving) frame.current = requestAnimationFrame(tick)
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    pointerType.current = event.pointerType
    if (event.pointerType === 'mouse') setSelected(undefined)
    if (event.button !== 0 || event.pointerType !== 'mouse' || size.narrow) return
    const id = (event.target as Element).closest<HTMLButtonElement>('[data-island]')?.dataset.island
    const offset = id ? offsets[id] ?? zero : zero
    pull.current = {
      pointer: event.pointerId, id, start: { x: event.clientX, y: event.clientY }, offset, camera, moved: false,
      target: offset, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    }
    if (!id) event.currentTarget.focus({ preventScroll: true })
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const current = pull.current
    if (!current || current.pointer !== event.pointerId) return
    if (!event.buttons) { endDrag(event); return }
    const dx = event.clientX - current.start.x
    const dy = event.clientY - current.start.y
    if (!current.moved) {
      if (Math.hypot(dx, dy) < 4) return
      current.moved = true
      event.currentTarget.setPointerCapture(event.pointerId)
      setHovered(undefined)
      setDragging(true)
    }
    if (current.id) {
      const point = anchors.get(current.id)!
      current.target = {
        x: Math.max(18 - point.x, Math.min(size.width - 18 - point.x, current.offset.x + dx / camera.zoom)),
        y: Math.max(16 - point.y, Math.min(size.height - 32 - point.y, current.offset.y + dy / camera.zoom)),
      }
      if (current.reduced) setOffsets({ [current.id]: current.target })
      else if (!frame.current) frame.current = requestAnimationFrame(tick)
    } else {
      const { x, y, zoom } = current.camera
      setCamera(limitCamera({ x: x + dx, y: y + dy, zoom }, size))
    }
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const current = pull.current
    if (!current || current.pointer !== event.pointerId) return
    pull.current = undefined
    if (current.moved) {
      setDragging(false)
      if (current.id) {
        if (current.reduced) setOffsets({})
        else if (!frame.current) frame.current = requestAnimationFrame(tick)
      }
    }
  }

  const points = new Map(islands.map(({ id }) => {
    const rest = anchors.get(id)!
    const offset = offsets[id] ?? zero
    return [id, { x: rest.x + offset.x, y: rest.y + offset.y }]
  }))
  const activePoint = active && points.get(active.id)!
  const tooltipX = activePoint ? activePoint.x * camera.zoom + camera.x : 0
  const tooltipY = activePoint ? activePoint.y * camera.zoom + camera.y : 0
  const tooltipVisible = active && !dragging && tooltipX >= 0 && tooltipX <= size.width && tooltipY >= 0 && tooltipY <= size.height
  // Leave both subtype islands visible when describing their parent.
  const tooltipAbove = tooltipY > 155 && activeId !== 'unstable'

  return (
    <figure className="tc-island-graph" aria-labelledby="home-intro-title">
      <div ref={chart} className="tc-island-chart" role="group" tabIndex={0} aria-label="关系图谱"
        data-highlight={activeId ? '' : undefined} data-dragging={dragging ? '' : undefined}
        onPointerDown={startDrag} onPointerMove={drag} onPointerUp={endDrag} onPointerCancel={endDrag}
        onLostPointerCapture={endDrag} onPointerLeave={event => { if (!pull.current?.moved) endDrag(event) }}
        onClick={event => { if (!(event.target as Element).closest('[data-island]')) setSelected(undefined) }}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            setHovered(undefined)
            setFocused(undefined)
            setSelected(undefined)
            setCamera(overview)
          }
          if (event.target === event.currentTarget && (event.key === '+' || event.key === '=' || event.key === '-')) {
            event.preventDefault()
            setCamera(current => zoomAround(current, event.key === '-' ? 1 / 1.18 : 1.18, { x: size.width / 2, y: size.height / 2 }, size))
          }
        }}>
        <div className="tc-island-window">
          <div className="tc-island-scene" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}>
            <svg className="tc-island-connections" aria-hidden="true" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none">
              <mask id={lineMask} maskUnits="userSpaceOnUse" x="0" y="0" width={size.width} height={size.height}>
                <rect width={size.width} height={size.height} fill="white" />
                {Object.entries(labels).map(([id, label]) => {
                  const { x, y } = points.get(id)!
                  return <rect key={id} x={x - label.width / 2 - 3} y={y + label.top - 2}
                    width={label.width + 6} height={label.height + 4} fill="black" />
                })}
              </mask>
              <g mask={`url(#${lineMask})`}>
                {connections.map(({ from, to }) => (
                  <line key={`${from}-${to}`} x1={points.get(from)!.x} y1={points.get(from)!.y}
                    x2={points.get(to)!.x} y2={points.get(to)!.y} vectorEffect="non-scaling-stroke"
                    data-active={from === activeId || to === activeId || undefined} />
                ))}
              </g>
            </svg>
            {islands.map(island => {
              const { x, y } = points.get(island.id)!
              const [left, top] = size.narrow ? island.narrow : island.wide
              const offset = offsets[island.id]
              return (
                <button key={island.id} type="button" className="tc-island-node" data-island={island.id}
                  style={{ left: `${left}%`, top: `${top}%`, translate: offset && `${offset.x}px ${offset.y}px` }}
                  data-region={island.region} data-large={island.large} data-active={island.id === activeId || undefined}
                  data-related={related.includes(island.id) || undefined} aria-pressed={island.id === selected}
                  aria-describedby={`island-${island.id}-description`}
                  onPointerEnter={event => { if (event.pointerType === 'mouse' && !pull.current?.moved) setHovered(island.id) }}
                  onPointerLeave={() => setHovered(undefined)}
                  onFocus={event => {
                    if (!event.currentTarget.matches(':focus-visible')) return
                    if (x * camera.zoom + camera.x < 48 || x * camera.zoom + camera.x > size.width - 48 ||
                        y * camera.zoom + camera.y < 22 || y * camera.zoom + camera.y > size.height - 34) setCamera(overview)
                    setFocused(island.id)
                  }}
                  onBlur={() => setFocused(undefined)}
                  onClick={event => {
                    if (event.detail > 0 && pointerType.current === 'mouse') {
                      setFocused(undefined)
                      return
                    }
                    setSelected(current => current === island.id ? undefined : island.id)
                  }}>
                  <svg aria-hidden="true" viewBox="0 0 32 22"><path d={shore} /></svg>
                  <span>{island.label}</span>
                  <span id={`island-${island.id}-description`} hidden>{island.description}</span>
                </button>
              )
            })}
          </div>
        </div>
        {tooltipVisible && (
          <div className="tc-island-tooltip" aria-hidden="true" style={{ left: `clamp(var(--tip-half), ${tooltipX}px, calc(100% - var(--tip-half)))`, top: tooltipY }}
            data-above={tooltipAbove || undefined}>
            <strong>{active.label}</strong>
            <p>{active.description}</p>
          </div>
        )}
      </div>
    </figure>
  )
}

function limitCamera(camera: Camera, { width, height }: ChartSize): Camera {
  function limitAxis(position: number, extent: number) {
    const center = (1 - camera.zoom) * extent / 2
    // Keep the overview in view while letting larger scales expose both edges.
    const range = Math.max(16, -center)
    return Math.max(center - range, Math.min(center + range, position))
  }
  return { x: limitAxis(camera.x, width), y: limitAxis(camera.y, height), zoom: camera.zoom }
}

function zoomAround(camera: Camera, factor: number, origin: Point, size: ChartSize): Camera {
  const zoom = Math.min(1.85, Math.max(.8, camera.zoom * factor))
  const ratio = zoom / camera.zoom
  return limitCamera({ zoom, x: origin.x + (camera.x - origin.x) * ratio, y: origin.y + (camera.y - origin.y) * ratio }, size)
}
