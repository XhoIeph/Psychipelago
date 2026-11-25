import type { Metadata } from 'next'
import { CATALOGUE_ITEMS } from '@/lib/psy/catalogue'
import { PsyCatalogue } from '@/components/psy/PsyCatalogue'

export const metadata: Metadata = {
  title: '量表库｜群岛 Psychipelago',
  description: '心理自评量表，涵盖创伤、解离、人格、抑郁、焦虑、睡眠等分类。',
}

const items = CATALOGUE_ITEMS.map(({ id, name, fullName, category, questionCount, description }) => ({
  id, name, fullName, category, questionCount, description,
}))

export default function PsyPage() {
  return (
    <article className="tc-psy-page">
      <PsyCatalogue items={items} />
    </article>
  )
}
