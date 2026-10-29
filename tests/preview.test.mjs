import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { amapProxyTarget, previewPath, createPreviewServer, previewOptions } from '../scripts/preview.ts'

test('保留 npm serve 的 --listen 调用，冲突端口明确报错', () => {
  assert.deepEqual(previewOptions(['--listen','4174']),previewOptions(['--port','4174']))
  assert.deepEqual(previewOptions([]),{directory:'out',port:4174})
  assert.equal(previewOptions(['--listen','4174','--port','4174']).port,4174)
  assert.throws(()=>previewOptions(['--listen','4174','--port','4176']),/端口不一致/)
})

test('安全代理只转发官方固定域名并在服务端替换 jscode', () => {
  for (const [path,host] of [['/v4/map/styles','webapi.amap.com'],['/v4/maps','restapi.amap.com']]) {
    const target = amapProxyTarget(new URL(`http://local/_AMapService${path}?key=public-key&jscode=untrusted`),'server-only-code')
    assert.equal(target.hostname,host)
    assert.equal(target.pathname,path)
    assert.equal(target.searchParams.get('jscode'),'server-only-code')
    assert.equal(target.searchParams.get('key'),'public-key')
  }
})

test('静态目录不能读出工作区与环境文件', () => {
  const root = resolve('out')
  assert.equal(previewPath(root,'/../.env.local'),undefined)
  assert.equal(previewPath(root,'/%2e%2e/.env.local'),undefined)
  assert.equal(previewPath(root,'/%2e%2e%5c.env.local'), process.platform === 'win32' ? undefined : resolve(root,'..\\.env.local'))
  assert.equal(previewPath(root,'/index.html'),resolve(root,'index.html'))
})

test('缺安全码返回 503，不假装地图服务已配置；静态入口仍可用', async () => {
  const server = createPreviewServer('public')
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve))
  try {
    const base = `http://127.0.0.1:${server.address().port}`
    const missing = await fetch(`${base}/_AMapService/v4/maps`)
    assert.equal(missing.status,503)
    assert.match(await missing.text(),/AMAP_SECURITY_JS_CODE/)
    assert.equal((await fetch(`${base}/geo/china-provinces.json`)).status,200)
    assert.equal((await fetch(base,{method:'POST'})).status,405)
  } finally { await new Promise(resolve => server.close(resolve)) }
})
