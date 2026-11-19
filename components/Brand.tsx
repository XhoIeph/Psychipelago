import Link from 'next/link'

/**
 * 共享品牌组件：群岛 Psychipelago 横排锁排（图形 + 英文词标 + 中文），整体是回首页的链接。
 * 资产 public/brand/psychipelago-lockup.svg 取自品牌设计源文件 Psychipelago_SVG.svg
 * （viewBox 1225.4×291.74），原样使用，禁止拉伸/裁切/改色/加底板。
 *
 * - 锁排自带词标，因此站点不再用文字站名；可访问名称由图片 alt 提供。
 * - 显式写 width/height 与 aspect-ratio，避免图片加载前后布局位移。
 * - 服务端组件（无 'use client'）；路径按 basePath 手动拼接。
 *
 * 版式由 .tc-brand 的 inline-flex 控制。
 */

/** 品牌锁排的固有尺寸（与 SVG 的 viewBox 一致），决定纵横比 */
const LOGO_WIDTH = 1225.4
const LOGO_HEIGHT = 291.74
const LOGO_ASPECT_RATIO = `${LOGO_WIDTH} / ${LOGO_HEIGHT}`

/**
 * next.config.ts 通过 env 注入 NEXT_PUBLIC_BASE_PATH：
 * 本地开发为 ''（根路径），GitHub Pages 项目站点为 '/Psychipelago'。
 * 去掉可能存在的结尾斜杠，避免拼出 '//brand/...'。
 */
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/+$/, '')
const LOGO_SRC = `${BASE_PATH}/brand/psychipelago-lockup.svg`

export type BrandProps = {
  /** 锁排高度（px），宽度按 1245.5:301.25 自动计算；默认 34 */
  height?: number
  /** 预留：辅助小字由锁排自带，不再单独渲染 */
  subtitle?: string
  /** 追加到 .tc-brand 之后的类名，用于按场景微调间距/字号 */
  className?: string
}

export function Brand({ height = 34, className }: BrandProps) {
  const intrinsicWidth = Math.round((height * LOGO_WIDTH) / LOGO_HEIGHT)
  const linkClassName = className ? `tc-brand ${className}` : 'tc-brand'

  return (
    <Link href="/" className={linkClassName}>
      <img
        src={LOGO_SRC}
        alt="群岛 Psychipelago"
        width={intrinsicWidth}
        height={height}
        decoding="async"
        style={{
          width: 'auto',
          height: `${height}px`,
          aspectRatio: LOGO_ASPECT_RATIO,
        }}
      />
    </Link>
  )
}

export default Brand

/**
 * 独立品牌图形（用于 /about/ 标题区等不与站名并排、也不作为链接的场景）。
 * 与 Brand 共用同一份资产与 basePath 逻辑。
 */
export function BrandMark({ height = 64, className }: { height?: number; className?: string }) {
  const intrinsicWidth = Math.round((height * LOGO_WIDTH) / LOGO_HEIGHT)
  return (
    <img
      src={LOGO_SRC}
      alt="群岛 Psychipelago 标识"
      width={intrinsicWidth}
      height={height}
      decoding="async"
      className={className}
      style={{
        display: 'block',
        width: 'auto',
        height: `${height}px`,
        aspectRatio: LOGO_ASPECT_RATIO,
      }}
    />
  )
}
