/**
 * 覆盖层：人工改动与源数据分开存，构建时合成。
 *
 * 为什么要有它：curated 里的 reports / hospitals / doctors 是「重新解析来源表格 + 那轮高德定位」的
 * 确定性产物，`validate-data` 用深度比对拦手改。编辑控制台要能改字段、能新增条目，就不能直接改 curated，
 * 于是把人工意图单独记成一层显式差异，构建时叠加在源推导结果之上；比对因此仍能发现「没走覆盖层的手改」。
 *
 * 目录：`data/overrides/<kind>/<id>.json`，一条记录一个文件，文件名逐字等于 id。
 * `kind` 与目录名同形（都用复数），代码里不需要再维护一张映射表。
 *
 * 记录形状：
 *
 *   {
 *     "schema_version": "1.0.0",
 *     "kind": "reports",            // reports | doctors | hospitals，必须等于所在目录名
 *     "id": "kdocs-s1-r43",         // 必须等于文件名（去掉 .json）
 *     "action": "patch",            // patch | insert | remove
 *     "reason": "原作者确认这行看的是创伤专病门诊",
 *     "by": "manual",
 *     "at": "2026-11-12",
 *     "source_value": { "doctor_name_raw": "临床心理科/创伤专病门诊" },
 *     "set": { "doctor_name_raw": "创伤专病门诊" },
 *     "clear": ["unlinked_reason"]
 *   }
 *
 * - `patch`：字段级改写。`set` 里的字段必须在白名单内；`clear` 里的字段必须当前存在。
 *   `source_value` 必须覆盖 `set` 与 `clear` 涉及的每一个字段，且与当前源值逐字相等——
 *   覆盖只在「当时那个值」成立，源表改了这一格之后旧覆盖就该失效报错，而不是继续悄悄生效。
 * - `insert`：本地新增，`id` 必须以 `local-` 开头，且不得与任何源 id 相同（大小写不敏感）。
 *   `set` 是整条记录（必须能过 zod 与现有红线），不是字段白名单的子集；不写 `source_value`。
 * - `remove`：整条下线。留一个墓碑文件，理由写在 `reason` 里；删掉文件即恢复。
 *
 * 数组一律整体替换，不做按项增删：元素没有稳定 id，按项增删要靠下标，比整段重写更难核对。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { doctorSchema, hospitalSchema, reportSchema } from '../../lib/schema.ts'
import { ROOT } from './paths.ts'

export type OverrideKind = 'reports' | 'doctors' | 'hospitals'
export type OverrideAction = 'patch' | 'insert' | 'remove'

export const OVERRIDE_KINDS: readonly OverrideKind[] = ['reports', 'doctors', 'hospitals']

export const LOCAL_ID_PREFIX = 'local-'

/** id 只允许小写字母、数字与连字符：Windows 文件系统不区分大小写，大写会与同名小写文件互相覆盖。 */
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/u
const MAX_ID_LENGTH = 80

/** 组合记录里明确不许改的字段：它们是这条记录的身份与出处，改了就换了来源。 */
const READ_ONLY: Record<OverrideKind, readonly string[]> = {
  reports: ['id', 'platform', 'source_channel', 'source_url', 'source_post_id', 'extraction', 'parts_count'],
  doctors: ['id'],
  hospitals: ['id'],
}

/** 字段白名单直接从 schema 取，不另抄一份：schema 加了字段，覆盖层自动能改，注释里也能看出关掉了哪些。 */
function editableFields(kind: OverrideKind): readonly string[] {
  const schema = kind === 'reports' ? reportSchema : kind === 'doctors' ? doctorSchema : hospitalSchema
  const all = Object.keys(schema.shape)
  const blocked = new Set(READ_ONLY[kind])
  const base = kind === 'hospitals'
    // 医院的其余字段都是高德那轮定位的结论：坐标、adcode、等级、类型、创伤服务能力。
    // 坐标只能经 `--query`/`--pick` 进 amap-manual.json，绝不在这里改一个字；
    // 名字与地区对不上时应该改 `scripts/lib/amap.ts` 的 SOURCE_NAME_EXPANSIONS 重跑定位。
    ? ['name', 'aliases', 'province', 'city']
    : all.filter(field => !blocked.has(field))
  return base
}

