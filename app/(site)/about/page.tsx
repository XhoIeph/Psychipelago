import { BrandMark } from '@/components/Brand'
import { ContributorIslands } from '@/components/about/ContributorIslands'
import { ContributorShore, type ContributorIslandId } from '@/components/about/ContributorShore'

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/+$/, '')
const platforms = {
  bilibili: 'B 站',
  xiaohongshu: '小红书',
  github: 'GitHub',
  zhihu: '知乎',
}

type ProfileLink = [platform: keyof typeof platforms, href: string]

type Contributor = {
  id: ContributorIslandId
  name: string
  tags: string[]
  note?: string
  noteLang?: string
  links?: ProfileLink[]
}

const contributors: Contributor[] = [
  {
    id: 'clementine', name: 'Clementine', tags: ['PSYMETRA 量表库', '症状科普'],
    note: 'STILL BECOMING, STILL BLOOMING.', noteLang: 'en',
  },
  { id: 'pangtong', name: '髈桐', tags: ['国内外就诊线索'] },
  {
    id: 'aimomao', name: '爱摸猫手斯基', tags: ['线索收集与审核', '项目管理'], note: '多意识体图书馆的群友',
    links: [['xiaohongshu', 'https://www.xiaohongshu.com/user/profile/6408091f000000002a0091f4']],
  },
  { id: 'xiongxiong', name: '熊熊', tags: ['症状科普', '文献核对'] },
  {
    id: 'delirium', name: 'Delirium', tags: ['前端开发', '视觉设计', 'UI/UX'],
    links: [
      ['bilibili', 'https://space.bilibili.com/3747567600929079'],
      ['xiaohongshu', 'https://www.xiaohongshu.com/user/profile/6699b7a700000000240225d4'],
      ['github', 'https://github.com/XhoIeph'],
    ],
  },
  { id: 'aki', name: 'Aki', tags: ['人格障碍分类', '量表评估'] },
  {
    id: 'coraline', name: 'Coraline', tags: ['线索整理', '科普与运营'],
    links: [
      ['xiaohongshu', 'https://www.xiaohongshu.com/user/profile/599d571b5e87e71d675a6ddf'],
      ['zhihu', 'https://www.zhihu.com/people/cc-cptsd'],
    ],
  },
  { id: 'lycoris', name: '莉可丽丝喵', tags: ['科普供稿', '文献综述'] },
  { id: 'niujiaobao', name: '牛角包', tags: ['线索对接', '海报设计'] },
]

export const metadata = {
  title: '关于项目｜群岛 Psychipelago',
  description: '认识参与群岛 Psychipelago 网站建设、就诊线索整理与科普的贡献者。',
  alternates: { canonical: '/about/' },
}

export default function AboutPage() {
  return (
    <div className="tc-about">
      <header className="tc-about-heading">
        <BrandMark height={58} />
        <h1>关于 群岛 Psychipelago</h1>
      </header>
      <section className="tc-contributors" aria-labelledby="contributors-title">
        <h2 id="contributors-title">贡献者</h2>
        <ContributorIslands>
          {contributors.map(({ id, name, tags, note, noteLang, links }) => (
            <li className="tc-contributor-slot" key={id}>
              <article className="tc-contributor-island" aria-labelledby={`contributor-${id}`}>
                <ContributorShore island={id} />
                <img className="tc-contributor-avatar" src={`${basePath}/contributors/${id}.webp`} width={64} height={64} alt="" draggable={false} loading="lazy" decoding="async" />
                <h3 id={`contributor-${id}`}>{name}</h3>
                <ul className="tc-contributor-tags" aria-label="贡献">
                  {tags.map(tag => <li key={tag}>{tag}</li>)}
                </ul>
                {note && <p className="tc-contributor-note" lang={noteLang}>{note}</p>}
                {links && (
                  <ul className="tc-contributor-links">
                    {links.map(([platform, href]) => (
                      <li key={platform}>
                        <a href={href} aria-label={`${name}的${platforms[platform]}`}>
                          <img src={`${basePath}/brand/${platform}.svg`} className={`tc-${platform}-mark`} alt="" width={16} height={16} draggable={false} />
                          {platforms[platform]}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </li>
          ))}
        </ContributorIslands>
      </section>
    </div>
  )
}
