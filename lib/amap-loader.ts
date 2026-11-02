let sdk: Promise<typeof AMap> | undefined

export function loadAmap(): Promise<typeof AMap> {
  const key = process.env.NEXT_PUBLIC_AMAP_JS_KEY
  if (!key) return Promise.reject(new Error('未配置高德 Web端（JS API）Key'))
  const local = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
  const serviceHost = process.env.NEXT_PUBLIC_AMAP_SERVICE_HOST || (local ? `${window.location.origin}/_AMapService` : '')
  if (!serviceHost) return Promise.reject(new Error('未配置高德安全代理地址'))
  if (!sdk) {
    window._AMapSecurityConfig = { serviceHost }
    // 脚本卡住不算「加载中」：连不上时给出错误，别让地图区一直等（侧栏与数据本来就不依赖它）。
    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('高德地图加载超时')), 12000)
    })
    sdk = Promise.race([
      import('@amap/amap-jsapi-loader').then(({ default: loader }) => loader.load({
        key, version: '2.0', plugins: ['AMap.Scale'],
      })),
      timeout,
    ]).catch(() => { throw new Error('高德地图加载失败，请检查 JS API 配置与安全代理') })
  }
  return sdk!
}
