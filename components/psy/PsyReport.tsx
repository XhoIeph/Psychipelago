'use client'

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import type { PsyDimensionScore, PsyLevel, PsyResult } from '@/lib/psy/types'

gsap.registerPlugin(useGSAP)

const TONE_BY_TYPE: Record<string, string> = {
  normal: 'ok',
  mild: 'info',
  moderate: 'warn',
  'moderate-severe': 'warn',
  severe: 'danger',
}

function toneFor(levelType?: string) {
  return TONE_BY_TYPE[levelType ?? ''] ?? 'info'
}

function formatDuration(seconds?: number) {
  if (!seconds || seconds < 0) return ''
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes === 0) return `${rest} 秒`
  return rest ? `${minutes} 分 ${rest} 秒` : `${minutes} 分钟`
}

function dimensionMax(scores: PsyDimensionScore[], scaleId: string) {
  const explicit = scores.find((score) => typeof score.max === 'number')?.max
  if (typeof explicit === 'number' && explicit > 0) return explicit
  const peak = scores.reduce((max, score) => Math.max(max, score.score ?? score.raw ?? 0), 0)
  if (scaleId === 'mmpi') return 100
  // 维度是每题均分：SCL-90 这类 1–5 分制峰值为 4.x 就不能按 4 装，否则整张雷达被压到三分之一。
  if (peak <= 4) return 4
  if (peak <= 5) return 5
  if (peak <= 10) return 10
  return Math.ceil(peak)
}

/** 引擎多数量表不给维度上限，但描述里写着「（3题，0-12分）」；用它算条形比例，免得每根都撑满。 */
function parseDescMax(desc?: string) {
  if (!desc) return undefined
  const matched = desc.match(/0\s*[-–~至]\s*(\d+)\s*分/)
  return matched ? Number(matched[1]) : undefined
}

/** 描述里的题数，如「（3题，0-12分）」；引擎给的是每题平均分，条宽得除以每题上限。 */
function parseDescCount(desc?: string) {
  if (!desc) return undefined
  const matched = desc.match(/(\d+)\s*题/)
  return matched ? Number(matched[1]) : undefined
}

/** 维度得分大多是每题均分（引擎 `dimSum / dim.items.length`），描述写的是题组总分上限，两者不能直接除。
 *  只有描述里明确写了题数（「（3题，0-12分）」）才折算成每题上限；PSQI 这类分组分数本身就是 0-3 的分值，
 *  描述里没有题数，不能拿去乘除。 */
function perItemMax(dimension: PsyDimensionScore, fallback: number) {
  const groupMax = dimension.max ?? parseDescMax(dimension.desc)
  const count = parseDescCount(dimension.desc)
  if (!groupMax || !count) return groupMax ?? fallback
  return groupMax / count
}

/** Keep the dimension description focused on what it measures. */
function displayDesc(desc?: string) {
  if (!desc) return ''
  return desc
    .replace(/[（(]\s*\d+\s*题\s*[，,]\s*0\s*[-–~至]\s*\d+(?:\.\d+)?\s*分\s*[)）]/gu, '')
    .replace(/([。.])\s*([。.])/gu, '$1')
    .replace(/\s+([，。；])/gu, '$1')
    .trim()
}

/** 维度名偏长，雷达图的轴标签只留前几个字，完整名称在下方的维度列表里。 */
function axisLabel(name: string) {
  const clean = name.replace(/[（(].*?[)）]/g, '').trim()
  return clean.length > 8 ? `${clean.slice(0, 8)}…` : clean
}

function toLines(value: string | string[] | undefined): string[] {
  if (!value) return []
  return (Array.isArray(value) ? value : [value]).filter((line) => typeof line === 'string' && line.trim())
}

