import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import test from 'node:test'

function config(variables) {
  const env = { ...process.env, ...variables }
  for (const name of ['GITHUB_PAGES', 'NEXT_PUBLIC_BASE_PATH']) {
    if (!(name in variables)) delete env[name]
  }
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e',
    "import config from './next.config.ts'; console.log(JSON.stringify(config))",
  ], { env, encoding: 'utf8' }))
}

for (const [name, variables, prefix] of [
  ['local default', {}, ''],
  ['original Pages CLI', { GITHUB_PAGES: 'true' }, '/TraumaCompass'],
  ['custom domain root', { GITHUB_PAGES: 'true', NEXT_PUBLIC_BASE_PATH: '' }, ''],
]) {
  test(name, () => {
    const result = config(variables)
    assert.equal(result.basePath, prefix)
    assert.equal(result.env.NEXT_PUBLIC_BASE_PATH, prefix)
    assert.equal(result.assetPrefix, prefix ? `${prefix}/` : undefined)
    assert.equal(result.output, 'export')
  })
}
