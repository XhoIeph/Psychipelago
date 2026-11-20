import raw from '@/data/psy/catalogue.json'

export type CatalogueItem = {
  id: string
  name: string
  fullName: string
  englishName: string
  category: string
  duration: number
  timeframe: string
  description: string
  instructions: string
  questionCount: number
  requiresGender: boolean
  crisis: boolean
  references?: { original: string[]; chineseValidation: string[] }
}

export const CATALOGUE_ITEMS: CatalogueItem[] = (raw as { items: CatalogueItem[] }).items
export const CATALOGUE_BY_ID = new Map(CATALOGUE_ITEMS.map((item) => [item.id, item]))
export const CATALOGUE_COUNT = CATALOGUE_ITEMS.length