function RadarChart({
  dimensions,
  barMax,
}: {
  dimensions: PsyDimensionScore[]
  barMax: number
}) {
  const count = dimensions.length
  const size = 320
  const center = size / 2
  const radius = 104
  const angleAt = (index: number) => (Math.PI * 2 * index) / count - Math.PI / 2
  const pointAt = (index: number, fraction: number) => {
    const angle = angleAt(index)
    return [center + Math.cos(angle) * radius * fraction, center + Math.sin(angle) * radius * fraction]
  }
  const rings = [0.25, 0.5, 0.75, 1]
  const ratios = dimensions.map((dimension) => {
    const value = dimension.score ?? dimension.raw ?? 0
    const max = perItemMax(dimension, barMax) || 1
    return Math.max(0, Math.min(1, value / max))
  })
  const shape = ratios.map((ratio, index) => pointAt(index, ratio).join(',')).join(' ')
  const readable = dimensions
    .map((dimension) => {
      const value = dimension.score ?? dimension.raw ?? 0
      return `${dimension.name} ${value}/${perItemMax(dimension, barMax)}`
    })
    .join('，')

  return (
    <figure className="tc-psy-radar">
      <svg viewBox="-46 -30 412 320" role="img" aria-label={`各维度相对满分：${readable}`}>
        {rings.map((ring) => (
          <polygon
            key={ring}
            className="tc-psy-radar-grid"
            points={dimensions.map((_, index) => pointAt(index, ring).join(',')).join(' ')}
          />
        ))}
        {dimensions.map((dimension, index) => {
          const [x, y] = pointAt(index, 1)
          return <line key={dimension.id ?? dimension.name} className="tc-psy-radar-axis" x1={center} y1={center} x2={x} y2={y} />
        })}
        <polygon className="tc-psy-radar-shape" points={shape} />
        {ratios.map((ratio, index) => {
          const [x, y] = pointAt(index, ratio)
          return <circle key={`dot-${index}`} className="tc-psy-radar-dot" cx={x} cy={y} r={3} />
        })}
        {dimensions.map((dimension, index) => {
          const [x, y] = pointAt(index, 1.2)
          const cos = Math.cos(angleAt(index))
          const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle'
          return (
            <text key={`label-${index}`} className="tc-psy-radar-label" x={x} y={y} textAnchor={anchor} dominantBaseline="middle">
              {axisLabel(dimension.name)}
            </text>
          )
        })}
      </svg>
    </figure>
  )
}