export const OVERRIDE_FIELDS: Record<OverrideKind, readonly string[]> = {
  reports: editableFields('reports'),
  doctors: editableFields('doctors'),
  hospitals: editableFields('hospitals'),
}

const RECORD_KEYS = new Set([
  'schema_version',
  'kind',
  'id',
  'action',
  'reason',
  'by',
  'at',
  'source_value',
  'set',
  'clear',
])

export type OverrideRecord = {
  schema_version: '1.0.0'
  kind: OverrideKind
  id: string
  action: OverrideAction
  reason: string
  by: string
  at: string
  source_value?: Record<string, unknown>
  set?: Record<string, unknown>
  clear?: string[]
}

export type OverrideLoad = { byKind: Record<OverrideKind, OverrideRecord[]>; errors: string[] }

export type OverrideResult = { items: Array<Record<string, unknown>>; errors: string[] }

function overridesDir(root: string): string {
  return resolve(root, 'data/overrides')
}

/** 记录里出现不认识的键时整条拒收：`source_values` 这种手误会让校验以为全对。 */
function readRecord(root: string, kind: OverrideKind, file: string): { record?: OverrideRecord; errors: string[] } {
  const errors: string[] = []
  const where = `data/overrides/${kind}/${file}`
  const stem = file.replace(/\.json$/u, '')
  if (file.includes('/') || file.includes('\\') || stem.includes('..')) {
    return { errors: [`${where}: 文件名不能包含路径分隔符`] }
  }
  if (!ID_PATTERN.test(stem) || stem.length > MAX_ID_LENGTH) {
    return { errors: [`${where}: id 只允许小写字母、数字与连字符，长度不超过 ${MAX_ID_LENGTH}`] }
  }
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(resolve(overridesDir(root), kind, file), 'utf8'))
  } catch (error) {
    return { errors: [`${where}: 不是合法 JSON（${(error as Error).message}）`] }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { errors: [`${where}: 必须是一个对象`] }
  const record = raw as Record<string, unknown>
  for (const key of Object.keys(record)) {
    if (!RECORD_KEYS.has(key)) errors.push(`${where}: 不认识的键 ${key}`)
  }
  if (record.schema_version !== '1.0.0') errors.push(`${where}: schema_version 必须是 1.0.0`)
  if (record.kind !== kind) errors.push(`${where}: kind 必须等于所在目录名 ${kind}`)
  if (record.id !== stem) errors.push(`${where}: id 必须逐字等于文件名 ${stem}`)
  if (record.action !== 'patch' && record.action !== 'insert' && record.action !== 'remove') {
    errors.push(`${where}: action 必须是 patch、insert 或 remove`)
  }
  if (typeof record.reason !== 'string' || !record.reason.trim()) errors.push(`${where}: reason 必填`)
  if (typeof record.by !== 'string' || !record.by.trim()) errors.push(`${where}: by 必填`)
  if (typeof record.at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(record.at)) errors.push(`${where}: at 必须是 YYYY-MM-DD`)
  if (record.action === 'insert' && typeof record.id === 'string' && !record.id.startsWith(LOCAL_ID_PREFIX)) {
    errors.push(`${where}: 新增记录的 id 必须以 ${LOCAL_ID_PREFIX} 开头，便于与上游记录区分`)
  }
  if (record.action === 'insert' && record.source_value !== undefined) {
    errors.push(`${where}: insert 不写 source_value（它没有源值可比）`)
  }
  // `remove` 是墓碑：它只表达「这条不要再出现」，没有 set/clear 可说。
  if (record.action === 'patch' && record.set === undefined && record.clear === undefined) {
    errors.push(`${where}: patch 需要 set 或 clear`)
  }
  if (record.set !== undefined && (typeof record.set !== 'object' || Array.isArray(record.set))) {
    errors.push(`${where}: set 必须是一个对象`)
  }
  if (record.clear !== undefined && (!Array.isArray(record.clear) || record.clear.some(item => typeof item !== 'string'))) {
    errors.push(`${where}: clear 必须是字符串数组`)
  }
  if (record.source_value !== undefined && (typeof record.source_value !== 'object' || Array.isArray(record.source_value))) {
    errors.push(`${where}: source_value 必须是一个对象`)
  }
  return errors.length ? { errors } : { record: record as unknown as OverrideRecord, errors }
}

