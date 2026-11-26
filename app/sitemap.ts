import type { MetadataRoute } from 'next'
import { CATALOGUE_ITEMS } from '@/lib/psy/catalogue'
import { SITE_ORIGIN } from '@/lib/site'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['/', '/map/', '/psy/', '/about/', ...CATALOGUE_ITEMS.map(({ id }) => `/psy/${id}/`)]
  return paths.map(path => ({ url: new URL(path, SITE_ORIGIN).href }))
}
