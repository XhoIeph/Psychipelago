import type { Metadata } from 'next'
import { TransitionProvider } from '@/components/PageTransition'
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from '@/lib/site'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
}

// 首帧前定主题：手动选过以 tc.theme 为准，否则跟随系统偏好。
const themeInit = `try{var s=localStorage.getItem('tc.theme');var d=s==='dark'||(s!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <TransitionProvider>{children}</TransitionProvider>
      </body>
    </html>
  )
}