export function loadOverrides(root: string = ROOT): OverrideLoad {
  const byKind: Record<OverrideKind, OverrideRecord[]> = { reports: [], doctors: [], hospitals: [] }
  const errors: string[] = []
  /** 全库 id 大小写不敏感唯一：只差大小写的两个 id 在 Windows 上会互相覆盖，事后极难查。 */
  const seen = new Map<string, string>()
  const dir = overridesDir(root)
  if (!existsSync(dir)) return { byKind, errors }
  for (const kind of OVERRIDE_KINDS) {
    const kindDir = resolve(dir, kind)
    if (!existsSync(kindDir)) continue
    for (const file of readdirSync(kindDir).sort()) {
      if (!file.endsWith('.json')) continue
      const { record, errors: fileErrors } = readRecord(root, kind, file)
      errors.push(...fileErrors)
      if (!record) continue
      const key = record.id.toLowerCase()
      const previous = seen.get(key)
      if (previous) {
        errors.push(`data/overrides: id 大小写不敏感重复 → ${previous} 与 ${kind}/${record.id}`)
        continue
      }
      seen.set(key, `${kind}/${record.id}`)
      byKind[kind].push(record)
    }
  }
  for (const kind of OVERRIDE_KINDS) byKind[kind].sort((a, b) => a.id.localeCompare(b.id))
  return { byKind, errors }
}

/** JSON 里没有 undefined：字段当时不存在就记 null，比对时两边都按同一规则归一。 */
function normalize(value: unknown): unknown {
  return value === undefined ? null : value
}

function quoteKey(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/gu, '') : ''
}

/**
 * 把覆盖层叠到源推导结果上：`源 + insert + patch − remove`。
 * insert 追加在末尾并按 id 排序，重复运行得到同一份结果。
 */
