import { RibbonMark } from '@/components/Brand'

export const metadata = {
  title: '关于项目｜TraumaCompass',
  description:
    'TraumaCompass 项目信息。',
}

export default function AboutPage() {
  return (
    <div className="tc-about">
      <RibbonMark height={80} />
      <h1>关于 TraumaCompass</h1>
      {/* 后续关于项目的正文统一从这里开始添加。 */}
    </div>
  )
}
