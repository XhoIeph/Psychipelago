'use client'

import { useRef } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { EMBLEM_GLYPHS, EMBLEM_ORIGIN, EMBLEM_VIEWBOX } from './emblem-paths'

gsap.registerPlugin(useGSAP)

/**
 * 所有字形共用一套耦合网格：外沿锁定在整体矩形轮廓上，
 * 相邻字形通过共享边界此消彼长，保证变形时内部空间始终饱满且永不碰撞。
 */
const PAIRS = /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g

type GlyphBox = { x0: number; x1: number; y0: number; y1: number }

const ORIGINALS: Record<string, string> = Object.fromEntries(
  EMBLEM_GLYPHS.map((glyph) => [glyph.name, glyph.d])
)

function measureBox(d: string): GlyphBox {
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  for (const match of d.matchAll(PAIRS)) {
    const x = Number(match[1])
    const y = Number(match[2])
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  return { x0, x1, y0, y1 }
}

const BOXES: Record<string, GlyphBox> = Object.fromEntries(
  EMBLEM_GLYPHS.map((glyph) => [glyph.name, measureBox(glyph.d)])
)

const P1_BOWL_Y1 = 2214.68

const clamp = (v: number) => Math.max(0, Math.min(1, v))
const smooth = (v: number) => v * v * (3 - 2 * v)
const bend = (v: number, a: number, b: number) => smooth(clamp((v - a) / (b - a)))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function remap(name: string, fn: (x: number, y: number) => [number, number]): string {
  const source = ORIGINALS[name] ?? ''
  return source.replace(PAIRS, (_, rawX: string, rawY: string) => {
    const [nx, ny] = fn(Number(rawX), Number(rawY))
    return `${nx.toFixed(2)} ${ny.toFixed(2)}`
  })
}

function fitBox(x: number, y: number, orig: GlyphBox, target: GlyphBox): [number, number] {
  return [
    target.x0 + ((x - orig.x0) / (orig.x1 - orig.x0)) * (target.x1 - target.x0),
    target.y0 + ((y - orig.y0) / (orig.y1 - orig.y0)) * (target.y1 - target.y0),
  ]
}

export type PoseChannels = {
  p1: number
  p2: number
  sDrop: number
  yDrop: number
  cL: number
  cR: number
  hW: number
  eL: number
  eR: number
  lW: number
  midTop: number
  midBot: number
  eWave: number
  gL: number
  gR: number
}

export const POSE_KEYFRAMES: ReadonlyArray<PoseChannels> = [
  { p1: 0, p2: 0, sDrop: 0, yDrop: 0, cL: 0, cR: 0, hW: 0, eL: 0, eR: 0, lW: 0, midTop: 0, midBot: 0, eWave: 0, gL: 0, gR: 0 },
  { p1: 215, p2: -88, sDrop: -78, yDrop: -145, cL: -112, cR: -10, hW: 32, eL: -92, eR: 22, lW: -18, midTop: -42, midBot: -96, eWave: 20, gL: -88, gR: 42 },
  { p1: -88, p2: 225, sDrop: 122, yDrop: -90, cL: -132, cR: 96, hW: -24, eL: -86, eR: -65, lW: 52, midTop: 22, midBot: 92, eWave: -20, gL: -88, gR: 68 },
  { p1: 160, p2: 105, sDrop: -38, yDrop: 62, cL: -62, cR: -16, hW: 28, eL: -92, eR: 72, lW: -16, midTop: -38, midBot: 44, eWave: 16, gL: -68, gR: -44 },
  { p1: 200, p2: 195, sDrop: -92, yDrop: -105, cL: -120, cR: 82, hW: -10, eL: -72, eR: -48, lW: 28, midTop: -28, midBot: -68, eWave: -16, gL: -88, gR: 38 },
]

export function applyMultiPose(
  byName: Map<string, SVGPathElement>,
  raw: PoseChannels,
  gain = 1
) {
  const p1 = raw.p1 * gain
  const p2 = raw.p2 * gain
  const sDrop = raw.sDrop * gain
  const yDrop = raw.yDrop * gain
  const cL = raw.cL * gain
  const cR = raw.cR * gain
  const hW = raw.hW * gain
  const eL = raw.eL * gain
  const eR = raw.eR * gain
  const lW = raw.lW * gain
  const midTopDelta = raw.midTop * gain
  const midBotDelta = raw.midBot * gain
  const eWave = raw.eWave * gain
  const gL = raw.gL * gain
  const gR = raw.gR * gain

  const bP1 = BOXES.p1!
  const bS = BOXES.s!
  const bY = BOXES.y!
  const bC = BOXES.c!
  const bH = BOXES.h!
  const bI = BOXES.i!
  const bP2 = BOXES.p2!
  const bPlusH = BOXES['plus-horizontal']!
  const bPlusV = BOXES['plus-vertical']!
  const bE = BOXES.e!
  const bL = BOXES.l!
  const bA = BOXES.a!
  const bG = BOXES.g!
  const bMark = BOXES.mark!

  // Left compartment: P1 stays locked vertically while S, Y, C, H, I share internal grid boundaries.
  const p1Right = bP1.x1 + p1
  const sLeft = p1Right + 64.01
  const sOrigW = bS.x1 - bS.x0
  const yUpperOrigL = 2017.07
  const yRight = bY.x1
  const topAvail = yRight - sLeft - 55.56
  const sTargetW = Math.max(430, Math.min(730, sOrigW + (topAvail - (sOrigW + (yRight - yUpperOrigL))) * 0.52))
  const sRight = sLeft + sTargetW
  const sBottom = bS.y1 + sDrop
  const yUpperLeft = sRight + 55.56

  const cLeft = bC.x0 + cL
  const cRight = bC.x1 + cR
  const cTop = Math.max(P1_BOWL_Y1 + 135, sBottom + 155.06 - (sDrop < 0 ? Math.abs(sDrop) * 0.45 : 0))
  const cBot = bC.y1

  const yBot = bY.y1 + yDrop
  const yTailShift = Math.max(0, cRight + 77.4 - bY.x0)

  const hLeft = Math.max(bH.x0, cRight + 102.68)
  const iRightMax = 2785
  const hBaseW = bH.x1 - bH.x0 + hW
  const iBaseW = bI.x1 - bI.x0 + hW * 0.25
  const gapHI = 150.22 - (cR > 0 ? Math.min(25, cR * 0.25) : 0)
  const maxSumW = iRightMax - hLeft - gapHI
  const scaleHI = hBaseW + iBaseW > maxSumW ? maxSumW / (hBaseW + iBaseW) : 1
  const hRight = hLeft + hBaseW * scaleHI
  const iLeft = hRight + gapHI
  const iRight = iLeft + iBaseW * scaleHI
  const hTop = yBot + 132.61
  const iTop = yBot + 74.22

  // Right compartment: P2 stays locked vertically while +, E, L, A, G, and mark share the space.
  const p2Right = bP2.x1 + p2
  const plusLeft = p2Right + 141.8 - (p2 > 0 ? Math.min(34, p2 * 0.16) : 0)
  const plusRight = bPlusH.x1 + (p2 > 0 ? Math.min(24, p2 * 0.1) : 0)
  const plusTop = bPlusV.y0

  const eLeft = bE.x0 + eL
  const eRight = bE.x1 + eR
  const lLeft = eRight + 90.05 - (eR > 0 ? Math.min(12, eR * 0.15) : 0)
  const lRight = lLeft + (bL.x1 - bL.x0) + lW
  const aLeft = lRight + 100.54 - (lW > 0 ? Math.min(14, lW * 0.25) : 0)
  const aRight = bA.x1

  const eTop = bE.y0 + midTopDelta + eWave * 0.5
  const eBot = bE.y1 + midBotDelta + eWave * 0.5
  const lTop = bL.y0 + midTopDelta - eWave * 0.35
  const lBot = bL.y1 + midBotDelta - eWave * 0.35
  const aTop = bA.y0 + midTopDelta - eWave * 0.5
  const aBot = bA.y1 + midBotDelta - eWave * 0.5
  const midRowMinTop = Math.min(eTop, lTop, aTop)
  const plusBot = Math.min(bPlusV.y1 + midTopDelta * 0.85, midRowMinTop - 78)

  const gLeft = bG.x0 + gL
  const gRight = bG.x1 + gR
  const markLeft = gRight + 61.04
  const markRight = bMark.x1
  const gTop = eBot + 154.39
  const markTop = Math.max(lBot + 12.56, aBot) + 161.05

  // Keep both P glyphs strictly locked vertically; animate horizontal bowl breathing only.
  byName.get('p1')?.setAttribute(
    'd',
    remap('p1', (x, y) => [
      x + (x > 840 ? p1 : 0),
      y,
    ])
  )
  byName.get('s')?.setAttribute(
    'd',
    remap('s', (x, y) => fitBox(x, y, bS, { x0: sLeft, x1: sRight, y0: bS.y0, y1: sBottom }))
  )
  byName.get('y')?.setAttribute(
    'd',
    remap('y', (x, y) => {
      const t = bend(y, 2120, 2500)
      const dxTop = (yUpperLeft - 2017.07) * (1 - clamp((x - 2017.07) / (2791.53 - 2017.07)))
      const dxTail = yTailShift * (1 - 0.35 * clamp((x - 1880.43) / (2462.33 - 1880.43)))
      return [
        x + lerp(dxTop, dxTail, t),
        bY.y0 + ((y - bY.y0) / (bY.y1 - bY.y0)) * (yBot - bY.y0),
      ]
    })
  )
  byName.get('c')?.setAttribute(
    'd',
    remap('c', (x, y) => fitBox(x, y, bC, { x0: cLeft, x1: cRight, y0: cTop, y1: cBot }))
  )
  byName.get('h')?.setAttribute(
    'd',
    remap('h', (x, y) => fitBox(x, y, bH, { x0: hLeft, x1: hRight, y0: hTop, y1: bH.y1 }))
  )
  byName.get('i')?.setAttribute(
    'd',
    remap('i', (x, y) => {
      const sx = (iRight - iLeft) / (bI.x1 - bI.x0)
      const sy = (bI.y1 - iTop) / (bI.y1 - bI.y0)
      const dotScale = Math.min(sx, sy)
      const stemTopOrig = 3139.18
      const stemTopNew = iTop + (stemTopOrig - bI.y0) * dotScale
      if (y < 3060) {
        const cxOrig = 2560.855
        const cyOrig = 2976.04
        const cxNew = (iLeft + iRight) / 2
        const cyNew = iTop + (cyOrig - bI.y0) * dotScale
        return [cxNew + (x - cxOrig) * dotScale, cyNew + (y - cyOrig) * dotScale]
      }
      return [
        iLeft + ((x - bI.x0) / (bI.x1 - bI.x0)) * (iRight - iLeft),
        stemTopNew + ((y - stemTopOrig) / (bI.y1 - stemTopOrig)) * (bI.y1 - stemTopNew),
      ]
    })
  )
  byName.get('p2')?.setAttribute(
    'd',
    remap('p2', (x, y) => [
      x + (x > 3180 ? p2 : 0),
      y,
    ])
  )
  const plusW = plusRight - plusLeft
  const plusH = plusBot - plusTop
  const plusCx = (plusLeft + plusRight) / 2
  const plusCy = (plusTop + plusBot) / 2
  byName.get('plus-horizontal')?.setAttribute(
    'd',
    remap('plus-horizontal', (x, y) => [
      plusLeft + ((x - bPlusH.x0) / (bPlusH.x1 - bPlusH.x0)) * plusW,
      plusCy + (y - 1872.79),
    ])
  )
  byName.get('plus-vertical')?.setAttribute(
    'd',
    remap('plus-vertical', (x, y) => [
      plusCx + (x - 4115.855),
      plusTop + ((y - bPlusV.y0) / (bPlusV.y1 - bPlusV.y0)) * plusH,
    ])
  )
  byName.get('e')?.setAttribute(
    'd',
    remap('e', (x, y) => fitBox(x, y, bE, { x0: eLeft, x1: eRight, y0: eTop, y1: eBot }))
  )
  byName.get('l')?.setAttribute(
    'd',
    remap('l', (x, y) => fitBox(x, y, bL, { x0: lLeft, x1: lRight, y0: lTop, y1: lBot }))
  )
  byName.get('a')?.setAttribute(
    'd',
    remap('a', (x, y) => fitBox(x, y, bA, { x0: aLeft, x1: aRight, y0: aTop, y1: aBot }))
  )
  byName.get('g')?.setAttribute(
    'd',
    remap('g', (x, y) => fitBox(x, y, bG, { x0: gLeft, x1: gRight, y0: gTop, y1: bG.y1 }))
  )
  const markOriginal = ORIGINALS.mark ?? ''
  const [triangle = '', hole = ''] = markOriginal.split(' Z ')
  const markSx = (markRight - markLeft) / (bMark.x1 - bMark.x0)
  const markSy = (bMark.y1 - markTop) / (bMark.y1 - bMark.y0)
  const holeScale = Math.min(markSx, markSy)
  const holeCxOrig = 4129.71
  const holeCyOrig = 3233.995
  const holeCxNew = (markLeft + markRight) / 2
  const holeCyNew = markTop + (holeCyOrig - bMark.y0) * markSy
  const top = triangle.replace(PAIRS, (_, rawX: string, rawY: string) => {
    const [nx, ny] = fitBox(Number(rawX), Number(rawY), bMark, {
      x0: markLeft,
      x1: markRight,
      y0: markTop,
      y1: bMark.y1,
    })
    return `${nx.toFixed(2)} ${ny.toFixed(2)}`
  })
  const dot = hole.replace(PAIRS, (_, rawX: string, rawY: string) => {
    const nx = holeCxNew + (Number(rawX) - holeCxOrig) * holeScale
    const ny = holeCyNew + (Number(rawY) - holeCyOrig) * holeScale
    return `${nx.toFixed(2)} ${ny.toFixed(2)}`
  })
  byName.get('mark')?.setAttribute('d', `${top} Z ${dot}`)
}

const GLYPH_BY_NAME = Object.fromEntries(EMBLEM_GLYPHS.map((glyph) => [glyph.name, glyph]))
const PILLAR_NAMES = ['p1', 'p2'] as const
const LETTER_NAMES = ['s', 'y', 'c', 'h', 'i', 'e', 'l', 'a', 'g'] as const

// The tall pillars travel less so the narrower gaps stay open through the wave.
const FLOAT_AMPLITUDE: Readonly<Record<string, number>> = {
  p1: 58, p2: 58,
  s: 86, y: 86, c: 96, h: 92, i: 92,
  e: 90, l: 92, a: 90, g: 88,
  plus: 78, mark: 76,
}

const LEFT_CHANNELS: ReadonlyArray<keyof PoseChannels> = ['p1', 'sDrop', 'yDrop', 'cL', 'cR', 'hW']
const RIGHT_CHANNELS: ReadonlyArray<keyof PoseChannels> = ['p2', 'eL', 'eR', 'lW', 'midTop', 'midBot', 'eWave', 'gL', 'gR']

function pickChannels(pose: PoseChannels, keys: ReadonlyArray<keyof PoseChannels>) {
  const subset: Partial<PoseChannels> = {}
  for (const key of keys) subset[key] = pose[key]
  return subset
}

export function HomeEmblem() {
  const root = useRef<SVGSVGElement>(null)
  const pointerType = useRef('')
  const interact = useRef<{
    enter: () => void
    leave: () => void
    tap: () => void
    scatter: (x: number, y: number) => void
    gather: () => void
  } | null>(null)
  const hoverTilt = useRef<{ xTo: gsap.QuickToFunc; yTo: gsap.QuickToFunc } | null>(null)

  useGSAP(
    () => {
      const svg = root.current
      if (!svg) return

      const stage = svg.querySelector<SVGGElement>('[data-emblem-stage]')
      const pillars = PILLAR_NAMES.map((name) => svg.querySelector<SVGGElement>(`[data-glyph-wrap="${name}"]`)).filter(
        (el): el is SVGGElement => Boolean(el)
      )
      const letters = LETTER_NAMES.map((name) => svg.querySelector<SVGGElement>(`[data-glyph-wrap="${name}"]`)).filter(
        (el): el is SVGGElement => Boolean(el)
      )
      const plus = svg.querySelector<SVGGElement>('[data-glyph-group="plus"]')
      const mark = svg.querySelector<SVGGElement>('[data-glyph-wrap="mark"]')
      const glyphNodes = Array.from(svg.querySelectorAll<SVGPathElement>('[data-glyph]'))
      const byName = new Map(glyphNodes.map((node) => [node.dataset.glyph ?? '', node]))
      const floating = Array.from(svg.querySelectorAll<SVGGElement>('[data-float]'), (node) => {
        const box = node.getBBox()
        const center = (box.x + box.width / 2 - EMBLEM_ORIGIN.x) / EMBLEM_VIEWBOX.width
        return { node, phaseOffset: -center * Math.PI * 1.65, amplitude: FLOAT_AMPLITUDE[node.dataset.float!] }
      })
      if (!stage || !plus || !mark) return
      const pieces = Array.from(stage.querySelectorAll<SVGGElement>('[data-scatter]'))

      const media = gsap.matchMedia()

      media.add('(prefers-reduced-motion: no-preference)', () => {
        const pose: PoseChannels = { ...POSE_KEYFRAMES[0]! }
        const motion = { mix: 0, phase: 0, introBlend: 0 }
        let hasDeformed = false
        let mixTween: gsap.core.Tween | undefined
        let tapCycle: gsap.core.Timeline | undefined
        let scatterTween: gsap.core.Tween | undefined
        let isHovering = false

        const resetPaths = () => {
          for (const [name, node] of byName) {
            node.setAttribute('d', ORIGINALS[name] ?? '')
            node.removeAttribute('transform')
          }
        }

        const draw = () => {
          if (motion.mix > 0.001) {
            applyMultiPose(byName, pose, motion.mix)
            hasDeformed = true
          } else if (hasDeformed) {
            resetPaths()
            hasDeformed = false
          }

          const floatAmp = (1 - motion.mix) * motion.introBlend
          if (floatAmp <= 0.001) {
            for (const { node } of floating) node.removeAttribute('transform')
            return
          }

          for (const { node, phaseOffset, amplitude } of floating) {
            const p = motion.phase + phaseOffset
            // Shape the cosine wave with a subtle second harmonic for buoyant MG crest/trough cadence.
            const shaped = p + 0.14 * Math.sin(p)
            const x = 6 * Math.sin(shaped) * floatAmp
            const y = -Math.cos(shaped) * amplitude * floatAmp
            node.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`)
          }
        }

        // Crisp MG choreography with 45ms lead/follow between left and right compartments.
        const morph = gsap.timeline({ paused: true, repeat: -1 })
        const sequence = [
          { pose: POSE_KEYFRAMES[1]!, move: 0.46, hold: 0.2, ease: 'expo.inOut', leadRight: false },
          { pose: POSE_KEYFRAMES[2]!, move: 0.44, hold: 0.18, ease: 'power4.inOut', leadRight: false },
          { pose: POSE_KEYFRAMES[3]!, move: 0.46, hold: 0.2, ease: 'expo.inOut', leadRight: true },
          { pose: POSE_KEYFRAMES[4]!, move: 0.44, hold: 0.24, ease: 'back.out(1.25)', leadRight: false },
          { pose: POSE_KEYFRAMES[0]!, move: 0.52, hold: 0.16, ease: 'power3.inOut', leadRight: true },
        ]
        for (const step of sequence) {
          const startAt = morph.duration()
          const firstKeys = step.leadRight ? RIGHT_CHANNELS : LEFT_CHANNELS
          const secondKeys = step.leadRight ? LEFT_CHANNELS : RIGHT_CHANNELS
          morph
            .to(pose, { ...pickChannels(step.pose, firstKeys), duration: step.move, ease: step.ease }, startAt)
            .to(pose, { ...pickChannels(step.pose, secondKeys), duration: step.move, ease: step.ease }, startAt + 0.045)
          if (step.hold > 0) morph.to(pose, { duration: step.hold }, startAt + step.move + 0.045)
        }
        const singleCycleDuration = morph.duration()
        morph.timeScale(1.15)

        const waveFloat = gsap.to(motion, {
          phase: Math.PI * 2,
          duration: 4.2,
          ease: 'none',
          repeat: -1,
          onUpdate: draw,
        })

        const plusBreath = gsap.to(plus, {
          scale: 1.032,
          transformOrigin: '50% 50%',
          duration: 2.4,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          paused: true,
        })

        const intro = gsap.timeline({
          onComplete: () => {
            if (!isHovering && !tapCycle?.isActive()) plusBreath.play(0)
          },
        })

        intro
          .to(motion, { introBlend: 1, duration: 0.65, ease: 'power2.out' }, 0.25)
          .from(
            pillars,
            {
              y: 54,
              opacity: 0,
              transformOrigin: '50% 100%',
              duration: 0.52,
              stagger: 0.08,
              ease: 'expo.out',
              clearProps: 'transform,opacity',
            },
            0
          )
          .from(
            letters,
            {
              y: 24,
              scale: 0.94,
              opacity: 0,
              transformOrigin: '50% 50%',
              duration: 0.42,
              stagger: 0.022,
              ease: 'power4.out',
              clearProps: 'transform,opacity',
            },
            0.08
          )
          .from(
            plus,
            {
              rotation: -45,
              scale: 0.58,
              opacity: 0,
              transformOrigin: '50% 50%',
              duration: 0.5,
              ease: 'back.out(1.65)',
              clearProps: 'transform,opacity',
            },
            0.22
          )
          .from(
            mark,
            {
              y: -48,
              scale: 0.84,
              opacity: 0,
              transformOrigin: '50% 100%',
              duration: 0.46,
              ease: 'back.out(1.65)',
              clearProps: 'transform,opacity',
            },
            0.28
          )

        const stopMorphToWave = () => {
          mixTween?.kill()
          mixTween = gsap.to(motion, {
            mix: 0,
            duration: 0.54,
            ease: 'power2.inOut',
            onComplete: () => {
              if (!isHovering) {
                morph.pause(0)
                Object.assign(pose, POSE_KEYFRAMES[0])
                resetPaths()
                hasDeformed = false
                plusBreath.resume()
              }
            },
          })
        }

        interact.current = {
          scatter: (clientX, clientY) => {
            const matrix = stage.getScreenCTM()
            if (!matrix) return

            const click = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse())
            const { width, height } = EMBLEM_VIEWBOX
            // Bias the burst toward the click without sending every piece in one direction at the edges.
            const originX = EMBLEM_ORIGIN.x + lerp(width / 2, click.x - EMBLEM_ORIGIN.x, 0.24)
            const originY = EMBLEM_ORIGIN.y + lerp(height / 2, click.y - EMBLEM_ORIGIN.y, 0.24)
            const viewportWidth = document.documentElement.clientWidth
            const offsets = pieces.map((piece) => {
              const box = piece.getBBox()
              const left = (box.x * matrix.a + matrix.e - 12) / matrix.a
              const right = (viewportWidth - (box.x + box.width) * matrix.a - matrix.e - 12) / matrix.a
              return {
                x: Math.max(-Math.max(0, left), Math.min(Math.max(0, right), (box.x + box.width / 2 - originX) * 0.22)),
                y: (box.y + box.height / 2 - originY) * 0.39,
              }
            })

            scatterTween?.kill()
            scatterTween = gsap.to(pieces, {
              x: (index) => offsets[index]!.x,
              y: (index) => offsets[index]!.y,
              duration: 0.36,
              ease: 'power3.out',
              stagger: { amount: 0.065, from: 'center' },
            })
          },
          gather: () => {
            scatterTween?.kill()
            scatterTween = gsap.to(pieces, { x: 0, y: 0, duration: 0.24, ease: 'power3.out' })
          },
          enter: () => {
            isHovering = true
            tapCycle?.kill()
            mixTween?.kill()
            plusBreath.pause()
            gsap.to(plus, { scale: 1, duration: 0.2, ease: 'power2.out' })
            if (morph.paused()) morph.play(0)
            mixTween = gsap.to(motion, {
              mix: 1,
              duration: 0.3,
              ease: 'power3.out',
            })
          },
          leave: () => {
            isHovering = false
            tapCycle?.kill()
            stopMorphToWave()
          },
          tap: () => {
            if (isHovering) return
            tapCycle?.kill()
            mixTween?.kill()
            plusBreath.pause()
            gsap.to(plus, { scale: 1, duration: 0.2, ease: 'power2.out' })
            Object.assign(pose, POSE_KEYFRAMES[0])
            morph.play(0)
            mixTween = gsap.to(motion, {
              mix: 1,
              duration: 0.28,
              ease: 'power3.out',
            })
            tapCycle = gsap.timeline()
            tapCycle.to({}, { duration: singleCycleDuration / 1.15 - 0.15 }).add(() => {
              if (!isHovering) stopMorphToWave()
            })
          },
        }

        hoverTilt.current = {
          xTo: gsap.quickTo(stage, 'x', { duration: 0.4, ease: 'power3.out' }),
          yTo: gsap.quickTo(stage, 'y', { duration: 0.4, ease: 'power3.out' }),
        }

        return () => {
          interact.current = null
          hoverTilt.current = null
          mixTween?.kill()
          tapCycle?.kill()
          scatterTween?.kill()
          plusBreath.kill()
          waveFloat.kill()
          intro.kill()
          morph.kill()
          resetPaths()
          for (const { node } of floating) node.removeAttribute('transform')
          gsap.set([stage, ...pieces, ...pillars, ...letters, plus, mark], { clearProps: 'all' })
        }
      })

      return () => media.revert()
    },
    { scope: root }
  )

  const onEnter = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'touch') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    interact.current?.enter()
  }

  const onMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'touch') return
    if (!hoverTilt.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const nx = clamp((event.clientX - rect.left) / rect.width) - 0.5
    const ny = clamp((event.clientY - rect.top) / rect.height) - 0.5
    hoverTilt.current.xTo(nx * 16)
    hoverTilt.current.yTo(ny * 12)
  }

  const onLeave = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'touch') return
    interact.current?.leave()
    hoverTilt.current?.xTo(0)
    hoverTilt.current?.yTo(0)
  }

  const onDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointerType.current = event.pointerType
    if (event.pointerType !== 'mouse' || event.button !== 0 || !interact.current) return
    // Keep receiving the release even if the pointer leaves the emblem during the press.
    event.currentTarget.setPointerCapture(event.pointerId)
    interact.current.scatter(event.clientX, event.clientY)
  }

  const onRelease = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'mouse') interact.current?.gather()
  }

  const onClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (event.button === 0 && pointerType.current !== 'mouse') interact.current?.tap()
  }

  const standardGlyphs = EMBLEM_GLYPHS.filter(
    (glyph) => glyph.name !== 'plus-horizontal' && glyph.name !== 'plus-vertical'
  )
  const plusH = GLYPH_BY_NAME['plus-horizontal']
  const plusV = GLYPH_BY_NAME['plus-vertical']

  return (
    <svg
      ref={root}
      className="tc-home-emblem"
      viewBox={`0 0 ${EMBLEM_VIEWBOX.width} ${EMBLEM_VIEWBOX.height}`}
      aria-hidden="true"
      focusable="false"
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerDown={onDown}
      onLostPointerCapture={onRelease}
      onClick={onClick}
    >
      <g fill="currentColor" transform={`translate(${-EMBLEM_ORIGIN.x} ${-EMBLEM_ORIGIN.y})`}>
        <g data-emblem-stage="">
          {standardGlyphs.map((glyph) => (
            <g key={glyph.name} data-scatter="">
              <g data-glyph-wrap={glyph.name}>
                <g data-float={glyph.name}>
                  <path
                    data-glyph={glyph.name}
                    data-row={glyph.row}
                    d={glyph.d}
                    fillRule={glyph.name === 'mark' ? 'evenodd' : undefined}
                  />
                </g>
              </g>
            </g>
          ))}
          {plusH && plusV ? (
            <g data-scatter="">
              <g data-glyph-group="plus">
                <g data-float="plus">
                  <path data-glyph={plusH.name} data-row={plusH.row} d={plusH.d} />
                  <path data-glyph={plusV.name} data-row={plusV.row} d={plusV.d} />
                </g>
              </g>
            </g>
          ) : null}
        </g>
      </g>
    </svg>
  )
}
