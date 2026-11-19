import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '群岛 Psychipelago',
  description:
    '把社区整理的就诊资源与线索放回地图上：按省份找医院，按医生看线索，附量表自评。',
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
