import type { Metadata } from 'next'
import { CATALOGUE_COUNT, CATALOGUE_ITEMS } from '@/lib/psy/catalogue'
import { PsyCatalogue, type PsyScale } from '@/components/psy/PsyCatalogue'

export const metadata: Metadata = {
  title: '量表库｜群岛 Psychipelago',
  description: `${CATALOGUE_COUNT} 个心理自评量表：创伤、解离、人格、抑郁、焦虑、睡眠等分类，免费、无需登录，结果只保存在本机。`,
}

/** 只把卡片要用的字段交给客户端，整份 JSON（含量表说明与参考文献）不进浏览器包。 */
const items: PsyScale[] = CATALOGUE_ITEMS.map((item) => ({
  id: item.id,
  name: item.name,
  fullName: item.fullName,
  englishName: item.englishName,
  category: item.category,
  duration: item.duration,
  questionCount: item.questionCount,
  description: item.description,
  crisis: item.crisis,
}))

export default function PsyPage() {
  return (
    <article className="tc-psy-page">
      <header className="tc-psy-head">
        <h1>量表库</h1>
        <p className="tc-muted">
          免费自评，不需要注册；结果只保存在这台设备上，不会上传。量表不能代替医生的诊断。
        </p>
      </header>

      <PsyCatalogue items={items} />

      <aside className="tc-psy-crisis" aria-labelledby="psy-crisis-title">
        <h2 id="psy-crisis-title">如果你现在很难受</h2>
        <p>
          如果情绪已经影响到日常生活，或出现伤害自己的念头，请尽快去综合医院临床心理科或精神科就诊。也可以拨打心理危机干预热线：400-161-9995。
        </p>
      </aside>

      <p className="tc-psy-note">
        量表题项与计分逻辑转写自 PSYMETRA 项目；量表版权归原作者与出版方所有。
      </p>
    </article>
  )
}
