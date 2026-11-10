// 坏 JSON 覆盖文件的报错探针：确认校验器把文件名点出来、并停下。
// 手工诊断用，跑完清空 data/overrides。
import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.cwd()
const OVERRIDES = resolve(ROOT, 'data/overrides')
rmSync(OVERRIDES, { recursive: true, force: true })
mkdirSync(resolve(OVERRIDES, 'hospitals'), { recursive: true })
// 模拟 PowerShell 写坏的中文与未闭合引号
writeFileSync(resolve(OVERRIDES, 'hospitals/kdocs-amap-bad.json'), '{ "kind": "hospitals", "reason": "实测 remove 一家医院', 'utf8')

const result = spawnSync(process.execPath, ['scripts/validate-data.ts'], { cwd: ROOT, encoding: 'utf8' })
const out = `${result.stdout ?? ''}${result.stderr ?? ''}`
console.log(`validate exit ${result.status}`)
for (const line of out.split('\n').filter((item) => /JSON|覆盖层|kdocs-amap-bad/u.test(item))) console.log(line.trim())

rmSync(OVERRIDES, { recursive: true, force: true })
console.log('已清空 data/overrides')
