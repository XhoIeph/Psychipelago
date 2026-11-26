import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Mail } from 'lucide-react'
import { TransitionLink } from '@/components/PageTransition'
import { HomeEmblem } from '@/components/home/HomeEmblem'
import { HomeMotion } from '@/components/home/HomeMotion'
import { HomeWater } from '@/components/home/HomeWater'
import { IslandGraph } from '@/components/home/IslandGraph'
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from '@/lib/site'

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/+$/, '')

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: '/',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [{ url: '/brand/psychipelago-avatar.webp', width: 480, height: 480, alt: SITE_NAME }],
  },
}

const website = { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, alternateName: '群岛', url: SITE_ORIGIN }

export default function HomePage() {
  return (
    <div className="tc-home">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
      <HomeMotion>
        <section className="tc-home-masthead" aria-labelledby="home-title">
          <HomeWater />
          <div className="tc-container tc-home-hero">
            <div className="tc-home-titles">
              <h1 id="home-title" className="tc-home-title">群岛</h1>
              <p className="tc-home-title-en" lang="en">Psychipelago</p>
              <p className="tc-home-subtitle">关于创伤，解离与人格</p>
              <figure className="tc-home-quote">
                <blockquote>“万物皆有裂痕，那是光照进来的地方。”</blockquote>
                <figcaption>— 莱昂纳德·科恩<cite>《颂歌》</cite></figcaption>
              </figure>
              <div className="tc-home-doors">
                <TransitionLink className="tc-button tc-button--active tc-home-door" href="/map/" prefetch={false}>
                  就诊地图 <ArrowRight size={18} aria-hidden="true" />
                </TransitionLink>
                <Link className="tc-button tc-home-door" href="/psy/">量表测试</Link>
              </div>
            </div>
            <div className="tc-home-atlas" aria-hidden="true">
              <svg className="tc-home-atlas-contours" viewBox="0 0 680 408" fill="none" stroke="currentColor">
                <g className="tc-home-atlas-contour--outer">
                  <path d="M22 158C19 125 49 96 92 89C134 82 151 71 177 44C202 18 228 9 261 22C291 34 303 64 323 71C341 77 365 61 387 73C416 89 398 119 365 128C333 137 300 125 272 139C238 156 247 183 213 199C181 214 151 198 131 214C110 231 58 229 48 207C38 186 24 183 22 158Z" />
                  <path d="M235 303C240 275 281 263 299 241C318 218 310 197 344 184C381 170 407 203 437 198C468 193 471 162 506 157C541 152 550 177 570 189C592 204 626 190 647 213C673 241 646 273 620 285C594 297 577 286 551 302C531 315 534 342 511 360C490 377 468 366 443 372C414 380 400 405 365 398C331 390 340 358 312 346C291 337 264 349 247 332C238 323 234 315 235 303Z" />
                  <path d="M437 89C442 68 473 62 491 47C508 32 519 15 547 20C573 25 580 49 603 52C626 56 651 57 659 81C672 121 624 141 583 129C558 122 543 107 518 118C467 140 426 124 437 89Z" />
                  <path d="M39 288C50 265 71 264 93 247C115 230 143 232 156 247C167 259 171 275 195 273C220 270 230 285 225 308C218 337 179 334 158 350C132 370 111 365 89 347C68 331 30 324 39 288Z" />
                </g>
                <g className="tc-home-atlas-contour--middle">
                  <path d="M38 154C38 125 66 108 101 104C139 100 162 87 191 57C213 34 236 24 259 39C286 56 284 82 317 87C342 92 368 76 384 88C397 99 376 116 352 116C315 117 289 114 264 129C230 149 233 173 207 185C182 196 151 181 123 199C99 214 66 210 59 194C51 174 37 174 38 154Z" />
                  <path d="M253 307C255 284 292 276 311 254C333 230 324 212 349 201C379 188 405 223 440 213C471 205 481 178 507 172C535 165 545 191 567 203C588 217 624 204 637 226C649 246 625 269 605 273C578 279 559 279 541 293C518 310 523 334 502 347C482 359 466 351 438 357C411 363 395 389 370 383C347 377 353 350 321 334C294 322 251 339 253 307Z" />
                  <path d="M455 92C462 77 485 74 502 57C517 41 530 31 547 36C566 43 572 61 594 66C615 70 636 66 643 85C655 111 622 124 592 115C560 105 545 92 518 103C481 118 445 115 455 92Z" />
                  <path d="M55 291C64 276 79 276 103 257C120 244 141 249 149 262C162 282 175 292 198 287C214 284 216 302 207 310C193 321 170 319 150 336C128 355 111 344 97 333C80 317 47 316 55 291Z" />
                </g>
                <g className="tc-home-atlas-contour--inner">
                  <path d="M61 148C72 123 107 121 134 113C166 103 185 86 204 66C225 45 245 44 256 57C271 75 267 89 291 97C312 105 335 97 353 99C327 108 287 101 253 118C218 136 218 169 193 170C160 171 143 173 115 187C97 195 75 192 71 177C68 166 56 162 61 148Z" />
                  <path d="M205 83C219 67 233 61 244 69C255 78 247 93 227 103C204 115 188 111 193 101C196 95 199 89 205 83Z" />
                  <path d="M276 301C280 287 312 278 329 258C347 237 340 223 357 218C383 209 410 238 444 229C475 221 489 194 509 187C530 181 540 206 560 217C580 228 613 221 621 235C626 253 598 259 579 262C556 265 533 274 522 292C512 310 512 331 489 333C471 335 457 334 436 341C412 349 396 370 378 367C365 365 368 343 340 327C315 312 270 321 276 301Z" />
                  <path d="M470 275C482 262 493 256 501 261C510 267 501 280 497 292C491 306 470 317 463 308C457 301 460 286 470 275Z" />
                  <path d="M512 69C524 57 537 49 546 55C558 62 566 76 555 83C544 90 522 89 510 91C495 92 503 79 512 69Z" />
                  <path d="M79 294C95 286 114 263 127 267C141 271 135 286 151 295C163 302 147 322 132 326C113 331 104 316 90 311C80 307 73 302 79 294Z" />
                </g>
              </svg>
              <HomeEmblem />
            </div>
          </div>
        </section>

        <div className="tc-container tc-home-sections">
          <section className="tc-home-section" aria-labelledby="home-intro-title">
            <header className="tc-home-section-head" data-reveal>
              <h2 id="home-intro-title">群岛是？</h2>
              <p>我们是群岛（Psychipelago）——一个公益性非营利组织。我们致力于为创伤相关亲历者、应激以及分离障碍群体、系统/多意识体及人格障碍群体提供科普支持、资源连接、经验分享与社群互助，陪伴更多人获得心理帮助与治疗，共同构建一隅安宁之岛。</p>
            </header>
            <IslandGraph />
          </section>

          <section className="tc-home-section tc-home-section--community" aria-labelledby="home-community-title" data-reveal>
            <header className="tc-home-section-head">
              <h2 id="home-community-title">社群合作</h2>
              <p>群岛希望与更多邻岛联结合作，以此提供更好的帮助</p>
            </header>
            <div className="tc-home-community">
              <a className="tc-home-partner" href="https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=MzkzMDk3Mjk3MA==#wechat_redirect" aria-labelledby="home-cc-title" aria-describedby="home-cc-description">
                <img className="tc-home-avatar" src={`${basePath}/brand/cc-cptsd-avatar.jpg`} alt="" width={500} height={500} loading="lazy" decoding="async" />
                <div className="tc-home-partner-body">
                  <h3 id="home-cc-title">CC的<wbr /><span className="tc-home-partner-name">C-PTSD安全岛 <ArrowUpRight className="tc-home-partner-arrow" size={15} aria-hidden="true" /></span></h3>
                  <p id="home-cc-description">公众号/社群</p>
                </div>
              </a>
              <a className="tc-home-partner" href="https://psymetra.underlined.ink/" aria-labelledby="home-psymetra-title" aria-describedby="home-psymetra-description">
                <img className="tc-home-avatar tc-home-avatar--psymetra" src={`${basePath}/brand/psymetra-logo.png`} alt="" width={190} height={190} loading="lazy" decoding="async" />
                <div className="tc-home-partner-body">
                  <h3 id="home-psymetra-title">PSYMETRA <ArrowUpRight className="tc-home-partner-arrow" size={15} aria-hidden="true" /></h3>
                  <p id="home-psymetra-description">心理测评平台</p>
                </div>
              </a>
            </div>
          </section>

          <section className="tc-home-section" aria-labelledby="home-feedback-title" data-reveal>
            <header className="tc-home-section-head">
              <h2 id="home-feedback-title">联系我们</h2>
              <p>群岛真诚欢迎每一位登岛拜访的朋友</p>
            </header>
            <dl className="tc-home-contacts">
              <div>
                <dt><Mail size={22} aria-hidden="true" />邮箱</dt>
                <dd><a href="mailto:psychipelago@163.com">psychipelago@163.com</a></dd>
              </div>
              <div>
                <dt><img className="tc-github-mark" src={`${basePath}/brand/github.svg`} alt="" width={22} height={22} />GitHub</dt>
                <dd><a href="https://github.com/XhoIeph/Psychipelago">XhoIeph/Psychipelago</a></dd>
              </div>
              <div>
                <dt><img src={`${basePath}/brand/xiaohongshu.svg`} alt="" width={22} height={22} />小红书</dt>
                <dd><a href="https://www.xiaohongshu.com/user/profile/684922bb000000001d0178b7">群岛 Psychipelago</a></dd>
              </div>
              <div>
                <dt><img className="tc-home-wechat-mark" src={`${basePath}/brand/wechat.svg`} alt="" width={22} height={22} />微信公众号</dt>
                <dd>
                  <details className="tc-home-wechat">
                    <summary>群岛 Psychipelago</summary>
                    <div className="tc-home-wechat-qr">
                      <img src={`${basePath}/brand/psychipelago-wechat.jpg`} alt="群岛 Psychipelago 微信公众号二维码" width={430} height={430} loading="lazy" decoding="async" />
                    </div>
                  </details>
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </HomeMotion>
    </div>
  )
}
