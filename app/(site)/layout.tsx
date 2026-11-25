import type { ReactNode } from 'react'
import { Brand } from '@/components/Brand'
import { SiteNav } from '@/components/SiteNav'
import { SiteWater } from '@/components/SiteWater'

/** 常规内容页布局：顶栏导航 + 正文容器 + 页脚（全屏地图页不经过这里） */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="tc-shell">
      <a className="tc-skip-link" href="#main-content">跳到正文</a>
      <header className="tc-header">
        <div className="tc-container tc-header-inner">
          <Brand height={48} className="tc-brand--site" />
          <SiteNav />
        </div>
      </header>

      <main className="tc-main" id="main-content" tabIndex={-1}>
        <SiteWater />
        <div className="tc-container">{children}</div>
      </main>

      <footer className="tc-footer">
        <div className="tc-container">
          <p>© 2026 群岛 Psychipelago. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
