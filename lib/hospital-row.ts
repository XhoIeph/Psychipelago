/**
 * 数据里没有收录的字段写成「未知」或空串；展示时统一当缺省处理，不把「未知」当名字印出来。
 */
export function knownText(value: string | undefined | null): string {
  const trimmed = value?.trim()
  return trimmed && trimmed !== '未知' ? trimmed : ''
}

/**
 * 机构行第二行的文案：`城市 · N 条线索`；城市缺失时只写 `N 条线索`。
 *
 * 筛选结果是跨省的，只写机构名看不出在哪，所以城市跟着条数一起放在第二行。
 */
export function hospitalRowMeta(city: string | undefined | null, leads: number): string {
  const trimmed = knownText(city)
  const count = `${leads} 条线索`
  return trimmed ? `${trimmed} · ${count}` : count
}
