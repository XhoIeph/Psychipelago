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
  { id: 'pd', label: '人格障碍', description: 'ICD-11（6D10）按自我与人际功能受影响的程度分档，并用突出的特质或模式描述具体表现。', region: 'personality', large: true, wide: [50, 58], narrow: [50, 58] },
  { id: 'severity', label: '严重程度', description: '按人格功能受影响的程度分为轻度、中度和重度。严重程度未明确时，可记为 6D10.Z。', region: 'personality', wide: [27, 71], narrow: [23, 67], links: ['pd'] },
  { id: 'mild', label: '轻度', description: '6D10.0 · 困难影响部分生活领域，部分关系和日常职责仍能维持。', region: 'personality', wide: [12, 85], narrow: [12, 76], links: ['severity'] },
  { id: 'moderate', label: '中度', description: '6D10.1 · 困难影响多个生活领域，关系或日常职责常明显受影响。', region: 'personality', wide: [26, 93], narrow: [23, 82], links: ['severity'] },
  { id: 'severe', label: '重度', description: '6D10.2 · 自我与人际功能受到广泛影响，多数生活领域出现明显困难。', region: 'personality', wide: [41, 85], narrow: [36, 76], links: ['severity'] },
  { id: 'traits', label: '特质域与模式', description: 'ICD-11（6D11）可用一个或多个突出特质域描述表现，也可另外标注边缘型模式。', region: 'personality', wide: [72, 71], narrow: [72, 67], links: ['pd'] },
  { id: 'negative-affectivity', label: '负性情感', description: '6D11.0 · 容易频繁或强烈地体验焦虑、愤怒、悲伤等情绪。', region: 'personality', wide: [53, 81], narrow: [55, 74], links: ['traits'] },
  { id: 'detachment', label: '分离特征', description: '6D11.1 · 倾向于与人保持社交或情感距离，较少建立亲密关系。', region: 'personality', wide: [59, 91], narrow: [47, 84], links: ['traits'] },
  { id: 'dissociality', label: '社交紊乱', description: '6D11.2 · 在人际互动中较少顾及他人的感受或权利。', region: 'personality', wide: [71, 94], narrow: [65, 90], links: ['traits'] },
  { id: 'disinhibition', label: '脱抑制', description: '6D11.3 · 容易受眼前的刺激或冲动驱使，行动前较少考虑后果。', region: 'personality', wide: [83, 92], narrow: [72, 82], links: ['traits'] },
  { id: 'anankastia', label: '强迫性', description: '6D11.4 · 对完美、秩序和规则的要求较强，遇到变化时较难调整。', region: 'personality', wide: [92, 84], narrow: [88, 80], links: ['traits'] },
  { id: 'borderline-pattern', label: '边缘型模式', description: '6D11.5 · 可额外标注的模式，常涉及自我认同、人际关系、情绪的不稳定和冲动。', region: 'personality', wide: [91, 68], narrow: [82, 96], links: ['traits'] },
]

const byId = new Map(islands.map(island => [island.id, island]))
const connections = islands.flatMap(from => (from.links ?? []).map(id => ({ from: from.id, to: id })))
const neighbors = new Map(islands.map(({ id }) => [id, connections.flatMap(({ from, to }) =>
  from === id ? [to] : to === id ? [from] : [],
)]))
const shore = 'M2 14c0-2 4-3 6-5 2-1 2-4 5-4 2 0 3 3 5 4 3 1 6 2 6 5 0 3-6 5-12 5S2 17 2 14ZM24 7c-1-2 2-4 4-3 3 1 3 4 1 5-2 1-4 0-5-2Z'

type LabelBounds = { width: number; height: number; top: number }
type Point = { x: number; y: number }
const initialSize = { width: 1152, height: 600, narrow: false }

function anchor(island: Island, { width, height, narrow }: typeof initialSize): Point {
  const [x, y] = narrow ? island.narrow : island.wide
  return { x: x * width / 100, y: y * height / 100 }
}

type Pull = {
  id: string
  pointer: number
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  left: number
  right: number
  top: number
  bottom: number
  reduced: boolean
  target?: Point
}

