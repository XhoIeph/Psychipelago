import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TraumaCompass｜创伤知情就诊地图',
  description:
    '基于《就诊地图10.25》社区整理版表格的就诊资源与线索地图。',
}

// 首帧前定主题：手动选过以 tc.theme 为准，否则跟随系统偏好。
const themeInit = `try{var s=localStorage.getItem('tc.theme');var d=s==='dark'||(s!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {children}
      </body>
    </html>
  )
}
