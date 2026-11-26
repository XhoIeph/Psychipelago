import { Mail } from 'lucide-react'

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/+$/, '')

export function MapSubmissions() {
  return (
    <ul className="tc-map-submissions">
      <li>
        <p>如果你也想为项目提供就诊线索或意见反馈，可以通过我们的邮箱进行投稿</p>
        <a className="tc-button" href="mailto:psychipelago@163.com">
          <Mail size={20} aria-hidden="true" />
          psychipelago@163.com
        </a>
      </li>
      <li>
        <p>我们也在寻找可以合作的志愿者，一同维护项目的线索仓库，若有志向，可联系我们的小红书账号</p>
        <a className="tc-button" href="https://www.xiaohongshu.com/user/profile/684922bb000000001d0178b7" target="_blank" rel="noopener noreferrer">
          <img src={`${basePath}/brand/xiaohongshu.svg`} alt="" width={20} height={20} />
          群岛 Psychipelago
        </a>
      </li>
      <li>
        <p>你还可以在网站仓库提出Issue，留下您宝贵的意见与Bug反馈等</p>
        <a className="tc-button" href="https://github.com/XhoIeph/Psychipelago/issues/new/choose" target="_blank" rel="noopener noreferrer">
          <img className="tc-github-mark" src={`${basePath}/brand/github.svg`} alt="" width={20} height={20} />
          GitHub · 提交 Issue
        </a>
      </li>
    </ul>
  )
}
