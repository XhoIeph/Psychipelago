import { BrandMark } from '@/components/Brand'

export const metadata = {
  title: '关于项目｜群岛 Psychipelago',
  description: '群岛 Psychipelago 项目信息。',
}

export default function AboutPage() {
  return (
    <div className="tc-about">
      <BrandMark height={80} />
      <h1>关于 群岛 Psychipelago</h1>
      {/* 后续关于项目的正文统一从这里开始添加。 */}
    </div>
  )
}
