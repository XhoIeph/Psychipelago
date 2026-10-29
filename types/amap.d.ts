import '@amap/amap-jsapi-types'

declare global {
  namespace AMap {
    class Scale extends Control {
      constructor(options?: { position?: string; offset?: [number, number] })
    }
  }
  interface Window {
    _AMapSecurityConfig?: { serviceHost: string }
  }
}