export default function PsyReport({
  result,
  levels,
  onRestart,
}: {
  result: PsyResult
  levels: PsyLevel[]
  onRestart: () => void
}) {
  const [copied, setCopied] = useState(false)
  const reportRef = useRef<HTMLElement | null>(null)
  const dimensions = result.dimensionScores ?? []
  const summaryLines = toLines(result.summary)
  const oldItq = result.scaleId === 'itq' && !result.scoringVersion
  const dso = result.scaleId === 'itq' && result.scoringVersion ? result.secondaryMetrics?.[0] : undefined
  const barMax = useMemo(() => dimensionMax(dimensions, result.scaleId), [dimensions, result.scaleId])
  const tone = toneFor(result.levelType)
  // 引擎给的单位常带一段「(0 - 40)」，与右侧的「/ 40」重复，页面上只留纯单位。
  const unitText = (result.primaryMetric?.unit ?? '').replace(
    /\s*[（(]\s*\d+(?:\.\d+)?\s*[-–~至]\s*\d+(?:\.\d+)?\s*[)）]\s*$/,
    '',
  )

  const summaryText = useMemo(() => {
    const narrative = toLines(result.summary)
    const lines = [
      `${result.scaleName}（${result.scaleFullName}）`,
      oldItq ? '旧版总分结果' : '',
      `${result.primaryMetric?.label ?? '得分'}：${result.primaryScore} ${unitText}${result.primaryMetric?.max ? ` / ${result.primaryMetric.max}` : ''}`,
      dso ? `${dso.label}：${dso.value} ${dso.unit} / ${dso.max}` : '',
      result.level ? `结果：${result.level}` : '',
      result.genderLabel ? `常模：${result.genderLabel}` : '',
      result.validityConclusion ?? '',
      narrative.length ? `\n${narrative.join('\n')}` : '',
      dimensions.length
        ? `\n维度：\n${dimensions
            .map((dimension) => `· ${dimension.name}：${dimension.score ?? dimension.raw ?? '-'}${dimension.level ? `（${dimension.level}）` : ''}`)
            .join('\n')}`
        : '',
    ]
    return lines.filter(Boolean).join('\n')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions, dso, oldItq, result])

  useGSAP(
    () => {
      const root = reportRef.current
      if (!root) return
      const media = gsap.matchMedia()
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const bars = Array.from(root.querySelectorAll<HTMLElement>('.tc-psy-dims-track > span'))
        if (bars.length) {
          gsap.fromTo(
            bars,
            { scaleX: 0, transformOrigin: 'left center' },
            { scaleX: 1, duration: 0.5, stagger: 0.035, ease: 'power3.out', clearProps: 'transform' },
          )
        }
      })
      return () => media.revert()
    },
    { scope: reportRef, dependencies: [result.scaleId, result.primaryScore] },
  )

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <article className="tc-psy-report" ref={reportRef} aria-label={`${result.scaleName} 结果`}>
      <header className="tc-psy-report-head">
        <h1>{result.scaleFullName}结果</h1>
        <p className="tc-psy-eyebrow">
          {result.scaleName} · {result.completedTimeFormatted}
          {oldItq && ' · 旧版总分结果'}
          {result.durationSeconds ? ` · 用时 ${formatDuration(result.durationSeconds)}` : ''}
        </p>
        {result.genderLabel && <p className="tc-psy-note">常模：{result.genderLabel}</p>}
      </header>

      <section className="tc-psy-score" aria-label="得分与结果">
        <div className="tc-psy-score-main">
          <p className="tc-psy-score-label">{result.primaryMetric?.label ?? '总分'}</p>
          <p className="tc-psy-score-line">
            <span className="tc-psy-score-value">{result.primaryScore}</span>
            <span className="tc-psy-score-unit">
              {unitText}
              {result.primaryMetric?.max ? <em> / {result.primaryMetric.max}</em> : null}
            </span>
          </p>
        </div>
        {dso && (
          <div className="tc-psy-score-main">
            <p className="tc-psy-score-label">{dso.label}</p>
            <p className="tc-psy-score-line">
              <span className="tc-psy-score-value">{dso.value}</span>
              <span className="tc-psy-score-unit">{dso.unit} <em> / {dso.max}</em></span>
            </p>
          </div>
        )}
        {result.level && (
          <div className="tc-psy-score-side">
            <p className="tc-psy-badge" data-tone={tone}>{result.level}</p>
          </div>
        )}
      </section>

      {summaryLines.length > 0 && (
        <section className="tc-psy-summary" aria-labelledby="psy-summary-title">
          <h2 id="psy-summary-title">结果解读</h2>
          {summaryLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
      )}

      {dimensions.length >= 3 && <RadarChart dimensions={dimensions} barMax={barMax} />}

      {levels.length > 0 && (
        <section className="tc-psy-levels" aria-label="等级区间">
          <h2>等级区间</h2>
          <ul>
            {levels.map((level) => {
              const active = level.label === result.level
              return (
                <li key={`${level.label}-${level.min}`} aria-current={active || undefined} data-active={active ? 'true' : undefined}>
                  <span className="tc-psy-levels-range">
                    {level.min}–{level.max}
                  </span>
                  <span className="tc-psy-levels-label">{level.label}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {dimensions.length > 0 && (
        <section className="tc-psy-dims" aria-label="维度得分">
          <h2>各维度</h2>
          <ul>
            {dimensions.map((dimension) => {
              const value = dimension.score ?? dimension.raw ?? 0
              const itemMax = perItemMax(dimension, barMax)
              const width = Math.max(2, Math.min(100, Math.round((value / itemMax) * 100)))
              return (
                <li key={dimension.id ?? dimension.name}>
                  <div className="tc-psy-dims-head">
                    <span className="tc-psy-dims-name">{dimension.name}</span>
                    {dimension.level && <span className="tc-psy-dims-level">{dimension.level}</span>}
                  </div>
                  <div className="tc-psy-dims-track" aria-hidden="true">
                    <span style={{ width: `${width}%` }} data-tone={toneFor(dimension.levelType)} />
                  </div>
                  {displayDesc(dimension.desc) && <p className="tc-psy-dims-desc">{displayDesc(dimension.desc)}</p>}
                  {dimension.interp && <p className="tc-psy-dims-interp">{dimension.interp}</p>}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {(result.validityConclusion || result.codeInterpretation) && (
        <section className="tc-psy-validity" aria-label="效度与编码型">
          {result.validityConclusion && <p>{result.validityConclusion}</p>}
          {result.codeInterpretation && <p>{result.codeInterpretation}</p>}
        </section>
      )}

      {!dso && (result.secondaryMetrics?.length ?? 0) > 0 && (
        <section className="tc-psy-metrics" aria-label="其他指标">
          <h2>其他指标</h2>
          <dl>
            {result.secondaryMetrics!.map((metric) => (
              <div key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>
                  {typeof metric.value === 'number' ? metric.value : metric.value}
                  {metric.unit ? ` ${metric.unit}` : ''}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {(result.answers?.length ?? 0) > 0 && (
        <details className="tc-psy-answers">
          <summary>作答明细（{result.answers!.length} 项）</summary>
          <ol>
            {result.answers!.map((answer) => (
              <li key={answer.id}>
                <span className="tc-psy-answers-q">{answer.text}</span>
                <span className="tc-psy-answers-a">{answer.label ?? answer.scored}</span>
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="tc-psy-report-actions">
        <button type="button" className="tc-button tc-button--active" onClick={() => window.print()}>
          打印 / 存 PDF
        </button>
        <button type="button" className="tc-button tc-button--ghost" onClick={copySummary}>
          {copied ? '已复制' : '复制摘要'}
        </button>
        <button type="button" className="tc-button tc-button--ghost" onClick={onRestart}>
          重新作答
        </button>
        <Link href="/psy/" className="tc-button tc-button--ghost tc-psy-back">
          返回量表库
        </Link>
      </div>
    </article>
  )
}
