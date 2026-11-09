import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TraumaCompass｜创伤知情就诊地图',
  description:
    '基于《就诊地图10.25》社区整理版表格的就诊资源与线索地图。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
