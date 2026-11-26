import type { ReactNode } from 'react'
import { Brand } from '@/components/Brand'
import { SiteNav } from '@/components/SiteNav'
import { SiteWater } from '@/components/SiteWater'

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/+$/, '')

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
          <p>除另有说明外，本站原创内容采用<a href="https://creativecommons.org/licenses/by-nc-nd/4.0/deed.zh-hans">知识共享署名-非商业性使用-禁止演绎 4.0 国际许可协议</a>。</p>
          <p><a className="tc-footer-source" href="https://github.com/XhoIeph/Psychipelago"><img className="tc-github-mark" src={`${basePath}/brand/github.svg`} alt="" width={16} height={16} />网站开源代码</a></p>
        </div>
      </footer>
    </div>
  )
}
