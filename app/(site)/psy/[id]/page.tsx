import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PsyRunner from '@/components/psy/PsyRunner';
import { CATALOGUE_BY_ID, CATALOGUE_ITEMS } from '@/lib/psy/catalogue';

export function generateStaticParams() {
  return CATALOGUE_ITEMS.map((item) => ({ id: item.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = CATALOGUE_BY_ID.get(id);
  if (!item) return { title: '量表库｜群岛 Psychipelago' };
  return {
    title: `${item.name}｜量表库｜群岛 Psychipelago`,
    description: item.description,
  };
}

export default async function ScalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = CATALOGUE_BY_ID.get(id);
  if (!item) notFound();
  return <PsyRunner item={item} />;
}
