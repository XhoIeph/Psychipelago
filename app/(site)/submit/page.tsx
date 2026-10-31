import Link from 'next/link'

const REPO_URL = 'https://github.com/XhoIeph/TraumaCompass'
const TEMPLATE_URL = `${REPO_URL}/issues/new?template=`

export const metadata = {
  title: '提交线索｜TraumaCompass',
  description: '提交就诊线索、更正记录或申请撤下。',
}

export default function SubmitPage() {
  return (
    <div className="tc-submit">
      <header className="tc-page-heading"><h1>提交线索</h1></header>
      <p>需登录 GitHub，提交内容公开可见。</p>
      <p className="tc-muted">请勿填写病历、证件号、联系方式、未成年人身份信息或自伤细节。</p>

      <div className="tc-grid tc-grid--cards">
        <section className="tc-card">
          <h2>核对主线线索</h2>
          <p>提供《就诊地图10.25》中的位置和原文摘录。</p>
          <a className="tc-button tc-button--active" href={`${TEMPLATE_URL}lead.yml`} target="_blank" rel="noopener noreferrer">
            打开线索模板
          </a>
        </section>
        <section className="tc-card">
          <h2>更正记录</h2>
          <p>提供记录编号、需更正的内容及来源。</p>
          <a className="tc-button" href={`${TEMPLATE_URL}correction.yml`} target="_blank" rel="noopener noreferrer">
            打开更正模板
          </a>
        </section>
        <section className="tc-card">
          <h2>申请撤下</h2>
          <p>提供记录编号或页面链接。</p>
          <a className="tc-button" href={`${TEMPLATE_URL}takedown.yml`} target="_blank" rel="noopener noreferrer">
            打开撤下模板
          </a>
        </section>
      </div>
      <Link className="tc-linklike" href="/?panel=submit">在地图中打开投稿面板 →</Link>
      <p className="tc-muted" style={{ marginTop: 24 }}>全国统一心理援助热线 <a href="tel:12356">12356</a></p>
    </div>
  )
}
