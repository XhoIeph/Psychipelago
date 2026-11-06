/**
 * 机构行第二行的文案：`城市 · N 条线索`；城市缺失时只写 `N 条线索`。
 *
 * 筛选结果是跨省的，只写机构名看不出在哪，所以城市跟着条数一起放在第二行。
 */
export function hospitalRowMeta(city: string | undefined | null, leads: number): string {
  const trimmed = city?.trim()
  const count = `${leads} 条线索`
  return trimmed ? `${trimmed} · ${count}` : count
}

/**
 * 医院列表第二行：`省 · N 类病症 · M 条线索`；省视图里省名已经在标题上，传空即可。
 *
 * 类别数是这家医院能对上的筛选分组数，不是评分，也不是原始病症 id 的数量。
 */
export function hospitalBrowseMeta(
  province: string | undefined | null,
  categories: number,
  leads: number,
): string {
  const parts: string[] = []
  const trimmed = province?.trim()
  if (trimmed) parts.push(trimmed)
  parts.push(`${categories} 类病症`, `${leads} 条线索`)
  return parts.join(' · ')
}