export function IslandGraph() {
  const lineMask = useId()
  const labelFade = `${lineMask}-label-fade`
  const chart = useRef<HTMLDivElement>(null)
  const pointerType = useRef('')
  const pull = useRef<Pull>(undefined)
  const frame = useRef(0)
  const chartSize = useRef(initialSize)
  const bodies = useRef(new Map(islands.map(({ id }) => [id, { x: 0, y: 0, vx: 0, vy: 0 }])))
  const [size, setSize] = useState(initialSize)
  const [labels, setLabels] = useState<Record<string, LabelBounds>>({})
  const [offsets, setOffsets] = useState<Record<string, Point>>({})
  const [dragged, setDragged] = useState<string>()
  const [hovered, setHovered] = useState<string>()
  const [focused, setFocused] = useState<string>()
  const [selected, setSelected] = useState<string>()
  const activeId = dragged ?? hovered ?? focused ?? selected
  const active = activeId ? byId.get(activeId) : undefined
  const related = activeId ? neighbors.get(activeId)! : []

  useEffect(() => {
    const element = chart.current!
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      chartSize.current = { width, height, narrow: matchMedia('(max-width: 760px)').matches }
      setSize(chartSize.current)
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
    return () => {
      observer.disconnect()
      labelObserver.disconnect()
      cancelAnimationFrame(frame.current)
    }
  }, [])

  const points = new Map(islands.map(island => {
    const { x, y } = anchor(island, size)
    const offset = offsets[island.id]
    return [island.id, { x: x + (offset?.x ?? 0), y: y + (offset?.y ?? 0) }]
  }))

  function tick() {
    frame.current = 0
    const current = bodies.current
    const grabbed = pull.current
    const held = grabbed?.target ? current.get(grabbed.id)! : undefined
    if (held) Object.assign(held, grabbed!.target, { vx: 0, vy: 0 })
    const anchors = new Map(islands.map(island => [island.id, anchor(island, chartSize.current)]))

    // Resting anchors keep the layout readable while the links transfer motion between nodes.
    for (const [id, body] of current) {
      if (body === held) continue
      let ax = -body.x * .055
      let ay = -body.y * .055
      const point = anchors.get(id)!
      for (const neighborId of neighbors.get(id)!) {
        const neighbor = current.get(neighborId)!
        ax += (neighbor.x - body.x) * .045
        ay += (neighbor.y - body.y) * .045
      }
      for (const [otherId, other] of current) {
        if (other === body || (other.x === body.x && other.y === body.y)) continue
        const rest = anchors.get(otherId)!
        const dx = point.x + body.x - rest.x - other.x
        const dy = point.y + body.y - rest.y - other.y
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

    let moving = false
    const next: Record<string, Point> = {}
    for (const [id, body] of current) {
      body.x += body.vx
      body.y += body.vy
      moving ||= Math.hypot(body.vx, body.vy) > .045 || (!held && Math.hypot(body.x, body.y) > .2)
      next[id] = { x: body.x, y: body.y }
    }
    if (moving || held) setOffsets(next)
    else {
      current.forEach(body => Object.assign(body, { x: 0, y: 0, vx: 0, vy: 0 }))
      setOffsets({})
    }
    if (moving) frame.current = requestAnimationFrame(tick)
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    pointerType.current = event.pointerType
    if (event.pointerType === 'mouse') setSelected(undefined)
    if (!event.isPrimary || event.button !== 0 || pull.current) return
    const node = (event.target as Element).closest<HTMLButtonElement>('[data-island]')
    if (!node) return
    const id = node.dataset.island!
    const offset = offsets[id]
    const bounds = node.getBoundingClientRect()
    const area = event.currentTarget.getBoundingClientRect()
    pull.current = {
      id, pointer: event.pointerId, startX: event.clientX, startY: event.clientY,
      offsetX: offset?.x ?? 0, offsetY: offset?.y ?? 0,
      left: Math.min(0, area.left - bounds.left), right: Math.max(0, area.right - bounds.right),
      top: Math.min(0, area.top - bounds.top), bottom: Math.max(0, area.bottom - bounds.bottom),
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    }
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const current = pull.current
    if (!current || event.pointerId !== current.pointer) return
    const dx = event.clientX - current.startX
    const dy = event.clientY - current.startY
    if (!current.target) {
      if (Math.hypot(dx, dy) < 4) return
      event.currentTarget.setPointerCapture(event.pointerId)
      setDragged(current.id)
      setHovered(undefined)
    }
    const island = byId.get(current.id)!
    const origin = anchor(island, chartSize.current)
    const target = {
      x: origin.x + current.offsetX + Math.max(current.left, Math.min(current.right, dx)),
      y: origin.y + current.offsetY + Math.max(current.top, Math.min(current.bottom, dy)),
    }
    const iconSize = (island.large ? 36 : 23) * 1.23
    const halfWidth = iconSize / 2
    const halfHeight = iconSize * 22 / 32 / 2
    const minX = origin.x + current.offsetX + current.left
    const maxX = origin.x + current.offsetX + current.right
    const minY = origin.y + current.offsetY + current.top
    const maxY = origin.y + current.offsetY + current.bottom

    for (let pass = 0; pass < islands.length; pass++) {
      let separated = false
      for (const other of islands) {
        if (other.id === current.id) continue
        const label = labels[other.id]
        if (!label) continue
        const body = bodies.current.get(other.id)!
        const point = anchor(other, chartSize.current)
        const labelX = point.x + body.x
        const labelY = point.y + body.y + label.top + label.height / 2
        const overlapX = halfWidth + label.width / 2 + 4 - Math.abs(target.x - labelX)
        const overlapY = halfHeight + label.height / 2 + 4 - Math.abs(target.y - labelY)
        if (overlapX <= 0 || overlapY <= 0) continue

        const direction = current.id < other.id ? -1 : 1
        if (overlapX < overlapY) {
          target.x += (Math.sign(target.x - labelX) || Math.sign(dx) || direction) * overlapX
          target.x = Math.max(minX, Math.min(maxX, target.x))
        } else {
          target.y += (Math.sign(target.y - labelY) || Math.sign(dy) || direction) * overlapY
          target.y = Math.max(minY, Math.min(maxY, target.y))
        }
        separated = true
      }
      if (!separated) break
    }

    current.target = { x: target.x - origin.x, y: target.y - origin.y }
    if (current.reduced) setOffsets({ [current.id]: current.target })
    else if (!frame.current) frame.current = requestAnimationFrame(tick)
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const current = pull.current
    if (!current || event.pointerId !== current.pointer) return
    pull.current = undefined
    if (!current.target) return
    setDragged(undefined)
    if (current.reduced) setOffsets({})
    else if (!frame.current) frame.current = requestAnimationFrame(tick)
  }

  const activePoint = activeId ? points.get(activeId) : undefined

  return (
    <figure className="tc-island-graph" aria-labelledby="home-intro-title">
      <div ref={chart} className="tc-island-chart" role="group" aria-label="关系图谱"
        data-highlight={activeId ? '' : undefined} data-dragging={dragged ? '' : undefined}
        onPointerDown={startDrag} onPointerMove={drag} onPointerUp={endDrag} onPointerCancel={endDrag}
        onLostPointerCapture={event => { if (event.target === event.currentTarget) endDrag(event) }}
        onPointerLeave={event => { if (!pull.current?.target) endDrag(event) }}
        onClick={event => { if (!(event.target as Element).closest('[data-island]')) setSelected(undefined) }}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            setHovered(undefined)
            setFocused(undefined)
            setSelected(undefined)
          }
        }}>
        <div className="tc-island-window">
          <svg className="tc-island-connections" aria-hidden="true" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none">
            {/* Hard cuts in dense connections make transparent labels look like boxes. */}
            <radialGradient id={labelFade}>
              <stop offset=".64" stopColor="black" />
              <stop offset="1" stopColor="black" stopOpacity="0" />
            </radialGradient>
            <mask id={lineMask} maskUnits="userSpaceOnUse" x="0" y="0" width={size.width} height={size.height}>
              <rect width={size.width} height={size.height} fill="white" />
              {Object.entries(labels).map(([id, label]) => {
                const { x, y } = points.get(id)!
                return <ellipse key={id} cx={x} cy={y + label.top + label.height / 2}
                  rx={label.width / 2 + 11} ry={label.height / 2 + 6} fill={`url(#${labelFade})`} />
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
            const [left, top] = size.narrow ? island.narrow : island.wide
            const offset = offsets[island.id]
            return (
              <button key={island.id} type="button" className="tc-island-node" data-island={island.id}
                style={{ left: `${left}%`, top: `${top}%`, translate: offset && `${offset.x}px ${offset.y}px` }}
                data-region={island.region} data-large={island.large} data-active={island.id === activeId || undefined}
                data-related={related.includes(island.id) || undefined} aria-pressed={island.id === selected}
                aria-describedby={`island-${island.id}-description`}
                onPointerEnter={event => { if (event.pointerType === 'mouse' && !pull.current?.target) setHovered(island.id) }}
                onPointerLeave={() => setHovered(undefined)}
                onFocus={event => { if (event.currentTarget.matches(':focus-visible')) setFocused(island.id) }}
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
        {active && activePoint && !dragged && (
          <div className="tc-island-tooltip" aria-hidden="true" style={{ left: `clamp(var(--tip-half), ${activePoint.x}px, calc(100% - var(--tip-half)))`, top: activePoint.y }}
            data-above={activePoint.y > 155 || undefined}>
            <strong>{active.label}</strong>
            <p>{active.description}</p>
          </div>
        )}
      </div>
    </figure>
  )
}
