import Link from 'next/link'

/**
 * 共享品牌组件：图形标 + 英文词标 + 中文名三件分开用，而不是整张锁排缩到很小。
 *
 * 资产都从品牌源文件 `Psychipelago_SVG.svg` 里按图层拆出来（`python .botharness/psy-merge/split-brand.py`）：
 * - `public/brand/psychipelago-mark.svg`      六块岛屿 + 星，自带品牌色，永远原色
 * - `public/brand/psychipelago-wordmark-en.svg` Psychipelago 的成形字（单色）
 * - `public/brand/psychipelago-name-zh.svg`     群岛两字（单色）
 * 后两份是单色路径，用 CSS mask 上色，所以浅底/深底同一个文件、颜色跟着 `--tc-accent` 走，
 * 不需要再维护一套深色副本。
 *
 * 三态的尺寸按同一个基准 `height`（图形标的高度）换算：
 * 英文词标 0.42×、中文 0.34×、两者间距 3px。这样 40px 的站头里词标也有 17px 高，
 * 比把整张锁排压到 40px（词标只有 11px）清楚得多。
 *
 * 服务端组件（无 'use client'）；basePath 由 next.config.ts 通过 env 注入。
 */

const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/+$/, '')
const asset = (name: string) => `url("${BASE_PATH}/brand/${name}")`

/** 各自的固有比例，用来算宽高，避免加载前后位移 */
const MARK_ASPECT = 421.4 / 291.74
const EN_ASPECT = 770.03 / 127.22
const ZH_ASPECT = 218.52 / 104.41

type TextMaskProps = { height: number; name: string; aspect: number; className: string }

/** 单色 SVG 当遮罩用：颜色由 CSS 的 background-color 决定 */
function TextMask({ height, name, aspect, className }: TextMaskProps) {
  const width = Math.round(height * aspect)
  const mask = asset(name)
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        ['--tc-brand-w' as string]: `${width}px`,
        ['--tc-brand-h' as string]: `${height}px`,
        WebkitMaskImage: mask,
        maskImage: mask,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskPosition: 'left center',
        maskPosition: 'left center',
      }}
    />
  )
}

export type BrandProps = {
  /** 图形标高度（px），词标与中文名按比例跟随；默认 34 */
  height?: number
  /** 追加到 .tc-brand 之后的类名，用于按场景微调间距/字号 */
  className?: string
}

export function Brand({ height = 34, className }: BrandProps) {
  const enHeight = Math.max(11, Math.round(height * 0.42))
  const zhHeight = Math.max(10, Math.round(height * 0.34))
  const markWidth = Math.round(height * MARK_ASPECT)

  return (
    <Link href="/" className={className ? `tc-brand ${className}` : 'tc-brand'} aria-label="群岛 Psychipelago">
      <img
        className="tc-brand-mark"
        src={`${BASE_PATH}/brand/psychipelago-mark.svg`}
        alt=""
        aria-hidden="true"
        width={markWidth}
        height={height}
        style={{
          ['--tc-brand-w' as string]: `${markWidth}px`,
          ['--tc-brand-h' as string]: `${height}px`,
        }}
        decoding="async"
      />
      <span className="tc-brand-lockup" aria-hidden="true">
        <TextMask className="tc-brand-en" name="psychipelago-wordmark-en.svg" aspect={EN_ASPECT} height={enHeight} />
        <TextMask className="tc-brand-zh" name="psychipelago-name-zh.svg" aspect={ZH_ASPECT} height={zhHeight} />
      </span>
    </Link>
  )
}

export default Brand

/**
 * 单独的图形标（关于页标题区等不需要重复站名的场景）。
 * 站点用文字写站名，图形只负责「是哪一家」。
 */
export function BrandMark({ height = 72, className }: { height?: number; className?: string }) {
  const width = Math.round(height * MARK_ASPECT)
  return (
    <img
      className={className ? `tc-brand-mark ${className}` : 'tc-brand-mark'}
      src={`${BASE_PATH}/brand/psychipelago-mark.svg`}
      alt="群岛 Psychipelago 标识"
      width={width}
      height={height}
      decoding="async"
    />
  )
}
