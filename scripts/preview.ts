import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import nextEnv from '@next/env'

const SERVICE_PREFIX = '/_AMapService'
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
}

export function amapProxyTarget(url: URL, securityCode: string) {
  const target = new URL(url.pathname.startsWith(`${SERVICE_PREFIX}/v4/map/styles`) ? 'https://webapi.amap.com' : 'https://restapi.amap.com')
  target.pathname = url.pathname.slice(SERVICE_PREFIX.length)
  target.search = url.search
  target.searchParams.set('jscode', securityCode)
  return target
}

export function previewPath(root: string, pathname: string) {
  const path = resolve(root, `.${decodeURIComponent(pathname)}`)
  return path === root || path.startsWith(`${root}${sep}`) ? path : undefined
}

export function previewOptions(args: string[]) {
  const { values } = parseArgs({ args, options: { directory: { type: 'string', default: 'out' }, port: { type: 'string' }, listen: { type: 'string' } } })
  if (values.port && values.listen && values.port !== values.listen) throw new Error('--port 与 --listen 端口不一致')
  return { directory: values.directory!, port: Number(values.port ?? values.listen ?? '4174') }
}

export function createPreviewServer(directory: string, securityCode?: string) {
  const root = resolve(directory)
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    const origin = request.headers.origin
    if (origin === 'http://127.0.0.1:4173' || origin === 'http://localhost:4173') {
      response.setHeader('Access-Control-Allow-Origin', origin)
      response.setHeader('Vary', 'Origin')
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405).end()
      return
    }
    if (url.pathname.startsWith(`${SERVICE_PREFIX}/`)) {
      if (!securityCode) {
        response.writeHead(503, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'AMAP_SECURITY_JS_CODE 未配置' }))
        return
      }
      try {
        const upstream = await fetch(amapProxyTarget(url, securityCode), { redirect: 'manual', signal: AbortSignal.timeout(15000) })
        if (upstream.status >= 300 && upstream.status < 400) throw new Error('upstream redirect')
        const data = request.method === 'HEAD' ? undefined : Buffer.from(await upstream.arrayBuffer())
        response.writeHead(upstream.status, {
          'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
          'Cache-Control': 'no-store',
        })
        response.end(data)
      } catch {
        console.error(`AMap proxy upstream failed: ${url.pathname}`)
        response.writeHead(502, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: '高德安全代理请求失败' }))
      }
      return
    }
    try {
      let path = previewPath(root, url.pathname)
      if (!path) { response.writeHead(403).end(); return }
      if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html')
      const data = await readFile(path)
      response.writeHead(200, {
        'Content-Type': MIME[extname(path)] ?? 'application/octet-stream',
        'Cache-Control': url.pathname.startsWith('/_next/static/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      })
      response.end(request.method === 'HEAD' ? undefined : data)
    } catch {
      response.writeHead(404).end('Not found')
    }
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  nextEnv.loadEnvConfig(process.cwd())
  const { directory, port } = previewOptions(process.argv.slice(2))
  createPreviewServer(directory, process.env.AMAP_SECURITY_JS_CODE).listen(port, '127.0.0.1', () => {
    console.log(`Preview: http://127.0.0.1:${port}/`)
  })
}