export function applyOverrides(
  kind: OverrideKind,
  sourceItems: Array<Record<string, unknown>>,
  records: OverrideRecord[],
): OverrideResult {
  const errors: string[] = []
  const items = sourceItems.map(item => ({ ...item }))
  const index = new Map(items.map((item, position) => [String(item.id), position]))
  const removed = new Set<string>()
  const inserted: Array<Record<string, unknown>> = []
  const editable = new Set(OVERRIDE_FIELDS[kind])

  for (const record of records) {
    const where = `data/overrides/${kind}/${record.id}.json`
    const position = index.get(record.id)
    const before = errors.length
    if (record.action === 'insert') {
      if (position !== undefined) {
        errors.push(`${where}: ${record.id} 已是源记录，不能重复新增`)
        continue
      }
      const payload = { ...(record.set ?? {}) }
      if (String(payload.id ?? '') !== record.id) errors.push(`${where}: set.id 必须是 ${record.id}`)
      // 坐标的出处只有两个：那轮高德定位的证据，和 amap-manual.json 里人工选定的点。
      // 新增记录两个都没有，自带坐标能过 zod、也能过比对，一路到合成页面坐标表才炸。
      if (kind === 'hospitals' && (payload.coordinates != null || payload.coordinates_source != null)) {
        errors.push(`${where}: 新增机构不能自带坐标，坐标只能来自高德查询与人工选定`)
        continue
      }
      if (kind === 'reports') {
        // 上游以后出现同一条发言时，本地新增就该退场，不能两处并存。
        // 判据只用引文与抓取范围：表格摘录类线索没有原帖链接可对。
        const quote = quoteKey(payload.evidence_quote)
        const captureScope = (payload.evidence_context as { capture_scope?: string } | undefined)?.capture_scope
        const clash = items.find(item => {
          const record = item as Record<string, unknown>
          if (!quote || quoteKey(record.evidence_quote) !== quote) return false
          const postId = payload.source_post_id
          if (typeof postId === 'string' && postId) return record.source_post_id === postId
          const context = record.evidence_context as { capture_scope?: string } | undefined
          return !record.source_post_id && context?.capture_scope === captureScope
        })
        if (clash) errors.push(`${where}: 已成为源记录（${String(clash.id)} 的出处与引文相同），请删除本地新增`)
      }
      // 新增记录没有源可推导，字段完整性只能在这里挡：缺一个必填字段，
      // 校验器只会报「和源不一致」，看不出真正原因。
      const parsed = kind === 'reports' ? reportSchema : kind === 'doctors' ? doctorSchema : hospitalSchema
      const result = parsed.safeParse(payload)
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push(`${where}: 新增记录字段不成立 → ${issue.path.join('.') || '(根)'}：${issue.message}`)
        }
      }
      if (errors.length === before) inserted.push(payload)
      continue
    }
    if (position === undefined) {
      errors.push(`${where}: 目标记录 ${record.id} 不存在`)
      continue
    }
    if (record.action === 'remove') {
      removed.add(record.id)
      continue
    }
    const item = items[position]
    const keys = [...Object.keys(record.set ?? {}), ...(record.clear ?? [])]
    if (keys.length === 0) {
      errors.push(`${where}: patch 没有任何字段要改`)
      continue
    }
    if (new Set(keys).size !== keys.length) errors.push(`${where}: 同一个字段同时出现在 set 与 clear`)
    for (const key of keys) {
      if (!editable.has(key)) {
        errors.push(`${where}: 字段 ${key} 不允许在覆盖层改`)
        continue
      }
      if (key === 'id') continue
      if (!(key in item)) {
        // 源记录里根本没有这个键：要么字段名打错，要么本该 insert。静默写入会让覆盖看起来生效了。
        errors.push(`${where}: 源记录没有字段 ${key}`)
        continue
      }
      const declared = record.source_value?.[key]
      if (!(key in (record.source_value ?? {}))) {
        errors.push(`${where}: source_value 缺少字段 ${key} 的源值`)
        continue
      }
      if (!isDeepStrictEqual(normalize(declared), normalize(item[key]))) {
        errors.push(`${where}: source_value.${key} 与当前源值不一致（源值已变，覆盖失效，请重新确认）`)
        continue
      }
    }
    for (const [key, value] of Object.entries(record.set ?? {})) {
      if (!editable.has(key)) continue
      if (isDeepStrictEqual(normalize(item[key]), normalize(value))) {
        errors.push(`${where}: set.${key} 与源值相同，覆盖没有作用`)
      }
    }
    for (const key of record.clear ?? []) {
      if (!editable.has(key)) continue
      if (normalize(item[key]) === null) errors.push(`${where}: clear.${key} 但该字段本来就没有值`)
    }
    if (errors.length > before) continue
    for (const [key, value] of Object.entries(record.set ?? {})) item[key] = value
    for (const key of record.clear ?? []) delete item[key]
  }

  const kept = items.filter(item => !removed.has(String(item.id)))
  inserted.sort((a, b) => String(a.id).localeCompare(String(b.id)))
  return { items: [...kept, ...inserted], errors }
}

/**
 * 生成器用：读覆盖层并叠到源推导结果上，任何一条覆盖有问题就抛出，不写半成品。
 * 覆盖失效率高于源，静默跳过会让控制台显示「已保存」而页面上什么都没有。
 */
export function applyStoredOverrides<T extends Record<string, unknown>>(
  kind: OverrideKind,
  sourceItems: T[],
  root: string = ROOT,
): T[] {
  const { byKind, errors } = loadOverrides(root)
  const applied = applyOverrides(kind, sourceItems, byKind[kind])
  const problems = [...errors, ...applied.errors]
  if (problems.length) {
    throw new Error(`覆盖层有 ${problems.length} 个问题，未写入：\n${problems.map(item => `  - ${item}`).join('\n')}`)
  }
  return applied.items as T[]
}

/**
 * 给编辑控制台用：按当前源记录算好 `source_value`，免得手抄源值抄错——覆盖失效判定全靠它。
 */
export function buildOverride(
  kind: OverrideKind,
  id: string,
  sourceItem: Record<string, unknown>,
  change: { set?: Record<string, unknown>; clear?: string[]; reason: string; by: string; at: string },
): OverrideRecord {
  const source_value: Record<string, unknown> = {}
  for (const key of [...Object.keys(change.set ?? {}), ...(change.clear ?? [])]) {
    source_value[key] = normalize(sourceItem[key])
  }
  return {
    schema_version: '1.0.0',
    kind,
    id,
    action: 'patch',
    reason: change.reason,
    by: change.by,
    at: change.at,
    source_value,
    ...(change.set ? { set: change.set } : {}),
    ...(change.clear?.length ? { clear: change.clear } : {}),
  }
}
